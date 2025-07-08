import abc
import os
import tempfile
from typing import Dict, Union, Any

from core.blob_store import BlobStore
from core.models.workflow_models import RAGInput


class BaseRagAgent(abc.ABC):
    """
    Abstract base class for RAG agents.

    This class defines the interface for all RAG (Retrieval-Augmented Generation) agents
    and provides common functionality such as resource cleanup.
    """

    @abc.abstractmethod
    async def generate(self, rag_input: RAGInput) -> Union[str, Dict]:
        """
        Generates content using Retrieval-Augmented Generation (RAG).

        This method must be implemented by all derived classes.

        Args:
            rag_input (RAGInput): Input containing the index path, retrieval query, and synthesis query.

        Returns:
            Union[str, Dict]: The generated content, either as a JSON object or a string.
        """
        pass

    @abc.abstractmethod
    def clear_resources(self) -> None:
        """
        Clears any resources used by the RAG agent, such as downloaded RAG indexes.

        This method must be implemented by all derived classes.
        """
        pass
