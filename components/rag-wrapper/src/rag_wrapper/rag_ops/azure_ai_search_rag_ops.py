from typing import Any, Dict, Optional, List

import nest_asyncio
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.vector_stores.azureaisearch import (
    AzureAISearchVectorStore,
    IndexManagement,
)
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.search.documents.aio import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ResourceNotFoundError
from rag_wrapper.base.base_classes import BaseRagOps

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()


class AzureAISearchRagOps(BaseRagOps):
    """Azure AI Search RAG operations with managed identity support and automatic index management."""

    _ERROR = ValueError(
        "Azure AI Search index is not properly initialized. "
        "Please check your configuration and ensure the service is accessible."
    )

    def __init__(
        self,
        search_service_name: str,
        index_name: str,
        emb_llm: Any,
        completion_llm: Any,
        metadata_fields: Optional[Dict[str, str]] = None,
        api_key: Optional[str] = None,
        use_managed_identity: bool = True,
        vector_store_kwargs: Optional[Dict] = None,
        **kwargs,
    ):
        """Initialize Azure AI Search RAG operations with authentication and LLM models.

        Args:
            search_service_name: Name of the Azure AI Search service
            index_name: Name of the search index
            emb_llm: Embedding language model
            completion_llm: Completion language model
            api_key: Optional API key for authentication
            use_managed_identity: Whether to use managed identity for auth
            vector_store_kwargs: Additional vector store configuration
            **kwargs: Additional arguments passed to BaseRagOps (similarity_top_k, response_mode)
        """
        super().__init__(emb_llm, completion_llm, **kwargs)
        self.search_service_endpoint = (
            f"https://{search_service_name}.search.windows.net"
        )
        self.index_name = index_name
        self.api_key = api_key
        self.use_managed_identity = use_managed_identity
        self.vector_store_kwargs = vector_store_kwargs or {}
        self.metadata_fields = metadata_fields

        # Initialize components as None - will be set up in initiate_index
        self.vector_store = None

    async def index_exists(
        self,
    ) -> bool:
        try:
            index_client = SearchIndexClient(
                endpoint=self.search_service_endpoint,
                credential=self._get_credentials(),
            )

            # This will throw ResourceNotFoundError if the index doesn't exist
            await index_client.get_index(self.index_name)
            return True
        except ResourceNotFoundError:
            return False

    async def initiate_index(self):
        """Initialize Azure AI Search vector store and load the RAG index only if it already exists."""
        try:
            # Check if index exists
            index_exists = await self.index_exists()
            if not index_exists:
                self.logger.info(
                    f"Index {self.index_name} does not exist. Use create_index() to create a new index."
                )
                # Set up storage context but don't create an index
                client = SearchIndexClient(
                    endpoint=self.search_service_endpoint,
                    credential=self._get_credentials(),
                )

                vector_store_config = {
                    "search_or_index_client": client,
                    "id_field_key": "id",
                    "chunk_field_key": "chunk",
                    "embedding_field_key": "embedding",
                    "doc_id_field_key": "doc_id",
                    "metadata_string_field_key": "metadata",
                    "filterable_metadata_field_keys": self.metadata_fields,
                    "index_management": IndexManagement.CREATE_IF_NOT_EXISTS,
                    "embedding_dimensionality": 1536,  # Default for OpenAI embeddings
                    **self.vector_store_kwargs,
                }

                if "index_name" not in vector_store_config:
                    vector_store_config["index_name"] = self.index_name

                self.vector_store = AzureAISearchVectorStore(**vector_store_config)
                self.storage_context = StorageContext.from_defaults(
                    vector_store=self.vector_store
                )
                return

            # If index exists, connect to it
            client = SearchClient(
                endpoint=self.search_service_endpoint,
                index_name=self.index_name,
                credential=self._get_credentials(),
            )

            self.logger.info(
                "Connecting to existing index with client type: %s", type(client)
            )

            # Initialize the Azure AI Search vector store
            vector_store_config = {
                "search_or_index_client": client,
                "id_field_key": "id",
                "chunk_field_key": "chunk",
                "embedding_field_key": "embedding",
                "doc_id_field_key": "doc_id",
                "metadata_string_field_key": "metadata",
                "filterable_metadata_field_keys": self.metadata_fields,
                "index_management": IndexManagement.VALIDATE_INDEX,
                "embedding_dimensionality": 1536,  # Default for OpenAI embeddings
                **self.vector_store_kwargs,
            }

            self.vector_store = AzureAISearchVectorStore(**vector_store_config)

            # Create storage context
            self.storage_context = StorageContext.from_defaults(
                vector_store=self.vector_store
            )

            # Load the existing index
            self.rag_index = VectorStoreIndex.from_documents(
                [],
                storage_context=self.storage_context,
                embed_model=self.emb_llm,
            )

            self.logger.info(
                f"Successfully connected to existing Azure AI Search index: {self.index_name}"
            )

        except Exception as e:
            self.logger.error(
                f"Failed to initialize Azure AI Search RAG operations: {e}"
            )
            raise

    async def persist_index(self):
        """No-op as Azure AI Search automatically persists the index."""
        # Index automatically persisted to Azure AI Search service - no action needed
        pass

    def _get_credentials(self):
        # Set up authentication
        if self.use_managed_identity and not self.api_key:
            # Use managed identity for secure authentication
            credential = DefaultAzureCredential()
            self.logger.info(
                "Using Managed Identity for Azure AI Search authentication"
            )
        elif self.api_key:
            # Use API key authentication
            credential = AzureKeyCredential(self.api_key)
            self.logger.info("Using API key for Azure AI Search authentication")
        else:
            raise ValueError(
                "Either provide an API key or enable managed identity authentication"
            )

        return credential
