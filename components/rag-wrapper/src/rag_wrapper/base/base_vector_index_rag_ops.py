import logging
import uuid
from abc import ABC, abstractmethod
from typing import Any, List, Dict, Optional

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    retry_if_result,
)

from llama_index.core.chat_engine.types import ChatMode
from llama_index.core import (
    StorageContext,
    VectorStoreIndex,
    Document,
    Settings,
    get_response_synthesizer,
)
from llama_index.core.indices.base import BaseIndex
from llama_index.core.llms import ChatMessage, LLM
from llama_index.core.schema import TransformComponent
from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter
from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
import traceback
from llama_index.core.response_synthesizers import (
    ResponseMode,
)


class BaseVectorIndexRagOps(ABC):
    """
    Abstract base class for RAG operations using LlamaIndex Vector Store.

    Provides methods for indexing, querying, and chat interactions
    with document collections using vector stores.

    The class uses LlamaIndex's built-in query engine and chat engine patterns,
    allowing users to pass custom configurations for flexible retrieval strategies.

    Attributes:
        rag_index: Main vector store index for semantic search
        vector_store: Vector store for similarity search
        storage_context: Storage context for data persistence
        emb_llm: Embedding language model
        completion_llm: Completion language model
        logger: Logger for debugging and monitoring
    """

    rag_index: Optional[VectorStoreIndex] = None
    vector_store: Optional[Any] = None
    storage_context: Optional[StorageContext] = None

    def __init__(
        self,
        completion_llm: LLM,
        emb_llm: Optional[LLM] = None,
        similarity_top_k: int = 3,
        response_mode: str = "tree_summarize",
    ):
        """Initialize with embedding and completion language models and configuration parameters.

        Args:
            emb_llm: Embedding language model
            completion_llm: Completion language model
            similarity_top_k: Number of top similar documents to retrieve (default: 3)
            response_mode: Response synthesis mode (default: "tree_summarize")
        """
        self.emb_llm = emb_llm
        self.completion_llm = completion_llm
        self.similarity_top_k = similarity_top_k
        self.response_mode = response_mode
        self.logger = logging.getLogger(__name__)
        self.token_counter = TokenCountingHandler()
        self._callback_manager = CallbackManager([self.token_counter])

    def _get_response_mode(self) -> ResponseMode:
        """Convert string response mode to ResponseMode enum."""
        mode_mapping = {
            "tree_summarize": ResponseMode.TREE_SUMMARIZE,
            "simple_summarize": ResponseMode.SIMPLE_SUMMARIZE,
            "generation": ResponseMode.GENERATION,
            "refine": ResponseMode.REFINE,
            "compact": ResponseMode.COMPACT,
            "compact_accumulate": ResponseMode.COMPACT_ACCUMULATE,
            "accumulate": ResponseMode.ACCUMULATE,
        }

        if isinstance(self.response_mode, str):
            return mode_mapping.get(
                self.response_mode.lower(), ResponseMode.TREE_SUMMARIZE
            )
        return self.response_mode

    def _create_metadata_filters(
        self, metadata_filter: Optional[Dict[str, str]] = None
    ) -> Optional[MetadataFilters]:
        """Create metadata filters from key-value pairs."""
        if not metadata_filter:
            return None

        filter_list = []
        for key, value in metadata_filter.items():
            filter_list.append(ExactMatchFilter(key=key, value=value))
        return MetadataFilters(filters=filter_list)

    async def _query_with_retries(
        self,
        text_str: str,
        metadata_filter: Optional[Dict[str, str]] = None,
    ):
        """Internal method with retry logic for robust querying."""

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=(
                retry_if_exception_type(Exception)
                | retry_if_result(
                    lambda result: self._retry_on_empty_string_or_timeout_response(
                        result
                    )
                )
            ),
            before_sleep=self._log_retry_attempt,
        )
        async def _aquery_with_retries():
            """Internal retry wrapper."""
            try:
                # Create query engine with metadata filters and response synthesizer
                query_engine_kwargs = {
                    "response_synthesizer": get_response_synthesizer(
                        llm=self.completion_llm,
                        response_mode=self._get_response_mode(),
                        callback_manager=self._callback_manager,
                    ),
                    "similarity_top_k": self.similarity_top_k,
                }

                # Add metadata filters if provided
                if metadata_filter:
                    filters = self._create_metadata_filters(metadata_filter)
                    query_engine_kwargs["filters"] = filters

                query_engine = self.rag_index.as_query_engine(
                    llm=self.completion_llm, **query_engine_kwargs
                )

                # Generate response using the query engine
                response = await query_engine.aquery(text_str)
                return response

            except Exception as e:
                self.logger.error(traceback.format_exc())
                raise e

        return await _aquery_with_retries()

    async def query_index(
        self,
        text_str: str,
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Query the vector store index and generate a response using a query engine.

        Args:
            text_str: Main query for response generation
            metadata_filter: Optional metadata filters for results

        Returns:
            Generated response with context from retrieved documents
        """
        if not self.rag_index:
            exists = await self.index_exists()
            if exists:
                await self.initiate_index()
            else:
                raise ValueError(
                    "No index exists. Create an index first using create_index()."
                )

        try:
            if metadata_filter:
                await self._prequery_filter_guard(metadata_filter) 
            answer = await self._query_with_retries(text_str, metadata_filter)
            # Validate response quality
            if self._retry_on_empty_string_or_timeout_response(answer):
                raise ValueError(f"LLM RESPONSE IS NOT VALID: {answer}")

            return answer

        except Exception as e:
            self.logger.error(f"Query failed for text '{text_str[:50]}...': {e}")
            raise

    async def chat_with_index(
        self,
        curr_message: str,
        chat_history: List[ChatMessage],
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Engage in conversational interaction with the RAG index using a chat engine.

        Args:
            curr_message: Current user message
            chat_history: Previous messages for context
            metadata_filter: Optional metadata filters for results

        Returns:
            Generated response considering conversation history
        """
        if not self.rag_index:
            exists = await self.index_exists()
            if exists:
                await self.initiate_index()
            else:
                raise ValueError(
                    "No index exists. Create an index first using create_index()."
                )

        try:
            if metadata_filter:
                await self._prequery_filter_guard(metadata_filter) 
            # Create chat engine with context awareness
            chat_engine_kwargs = {
                "chat_mode": ChatMode.CONTEXT,
                "llm": self.completion_llm,
                "embed_model": self.emb_llm,
                "similarity_top_k": self.similarity_top_k,
            }

            # Add metadata filters if provided
            if metadata_filter:
                filters = self._create_metadata_filters(metadata_filter)
                chat_engine_kwargs["filters"] = filters

            chat_engine = self.rag_index.as_chat_engine(**chat_engine_kwargs)
            if hasattr(chat_engine, "callback_manager"):
                chat_engine.callback_manager = self._callback_manager

            # Generate response with chat history context
            response = await chat_engine.achat(curr_message, chat_history)

            self.logger.debug(
                f"Chat response generated for message: {curr_message[:50]}..."
            )
            return response.response

        except Exception as e:
            self.logger.error(f"Chat failed for message '{curr_message[:50]}...': {e}")
            self.logger.error(traceback.format_exc())
            raise

    async def create_index(
        self,
        text_chunks: List[str],
        metadata: dict = None,
        transformations: List[TransformComponent] = None,
    ) -> List[str]:
        """
        Create a new index from text chunks.

        Creates a new index object every time it is called, replacing any existing index.

        Args:
            text_chunks: List of text segments to index
            metadata: Optional metadata for all chunks

        Returns:
            List of document IDs for the indexed chunks
        """
        try:
            if not self.rag_index:
                await self.initiate_index()

            documents, doc_ids = self._create_documents_from_text_chunks(
                text_chunks, metadata
            )

            # Create a new index from documents
            self.rag_index = VectorStoreIndex.from_documents(
                documents,
                storage_context=self.storage_context,
                embed_model=self.emb_llm,
                use_async=True,
                transformations=transformations,
                callback_manager=self._callback_manager,
            )

            self.logger.info(f"Created new index with {len(documents)} documents")

            # Persist the index using subclass-specific logic
            await self.persist_index()

            self.logger.info(f"Successfully indexed {len(documents)} documents")
            return doc_ids

        except Exception as e:
            self.logger.error(f"Failed to create index: {e}")
            raise

    async def insert_text_chunks(
        self,
        text_chunks: List[str],
        metadata: dict = None,
        transformations: List[TransformComponent] = None,
    ) -> List[str]:
        """
        Insert text chunks into an existing vector store index.

        Args:
            text_chunks: List of text segments to insert
            metadata: Optional metadata for all chunks
            transformations: Optional list of transformations to apply

        Returns:
            List of document IDs for the inserted chunks
        """
        if not self.rag_index:
            raise ValueError("Index must be created before inserting text chunks")

        try:
            # Create documents from text chunks
            documents, doc_ids = self._create_documents_from_text_chunks(
                text_chunks, metadata
            )

            # Set transformations on the index if provided
            if transformations:
                self.rag_index._transformations = transformations

            # Insert documents
            for document in documents:
                self.rag_index.insert(document)

            self.logger.info(f"Successfully inserted {len(documents)} text chunks")

            # Persist the updated index
            await self.persist_index()

            return doc_ids

        except Exception as e:
            self.logger.error(f"Failed to insert text chunks: {e}")
            raise

    async def delete_documents(
        self,
        doc_ids: List[str],
    ) -> None:
        """
        Delete documents from the vector store index.

        Args:
            doc_ids: List of document IDs to delete
        """
        if not self.rag_index:
            raise ValueError("Index must be created before deleting documents")

        try:
            for doc_id in doc_ids:
                self.rag_index.delete(doc_id)

            self.logger.info(f"Successfully deleted {len(doc_ids)} documents")

            # Persist the updated index
            await self.persist_index()

        except Exception as e:
            self.logger.error(f"Failed to delete documents: {e}")
            raise

    def _create_documents_from_text_chunks(
        self, text_chunks: List[str], metadata: dict = None
    ) -> tuple[List[Document], List[str]]:
        """Create Document objects from text chunks with optional metadata."""
        if not text_chunks:
            raise ValueError("text_chunks cannot be empty")

        documents = []
        doc_ids = []

        for text in text_chunks:
            if not text.strip():  # Skip empty or whitespace-only chunks
                continue

            doc_id = f"doc_id_{uuid.uuid4()}"
            doc_chunk = Document(text=text, id_=doc_id)

            if metadata:
                doc_chunk.metadata = metadata.copy()

            documents.append(doc_chunk)
            doc_ids.append(doc_id)

        if not documents:
            raise ValueError("No valid text chunks provided after filtering")

        return documents, doc_ids

    def _log_retry_attempt(self, retry_state):
        """Log retry attempts with detailed information."""
        self.logger.warning(
            f"Retrying {retry_state.fn.__name__} after {retry_state.attempt_number} attempts. "
            f"Next attempt in {retry_state.next_action.sleep} seconds."
        )

    def _retry_on_empty_string_or_timeout_response(self, result) -> bool:
        """Check if response indicates failure requiring retry."""
        if hasattr(result, "response"):
            response_text = str(result.response)
        else:
            response_text = str(result)

        # Check for empty responses or known error patterns
        return (
            response_text == ""
            or response_text == "504.0 GatewayTimeout"
            or "timeout" in response_text.lower()
            or len(response_text.strip()) == 0
        )
    
    async def _prequery_filter_guard(self, metadata_filter: Optional[Dict[str, Any]]) -> None:
        """Hook to validate that the metadata filter has at least one match.
        Default no-op; override in backend-specific subclasses."""
        return

    @abstractmethod
    async def persist_index(self):
        """Persist the index to storage backend."""
        pass

    @abstractmethod
    async def initiate_index(self):
        """Initialize the RAG index only if it already exists in the storage backend.

        This method should check if the index exists using index_exists(),
        and only instantiate an index object if it does exist.
        Otherwise, it should not create a new index.
        """
        pass

    @abstractmethod
    async def index_exists(self) -> bool:
        """Check if the index already exists in the storage backend."""
        pass

    # New utility methods for vector store operations

    def from_existing_vector_store(self, vector_store: Any, **kwargs) -> None:
        """Create a vector store index from existing vector store.

        Args:
            vector_store: Existing vector store
            **kwargs: Additional arguments for VectorStoreIndex.from_vector_store
        """
        try:
            self.vector_store = vector_store

            # Update storage context
            self.storage_context = StorageContext.from_defaults(
                vector_store=self.vector_store,
            )

            # Create index from existing store
            self.rag_index = VectorStoreIndex.from_vector_store(
                vector_store=self.vector_store,
                embed_model=self.emb_llm,
                callback_manager=self._callback_manager,
                **kwargs,
            )

            self.logger.info("Successfully created index from existing vector store")

        except Exception as e:
            self.logger.error(f"Failed to create index from existing vector store: {e}")
            raise
