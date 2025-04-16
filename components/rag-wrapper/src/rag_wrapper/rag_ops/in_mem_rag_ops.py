import os
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
from typing import List
from llama_index.core.retrievers import VectorIndexRetriever
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
        self.storage_context = StorageContext.from_defaults(persist_dir=index_path)

        if self.__has_index_files(index_path):
            self.rag_index = load_index_from_storage(
                storage_context=self.storage_context,
                embed_model=self.emb_llm,
            )
            self.retriever = VectorIndexRetriever(
                index=self.rag_index,
                similarity_top_k=3,  # Number of top results to retrieve
            )

    async def retrieve(self, query: str):
        """
        Retrieves relevant documents from the RAG index.

        Args:
            query (str): Query string for retrieval.

        Returns:
            List[str]: A list of retrieved document texts.
        """
        if not self.rag_index:
            raise self._ERROR
        if not self.retriever:
            self.retriever = VectorIndexRetriever(
                index=self.rag_index,
                similarity_top_k=3,
            )

        retrieved_nodes = self.retriever.retrieve(query)
        return [node.node.get_text() for node in retrieved_nodes]

    async def query_index(self, text_str: str):
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
        async def _aquery_with_retries(query_engine, query):
            return await query_engine.aquery(query)

        if not self.rag_index:
            raise self._ERROR

        query_engine = self.rag_index.as_query_engine(llm=self.completion_llm)
        answer = await _aquery_with_retries(query_engine, text_str)
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

    def insert_text(self, text_chunks: List[str]):
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
            documents.append(doc_chunk)

        if not self.rag_index:
            self.rag_index = VectorStoreIndex.from_documents(
                documents,
                llm=self.completion_llm,
                embed_model=self.emb_llm,
                storage_context=self.storage_context,
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
