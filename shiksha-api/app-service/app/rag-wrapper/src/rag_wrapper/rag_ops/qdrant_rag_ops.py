from typing import Any, Dict, Optional, List
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.llms import LLM
from llama_index.vector_stores.qdrant.base import QdrantVectorStore
from rag_wrapper.base.base_vector_index_rag_ops import BaseVectorIndexRagOps
from rag_wrapper.utils.qdrant import QdrantUtils


class QdrantRagOps(BaseVectorIndexRagOps):
    """Qdrant RAG operations for vector database.

    Delegates all qdrant-client specific functionality to `QdrantUtils` so this
    class focuses on RAG-specific initialization, index loading, and query
    orchestration.
    """

    _ERROR = ValueError(
        "Qdrant index is not properly initialized. "
        "Please check your configuration and ensure the service is accessible."
    )

    def __init__(
        self,
        url: str = "http://localhost:6333",
        collection_name: str = "default",
        emb_llm: LLM = None,
        completion_llm: LLM = None,
        api_key: Optional[str] = None,
        vector_store_kwargs: Optional[Dict] = None,
        payload_fields: Optional[List[str]] = None,
        **kwargs,
    ):
        super().__init__(completion_llm, emb_llm, **kwargs)
        self.url = url
        self.collection_name = collection_name
        self.api_key = api_key
        self.vector_store_kwargs = vector_store_kwargs or {}
        self.payload_fields = payload_fields or []
        self.vector_store = None

        # Utility that encapsulates qdrant-client interactions
        self.qdrant_utils = QdrantUtils(
            url=self.url,
            collection_name=self.collection_name,
            api_key=self.api_key,
            payload_fields=self.payload_fields,
            vector_store_kwargs=self.vector_store_kwargs,
            logger=self.logger,
        )

    async def index_exists(self) -> bool:
        """Check if the Qdrant collection exists using the utils async client."""
        return await self.qdrant_utils.index_exists()

    async def initiate_index(self):
        """Initialize Qdrant vector store and load the RAG index only if it already exists.

        If the collection does not exist this will create it (using the embedding
        LLM to determine vector dimension) and initialize the vector store but not
        create an in-memory RAG index. If the collection exists it will connect
        and load the VectorStoreIndex.
        """
        try:
            index_exists = await self.index_exists()
            if not index_exists:
                self.logger.info(
                    f"Collection {self.collection_name} does not exist. Use create_index() to create a new collection."
                )
                # Create the collection based on the embedding dimension
                probe_vec = self.emb_llm.get_text_embedding("dim-probe")
                dim = len(probe_vec)
                self.qdrant_utils.create_collection(dim)

                # Set up storage context but don't create an index
                vector_store_config = self.qdrant_utils.get_vector_store_config()
                self.vector_store = QdrantVectorStore(**vector_store_config)
                self.storage_context = StorageContext.from_defaults(
                    vector_store=self.vector_store
                )
                return

            # If collection exists, connect to it
            self.logger.info(
                f"Connecting to existing Qdrant collection: {self.collection_name}"
            )

            vector_store_config = self.qdrant_utils.get_vector_store_config()
            self.vector_store = QdrantVectorStore(**vector_store_config)
            self.storage_context = StorageContext.from_defaults(
                vector_store=self.vector_store
            )
            self.rag_index = VectorStoreIndex.from_vector_store(
                vector_store=self.vector_store,
                embed_model=self.emb_llm,
            )
            self.logger.info(
                f"Successfully connected to existing Qdrant collection: {self.collection_name}"
            )
        except Exception as e:
            self.logger.error(f"Failed to initialize Qdrant RAG operations: {e}")
            raise

    async def persist_index(self):
        """No-op as Qdrant automatically persists the index."""
        pass

    def _to_qdrant_filter(self, metadata_filter: Dict[str, Any]):
        """Delegate filter conversion to utils for compatibility."""
        return self.qdrant_utils.to_qdrant_filter(metadata_filter)

    async def _prequery_filter_guard(
        self, metadata_filter: Optional[Dict[str, Any]]
    ) -> None:
        """Delegate prequery existence guard to utils."""
        return await self.qdrant_utils.prequery_filter_guard(metadata_filter)
