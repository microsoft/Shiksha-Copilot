"""
Simple Property Graph RAG operations using in-memory storage.

This is a concrete implementation of BaseGraphIndexRagOps using SimplePropertyGraphStore
for local/in-memory property graph operations.
"""

import os
import logging
from typing import Any, List, Dict, Optional

from llama_index.core import StorageContext, PropertyGraphIndex
from llama_index.core.indices import load_index_from_storage
from llama_index.core.graph_stores import SimplePropertyGraphStore
from llama_index.core.llms import LLM
from llama_index.core.schema import TransformComponent
from rag_wrapper.base.base_graph_index_rag_ops import BaseGraphIndexRagOps


class InMemGraphRagOps(BaseGraphIndexRagOps):
    """
    In-Memory Property Graph RAG operations using in-memory storage.

    This implementation uses SimplePropertyGraphStore for local property graph storage
    and can optionally persist to disk.
    """

    def __init__(
        self,
        emb_llm: LLM,
        completion_llm: LLM,
        persist_dir: Optional[str] = None,
        kg_extractors: Optional[List[TransformComponent]] = None,
        **kwargs,
    ):
        """Initialize InMemGraphRagOps with optional persistence.

        Args:
            emb_llm: Embedding language model
            completion_llm: Completion language model
            persist_dir: Optional directory to persist the index
            **kwargs: Additional arguments passed to BaseGraphIndexRagOps
        """
        super().__init__(
            completion_llm=completion_llm,
            emb_llm=emb_llm,
            kg_extractors=kg_extractors,
            **kwargs,
        )
        self.persist_dir = persist_dir or "./inmem_graph_storage"

        # Initialize the simple property graph store
        self.property_graph_store = SimplePropertyGraphStore()

        # Setup storage context
        self.storage_context = StorageContext.from_defaults(
            property_graph_store=self.property_graph_store
        )

    async def persist_index(self):
        """Persist the property graph index to disk."""
        if not self.rag_index:
            self.logger.warning("No index to persist")
            return

        try:
            os.makedirs(self.persist_dir, exist_ok=True)
            self.rag_index.storage_context.persist(persist_dir=self.persist_dir)
            self.logger.info(f"Index persisted to {self.persist_dir}")
        except Exception as e:
            self.logger.error(f"Failed to persist index: {e}")
            raise

    async def initiate_index(self):
        """Initialize the property graph index from existing storage if it exists."""
        try:
            if await self.index_exists():
                # Load existing index from storage
                storage_context = StorageContext.from_defaults(
                    persist_dir=self.persist_dir,
                )

                self.rag_index = load_index_from_storage(
                    storage_context,
                    embed_model=self.emb_llm if self.embed_kg_nodes else None,
                    llm=self.completion_llm,
                    callback_manager=self._callback_manager,
                )

                self.storage_context = storage_context

                # Extract the property graph store from the loaded index
                if hasattr(self.rag_index, "property_graph_store"):
                    self.property_graph_store = self.rag_index.property_graph_store
                elif hasattr(self.storage_context, "property_graph_store"):
                    self.property_graph_store = (
                        self.storage_context.property_graph_store
                    )
                else:
                    # Fallback: create a new property graph store if none found
                    self.logger.warning(
                        "No property graph store found in loaded index, creating new one"
                    )
                    self.property_graph_store = SimplePropertyGraphStore()

                self.logger.info(f"Loaded existing index from {self.persist_dir}")
            else:
                # Index doesn't exist, just setup the storage context
                self.storage_context = StorageContext.from_defaults(
                    property_graph_store=self.property_graph_store
                )
                self.logger.info("Index doesn't exist, storage context initialized")

        except Exception as e:
            self.logger.error(f"Failed to initiate index: {e}")
            raise

    async def index_exists(self) -> bool:
        """Check if the property graph index exists in storage."""
        if not self.persist_dir:
            return False

        if not os.path.exists(self.persist_dir):
            return False

        if not os.path.isdir(self.persist_dir):
            raise NotADirectoryError(
                f"The path '{self.persist_dir}' is not a directory."
            )

        return any(file.endswith(".json") for file in os.listdir(self.persist_dir))
