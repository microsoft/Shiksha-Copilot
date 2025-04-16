import asyncio
from collections import deque
from datetime import datetime
import heapq
import logging
from typing import Deque, List, Tuple

from llm_queue.base.base_classes import BaseScheduler
from llm_queue.base.config_data_classes import LLMQueueSchedulerLimits
from llm_queue.base.custom_errors import SchedulerQueueFullError
from llm_queue.base.data_classes import ScheduledRequest, TopQueuedRequest


class BasicFIFOScheduler(BaseScheduler):
    """
    Handles scheduling of requests using First-In-First-Out (FIFO) logic with support for priority queueing based on request timestamps.
    Supports adding requests to two queues: a main queue and a wait queue, each governed by a maximum size limit.

    The 'main queue' directly holds the incoming requests that are to be processed as soon as possible.
    The 'wait queue' holds requests that cannot be immediately processed due to rate limits of preferred LLM models.

    During each iteration of polling(say Iteration A), first the top request from main_queue(say `main_top`) is polled to check if the requested LLM
    resource is available or not, if its not available, the request is put into the wait_queue.
    During the same iteration A, after checking resource availability for `main_top` request, all the requests from wait_queue are
    peeked and checked for resource availability.

    Methods:
    - __init__(limits: SchedulerLimitsConfig): Initializes the scheduler with limits for queue sizes.
    - add_request_to_wait_queue(request: ScheduledRequest): Asynchronously adds a request to the wait queue if it's not full, otherwise raises a SchedulerQueueFullError.
    - add_request(request: ScheduledRequest): Asynchronously adds a new request to the main queue with the current timestamp, raising SchedulerQueueFullError if the queue is full.
    - get_top_requests_model_prefs(): Asynchronously retrieves(without removing) the top (earliest) request from the main queue and all requests from the wait queue, sorted by their timestamps and returns their model prefs.
    - pop_top_new_request(): Asynchronously removes and returns the top (earliest) request from the main queue.
    - pop_top_waiting_request(): Asynchronously removes and returns the top (earliest) request from the wait queue.
    - has_request(): Checks if there are any requests in either the main or wait queues.
    - remove_request_by_id(req_id: str): Removes a request from either queue based on its request ID.
    """

    def __init__(self, limits: LLMQueueSchedulerLimits):
        self.logging = logging.getLogger(__name__)
        self.queue: Deque[ScheduledRequest] = deque()
        self.wait_queue: Deque[ScheduledRequest] = deque()
        self.lock = asyncio.Lock()
        self.limits = LLMQueueSchedulerLimits(**limits)

    async def add_request_to_wait_queue(self, request: ScheduledRequest):
        async with self.lock:
            if len(self.wait_queue) >= self.limits.max_queue_size:
                raise SchedulerQueueFullError(
                    f"Wait queue is full. Max: {self.limits.max_queue_size}"
                )

            self.wait_queue.append(request)
            self.logging.debug(
                f"Request {request.req_id} added to wait queue, curr_size: {len(self.wait_queue)}"
            )

    async def add_request(self, request: ScheduledRequest):
        async with self.lock:
            if len(self.queue) >= self.limits.max_queue_size:
                raise SchedulerQueueFullError(
                    f"Main queue is full. Max: {self.limits.max_queue_size}"
                )

            self.queue.append(request)
            self.logging.debug(
                f"Request {request.req_id} added to main queue, curr_size: {len(self.queue)}"
            )
            request.telemetry_data.request_queued_at = int(datetime.now().timestamp())

    async def get_top_requests_model_prefs(self) -> TopQueuedRequest:
        async with self.lock:
            res = TopQueuedRequest()
            if self.queue:
                request = self.queue[0]
                res.newly_queued_request = request.model_preferences
            if self.wait_queue:
                # Directly converting heap to list for a one-time sorted snapshot without altering the heap
                res.waiting_requests_list = [
                    r.model_preferences for r in self.wait_queue
                ]
            return res

    async def pop_top_new_request(self) -> ScheduledRequest:
        async with self.lock:
            if self.queue:
                request = self.queue.popleft()
                return request
            return None

    async def pop_top_waiting_request(self) -> ScheduledRequest:
        async with self.lock:
            if self.wait_queue:
                request = self.wait_queue.popleft()
                return request
            return None

    async def has_request(self):
        async with self.lock:
            return bool(self.queue) or bool(self.wait_queue)

    async def remove_request_by_id(self, req_id: str):
        async with self.lock:
            # Attempt to remove from the main queue first
            removed = self._remove_from_queue(self.queue, req_id)
            if not removed:
                # If not found in the main queue, attempt to remove from the wait queue
                removed = self._remove_from_queue(self.wait_queue, req_id)

    def _remove_from_queue(
        self, queue: List[Tuple[int, ScheduledRequest]], req_id: str
    ) -> bool:
        """
        Helper method to remove a request by req_id from a given queue.
        Returns True if the request was found and removed, False otherwise.
        """
        for i, (_, request) in enumerate(queue):
            if request.req_id == req_id:
                # Remove the request by index
                queue.pop(i)
                return True
        return False
