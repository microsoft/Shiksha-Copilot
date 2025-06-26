import os
import logging
from typing import Any
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    retry_if_result,
)

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core import Document
from llama_index.core.llms import ChatMessage
from llama_index.core.indices import load_index_from_storage
from typing import List, Dict, Optional
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter
from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
from llama_index.core.schema import NodeWithScore
from llama_index.core.response_synthesizers import (
    ResponseMode,
    get_response_synthesizer,
)
import uuid
from rag_wrapper.base.base_classes import BaseRagOps


class InMemRagOps(BaseRagOps):
    """
    In-memory implementation of RAG operations using LlamaIndex.
    This class provides methods for initializing, querying, retrieving,
    inserting, and chatting with an indexed document repository.
    """

    _ERROR = ValueError(
        "Index Object is not defined. The `index_path` passed to the constructor doesn't contain the index files."
    )

    def __init__(self, index_path: str, emb_llm: Any, completion_llm: Any):
        """
        Initializes the in-memory RAG operations.

        Args:
            index_path (str): Folder path where the index is stored or should be stored.
            emb_llm (Any): Embedding language model instance.
            completion_llm (Any): Completion language model instance.
        """
        self.index_path = index_path
        self.emb_llm = emb_llm
        self.completion_llm = completion_llm
        self.logger = logging.getLogger(__name__)

        if self.__has_index_files(index_path):
            self.storage_context = StorageContext.from_defaults(persist_dir=index_path)
            self.rag_index = load_index_from_storage(
                storage_context=self.storage_context,
                embed_model=self.emb_llm,
            )
            self.retriever = VectorIndexRetriever(
                index=self.rag_index,
                similarity_top_k=3,  # Number of top results to retrieve
            )

    async def retrieve(
        self, query: str, metadata_filter: Optional[Dict[str, str]] = None
    ) -> List[NodeWithScore]:
        """
        Retrieves relevant documents from the RAG index.

        Args:
            query (str): Query string for retrieval.
            metadata_filter (Optional[Dict[str, str]]): Optional metadata filter as a dictionary
                of key-value pairs for exact matching. Example: {"filename": "file1.pdf"}

        Returns:
            List[NodeWithScore]: A list of retrieved nodes.
        """
        if not self.rag_index:
            raise self._ERROR

        # Create metadata filters if provided
        filters = None
        if metadata_filter:
            filter_list = []
            for key, value in metadata_filter.items():
                filter_list.append(ExactMatchFilter(key=key, value=value))
            filters = MetadataFilters(filters=filter_list)

        # Create retriever with or without filters
        if filters:
            retriever = self.rag_index.as_retriever(filters=filters, similarity_top_k=3)
        else:
            if not self.retriever:
                self.retriever = VectorIndexRetriever(
                    index=self.rag_index,
                    similarity_top_k=3,
                )
            retriever = self.retriever

        return await retriever.aretrieve(query)

    async def query_index(
        self,
        text_str: str,
        retrieval_query: Optional[str] = None,
        metadata_filter: Optional[Dict[str, str]] = None,
    ):
        """
        Queries the RAG index using the completion language model.

        Args:
            text_str (str): Query string.

        Returns:
            Any: Response from the query engine.
        """

        @retry(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=(
                retry_if_exception_type(Exception)
                | retry_if_result(
                    lambda result: self.__retry_on_empty_string_or_timeout_response(
                        result
                    )
                )
            ),
            before_sleep=self.__log_retry_attempt,
        )
        async def _aquery_with_retries():
            _token_counter = TokenCountingHandler(logger=self.logger, verbose=True)
            response_synthesizer = get_response_synthesizer(
                llm=self.completion_llm,
                response_mode=ResponseMode.TREE_SUMMARIZE,
                callback_manager=CallbackManager([_token_counter]),
            )
            retrieved_nodes = await self.retrieve(
                retrieval_query or text_str, metadata_filter
            )
            response = await response_synthesizer.asynthesize(text_str, retrieved_nodes)
            return response, _token_counter

        if not self.rag_index:
            raise self._ERROR

        answer, token_counter = await _aquery_with_retries()
        self.logger.debug(
            f"TOKEN COUNTS: completion {token_counter.completion_llm_token_count}, "
            f"prompt {token_counter.prompt_llm_token_count}, "
            f"total: {token_counter.total_llm_token_count}",
        )
        if self.__retry_on_empty_string_or_timeout_response(answer):
            raise ValueError(f"LLM RESPONSE IS NOT VALID: {answer}")
        return answer

    async def chat_with_index(
        self,
        curr_message: str,
        chat_history: List[ChatMessage],
        chat_mode: str = "context",
    ):
        """
        Initiates a chat session with the RAG index.

        Args:
            curr_message (str): Current message in the conversation.
            chat_history (List[ChatMessage]): Previous chat messages.
            chat_mode (str): Chat mode (default is "context").

        Returns:
            Any: Response from the chat engine.
        """
        if not self.rag_index:
            raise self._ERROR

        query_engine = self.rag_index.as_chat_engine(
            chat_mode=chat_mode, llm=self.completion_llm
        )
        answer = (await query_engine.achat(curr_message, chat_history)).response
        return answer

    def insert_text(self, text_chunks: List[str], metadata: dict = None):
        """
        Inserts text chunks into the RAG index.

        Args:
            text_chunks (List[str]): List of text chunks to insert.

        Returns:
            List[str]: List of inserted document IDs.
        """
        documents = []
        for text in text_chunks:
            doc_chunk = Document(text=text, id_=f"doc_id_{uuid.uuid4()}")
            if metadata:
                doc_chunk.metadata = metadata
            documents.append(doc_chunk)

        if not self.rag_index:
            self.rag_index = VectorStoreIndex.from_documents(
                documents,
                llm=self.completion_llm,
                embed_model=self.emb_llm,
                # storage_context=StorageContext.from_defaults(
                #     persist_dir=self.index_path
                # ),
            )
        else:
            for doc in documents:
                self.rag_index.insert(doc)

        self.rag_index.storage_context.persist(persist_dir=self.index_path)
        return [doc.doc_id for doc in documents]

    def __log_retry_attempt(self, retry_state):
        """
        Logs retry attempts for queries.
        """
        print(
            "*************************************"
            f"Retrying {retry_state.fn.__name__} after {retry_state.attempt_number} attempts. "
            f"Next attempt in {retry_state.next_action.sleep} seconds."
            "*************************************"
        )

    def __retry_on_empty_string_or_timeout_response(self, result) -> bool:
        """
        Checks if the response is empty or a timeout error.
        """
        return result == "" or result == "504.0 GatewayTimeout"

    @staticmethod
    def __has_index_files(folder_path: str) -> bool:
        """
        Checks if the folder contains index files.

        Args:
            folder_path (str): Path to the folder.

        Returns:
            bool: True if index files exist, False otherwise.
        """
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"The folder '{folder_path}' does not exist.")

        if not os.path.isdir(folder_path):
            raise NotADirectoryError(f"The path '{folder_path}' is not a directory.")

        return any(file.endswith(".json") for file in os.listdir(folder_path))
