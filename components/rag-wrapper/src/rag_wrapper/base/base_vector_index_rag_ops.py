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

from llama_index.core import StorageContext, VectorStoreIndex, Document
from llama_index.core.indices.base import BaseIndex
from llama_index.core.llms import ChatMessage
from llama_index.core.schema import NodeWithScore, TransformComponent
from llama_index.core.retrievers import BaseRetriever, VectorIndexRetriever
from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter
from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
from llama_index.core.response_synthesizers import (
    ResponseMode,
    get_response_synthesizer,
)


class BaseVectorIndexRagOps(ABC):
    """
    Abstract base class for RAG operations using LlamaIndex.

    Provides methods for indexing, retrieval, querying, and chat interactions
    with document collections.

    Attributes:
        rag_index: Main RAG index for semantic search
        retriever: Retriever instance for document queries
        vector_store: Vector store for similarity search
        storage_context: Storage context for data persistence
        emb_llm: Embedding language model
        completion_llm: Completion language model
        logger: Logger for debugging and monitoring
    """

    rag_index: Optional[BaseIndex] = None
    retriever: Optional[BaseRetriever] = None
    vector_store: Optional[VectorStoreIndex] = None
    storage_context: Optional[StorageContext] = None

    def __init__(
        self,
        emb_llm: Any,
        completion_llm: Any,
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

    async def _create_retriever(
        self,
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> BaseRetriever:
        """Create a retriever with optional metadata filtering.

        Args:
            metadata_filter: Optional metadata filters for results
        """
        if not self.rag_index:
            exists = await self.index_exists()
            if exists:
                await self.initiate_index()
            else:
                raise ValueError(
                    "No index exists. Create an index first using create_index()."
                )

        assert self.rag_index, "RAG index must be initialized before creating retriever"

        filters = self._create_metadata_filters(metadata_filter)

        if filters:
            return VectorIndexRetriever(
                index=self.rag_index,
                similarity_top_k=self.similarity_top_k,  # Number of top results to retrieve
                filters=filters,
            )
        else:
            return VectorIndexRetriever(
                index=self.rag_index,
                similarity_top_k=self.similarity_top_k,
            )

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

    async def _query_with_retries(
        self,
        text_str: str,
        retrieval_query: Optional[str] = None,
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> tuple[Any, TokenCountingHandler]:
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
            _token_counter = TokenCountingHandler(logger=self.logger, verbose=True)

            # Create response synthesizer with token tracking
            response_synthesizer = get_response_synthesizer(
                llm=self.completion_llm,
                response_mode=self._get_response_mode(),
                callback_manager=CallbackManager([_token_counter]),
            )

            # Retrieve relevant documents
            retrieved_nodes = await self.retrieve(
                retrieval_query or text_str, metadata_filter
            )

            # Generate response using retrieved context
            response = await response_synthesizer.asynthesize(text_str, retrieved_nodes)
            return response, _token_counter

        return await _aquery_with_retries()

    async def retrieve(
        self, query: str, metadata_filter: Optional[Dict[str, str]] = None
    ) -> List[NodeWithScore]:
        """
        Retrieve relevant documents based on semantic similarity.

        Args:
            query: Search query string for similarity matching
            metadata_filter: Optional metadata filters for results

        Returns:
            List of document nodes with similarity scores
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
            retriever = await self._create_retriever(metadata_filter)
            results = await retriever.aretrieve(query)
            self.logger.debug(
                f"Retrieved {len(results)} documents for query: {query[:50]}..."
            )
            return results
        except Exception as e:
            self.logger.error(f"Retrieval failed for query '{query}': {e}")
            raise

    async def query_index(
        self,
        text_str: str,
        retrieval_query: Optional[str] = None,
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Query the RAG index and generate a response.

        Args:
            text_str: Main query for response generation
            retrieval_query: Optional separate query for document retrieval
            metadata_filter: Optional metadata filters

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
            answer, token_counter = await self._query_with_retries(
                text_str, retrieval_query, metadata_filter
            )

            # Log token usage for monitoring
            self.logger.debug(
                f"TOKEN COUNTS: completion {token_counter.completion_llm_token_count}, "
                f"prompt {token_counter.prompt_llm_token_count}, "
                f"total: {token_counter.total_llm_token_count}",
            )

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
        chat_mode: str = "context",
    ) -> Any:
        """
        Engage in conversational interaction with the RAG index.

        Args:
            curr_message: Current user message
            chat_history: Previous messages for context
            chat_mode: Chat mode configuration

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
            # Create chat engine with context awareness
            chat_engine = self.rag_index.as_chat_engine(
                chat_mode=chat_mode, llm=self.completion_llm
            )

            # Generate response with chat history context
            response = await chat_engine.achat(curr_message, chat_history)

            self.logger.debug(
                f"Chat response generated for message: {curr_message[:50]}..."
            )
            return response.response

        except Exception as e:
            self.logger.error(f"Chat failed for message '{curr_message[:50]}...': {e}")
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
            )

            self.logger.info(f"Created new index with {len(documents)} documents")

            # Persist the index using subclass-specific logic
            await self.persist_index()

            self.logger.info(f"Successfully indexed {len(documents)} documents")
            return doc_ids

        except Exception as e:
            self.logger.error(f"Failed to create index: {e}")
            raise

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
