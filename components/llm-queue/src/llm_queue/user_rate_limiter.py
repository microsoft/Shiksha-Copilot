# Import the necessary modules
# Create a python class called UserRateLimiter. This class should get user_id from header of a API request in FastAPI. Check if the user has made more than "x" requests in last "y" seconds. Use azure cache redis as a store to keep the user request numbers. Use async-await with all redis operations. Give me working python code. Also Give redis library version used.
import time

from llm_queue.base.adapter_base_classes import UserRateLimitsDatastoreAdapter
from llm_queue.base.config_data_classes import UserLimits


class UserRateLimiter:
    RATE_LIMIT_EXCEEDED_MESSAGE = "RATE LIMIT EXCEEDED"

    def __init__(
        self, user_limits: UserLimits, data_store: UserRateLimitsDatastoreAdapter
    ):
        self.user_limits = UserLimits(**user_limits)
        self.data_store = data_store

    async def connect(self):
        await self.data_store.connect()

    async def disconnect(self):
        await self.data_store.disconnect()

    async def check_limit(self, user_id: str):
        now = int(time.time() * 1000)
        return await self.data_store.check_and_add_request(
            user_id,
            self.user_limits.max_num_requests_in_time_window,
            now,
            self.user_limits.time_window_length_in_seconds,
        )
