"""
Simple Property Graph RAG operations using in-memory storage.
"""

import logging
from typing import Any, List, Dict, Optional

from llama_index.core import StorageContext
from llama_index.graph_stores.neo4j import Neo4jPropertyGraphStore
from llama_index.vector_stores.qdrant.base import (
    QdrantVectorStore,
)
from llama_index.core.llms import LLM
from llama_index.core.schema import TransformComponent
from rag_wrapper.base.base_graph_index_rag_ops import BaseGraphIndexRagOps
from rag_wrapper.utils.qdrant import QdrantUtils


class Neo4jQdrantGraphRagOps(BaseGraphIndexRagOps):
    """
    Property Graph RAG operations using Neo4j and Qdrant.

    This implementation uses Neo4jPropertyGraphStore for property graph storage and Qdrant as the vector store.
    """

    def __init__(
        self,
        emb_llm: LLM,
        completion_llm: LLM,
        qdrant_url: str = "http://localhost:6333",
        qdrant_api_key: str = None,
        qdrant_collection_name: str = "default",
        neo4j_url: str = "bolt://localhost:7687",
        neo4j_user: str = "neo4j",
        neo4j_password: str = "password",
        neo4j_clear_database: Optional[bool] = False,
        kg_extractors: Optional[List[TransformComponent]] = None,
        **kwargs,
    ):
        """
        Initialize Neo4jQdrantGraphRagOps with Neo4j and Qdrant configuration.

        Args:
            emb_llm: Embedding language model instance.
            completion_llm: Completion language model instance.
            qdrant_url: Qdrant server URL.
            qdrant_api_key: Qdrant API key (optional).
            qdrant_collection_name: Name of the Qdrant collection to use.
            neo4j_url: Neo4j server URL.
            neo4j_user: Username for Neo4j authentication.
            neo4j_password: Password for Neo4j authentication.
            neo4j_clear_database: Whether to clear the Neo4j database on init (not used here).
            kg_extractors: Optional list of knowledge graph extractors.
            **kwargs: Additional arguments for the base class.
        """
        super().__init__(
            completion_llm=completion_llm,
            emb_llm=emb_llm,
            kg_extractors=kg_extractors,
            **kwargs,
        )

        self.property_graph_store = Neo4jPropertyGraphStore(
            username=neo4j_user,
            password=neo4j_password,
            url=neo4j_url,
        )

        # QdrantUtils encapsulates qdrant-client details and vector store configuration
        self.qdrant_utils = QdrantUtils(
            url=qdrant_url,
            collection_name=qdrant_collection_name,
            api_key=qdrant_api_key,
            logger=self.logger,
        )

        self.vector_store = QdrantVectorStore(
            **self.qdrant_utils.get_vector_store_config()
        )

        self.storage_context = StorageContext.from_defaults(
            property_graph_store=self.property_graph_store,
            vector_store=self.vector_store,
        )

    async def persist_index(self):
        """
        Persist the property graph index to disk.
        (Not implemented for Neo4j/Qdrant setup; override if persistence is needed.)
        """
        pass

    async def initiate_index(self):
        """
        Initialize the property graph index from existing storage if it exists.
        Loads the index from Neo4j and Qdrant if the Qdrant collection exists.
        """
        try:
            if await self.index_exists():
                # Load RAG index from existing Neo4j and Qdrant stores
                self.from_existing_graph_store(
                    self.property_graph_store, self.vector_store
                )
                self.logger.info("Loaded existing index")
        except Exception as e:
            self.logger.error(f"Failed to initiate index: {e}")
            raise

    async def index_exists(self) -> bool:
        """
        Check if the Qdrant collection exists using the QdrantUtils async client.
        Returns:
            bool: True if the Qdrant collection exists, False otherwise.
        """
        return await self.qdrant_utils.index_exists()
