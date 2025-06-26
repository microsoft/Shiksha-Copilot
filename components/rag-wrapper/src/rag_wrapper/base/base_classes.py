from abc import ABC
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.indices.base import BaseIndex
from llama_index.core import Document
from llama_index.core.llms import ChatMessage
from llama_index.core.schema import NodeWithScore
from typing import List, Optional, Any, Dict
from llama_index.core.retrievers import BaseRetriever


class BaseRagOps(ABC):
    """
    Abstract base class for Retrieval-Augmented Generation (RAG) operations using LlamaIndex.

    This class defines the core interface for RAG systems, providing methods for indexing,
    retrieval, querying, and chat-based interactions with document collections. Concrete
    implementations should inherit from this class and implement all abstract methods.

    The class supports various RAG workflows including:
    - Document indexing and storage
    - Semantic retrieval with metadata filtering
    - Query-based document search
    - Conversational chat interfaces
    - Dynamic content insertion

    Attributes:
        rag_index (Optional[BaseIndex]): The main RAG index containing embedding vectors
            and document metadata for semantic search operations.
        retriever (Optional[BaseRetriever]): Retriever instance for querying the index
            and finding relevant documents based on similarity scores.
        vector_store (Optional[VectorStoreIndex]): Vector store implementation for
            efficient similarity search and document retrieval.
        storage_context (Optional[StorageContext]): Storage context managing data
            persistence, caching, and retrieval strategies.

    Example:
        >>> class MyRagOps(BaseRagOps):
        ...     async def initiate_index(self):
        ...         # Implementation specific setup
        ...         pass
        >>> rag_ops = MyRagOps()
        >>> await rag_ops.initiate_index()
    """

    rag_index: Optional[BaseIndex] = None
    retriever: Optional[BaseRetriever] = None
    vector_store: Optional[VectorStoreIndex] = None
    storage_context: Optional[StorageContext] = None

    async def initiate_index(self):
        """
        Initialize the RAG index and set up necessary resources.

        This method should set up the vector store, storage context, retriever,
        and any other components required for RAG operations. Implementation
        should handle configuration loading, connection establishment, and
        resource initialization.

        Raises:
            NotImplementedError: This is an abstract method that must be implemented
                by concrete subclasses.
            ConnectionError: If unable to establish connections to required services.
            ConfigurationError: If required configuration parameters are missing or invalid.

        Example:
            >>> await rag_ops.initiate_index()
        """
        pass

    async def retrieve(
        self, query: str, metadata_filter: Optional[Dict[str, str]] = None
    ) -> List[NodeWithScore]:
        """
        Retrieve relevant documents from the RAG index based on semantic similarity.

        Performs semantic search using the provided query string and returns a ranked
        list of document nodes with their similarity scores. Optional metadata filtering
        allows for refined search within specific document subsets.

        Args:
            query (str): The search query string used for semantic similarity matching.
                Should be a natural language question or statement.
            metadata_filter (Optional[Dict[str, str]], optional): Dictionary of metadata
                key-value pairs for exact matching. Used to filter results to specific
                document categories, sources, or attributes. Defaults to None.

        Returns:
            List[NodeWithScore]: Ordered list of document nodes with similarity scores,
                ranked from most to least relevant. Each node contains the document
                content and associated metadata.

        Raises:
            NotImplementedError: This is an abstract method that must be implemented
                by concrete subclasses.
            ValueError: If query is empty or invalid.
            IndexError: If the RAG index is not properly initialized.

        Example:
            >>> results = await rag_ops.retrieve(
            ...     "What is machine learning?",
            ...     metadata_filter={"document_type": "tutorial"}
            ... )
            >>> for node in results:
            ...     print(f"Score: {node.score}, Content: {node.text[:100]}...")
        """
        pass

    async def query_index(
        self,
        text_str: str,
        retrieval_query: Optional[str] = None,
        metadata_filter: Optional[Dict[str, str]] = None,
    ) -> Any:
        """
        Query the RAG index and generate a comprehensive response.

        Combines retrieval and generation phases to provide contextually relevant
        answers. Retrieves relevant documents using the query, then generates a
        response based on the retrieved context and the original question.

        Args:
            text_str (str): The main query or question for which to generate a response.
                This is used for both retrieval (if retrieval_query not provided) and
                response generation.
            retrieval_query (Optional[str], optional): Separate query string optimized
                for document retrieval. If provided, this is used instead of text_str
                for finding relevant documents. Defaults to None.
            metadata_filter (Optional[Dict[str, str]], optional): Dictionary of metadata
                filters to constrain the search space. Defaults to None.

        Returns:
            Any: Generated response object containing the answer, source documents,
                metadata, and any additional context information. The exact type
                depends on the specific implementation.

        Raises:
            NotImplementedError: This is an abstract method that must be implemented
                by concrete subclasses.
            ValueError: If text_str is empty or contains invalid characters.
            RuntimeError: If the query processing fails due to system errors.

        Example:
            >>> response = await rag_ops.query_index(
            ...     "Explain the benefits of renewable energy",
            ...     retrieval_query="renewable energy advantages benefits",
            ...     metadata_filter={"topic": "environment"}
            ... )
            >>> print(response.response)
        """
        pass

    async def chat_with_index(
        self, curr_message: str, chat_history: List[ChatMessage]
    ) -> Any:
        """
        Engage in conversational interaction with the RAG index.

        Maintains context from previous conversation turns while generating responses
        based on the document index. Supports follow-up questions, clarifications,
        and multi-turn conversations with memory of previous exchanges.

        Args:
            curr_message (str): The current user message or question in the conversation.
                Should be a natural language input that may reference previous context.
            chat_history (List[ChatMessage]): Chronologically ordered list of previous
                messages in the conversation, including both user inputs and system
                responses. Used to maintain conversational context.

        Returns:
            Any: Generated conversational response that considers both the current
                message and conversation history. May include follow-up questions,
                clarifications, or additional relevant information.

        Raises:
            NotImplementedError: This is an abstract method that must be implemented
                by concrete subclasses.
            ValueError: If curr_message is empty or chat_history contains invalid entries.
            ContextError: If the conversation context becomes too large to process.

        Example:
            >>> history = [
            ...     ChatMessage(role="user", content="What is photosynthesis?"),
            ...     ChatMessage(role="assistant", content="Photosynthesis is...")
            ... ]
            >>> response = await rag_ops.chat_with_index(
            ...     "How does it relate to climate change?",
            ...     history
            ... )
            >>> print(response.response)
        """
        pass

    async def insert_text(self, text_chunks: List[str], metadata: dict = None) -> None:
        """
        Insert new text chunks into the RAG index for future retrieval.

        Processes and indexes new textual content, making it available for subsequent
        queries and retrieval operations. Text chunks are embedded and stored with
        optional metadata for enhanced filtering and organization.

        Args:
            text_chunks (List[str]): List of text segments to be indexed. Each chunk
                should be a coherent piece of content (paragraph, section, document).
                Empty strings or very short chunks may be filtered out.
            metadata (dict, optional): Dictionary of metadata to associate with all
                text chunks. Common keys include 'source', 'author', 'date', 'category'.
                This metadata can be used later for filtering during retrieval.
                Defaults to None.

        Returns:
            None: This method modifies the index in-place and does not return a value.

        Raises:
            NotImplementedError: This is an abstract method that must be implemented
                by concrete subclasses.
            ValueError: If text_chunks is empty or contains only invalid entries.
            StorageError: If there are issues persisting the new content to storage.
            IndexError: If the index is not properly initialized or becomes corrupted.

        Example:
            >>> chunks = [
            ...     "Solar panels convert sunlight into electricity.",
            ...     "Wind turbines harness wind energy for power generation."
            ... ]
            >>> metadata = {"source": "renewable_energy_guide.pdf", "chapter": "2"}
            >>> await rag_ops.insert_text(chunks, metadata)
        """
        pass
