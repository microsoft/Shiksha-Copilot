import asyncio
from typing import Tuple

from llm_queue.base.adapter_base_classes import UserRateLimitsDatastoreAdapter


class InMemoryUserRateLimitStoreAdapter(UserRateLimitsDatastoreAdapter):
    """
    An implementation of UserRateLimitsDatastoreAdapter that uses in-memory storage
    to manage user rate limits. This class provides functionality to check and add
    user requests against specified rate limits within a time window.
    """

    def __init__(self):
        """
        Initializes the in-memory storage and lock dictionaries for managing user rate limits.
        """
        self.storage = {}
        self.locks = {}

    async def connect(self):
        """
        Since the storage is in-memory, this method does nothing as there is nothing to connect to.
        """
        pass

    async def disconnect(self):
        """
        Clears the in-memory storage to simulate disconnection.
        """
        self.storage.clear()

    async def _get_lock(self, user_id: str):
        """
        Retrieves or creates an asyncio lock for the specified user ID to ensure thread-safe operations.

        Parameters:
            user_id (str): The unique identifier for the user.

        Returns:
            asyncio.Lock: The lock associated with the specified user ID.
        """
        if user_id not in self.locks:
            self.locks[user_id] = asyncio.Lock()
        return self.locks[user_id]

    async def check_and_add_request(
        self, user_id: str, limit: int, now: int, window_len: int
    ) -> Tuple[bool, float]:
        """
        Checks if a new request by a user exceeds the set rate limit within a defined time window,
        and adds the request to the in-memory storage if it does not exceed the limit. Manages requests
        in a thread-safe manner using asyncio locks.

        Parameters:
            user_id (str): The unique identifier for the user.
            limit (int): The maximum number of allowed requests in the time window.
            now (int): The current time, typically a timestamp, used to calculate the window's start.
            window_len (int): The length of the time window in which the requests are counted, typically in milliseconds.

        Returns:
            Tuple[bool, float]: A tuple containing a boolean indicating whether the request was added
                                 without exceeding the limit, and a float indicating the remaining time
                                 until the window resets, if the limit is exceeded.
        """
        lock = await self._get_lock(user_id)
        async with lock:
            # Ensure the user's request list exists
            if user_id not in self.storage:
                self.storage[user_id] = []

            requests = self.storage[user_id]

            # Calculate the start of the window
            window_start = now - (window_len * 1000)

            # Remove requests outside of the current window
            self.storage[user_id] = [req for req in requests if req > window_start]

            # Check if adding a new request would exceed the limit
            if len(self.storage[user_id]) >= limit:
                # Calculate the remaining time until the oldest request exits the window
                oldest_request = self.storage[user_id][0]
                remaining_time = ((oldest_request - window_start) / 1000) + window_len
                return False, remaining_time

            # Add the new request
            self.storage[user_id].append(now)
            # Ensure the list is sorted; this may be redundant if timestamps are always increasing
            self.storage[user_id].sort()

            return True, None
