import os
import logging
from typing import Any
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core import Document
from llama_index.core.llms import ChatMessage
from llama_index.core.indices import load_index_from_storage
from typing import List, Dict, Optional
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.schema import NodeWithScore
import uuid
from rag_wrapper.base.base_vector_index_rag_ops import BaseVectorIndexRagOps


class InMemRagOps(BaseVectorIndexRagOps):
    """In-memory RAG operations using LlamaIndex."""

    _ERROR = ValueError(
        "Index Object is not defined. The `index_path` passed to the constructor doesn't contain the index files."
    )

    def __init__(self, index_path: str, emb_llm: Any, completion_llm: Any, **kwargs):
        """Initialize in-memory RAG operations with models and index path.

        Args:
            index_path: Path to store/load the index
            emb_llm: Embedding language model
            completion_llm: Completion language model
            **kwargs: Additional arguments passed to BaseRagOps (similarity_top_k, response_mode)
        """
        super().__init__(emb_llm, completion_llm, **kwargs)
        self.index_path = index_path
        # Index initialization is now handled by initiate_index() method

    async def persist_index(self):
        """Persist the index to disk."""
        if self.rag_index and hasattr(self.rag_index, "storage_context"):
            self.rag_index.storage_context.persist(persist_dir=self.index_path)
        else:
            self.logger.warning("No index to persist or index lacks storage context")

    async def initiate_index(self):
        """Load existing index from storage without creating a new one."""
        try:
            if await self.index_exists():
                self.logger.info(f"Loading existing index from {self.index_path}")
                self.storage_context = StorageContext.from_defaults(
                    persist_dir=self.index_path
                )
                self.rag_index = load_index_from_storage(
                    storage_context=self.storage_context,
                    embed_model=self.emb_llm,
                )
                self.logger.info("Successfully loaded existing index")
            else:
                self.logger.info(
                    f"No existing index found at {self.index_path}. Use create_index() to create a new index."
                )

        except Exception as e:
            self.logger.error(f"Failed to initialize index: {e}")
            raise

    async def index_exists(self) -> bool:
        """Check if folder contains index files (.json)."""
        if not os.path.exists(self.index_path):
            return False

        if not os.path.isdir(self.index_path):
            raise NotADirectoryError(
                f"The path '{self.index_path}' is not a directory."
            )

        return any(file.endswith(".json") for file in os.listdir(self.index_path))
