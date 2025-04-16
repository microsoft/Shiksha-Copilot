import time
from llm_queue.base.base_classes import BaseLLMEntityLoadBalancer
from llm_queue.base.config_data_classes import AzureAOIModels
from llm_queue.base.custom_errors import ResourceAvailabilityError
import logging


class EvenlySpacedRequestLB(BaseLLMEntityLoadBalancer):
    """
    A load balancer that evenly spaces requests to LLM entities based on configuration.

    Attributes:
        llm_configs (list[AzureAOIModels]): List of LLM configurations.
        last_selected_index (int): Index of the last selected LLM.
        llm_entity_last_error_time_map (dict): Tracks the last error time for each LLM.
        llm_entity_last_request_metadata_map (dict): Tracks the last request time and number of calls for each LLM.
    """

    def __init__(self, llm_configs: list[AzureAOIModels]):
        """
        Initialize the load balancer with LLM configurations.

        Args:
            llm_configs (list[AzureAOIModels]): List of LLM configuration objects.
        """
        self.logging = logging.getLogger(__name__)
        self.llm_configs = llm_configs
        self.last_selected_index = -1
        self.llm_entity_last_error_time_map = {}
        self.llm_entity_last_request_metadata_map = {}

    def disconnect(self):
        """
        Clean up resources used by the load balancer.
        """
        self.logging.info("CLOSING IN MEM LOAD BALANCER")

    def __update_last_error_time(self, llm_entity_id: str):
        """
        Update the last error time for a specific LLM.

        Args:
            llm_entity_id (str): The unique identifier of the LLM.
        """
        current_time = time.time()
        self.llm_entity_last_error_time_map[llm_entity_id] = current_time

    def __get_last_error_time(self, llm_entity_id: str):
        """
        Get the last error time for a specific LLM.

        Args:
            llm_entity_id (str): The unique identifier of the LLM.

        Returns:
            float | None: The last error time, or None if not available.
        """
        return self.llm_entity_last_error_time_map.get(llm_entity_id)

    def __update_last_request_metadata(
        self, llm_entity_id: str, num_llm_calls: float = 1.0
    ):
        """
        Update the last request metadata for a specific LLM.

        Args:
            llm_entity_id (str): The unique identifier of the LLM.
            num_llm_calls (float): The number of LLM calls made in the request.
        """
        current_time = time.time()
        self.llm_entity_last_request_metadata_map[llm_entity_id] = (
            current_time,
            num_llm_calls,
        )

    def __get_last_request_metadata(self, llm_entity_id: str):
        """
        Get the last request metadata for a specific LLM.

        Args:
            llm_entity_id (str): The unique identifier of the LLM.

        Returns:
            tuple: A tuple containing the last request time and number of calls.
        """
        return self.llm_entity_last_request_metadata_map.get(llm_entity_id, (0, 1))

    def __get_minimum_interval(
        self, llm_entity: AzureAOIModels, num_llm_calls: float = 1.0
    ):
        """
        Calculate the minimum interval between requests for a specific LLM.

        Args:
            llm_entity (AzureAOIModels): The LLM configuration object.
            num_llm_calls (float): The number of LLM calls to consider.

        Returns:
            float: The minimum interval in seconds.
        """
        return (60 / llm_entity.req_per_min) * num_llm_calls

    def __is_request_allowed(self, llm_entity: AzureAOIModels):
        """
        Check if a request is allowed for a specific LLM.

        Args:
            llm_entity (AzureAOIModels): The LLM configuration object.

        Returns:
            bool: True if the request is allowed, False otherwise.
        """
        curr_time = time.time()
        last_error_time = self.__get_last_error_time(llm_entity.unique_model_id)
        if (
            last_error_time
            and (curr_time - last_error_time) < llm_entity.error_backoff_in_seconds
        ):
            return False

        last_request_time, num_llm_calls = self.__get_last_request_metadata(
            llm_entity.unique_model_id
        )
        min_interval = self.__get_minimum_interval(llm_entity, num_llm_calls)
        return curr_time - last_request_time >= min_interval

    def __get_next_available_llm_index(self):
        """
        Get the index of the next available LLM based on load balancing logic.

        Returns:
            int | None: The index of the available LLM, or None if none are available.
        """
        for i in range(len(self.llm_configs)):
            index = (self.last_selected_index + 1 + i) % len(self.llm_configs)
            llm_entity = self.llm_configs[index]
            if self.__is_request_allowed(llm_entity):
                return index
        return None

    def __get_index_of_llm_if_available(self, llm_id: str):
        """
        Get the index of a specific LLM if it is available.

        Args:
            llm_id (str): The unique identifier of the LLM.

        Returns:
            int | None: The index of the LLM, or None if not available.

        Raises:
            ResourceAvailabilityError: If the LLM ID is not found in the load balancer.
        """
        has_found_llm = False
        for index, config in enumerate(self.llm_configs):
            if config.unique_model_id == llm_id:
                has_found_llm = True
                if self.__is_request_allowed(config):
                    return index
        if not has_found_llm:
            raise ResourceAvailabilityError(
                f"SPECIFIED LLM ID: {llm_id} is not present in the load balancer. Please check with the LLM Config provided."
            )
        return None

    def has_available_llm(self, specific_llm_requried: str = None) -> bool | None:
        """
        Check if an available LLM exists, optionally filtering by a specific LLM ID.

        Args:
            specific_llm_requried (str, optional): The unique identifier of the LLM. Defaults to None.

        Returns:
            bool | None: True if an available LLM exists, False otherwise.
        """
        if specific_llm_requried is None:
            index = self.__get_next_available_llm_index()
        else:
            index = self.__get_index_of_llm_if_available(specific_llm_requried)
        return index is not None

    def get_available_llm_id(
        self, num_llm_calls: float = 1.0, specific_llm_requried: str = None
    ) -> str | None:
        """
        Get the unique identifier of an available LLM.

        Args:
            num_llm_calls (float, optional): The number of LLM calls for this request. Defaults to 1.0.
            specific_llm_requried (str, optional): The unique identifier of the LLM. Defaults to None.

        Returns:
            str | None: The unique identifier of the selected LLM, or None if no LLM is available.
        """
        if specific_llm_requried is None:
            index = self.__get_next_available_llm_index()
        else:
            index = self.__get_index_of_llm_if_available(specific_llm_requried)
        if index is not None:
            self.last_selected_index = index
            selected_llm_config = self.llm_configs[self.last_selected_index]
            self.__update_last_request_metadata(
                selected_llm_config.unique_model_id, num_llm_calls
            )
            return selected_llm_config.unique_model_id
        return None

    def register_error(self, llm_id: str):
        """
        Register an error for a specific LLM.

        Args:
            llm_id (str): The unique identifier of the LLM.
        """
        self.__update_last_error_time(llm_id)
