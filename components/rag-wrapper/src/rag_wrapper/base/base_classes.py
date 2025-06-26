from abc import ABC
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.indices.base import BaseIndex
from llama_index.core import Document
from llama_index.core.llms import ChatMessage
from typing import List, Optional, Any
from llama_index.core.retrievers import BaseRetriever


class BaseRagOps(ABC):
    """
    An abstract base class for Retrieval-Augmented Generation (RAG) operations
    using LlamaIndex. This class defines the core functionalities needed for
    interacting with an index, including indexing, retrieval, querying, and chat-based operations.

    Attributes:
    -----------
        rag_index (Optional[Any]):
            A reference to the Llama-Index RAG index that contains all embedding vectors.

        vector_store (Optional[VectorStoreIndex]):
            A reference to the vector store index used for retrieval.

        storage_context (Optional[StorageContext]):
            A reference to the storage context, managing how data is stored and retrieved.

        retriever (Optional[BaseRetriever]):
            A retriever object that facilitates querying the index for relevant documents.
    """

    rag_index: Optional[BaseIndex] = None
    retriever: Optional[BaseRetriever] = None
    vector_store: Optional[VectorStoreIndex] = None
    storage_context: Optional[StorageContext] = None

    async def initiate_index(self):
        """
        Initializes the RAG index.
        This method should be implemented to set up necessary resources for indexing.
        """
        pass

    async def retrieve(self, query: str) -> List[str]:
        """
        Retrieves relevant documents from the RAG index based on the input query.

        Args:
            query (str): The query string to search for in the index.

        Returns:
            List[str]: A list of retrieved documents.
        """
        pass

    async def query_index(self, text_str: str) -> Any:
        """
        Queries the RAG index with a given text string and retrieves relevant responses.

        Args:
            text_str (str): The text query string.

        Returns:
            Any: Processed response from the RAG index.
        """
        pass

    async def chat_with_index(
        self, curr_message: str, chat_history: List[ChatMessage]
    ) -> Any:
        """
        Engages in a chat-like interaction with the RAG index, maintaining chat history.

        Args:
            curr_message (str): The latest message in the conversation.
            chat_history (List[ChatMessage]): A list of previous chat messages.

        Returns:
            Any: The generated response from the RAG index.
        """
        pass

    async def insert_text(self, text_chunks: List[str], metadata: dict = None) -> None:
        """
        Inserts a list of text chunks into the RAG index for future retrieval.

        Args:
            text_chunks (List[str]): A list of text snippets to be added to the index.

        Returns:
            None
        """
        pass
