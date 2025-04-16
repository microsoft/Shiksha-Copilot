from abc import ABC, abstractmethod
from typing import Tuple

from llm_queue.base.data_classes import TelemetryData


class TelemetryDataStoreAdapter(ABC):
    """
    An abstract base class defining the interface for telemetry data storage adapters for LLM Queue. This class outlines the methods required
    for connecting to a datastore, disconnecting from it, and inserting telemetry data entries.

    Methods:
        connect(): Establishes a connection to the telemetry data storage system. Must be implemented by subclasses.
        disconnect(): Closes the connection to the telemetry data storage system. Must be implemented by subclasses.
        insert_telemetry_data(telemetry_data: TelemetryData): Inserts a telemetry data record into the datastore. Must be implemented by subclasses.
    """

    @abstractmethod
    async def connect(self):
        pass

    @abstractmethod
    async def disconnect(self):
        pass

    @abstractmethod
    async def insert_telemetry_data(self, telemetry_data: TelemetryData):
        pass


class UserRateLimitsDatastoreAdapter(ABC):
    """
    An abstract base class for adapter implementations that manage user rate limits in a datastore.

    This class provides a framework for connecting to, disconnecting from, and managing rate limit checks
    and updates in a datastore, requiring implementations for each method.
    """

    @abstractmethod
    async def connect(self):
        """
        Establishes a connection to the datastore.

        This method must be overridden by subclasses to implement the specific logic required
        to connect to their datastore.
        """
        pass

    @abstractmethod
    async def disconnect(self):
        """
        Closes the connection to the datastore.

        This method must be overridden by subclasses to implement the specific logic required
        to disconnect from their datastore.
        """
        pass

    @abstractmethod
    async def check_and_add_request(
        self, user_id: str, limit: int, now: int, window_len: int
    ) -> Tuple[bool, float]:
        """
        Checks if a new request by a user exceeds the set rate limit within a defined time window,
        and adds the request to the datastore if it does not exceed the limit.

        Parameters:
            user_id (str): The unique identifier for the user.
            limit (int): The maximum number of allowed requests in the time window.
            now (int): The current time, typically a timestamp, used to calculate the window's start.
            window_len (int): The length of the time window in which the requests are counted, typically in seconds.

        Returns:
            Tuple[bool, float]: A tuple containing a boolean indicating whether the request was added
                                 without exceeding the limit, and a float indicating the remaining time
                                 until the window resets, if the boolean is False

        This method must be overridden by subclasses to implement specific rate limit checking and updating logic.
        """
        pass
