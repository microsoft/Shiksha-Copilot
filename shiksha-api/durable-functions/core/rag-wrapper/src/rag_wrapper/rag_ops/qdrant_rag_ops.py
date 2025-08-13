from typing import Dict, Optional, Union
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.llms import LLM
from llama_index.vector_stores.qdrant.base import QdrantVectorStore, DEFAULT_DENSE_VECTOR_NAME
from qdrant_client.http.models import VectorParams, Distance
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
            **kwargs: Additional arguments passed to BaseRagOps (similarity_top_k, response_mode)
        """
        super().__init__(completion_llm, emb_llm, **kwargs)
        self.url = url
        self.collection_name = collection_name
        self.api_key = api_key
        self.vector_store_kwargs = vector_store_kwargs or {}
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
