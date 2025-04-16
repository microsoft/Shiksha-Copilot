from typing import Tuple
from llm_queue.base.adapter_base_classes import UserRateLimitsDatastoreAdapter
import aioredis
import uuid


class RedisUserRateLimitStoreAdapter(UserRateLimitsDatastoreAdapter):
    """
    An implementation of UserRateLimitsDatastoreAdapter that uses a Redis database
    to manage user rate limits. This class provides functionality to check and add
    user requests against specified rate limits within a time window.
    """

    def __init__(self, redis_host: str, redis_password: str):
        """
        Initializes the adapter with the Redis server credentials.

        Parameters:
            redis_host (str): The host address of the Redis server.
            redis_password (str): The password for accessing the Redis server.
        """
        self.redis_host = redis_host
        self.redis_password = redis_password
        self.redis = None

    async def connect(self):
        """
        Establishes a connection to the Redis server using credentials provided during initialization.

        The connection parameters are determined based on whether the deployment is custom (e.g., Azure Container instance).
        """
        is_custom_deployment = "azurecontainer" in self.redis_host
        redis_port = 6379 if is_custom_deployment else 6380
        url_scheme = "redis" if is_custom_deployment else "rediss"
        self.redis = aioredis.from_url(
            f"{url_scheme}://:{self.redis_password}@{self.redis_host}:{redis_port}",
            encoding="utf-8",
            decode_responses=True,
        )

    async def disconnect(self):
        """
        Closes the connection to the Redis server.
        """
        await self.redis.close()

    async def check_and_add_request(
        self, user_id: str, limit: int, now: int, window_len: int
    ) -> Tuple[bool, float]:
        """
        Checks if a new request by a user exceeds the set rate limit within a defined time window,
        and adds the request to the Redis database if it does not exceed the limit. Manages requests
        in a thread-safe manner using Redis transactions and optimistic locking.

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
        window_start = now - window_len * 1000
        async with self.redis.pipeline() as pipe:
            while True:
                try:
                    await pipe.watch(user_id)

                    # Remove the requests older than the window_start
                    await pipe.zremrangebyscore(user_id, 0, window_start)

                    size = await pipe.zcard(user_id)

                    if size >= limit:
                        first_score = int(
                            (await pipe.zrange(user_id, 0, 0, withscores=True))[0][1]
                        )
                        remaining_time = window_len - (now - first_score) / 1000
                        await pipe.unwatch()
                        return False, remaining_time
                    else:
                        pipe.multi()
                        value = str(uuid.uuid4())
                        zadd_data = {value: now}
                        await pipe.zadd(user_id, zadd_data)
                        await pipe.execute()
                        return True, None
                except aioredis.WatchError:
                    continue
