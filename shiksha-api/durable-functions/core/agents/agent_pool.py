from typing import Dict, Type, TypeVar, Any

from core.agents.base_rag_agent import BaseRagAgent
from core.agents.gpt_agent import GPTAgent
from core.agents.in_mem_rag_agent import InMemRAGAgent
from core.agents.validator_agent import ValidatorAgent


# Generic type for agent classes
T = TypeVar("T")


class AgentPool:
    """
    Manages singleton instances of various agent types.

    This class provides a centralized way to access agent instances
    without creating multiple instances of the same agent type,
    which helps with resource management and consistency.
    """

    # Define which RAG Agent implementation to use - change this ONE line to switch implementations
    RAG_AGENT_CLASS = InMemRAGAgent

    # Dictionary to store agent instances
    _instances: Dict[Type, Any] = {}
    # Dictionary to store RAG agent instances by identifier
    _rag_instances: Dict[str, BaseRagAgent] = {}

    @classmethod
    def get_gpt_agent(cls) -> GPTAgent:
        """
        Returns a singleton instance of the GPTAgent.

        Returns:
            GPTAgent: A singleton instance of GPTAgent
        """
        return cls._get_agent(GPTAgent)

    @classmethod
    def get_rag_agent(cls, identifier: str = "default") -> BaseRagAgent:
        """
        Returns a singleton instance of a RAG agent for the given identifier.
        The specific implementation is determined by RAG_AGENT_CLASS.

        Args:
            identifier: String identifier for the RAG agent instance

        Returns:
            BaseRagAgent: A singleton instance of RAG agent for the given identifier
        """
        if identifier not in cls._rag_instances:
            cls._rag_instances[identifier] = cls.RAG_AGENT_CLASS(identifier)

        return cls._rag_instances[identifier]

    @classmethod
    def clear_rag_agent_resources(cls, identifier: str = "default"):
        """
        Clears resources associated with the RAG agent for the given identifier.

        This method calls the `clear_resources` method on the RAG agent instance
        corresponding to the provided identifier, if it exists.

        Args:
            identifier: String identifier for the RAG agent instance whose resources should be cleared.
        """
        if identifier in cls._rag_instances:
            cls._rag_instances[identifier].clear_resources()

    @classmethod
    def get_validator_agent(cls) -> ValidatorAgent:
        """
        Returns a singleton instance of the ValidatorAgent.

        Returns:
            ValidatorAgent: A singleton instance of ValidatorAgent
        """
        return cls._get_agent(ValidatorAgent)

    @classmethod
    def _get_agent(cls, agent_class: Type[T]) -> T:
        """
        Gets or creates a singleton instance of the specified agent class.

        Args:
            agent_class: The class of the agent to retrieve

        Returns:
            An instance of the specified agent class
        """
        if agent_class not in cls._instances:
            cls._instances[agent_class] = agent_class()

        return cls._instances[agent_class]
