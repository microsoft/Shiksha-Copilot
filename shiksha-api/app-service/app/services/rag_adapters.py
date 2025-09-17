"""
RAG adapter classes for handling different types of RAG operations.

This module provides an extensible architecture for supporting multiple RAG backends
like InMemRagOps and QdrantRagOps through a common interface.
"""

import os
import logging
import tempfile
from abc import ABC, abstractmethod
from typing import List, Optional, Union
from app.config import settings
from app.utils.blob_store import BlobStore
from rag_wrapper import InMemRagOps, QdrantRagOps
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.llms import ChatMessage
from app.config import settings

logger = logging.getLogger(__name__)


class BaseRagAdapter(ABC):
    """Abstract base class for RAG adapters."""

    def __init__(
        self,
        completion_llm: AzureOpenAI,
        embedding_llm: AzureOpenAIEmbedding,
        metadata_filter: dict = None,
    ):
        """
        Initialize the base RAG adapter.

        Args:
            completion_llm: Azure OpenAI completion model instance
            embedding_llm: Azure OpenAI embedding model instance
            metadata_filter: optional metadata filter to apply while retrieval
        """
        self.completion_llm = completion_llm
        self.embedding_llm = embedding_llm
        self.metadata_filter = metadata_filter
        self._rag_ops: Optional[Union[InMemRagOps, QdrantRagOps]] = None

    @abstractmethod
    async def initialize(self) -> Union[InMemRagOps, QdrantRagOps]:
        """
        Initialize and return the RAG operations instance.

        Returns:
            Union[InMemRagOps, QdrantRagOps]: The initialized RAG operations instance
        """
        pass

    @abstractmethod
    async def initiate_index(self) -> None:
        """
        Initiate the index by downloading files or preparing the index.
        This method handles any setup required before the index can be used.
        """
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        """Clean up any resources used by the adapter."""
        pass

    @property
    def rag_ops(self) -> Union[InMemRagOps, QdrantRagOps]:
        """Get the RAG operations instance."""
        if self._rag_ops is None:
            raise RuntimeError("RAG adapter not initialized. Call initialize() first.")
        return self._rag_ops

    async def chat_with_index(
        self, curr_message: str, chat_history: List[ChatMessage]
    ) -> str:
        """
        Chat with the RAG index.

        Args:
            curr_message: Current user message
            chat_history: List of previous chat messages

        Returns:
            str: Response from the RAG system
        """
        return await self.rag_ops.chat_with_index(
            curr_message, chat_history, metadata_filter=self.metadata_filter
        )

    async def index_exists(self) -> bool:
        """Check if the index exists."""
        return await self.rag_ops.index_exists()


class InMemRagOpsAdapter(BaseRagAdapter):
    """Adapter for InMemRagOps that handles blob storage downloads."""

    def __init__(
        self,
        completion_llm: AzureOpenAI,
        embedding_llm: AzureOpenAIEmbedding,
        index_path: str,
    ):
        """
        Initialize the InMemRagOps adapter.

        Args:
            completion_llm: Azure OpenAI completion model instance
            embedding_llm: Azure OpenAI embedding model instance
            index_path: Path to the RAG index in blob storage
        """
        super().__init__(completion_llm, embedding_llm)
        self.index_path = index_path
        self._blob_store = BlobStore()
        self.persist_dir = os.path.join(
            tempfile.gettempdir(), index_path.replace("/", "_")
        )

    async def initialize(self) -> InMemRagOps:
        """
        Initialize the InMemRagOps instance.

        Returns:
            InMemRagOps: The initialized InMemRagOps instance
        """
        if self._rag_ops is None:
            self._rag_ops = InMemRagOps(
                persist_dir=self.persist_dir,
                completion_llm=self.completion_llm,
                emb_llm=self.embedding_llm,
            )
        return self._rag_ops

    async def initiate_index(self) -> None:
        """
        Initiate the index by downloading files from blob storage if needed.
        """
        index_exists = await self.index_exists()
        if not index_exists:
            logger.info(f"Downloading RAG index from blob storage: {self.index_path}")

            downloaded_file_paths = await self._blob_store.download_blobs_to_folder(
                prefix=self.index_path, target_folder=self.persist_dir
            )

            if not downloaded_file_paths:
                raise RuntimeError(
                    f"No files downloaded for index path: {self.index_path}"
                )

            logger.info(f"Downloaded {len(downloaded_file_paths)} index files")
            file_paths_str = "\n".join(downloaded_file_paths)
            logger.info(f"Downloaded RAG index files: {file_paths_str}")
        else:
            logger.debug(f"Index already exists at: {self.persist_dir}")

    async def cleanup(self) -> None:
        """Clean up downloaded index files."""
        if os.path.exists(self.persist_dir):
            import shutil

            try:
                shutil.rmtree(self.persist_dir)
                logger.info(f"Cleaned up index files at: {self.persist_dir}")
            except Exception as e:
                logger.error(
                    f"Failed to clean up index files at {self.persist_dir}: {e}"
                )


