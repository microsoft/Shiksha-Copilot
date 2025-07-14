import os
import logging
from typing import Any
from llama_index.core import StorageContext
from llama_index.core.indices import load_index_from_storage
from llama_index.core.llms import LLM
from rag_wrapper.base.base_vector_index_rag_ops import BaseVectorIndexRagOps


class InMemRagOps(BaseVectorIndexRagOps):
    """In-memory RAG operations using LlamaIndex."""

    _ERROR = ValueError(
        "Index Object is not defined. The `persist_dir` passed to the constructor doesn't contain the index files."
    )

    def __init__(self, persist_dir: str, emb_llm: LLM, completion_llm: LLM, **kwargs):
        """Initialize in-memory RAG operations with models and index path.

        Args:
            persist_dir: Path to store/load the index
            emb_llm: Embedding language model
            completion_llm: Completion language model
            **kwargs: Additional arguments passed to BaseRagOps (similarity_top_k, response_mode)
        """
        super().__init__(completion_llm=completion_llm, emb_llm=emb_llm, **kwargs)
        self.persist_dir = persist_dir

    async def persist_index(self):
        """Persist the index to disk."""
        if self.rag_index and hasattr(self.rag_index, "storage_context"):
            self.rag_index.storage_context.persist(persist_dir=self.persist_dir)
        else:
            self.logger.warning("No index to persist or index lacks storage context")

    async def initiate_index(self):
        """Load existing index from storage without creating a new one."""
        try:
            if await self.index_exists():
                self.logger.info(f"Loading existing index from {self.persist_dir}")
                self.storage_context = StorageContext.from_defaults(
                    persist_dir=self.persist_dir
                )
                self.rag_index = load_index_from_storage(
                    storage_context=self.storage_context,
                    embed_model=self.emb_llm,
                    callback_manager=self._callback_manager,
                )
                self.logger.info("Successfully loaded existing index")
            else:
                self.logger.info(
                    f"No existing index found at {self.persist_dir}. Use create_index() to create a new index."
                )

        except Exception as e:
            self.logger.error(f"Failed to initialize index: {e}")
            raise

    async def index_exists(self) -> bool:
        """Check if folder contains index files (.json)."""
        if not os.path.exists(self.persist_dir):
            return False

        if not os.path.isdir(self.persist_dir):
            raise NotADirectoryError(
                f"The path '{self.persist_dir}' is not a directory."
            )

        return any(file.endswith(".json") for file in os.listdir(self.persist_dir))
