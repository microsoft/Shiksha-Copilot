from abc import ABC, abstractmethod

from llm_queue.base.data_classes import (
    ModelPreferences,
    ScheduledRequest,
    TelemetryData,
    TopQueuedRequest,
)


class BaseLLMEntityLoadBalancer(ABC):
    """
    Abstract base class defining the interface for an LLM load balancer.
    This class is responsible for managing available LLM entities and handling errors.
    """

    @abstractmethod
    def has_available_llm(self, specific_llm_requried: str = None) -> bool | None:
        pass

    @abstractmethod
    def get_available_llm_id(
        self, num_llm_calls: float = 1.0, specific_llm_requried: str = None
    ) -> str:  # Return LLMConfig Id to use for current request
        pass

    @abstractmethod
    def register_error(self, llm_id: str):
        pass


class BaseRequestController(ABC):
    """
    Abstract Base class for all request executors used by LLM queue to execute a request.
    """

    @abstractmethod
    def process_request(
        self, req: dict, chosen_llm_ids: list[dict], telemetry_data: TelemetryData
    ) -> dict:
        """
        Called from LLM Queue whenever the resources for a queued request is available. This function should execute the
        request and return the response.

        Parameters:
            req: dict -> The request payload which was enqueued in LLM Queue
            chosen_llm_ids: list[dict] -> List of LLM configs that has been chosen to execute this request
            telemetry_data: TelemetryData -> Telemetry data object which should be used inside this function to set values of appropriate attributes
        """
        pass


class BaseResourceAvailabilityChecker(ABC):
    """
    Abstract base class that checks the availability of resources required for processing requests in LLM Queue
    """

    @abstractmethod
    def get_model_ids_if_available(
        self, model_pref: ModelPreferences
    ) -> list[str] | None:
        pass

    @abstractmethod
    def register_error(self, llm_ids: list[str]):
        pass


class BaseScheduler(ABC):
    """
    Abstract base class that defines the scheduling logic for requests in LLM Queue. Manages the addition, retrieval,
    and removal of requests from the queue.
    """

    @abstractmethod
    def add_request_to_wait_queue(self, request: ScheduledRequest):
        pass

    @abstractmethod
    def add_request(self, request: ScheduledRequest):
        pass

    @abstractmethod
    def pop_top_new_request(self) -> ScheduledRequest | None:
        pass

    @abstractmethod
    def pop_top_waiting_request(self) -> ScheduledRequest | None:
        pass

    @abstractmethod
    def has_request(self) -> bool:
        pass

    @abstractmethod
    def remove_request_by_id(self, req_id: str):
        pass

    @abstractmethod
    def get_top_requests_model_prefs(self) -> TopQueuedRequest:
        pass
