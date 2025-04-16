# Define a class that polls the scheduler and load balances the requests between two API instances
import asyncio
from datetime import datetime
import json
import logging
import os
import traceback

from llm_queue.base.base_classes import (
    BaseRequestController,
    BaseResourceAvailabilityChecker,
    BaseScheduler,
)
from llm_queue.base.config_data_classes import LLMConfig, LLMQueueSchedulerLimits
from llm_queue.base.custom_errors import (
    LLMError,
    QueueTimeoutError,
    ResourceAvailabilityError,
)
from llm_queue.base.data_classes import (
    ModelPreferences,
    ScheduledRequest,
    TopQueuedRequest,
)


class Poller:
    """
    Polls a given scheduler to process requests based on resource availability, distributing them across registered request controllers for processing.

    Constructor Args:
    - scheduler: The scheduler instance from which requests are fetched.
    - scheduler_limits: Configuration for scheduler limits, such as maximum queue sizes and time-to-live for requests.
    - resource_availability_checker: Checks the availability of resources required to process the requests.

    Methods:
    - register_req_type(req_type: str, req_controller: BaseRequestController): Registers a request controller responsible for processing a specific type of request.
    - __check_resource_availability_and_process(model_pref: ModelPreferences, is_waiting_req=False): Checks resource availability and processes requests accordingly, moving them to the wait queue if necessary.
    - poll_and_process(): Continuously polls the scheduler for new or waiting requests, processing them based on resource availability and request type.
    - process_and_put(scheduled_request: ScheduledRequest, resource_ids: list[str]): Processes a given request using the appropriate request controller and places the response in a response queue.
    - get_and_set(): Retrieves responses from the response queue and sets the result of the corresponding future, signaling that the request has been processed.
    - wait_for_request_to_be_polled(req_id): Waits for a request with the given ID to be polled and processed, with a timeout based on scheduler limits.
    """

    def __init__(
        self,
        scheduler: BaseScheduler,
        scheduler_limits: LLMQueueSchedulerLimits,
        resource_availibility_checker: BaseResourceAvailabilityChecker,
        llm_config: LLMConfig,
    ):
        self.logging = logging.getLogger(__name__)
        self.scheduler = scheduler
        self.scheduler_limits = LLMQueueSchedulerLimits(**scheduler_limits)
        self.llm_config = llm_config
        self.response_queue = asyncio.Queue()
        # Use a dictionary to store the request ids and their corresponding futures
        self.futures = {}
        self.req_controllers: dict[str, BaseRequestController] = {}
        self.resource_availibility_checker = resource_availibility_checker
        self._continue_polling = True
        self.shutdown_event_poll_and_process = asyncio.Event()
        self.shutdown_event_resp_queue_wait = asyncio.Event()

    def register_req_type(self, req_type: str, req_controller: BaseRequestController):
        self.req_controllers[req_type] = req_controller

    async def __check_resource_availibility_and_process(
        self, model_pref: ModelPreferences, is_waiting_req=False
    ):
        try:
            resource_ids = (
                self.resource_availibility_checker.get_model_ids_if_available(
                    model_pref
                )
            )
        except ResourceAvailabilityError as err:
            scheduled_request: ScheduledRequest = (
                await self.scheduler.pop_top_waiting_request()
                if is_waiting_req
                else await self.scheduler.pop_top_new_request()
            )
            self.logging.debug(
                f"[POLLER] ENCOUNTERED ResourceAvailabilityError FOR REQUEST: {scheduled_request.req_id}, INVALID CHOICE OF EMB/LLM MODEL"
            )
            scheduled_request.telemetry_data.request_dequeued_at = int(
                datetime.now().timestamp()
            )
            self.futures[scheduled_request.req_id] = asyncio.Future()
            self.futures[scheduled_request.req_id].set_result((str(err), 400))

        if (
            resource_ids is None
            and model_pref.has_specific_model_pref()
            and not is_waiting_req
        ):
            # SPECIFIC RESOURCE NOT AVAILABLE RIGHT NOW, ADD TO WAIT QUEUE
            scheduled_request: ScheduledRequest = (
                await self.scheduler.pop_top_new_request()
            )
            await self.scheduler.add_request_to_wait_queue(scheduled_request)

        elif resource_ids is not None:
            # If required resources are available,
            # Pop the highest priority request from the scheduler
            scheduled_request: ScheduledRequest = (
                await self.scheduler.pop_top_waiting_request()
                if is_waiting_req
                else await self.scheduler.pop_top_new_request()
            )
            self.logging.debug(
                f"[POLLER] NOW PROCESSING REQUEST: {scheduled_request.req_id}..."
            )
            scheduled_request.telemetry_data.request_dequeued_at = int(
                datetime.now().timestamp()
            )
            future = asyncio.Future()
            self.futures[scheduled_request.req_id] = future
            _ = asyncio.create_task(
                self.process_and_put(scheduled_request, resource_ids)
            )

    # Poll the scheduler and send requests to appropriate request controller
    async def poll_and_process(self):
        try:
            while self._continue_polling:
                # CHECK IF SCHEDULER HAS A REQUEST
                if await self.scheduler.has_request():
                    #  GET TOP NEW and ALL WAITING REQUESTS
                    top_queued_req_obj: TopQueuedRequest = (
                        await self.scheduler.get_top_requests_model_prefs()
                    )

                    if top_queued_req_obj.newly_queued_request is not None:
                        # PROCESS NEW REQUEST
                        model_pref = top_queued_req_obj.newly_queued_request
                        await self.__check_resource_availibility_and_process(
                            model_pref, is_waiting_req=False
                        )

                    for model_pref in top_queued_req_obj.waiting_requests_list:
                        # PROCESS EACH WAITING REQUEST
                        await self.__check_resource_availibility_and_process(
                            model_pref, is_waiting_req=True
                        )

                # Sleep for a small interval to avoid busy waiting
                await asyncio.sleep(0.1)
        finally:
            self.shutdown_event_poll_and_process.set()

    # Process a request using the API instance and put the response in the queue
    async def process_and_put(
        self, scheduled_request: ScheduledRequest, resource_ids: list[str]
    ):
        response = "Invalid request type"
        status_code = 404
        if scheduled_request.req_type in self.req_controllers:
            try:
                scheduled_request.telemetry_data.deployment_name = ";".join(
                    resource_ids
                )
                response = await self.req_controllers[
                    scheduled_request.req_type
                ].process_request(
                    scheduled_request.payload,
                    [
                        self.llm_config.get_llm_config_from_llm_id(resource_id)
                        for resource_id in resource_ids
                    ],
                    scheduled_request.telemetry_data,
                )
                status_code = 200
            except LLMError as le:
                self.logging.error(f"[POLLER] LLM ERROR in process_and_put(): {le}")
                self.logging.error(traceback.format_exc())
                response = f"LLM ERROR: {le}"
                status_code = 500
                self.resource_availibility_checker.register_error(resource_ids)
            except Exception as err:
                self.logging.error(f"[POLLER] EXCEPTION IN process_and_put(): {err}")
                self.logging.error(traceback.format_exc())
                response = f"INTERNAL SERVER ERROR: {err}"
                status_code = 500

        # response["req_id"] = request_id // NOT NEEDED
        response_queue_item = (
            scheduled_request.req_id,
            response,
            status_code,
            scheduled_request.telemetry_data,
        )
        await self.response_queue.put(response_queue_item)
        scheduled_request.telemetry_data.response_queued_at = int(
            datetime.now().timestamp()
        )
        self.logging.debug(
            f"[POLLER] RESPONSE PUT IN RESPONSE QUEUE: {scheduled_request.req_id} {status_code}"
        )

    # Get the response from the queue and set the result of the corresponding future
    async def get_and_set(self):
        try:
            while self._continue_polling:
                request_id, response, status_code, telemetry_data = (
                    await self.response_queue.get()
                )
                future = self.futures[request_id]
                future.set_result((response, status_code))
                del self.futures[request_id]
                telemetry_data.response_dequeued_at = int(datetime.now().timestamp())
                await asyncio.sleep(0.1)
        finally:
            self.shutdown_event_resp_queue_wait.set()

    async def wait_for_request_to_be_polled(self, req_id):
        time_elapsed = 0
        wait_time = 0.1
        while req_id not in self.futures:
            await asyncio.sleep(wait_time)
            time_elapsed += wait_time
            if time_elapsed >= self.scheduler_limits.ttl_in_seconds:
                await self.scheduler.remove_request_by_id(req_id)
                raise QueueTimeoutError(
                    f"Request has timed out in scheduler queue. TTL: {self.scheduler_limits.ttl_in_seconds}"
                )

    def stop_polling(self):
        self._continue_polling = False
