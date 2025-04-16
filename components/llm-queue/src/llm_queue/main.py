import asyncio
import traceback
import json
import uuid
import logging

from llm_queue.base.adapter_base_classes import (
    TelemetryDataStoreAdapter,
    UserRateLimitsDatastoreAdapter,
)
from llm_queue.base.base_classes import (
    BaseLLMEntityLoadBalancer,
    BaseRequestController,
    BaseScheduler,
)
from llm_queue.base.config_data_classes import AzureAOIModels, LLMConfig, LLMOutputTypes
from llm_queue.base.custom_errors import (
    QueueTimeoutError,
    SchedulerQueueFullError,
    UserRateLimitExceededError,
    UserIdHeaderMissingError,
)
from llm_queue.base.data_classes import (
    ModelPreferences,
    ScheduledRequest,
    TelemetryData,
)
from llm_queue.load_balancers.even_spaced_req_lb_in_mem import EvenlySpacedRequestLB
from llm_queue.poller import Poller
from llm_queue.resource_availability_checker import ResourceAvailabilityChecker
from llm_queue.schedulers.basic_fifo_scheduler import BasicFIFOScheduler
from llm_queue.telemetry import Telemetry
from llm_queue.user_rate_limiter import UserRateLimiter
from llm_queue.user_rate_limiter_adapters import InMemoryUserRateLimitStoreAdapter
import logging


class LLMQueue:
    async def initiate(self):
        await self.telemetry.connect_database()
        await self.user_rate_limiter.connect()
        self.logging.debug("FINISHED INITIATING LLM QUEUE INSTANCE...")

    def register_request_executors(
        self, request_executors: dict[str, BaseRequestController]
    ):
        # REGISTER REQUEST CONTROLLERS WITH TASK TYPES
        for req_type, request_controller in request_executors.items():
            self.poller.register_req_type(req_type, req_controller=request_controller)

    def __init__(
        self,
        llm_config: LLMConfig,
        request_executors: dict[str, BaseRequestController],
        user_rate_limits_store_adapter: UserRateLimitsDatastoreAdapter = None,
        telemetry_store_adapter: TelemetryDataStoreAdapter = None,
        scheduler: BaseScheduler = None,
        llm_load_balancer: BaseLLMEntityLoadBalancer = None,
        embedding_load_balancer: BaseLLMEntityLoadBalancer = None,
    ):
        self.logging = logging.getLogger(__name__)

        self.logging.debug("INITIATING LLMQueue INSTANCE...")
        self.llm_config = llm_config

        # TODO: Expose scheduler and load balancer to overwrite default ones
        # CREATE DEFAULT FIFO SCHEDULER
        self.scheduler = scheduler or BasicFIFOScheduler(
            limits=self.llm_config.scheduler_limits
        )

        # CREATE DEFAULT EVENLY SPACED REQUEST LOADBALANCERS
        # TODO: No need for separate load balancers for each
        self.llm_load_balancer = llm_load_balancer or EvenlySpacedRequestLB(
            self.__filter_models(self.llm_config, LLMOutputTypes.COMPLETION)
        )
        self.embedding_llm_loadbalancer = (
            embedding_load_balancer
            or EvenlySpacedRequestLB(
                self.__filter_models(self.llm_config, LLMOutputTypes.EMBEDDINGS)
            )
        )

        # CREATE POLLER OBJECT
        self.poller = Poller(
            self.scheduler,
            self.llm_config.scheduler_limits,
            ResourceAvailabilityChecker(
                self.embedding_llm_loadbalancer, self.llm_load_balancer
            ),
            self.llm_config,
        )

        # REGISTER REQUEST CONTROLLERS WITH TASK TYPES
        for req_type, request_controller in request_executors.items():
            self.poller.register_req_type(req_type, req_controller=request_controller)

        # CREATE USER RATE-LIMITER
        self.user_rate_limiter = UserRateLimiter(
            self.llm_config.user_limits,
            user_rate_limits_store_adapter or InMemoryUserRateLimitStoreAdapter(),
        )

        # CREATE TELEMETRY
        self.telemetry = Telemetry(telemetry_store_adapter)

        # START BACKGROUND POLLING PROCESSES
        self.poll_process_task = asyncio.create_task(self.poller.poll_and_process())
        self.resp_get_set_task = asyncio.create_task(self.poller.get_and_set())

    async def graceful_shutdown(self):
        self.poller.stop_polling()  # Signal to stop the loop
        await self.poller.shutdown_event_poll_and_process.wait()  # Wait until the task acknowledges shutdown
        await self.poller.shutdown_event_resp_queue_wait.wait()
        if self.poll_process_task:
            await self.poll_process_task
        if self.resp_get_set_task:
            await self.resp_get_set_task

    async def execute_request(
        self,
        req_type: str,
        request_data: dict,
        user_id: str,
        model_pref: ModelPreferences,
    ):
        try:
            llm_res_queue = ""
            request_id = str(uuid.uuid4())

            if user_id is None:
                raise UserIdHeaderMissingError("user-id header is missing")

            telemetry_data = TelemetryData(
                user_id=user_id,
                req_id=request_id,
                req_payload=str(request_data),
                req_type=req_type,
            )

            allowed, remaining = await self.user_rate_limiter.check_limit(user_id)
            if not allowed:
                telemetry_data.error_message = (
                    self.user_rate_limiter.RATE_LIMIT_EXCEEDED_MESSAGE
                )
                raise UserRateLimitExceededError(
                    f"Too many requests, please try again in {remaining} seconds"
                )

            scheduled_request = ScheduledRequest(
                req_type=req_type,
                req_id=request_id,
                payload=request_data,
                telemetry_data=telemetry_data,
                model_preferences=model_pref,
            )

            await self.scheduler.add_request(scheduled_request)
            await self.poller.wait_for_request_to_be_polled(request_id)
            llm_res_queue, status_code = await self.poller.futures[request_id]

            if status_code == 200:
                self.telemetry.sink_successfull(telemetry_data)
            else:
                self.telemetry.sink_with_error(llm_res_queue, telemetry_data)

            return llm_res_queue, status_code
        except QueueTimeoutError as err:
            self.logging.error(err)
            self.logging.error(traceback.format_exc())
            self.__sink_telemetry_with_error(llm_res_queue, str(err), telemetry_data)
            raise err
        except SchedulerQueueFullError as err:
            self.logging.error(err)
            self.logging.error(traceback.format_exc())
            self.__sink_telemetry_with_error(llm_res_queue, str(err), telemetry_data)
            raise err
        except Exception as err:
            self.logging.error(err)
            self.logging.error(traceback.format_exc())
            self.__sink_telemetry_with_error(llm_res_queue, str(err), telemetry_data)
            raise err

    async def __sink_telemetry_with_error(
        self, llm_res_queue: str, error_message: str, telemetry_data: TelemetryData
    ):
        if len(llm_res_queue) > 0:
            error_message = llm_res_queue
        self.telemetry.sink_with_error(error_message, telemetry_data)

    def __filter_models(
        self, llm_config: LLMConfig, model_type: str
    ) -> list[AzureAOIModels]:
        res = []
        for az_deployment in llm_config.azure_open_ai:
            for model in az_deployment.azure_oai_models:
                if model.model_type == model_type:
                    res.append(model)
        return res
