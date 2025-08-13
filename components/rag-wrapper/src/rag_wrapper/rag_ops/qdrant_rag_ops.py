from typing import Any, Dict, Optional, Union, List
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.llms import LLM
from llama_index.vector_stores.qdrant.base import QdrantVectorStore, DEFAULT_DENSE_VECTOR_NAME
from qdrant_client.http.models import VectorParams, Distance, PayloadSchemaType, Filter as QFilter, FieldCondition, MatchValue
from qdrant_client import QdrantClient, AsyncQdrantClient
from rag_wrapper.base.base_vector_index_rag_ops import BaseVectorIndexRagOps

class QdrantRagOps(BaseVectorIndexRagOps):
    """Qdrant RAG operations for vector database.
    
    Supports both synchronous and asynchronous Qdrant clients by providing
    both client types to the QdrantVectorStore for maximum flexibility.
    Uses async client for index existence checks.
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
        """Initialize Qdrant RAG operations with authentication and LLM models.

        Args:
            url: Qdrant service URL (e.g., http://localhost:6333)
            collection_name: Name of the Qdrant collection
            emb_llm: Embedding language model
            completion_llm: Completion language model
            api_key: Optional API key for authentication
            vector_store_kwargs: Additional vector store configuration
            payload_fields: Optional list of payload field names to create indexes for.
                           All fields will use "keyword" schema type for exact matching filters.
                           These indexes enable efficient filtering on metadata fields.
            **kwargs: Additional arguments passed to BaseRagOps (similarity_top_k, response_mode)
        """
        super().__init__(completion_llm, emb_llm, **kwargs)
        self.url = url
        self.collection_name = collection_name
        self.api_key = api_key
        self.vector_store_kwargs = vector_store_kwargs or {}
        self.payload_fields = payload_fields or []
        self.vector_store = None

    def _create_sync_client(self) -> QdrantClient:
        """Create a synchronous Qdrant client."""
        return QdrantClient(
            url=self.url,
            api_key=self.api_key,
        )

    def _create_async_client(self) -> AsyncQdrantClient:
        """Create an asynchronous Qdrant client."""
        return AsyncQdrantClient(
            url=self.url,
            api_key=self.api_key,
        )

    def _get_vector_store_config(self) -> Dict:
        """Get the vector store configuration with both sync and async clients."""
        base_config = {
            "collection_name": self.collection_name,
            "client": self._create_sync_client(),
            "aclient": self._create_async_client(),
            "dense_vector_name": DEFAULT_DENSE_VECTOR_NAME,
            **self.vector_store_kwargs,
        }
        
        return base_config

    def _create_payload_indexes(self, client: QdrantClient):
        """Create payload indexes for the specified fields.
        
        Creates keyword-type indexes for all fields in self.payload_fields to enable
        efficient exact matching filters on metadata fields.
        
        Args:
            client: Synchronous Qdrant client to use for index creation
        """
        if not self.payload_fields:
            return
            
        for field_name in self.payload_fields:
            try:
                client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=PayloadSchemaType.KEYWORD
                )
                self.logger.info(f"Created keyword payload index for field: {field_name}")
            except Exception as e:
                self.logger.warning(f"Failed to create payload index for field {field_name}: {e}")

    async def index_exists(self) -> bool:
        """Check if the Qdrant collection exists using async client."""
        try:
            client = self._create_async_client()
            collections = await client.get_collections()
            collection_names = [c.name for c in collections.collections]
            exists = self.collection_name in collection_names
            
            self.logger.info(f"Qdrant collection '{self.collection_name}' exists: {exists}")
            return exists
        except Exception as e:
            self.logger.error(f"Error checking Qdrant collection existence: {e}")
            return False

    async def initiate_index(self):
        """Initialize Qdrant vector store and load the RAG index only if it already exists."""
        try:
            index_exists = await self.index_exists()
            if not index_exists:
                self.logger.info(
                    f"Collection {self.collection_name} does not exist. Use create_index() to create a new collection."
                )
                # Create the collection
                client = self._create_sync_client()
                probe_vec = self.emb_llm.get_text_embedding("dim-probe")
                dim = len(probe_vec)
                client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config={
                        DEFAULT_DENSE_VECTOR_NAME: VectorParams(size=dim, distance=Distance.COSINE)
                    },
                )
                
                # Create payload indexes for filtering
                self._create_payload_indexes(client)
                
                # Set up storage context but don't create an index
                vector_store_config = self._get_vector_store_config()
                self.vector_store = QdrantVectorStore(**vector_store_config)
                self.storage_context = StorageContext.from_defaults(
                    vector_store=self.vector_store
                )
                return

            # If collection exists, connect to it
            self.logger.info(
                f"Connecting to existing Qdrant collection: {self.collection_name}"
            )
            
            vector_store_config = self._get_vector_store_config()
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
            self.logger.error(
                f"Failed to initialize Qdrant RAG operations: {e}"
            )
            raise

    async def persist_index(self):
        """No-op as Qdrant automatically persists the index."""
        pass

    def _to_qdrant_filter(self, metadata_filter: Dict[str, Any]) -> QFilter:
        # Exact-match map (you already build ExactMatchFilter upstream)
        return QFilter(
            must=[
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in metadata_filter.items()
            ]
        )

    async def _prequery_filter_guard(self, metadata_filter: Optional[Dict[str, Any]]) -> None:
        if not metadata_filter:
            return
        aclient = self._create_async_client()
        qf = self._to_qdrant_filter(metadata_filter)

        # Fast existence check: scroll 1 point by filter only (no vectors/payload)
        points, _ = await aclient.scroll(
            collection_name=self.collection_name,
            scroll_filter=qf,
            with_payload=False,
            with_vectors=False,
            limit=1,
        )
        if not points:
            raise ValueError(f"No data matches metadata filter: {metadata_filter}")
