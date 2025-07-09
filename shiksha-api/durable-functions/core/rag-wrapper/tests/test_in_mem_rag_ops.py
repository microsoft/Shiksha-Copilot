"""
In-Memory RAG Operations Tests

Tests require Azure OpenAI services with these environment variables:

Required:
- AZURE_OPENAI_API_KEY: OpenAI API key
- AZURE_OPENAI_ENDPOINT: OpenAI endpoint
- AZURE_OPENAI_EMBEDDING_MODEL: Embedding model (default: text-embedding-ada-002)
- AZURE_OPENAI_EMBEDDING_DEPLOYMENT: Embedding deployment name
- AZURE_OPENAI_COMPLETION_MODEL: Completion model (default: gpt-35-turbo)
- AZURE_OPENAI_COMPLETION_DEPLOYMENT: Completion deployment name

Optional:
- AZURE_OPENAI_API_VERSION: API version (default: 2024-02-15-preview)
"""

import pytest
import tempfile
import os
import shutil
import logging
from unittest.mock import Mock, MagicMock
from typing import List
import uuid
from dotenv import load_dotenv

from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.llms import ChatMessage
from rag_wrapper.rag_ops.in_mem_rag_ops import InMemRagOps

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Suppress DEBUG logs from Azure and other libraries
logging.getLogger("azure").setLevel(logging.WARNING)
logging.getLogger("llama_index").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# Force root logger to INFO level (in case it was set elsewhere)
logging.getLogger().setLevel(logging.INFO)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


@pytest.fixture
def metadata_fields_a():
    """Source metadata for group A test documents"""
    return {
        "source": "a_test_inmem_rag_ops",
        "created_date": "2025-06-27",
    }


@pytest.fixture
def metadata_fields_b():
    """Source metadata for group B test documents"""
    return {
        "source": "b_test_inmem_rag_ops",
        "created_date": "2025-06-27",
    }


@pytest.fixture
def embedding_llm():
    """Initialize Azure OpenAI embedding model"""
    return AzureOpenAIEmbedding(
        model=os.getenv("AZURE_OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002"),
        deployment_name=os.getenv(
            "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002"
        ),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
    )


