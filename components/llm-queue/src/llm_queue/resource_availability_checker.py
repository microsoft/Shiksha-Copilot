from llm_queue.base.base_classes import (
    BaseLLMEntityLoadBalancer,
    BaseResourceAvailabilityChecker,
)
from llm_queue.base.data_classes import ModelPreferences


# TODO: No need for separate load balancers for emb and LLM models. Can be just one.
class ResourceAvailabilityChecker(BaseResourceAvailabilityChecker):
    """
    A class to check the availability of resources for embedding and LLM models based on preferences.

    Attributes:
        embedding_llm_lb (BaseLLMEntityLoadBalancer): Load balancer for embedding models.
        llm_lb (BaseLLMEntityLoadBalancer): Load balancer for LLM models.
    """

    def __init__(
        self,
        embedding_llm_lb: BaseLLMEntityLoadBalancer,
        llm_lb: BaseLLMEntityLoadBalancer,
    ):
        """
        Initialize the ResourceAvailabilityChecker with embedding and LLM load balancers.

        Args:
            embedding_llm_lb (BaseLLMEntityLoadBalancer): Load balancer for embedding models.
            llm_lb (BaseLLMEntityLoadBalancer): Load balancer for LLM models.
        """
        self.embedding_llm_lb = embedding_llm_lb
        self.llm_lb = llm_lb

    def get_model_ids_if_available(
        self, model_pref: ModelPreferences
    ) -> list[str] | None:
        """
        Check if models specified in the preferences are available and return their IDs if available.

        Args:
            model_pref (ModelPreferences): Preferences specifying required models and configurations.

        Returns:
            list[str] | None: A list of available model IDs or None if models are not available.
        """
        # If neither embedding nor LLM model is required, return None immediately.
        if not model_pref.require_embedding_model and not model_pref.require_llm_model:
            return None

        # Initialize an empty list to hold model IDs.
        llms = []

        # Check if both embedding model and LLM model are required.
        if model_pref.require_embedding_model and model_pref.require_llm_model:
            # Check if both specific models are available.
            if self.embedding_llm_lb.has_available_llm(
                model_pref.specific_embedding_model
            ) and self.llm_lb.has_available_llm(model_pref.specific_llm_model):
                # Only if both are available, append their IDs to the list.
                llms.append(
                    self.embedding_llm_lb.get_available_llm_id(
                        model_pref.num_emb_calls_per_req,
                        model_pref.specific_embedding_model,
                    )
                )
                llms.append(
                    self.llm_lb.get_available_llm_id(
                        model_pref.num_llm_calls_per_req, model_pref.specific_llm_model
                    )
                )
            else:
                # If either model is not available, return None.
                return None
        elif model_pref.require_llm_model:
            # If only the LLM model is required, check its availability.
            if self.llm_lb.has_available_llm(model_pref.specific_llm_model):
                llms.append(
                    self.llm_lb.get_available_llm_id(
                        model_pref.num_llm_calls_per_req, model_pref.specific_llm_model
                    )
                )
            else:
                return None
        elif model_pref.require_embedding_model:
            if self.embedding_llm_lb.has_available_llm(
                model_pref.specific_embedding_model
            ):
                llms.append(
                    self.embedding_llm_lb.get_available_llm_id(
                        model_pref.num_emb_calls_per_req,
                        model_pref.specific_embedding_model,
                    )
                )
            else:
                return None

        return llms if llms else None

    def register_error(self, llm_ids: list[str]):
        """
        Register an error for the specified model IDs.

        Args:
            llm_ids (list[str]): A list containing the IDs of the models where errors occurred.
        """
        if len(llm_ids) == 2:
            self.embedding_llm_lb.register_error(llm_ids[0])
            self.llm_lb.register_error(llm_ids[1])