class QdrantRagOpsAdapter(BaseRagAdapter):
    """Adapter for QdrantRagOps that handles Qdrant-specific operations."""

    def __init__(
        self,
        completion_llm: AzureOpenAI,
        embedding_llm: AzureOpenAIEmbedding,
        index_path: str,
    ):
        """
        Initialize the QdrantRagOps adapter.

        Args:
            completion_llm: Azure OpenAI completion model instance
            embedding_llm: Azure OpenAI embedding model instance
            index_path: Path to the Qdrant collection/index in format "qdrant/collection_name/key:value"
        """
        self.index_path = index_path
        # Parse index_path to extract collection name and metadata filter
        [_, qdrant_collection, metadata_filter_key_val] = index_path.split("/", 2)
        [key, val] = metadata_filter_key_val.split(":", 1)
        self.collection_name = qdrant_collection
        super().__init__(completion_llm, embedding_llm, metadata_filter={key: val})

    async def initialize(self) -> QdrantRagOps:
        """
        Initialize the QdrantRagOps instance.

        Returns:
            QdrantRagOps: The initialized QdrantRagOps instance
        """
        if self._rag_ops is None:
            self._rag_ops = QdrantRagOps(
                collection_name=self.collection_name,
                completion_llm=self.completion_llm,
                emb_llm=self.embedding_llm,
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key,
                similarity_top_k=5,
            )
        return self._rag_ops

    async def initiate_index(self) -> None:
        """
        Initiate the Qdrant index.

        For QdrantRagOps, no local file downloads are needed as it works with remote Qdrant instances.
        This method is implemented for interface compliance but performs no operations.
        """
        pass

    async def cleanup(self) -> None:
        """Clean up Qdrant resources if needed."""
        # QdrantRagOps typically doesn't require local file cleanup
        # as it works with remote Qdrant instances
        pass


class RagAdapterFactory:
    """Factory class for creating appropriate RAG adapters."""

    @staticmethod
    def create_adapter(
        index_path: str,
        completion_llm: AzureOpenAI,
        embedding_llm: AzureOpenAIEmbedding,
    ) -> BaseRagAdapter:
        """
        Create the appropriate RAG adapter based on the index path.

        Args:
            index_path: Path to the RAG index
            completion_llm: Azure OpenAI completion model instance
            embedding_llm: Azure OpenAI embedding model instance

        Returns:
            BaseRagAdapter: The appropriate RAG adapter instance
        """
        if "qdrant" in index_path.lower():
            logger.debug(f"Creating QdrantRagOpsAdapter for index: {index_path}")
            return QdrantRagOpsAdapter(completion_llm, embedding_llm, index_path)
        else:
            logger.debug(f"Creating InMemRagOpsAdapter for index: {index_path}")
            return InMemRagOpsAdapter(completion_llm, embedding_llm, index_path)