@pytest.fixture
def completion_llm():
    """Initialize Azure OpenAI completion model"""
    return AzureOpenAI(
        model=os.getenv("AZURE_OPENAI_COMPLETION_MODEL", "gpt-35-turbo"),
        deployment_name=os.getenv("AZURE_OPENAI_COMPLETION_DEPLOYMENT", "gpt-35-turbo"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
    )


@pytest.fixture
def temp_index_dir():
    """Create a directory for testing index storage inside tests/indexes"""
    # Get the tests directory path
    tests_dir = os.path.dirname(__file__)
    indexes_dir = os.path.join(tests_dir, "indexes")

    # Create indexes directory if it doesn't exist
    os.makedirs(indexes_dir, exist_ok=True)

    # Create a unique subdirectory for this test run
    test_index_dir = os.path.join(indexes_dir, f"test_{uuid.uuid4().hex}")
    os.makedirs(test_index_dir, exist_ok=True)

    yield test_index_dir


@pytest.fixture(scope="function")
def rag_ops_instance(temp_index_dir, embedding_llm, completion_llm, metadata_fields_a):
    """Create an InMemRagOps instance for testing"""
    return InMemRagOps(
        index_path=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
    )


@pytest.mark.asyncio
async def test_create_index_with_metadata_a(rag_ops_instance, metadata_fields_a):
    """Test index creation with metadata A"""

    text_chunks = [
        "This is the first chunk of content with metadata A.",
        "This is the second chunk with different information with metadata A.",
    ]

    # Create a new index with text chunks and metadata
    doc_ids = await rag_ops_instance.create_index(
        text_chunks, metadata=metadata_fields_a
    )

    # Assertions
    assert len(doc_ids) == len(
        text_chunks
    ), "Should return correct number of document IDs"
    assert rag_ops_instance.rag_index is not None, "RAG index should be created"

    logger.info(
        f"Successfully created index with {len(doc_ids)} document chunks and metadata"
    )


@pytest.mark.asyncio
async def test_create_index_with_metadata_b(rag_ops_instance, metadata_fields_b):
    """Test index creation with metadata B"""

    text_chunks = [
        "This is the first chunk of content with metadata B.",
        "This is the second chunk with different information with metadata B.",
    ]

    # Create a new index with text chunks and metadata
    doc_ids = await rag_ops_instance.create_index(
        text_chunks, metadata=metadata_fields_b
    )

    # Assertions
    assert len(doc_ids) == len(
        text_chunks
    ), "Should return correct number of document IDs"
    assert rag_ops_instance.rag_index is not None, "RAG index should be created"

    logger.info(
        f"Successfully created index with {len(doc_ids)} document chunks and metadata"
    )


@pytest.mark.asyncio
async def test_retrieve(rag_ops_instance):
    """Test basic document retrieval"""
    # Test data for index creation
    text_chunks = [
        "This is the first chunk about artificial intelligence and machine learning.",
        "This is the second chunk discussing natural language processing and embeddings.",
        "The third chunk covers vector databases and similarity search algorithms.",
    ]

    # Create an index with the text chunks
    await rag_ops_instance.create_index(text_chunks)

    # Now test retrieval
    query = "first chunk"
    logger.info(f"Testing retrieval with query: '{query}'")
    retrieved_docs = await rag_ops_instance.retrieve(query)

    # Log all retrieved documents
    logger.info(f"Retrieved {len(retrieved_docs)} documents:")
    for i, doc in enumerate(retrieved_docs):
        logger.info(f"Document {i+1}: {doc}")

    # Assertions
    assert isinstance(retrieved_docs, list), "retrieve should return a list"
    assert len(retrieved_docs) >= 2, "Should retrieve atleast 2 docs"


@pytest.mark.asyncio
async def test_retrieve_with_metadata_a(rag_ops_instance, metadata_fields_a):
    """Test document retrieval with metadata A filter"""
    # Create index with metadata A
    text_chunks = [
        "This is the first chunk of content with metadata A.",
        "This is the second chunk with different information with metadata A.",
    ]
    await rag_ops_instance.create_index(text_chunks, metadata=metadata_fields_a)

    # Now test retrieval
    query = "first chunk"

    logger.info(f"Testing retrieval with query: '{query}'")
    retrieved_docs = await rag_ops_instance.retrieve(
        query, metadata_filter=metadata_fields_a
    )

    # Log all retrieved documents
    logger.info(f"Retrieved {len(retrieved_docs)} documents:")
    for i, doc in enumerate(retrieved_docs):
        logger.info(f"Document {i+1}: {doc}")

    # Assertions
    assert isinstance(retrieved_docs, list), "retrieve should return a list"
    assert len(retrieved_docs) >= 1, "Should retrieve atleast 1 doc"


@pytest.mark.asyncio
async def test_retrieve_with_metadata_b(rag_ops_instance, metadata_fields_b):
    """Test document retrieval with metadata B filter"""
    # Create index with metadata B
    text_chunks = [
        "This is the first chunk of content with metadata B.",
        "This is the second chunk with different information with metadata B.",
    ]
    await rag_ops_instance.create_index(text_chunks, metadata=metadata_fields_b)

    # Now test retrieval
    query = "second chunk"

    logger.info(f"Testing retrieval with query: '{query}'")
    retrieved_docs = await rag_ops_instance.retrieve(
        query, metadata_filter=metadata_fields_b
    )

    # Log all retrieved documents
    logger.info(f"Retrieved {len(retrieved_docs)} documents:")
    for i, doc in enumerate(retrieved_docs):
        logger.info(f"Document {i+1}: {doc}")

    # Assertions
    assert isinstance(retrieved_docs, list), "retrieve should return a list"
    assert len(retrieved_docs) >= 1, "Should retrieve atleast 1 doc"


@pytest.mark.asyncio
async def test_query_index(rag_ops_instance):
    """Test LLM query with retrieved context"""
    # Create a test index
    text_chunks = [
        "This is the first chunk about artificial intelligence and machine learning.",
        "This is the second chunk discussing natural language processing and embeddings.",
        "The third chunk covers vector databases and similarity search algorithms.",
    ]

    # Create an index with the text chunks
    await rag_ops_instance.create_index(text_chunks)

    # Test query_index
    query = "What is first chunk?"
    logger.info(f"Testing query_index with query: '{query}'")
    response = await rag_ops_instance.query_index(query)

    # Log the response
    logger.info(f"Query response: {response.response}")

    # Assertions
    assert response is not None, "query_index should return a response"
    assert hasattr(response, "response"), "Response should have a response attribute"
    assert isinstance(response.response, str), "Response text should be a string"


@pytest.mark.asyncio
async def test_chat(rag_ops_instance):
    """Test conversational query with context"""
    # Create a test index
    text_chunks = [
        "This is the first chunk about artificial intelligence and machine learning.",
        "The second chunk has metadata associated with it regarding source and creation date.",
        "The third chunk covers vector databases and similarity search algorithms.",
    ]

    # Create an index with the text chunks
    await rag_ops_instance.create_index(text_chunks)

    # Test chat_with_index
    message = "What metadata is associated with the second chunk?"
    chat_history = []  # Empty chat history for first interaction

    logger.info(f"Testing chat_with_index with message: '{message}'")
    response = await rag_ops_instance.chat_with_index(
        curr_message=message, chat_history=chat_history, chat_mode="context"
    )

    # Log the chat response
    logger.info(f"Chat response: {response}")

    # Assertions
    assert response is not None, "chat_with_index should return a response"
    assert isinstance(response, str), "Chat response should be a string"


@pytest.mark.asyncio
async def test_query_index_with_metadata_a(rag_ops_instance, metadata_fields_a):
    """Test LLM query with metadata A filter"""
    # Create index with metadata A
    text_chunks = [
        "This is the first chunk of content with metadata A.",
        "This is the second chunk with different information with metadata A.",
    ]
    await rag_ops_instance.create_index(text_chunks, metadata=metadata_fields_a)

    # Test retrieval with a query that should match multiple chunks
    query = "second chunk info"
    logger.info(
        f"Testing multiple chunk retrieval with query: '{query}', metadata: {metadata_fields_a}"
    )
    response = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_a
    )

    # Log the response
    logger.info(f"Query response: {response.response}")

    # Assertions
    assert response is not None, "query_index should return a response"
    assert hasattr(response, "response"), "Response should have a response attribute"
    assert isinstance(response.response, str), "Response text should be a string"


@pytest.mark.asyncio
async def test_index_persistence(
    temp_index_dir, embedding_llm, completion_llm, metadata_fields_a
):
    """Test that the index is persisted to disk and can be reloaded"""
    # Create an initial RAG ops instance
    initial_rag_ops = InMemRagOps(
        index_path=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
    )

    # Create content and index it
    text_chunks = [
        "This is a persistence test chunk one.",
        "This is a persistence test chunk two.",
    ]
    doc_ids = await initial_rag_ops.create_index(
        text_chunks, metadata=metadata_fields_a
    )
    assert len(doc_ids) == 2, "Should have indexed 2 documents"

    # Create a new RAG ops instance pointing to the same index location
    # This simulates restarting the application
    reloaded_rag_ops = InMemRagOps(
        index_path=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
    )

    # Test that the index was loaded correctly by querying it
    query = "persistence test"
    retrieved_docs = await reloaded_rag_ops.retrieve(query)

    # Assertions
    assert isinstance(retrieved_docs, list), "retrieve should return a list"
    assert len(retrieved_docs) > 0, "Should retrieve documents from persisted index"
    logger.info(f"Retrieved {len(retrieved_docs)} documents from persisted index")

    # Verify content is retrievable
    response = await reloaded_rag_ops.query_index(query)
    assert response is not None, "Should get a response from the persisted index"
    logger.info(f"Query response from persisted index: {response.response}")
