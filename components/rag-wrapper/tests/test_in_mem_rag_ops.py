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
from rag_wrapper.rag_ops.in_mem_rag_ops import InMemRagOps

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


@pytest.fixture
def mock_embedding_llm():
    """Azure OpenAI embedding language model"""
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
def mock_completion_llm():
    """Azure OpenAI completion language model"""
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


@pytest.fixture
def sample_markdown_content():
    """Read markdown content from README.md file"""
    readme_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "README.md")
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()
    return content


@pytest.fixture
def rag_ops_instance(temp_index_dir, mock_embedding_llm, mock_completion_llm):
    """Create an InMemRagOps instance for testing"""
    return InMemRagOps(
        index_path=temp_index_dir,
        emb_llm=mock_embedding_llm,
        completion_llm=mock_completion_llm,
    )


def test_insert_text_with_markdown_chunks(rag_ops_instance, sample_markdown_content):
    """Test inserting text chunks from markdown content"""
    # Split the markdown content into chunks (by sections)
    sections = sample_markdown_content.split("\n## ")
    text_chunks = []

    # Add the first section (title and introduction)
    if sections:
        text_chunks.append(sections[0])

        # Add the remaining sections with proper markdown formatting
        for section in sections[1:]:
            text_chunks.append("## " + section)

    # Filter out empty chunks
    text_chunks = [chunk.strip() for chunk in text_chunks if chunk.strip()]

    # Insert the text chunks
    doc_ids = rag_ops_instance.insert_text(text_chunks)

    # Assertions
    assert isinstance(doc_ids, list), "insert_text should return a list of document IDs"
    assert len(doc_ids) == len(
        text_chunks
    ), "Number of returned IDs should match number of chunks"
    assert (
        rag_ops_instance.rag_index is not None
    ), "RAG index should be created after inserting text"


def test_insert_text_with_metadata(rag_ops_instance):
    """Test inserting text chunks with metadata"""
    text_chunks = [
        "This is the first chunk of markdown content.",
        "This is the second chunk with different information.",
    ]

    metadata = {
        "source": "rag_wrapper_readme.md",
        "document_type": "markdown",
        "author": "test_user",
        "created_date": "2025-06-26",
    }

    # Insert text chunks with metadata
    doc_ids = rag_ops_instance.insert_text(text_chunks, metadata=metadata)

    # Assertions
    assert len(doc_ids) == len(
        text_chunks
    ), "Should return correct number of document IDs"
    assert rag_ops_instance.rag_index is not None, "RAG index should be created"


@pytest.mark.asyncio
async def test_retrieve_from_metadata_index(rag_ops_instance):
    """Test retrieving documents from an index created with metadata"""
    # First, insert text chunks with metadata
    text_chunks = [
        "This is the first chunk about artificial intelligence and machine learning.",
        "This is the second chunk discussing natural language processing and embeddings.",
        "The third chunk covers vector databases and similarity search algorithms.",
    ]

    metadata = {
        "source": "ai_concepts.md",
        "document_type": "markdown",
        "author": "test_user",
        "created_date": "2025-06-26",
    }

    # Insert text chunks with metadata
    doc_ids = rag_ops_instance.insert_text(text_chunks, metadata=metadata)

    # Test retrieval
    query = "machine learning algorithms"
    logger.info(f"Testing retrieval with query: '{query}'")
    retrieved_docs = await rag_ops_instance.retrieve(query)

    # Log all retrieved documents
    logger.info(f"Retrieved {len(retrieved_docs)} documents:")
    for i, doc in enumerate(retrieved_docs):
        logger.info(f"Document {i+1}: {doc}")

    # Assertions
    assert isinstance(retrieved_docs, list), "retrieve should return a list"
    assert len(retrieved_docs) > 0, "Should retrieve at least one document"


@pytest.mark.asyncio
async def test_query_index_with_metadata(rag_ops_instance):
    """Test querying an index created with metadata using query_index method"""
    # Insert text chunks with metadata
    text_chunks = [
        "Python is a high-level programming language known for its simplicity and readability.",
        "Machine learning frameworks like TensorFlow and PyTorch are popular in Python.",
        "Vector databases store and search high-dimensional vectors efficiently.",
    ]

    metadata = {
        "source": "programming_concepts.md",
        "document_type": "markdown",
        "topic": "programming",
        "created_date": "2025-06-26",
    }

    # Insert text chunks with metadata
    doc_ids = rag_ops_instance.insert_text(text_chunks, metadata=metadata)

    # Test query_index
    query = "What programming language is mentioned?"
    logger.info(f"Testing query_index with query: '{query}'")
    response = await rag_ops_instance.query_index(query)

    # Log the response
    logger.info(f"Query response: {response.response}")

    # Assertions
    assert response is not None, "query_index should return a response"
    assert hasattr(response, "response"), "Response should have a response attribute"
    assert isinstance(response.response, str), "Response text should be a string"
    assert len(response.response.strip()) > 0, "Response should not be empty"


@pytest.mark.asyncio
async def test_chat_with_metadata_index(rag_ops_instance):
    """Test chatting with an index created with metadata"""
    # Insert text chunks with metadata
    text_chunks = [
        "RAG (Retrieval-Augmented Generation) combines retrieval and generation for better responses.",
        "Vector embeddings represent text as numerical vectors in high-dimensional space.",
        "Semantic search finds relevant documents based on meaning rather than exact keyword matches.",
    ]

    metadata = {
        "source": "rag_concepts.md",
        "document_type": "technical_documentation",
        "domain": "information_retrieval",
        "created_date": "2025-06-26",
    }

    # Insert text chunks with metadata
    doc_ids = rag_ops_instance.insert_text(text_chunks, metadata=metadata)

    # Test chat_with_index
    message = "Explain what RAG is"
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
    assert len(response.strip()) > 0, "Chat response should not be empty"


@pytest.mark.asyncio
async def test_query_multiple_relevant_chunks(rag_ops_instance):
    """Test querying when multiple chunks are relevant to the query"""
    # Insert text chunks with overlapping topics
    text_chunks = [
        "Deep learning is a subset of machine learning that uses neural networks with multiple layers.",
        "Neural networks are computational models inspired by biological neural networks.",
        "Machine learning algorithms learn patterns from data to make predictions or decisions.",
        "Artificial intelligence encompasses machine learning, deep learning, and other cognitive technologies.",
    ]

    metadata = {
        "source": "ai_glossary.md",
        "document_type": "educational",
        "difficulty": "intermediate",
        "created_date": "2025-06-26",
    }

    # Insert text chunks with metadata
    doc_ids = rag_ops_instance.insert_text(text_chunks, metadata=metadata)

    # Test retrieval with a query that should match multiple chunks
    query = "neural networks and machine learning"
    logger.info(f"Testing multiple chunk retrieval with query: '{query}'")
    retrieved_docs = await rag_ops_instance.retrieve(query)

    # Log all retrieved documents
    logger.info(f"Retrieved {len(retrieved_docs)} documents for multiple chunk query:")
    for i, doc in enumerate(retrieved_docs):
        logger.info(f"Document {i+1}: {doc}")

    # Assertions
    assert len(retrieved_docs) > 1, "Should retrieve multiple relevant documents"
    assert len(retrieved_docs) <= 3, "Should not exceed similarity_top_k limit (3)"

    # Test query_index with the same query
    logger.info(f"Testing query_index for multiple chunks with query: '{query}'")
    response = await rag_ops_instance.query_index(query)

    # Log the comprehensive response
    logger.info(f"Multiple chunk query response: {response.response}")

    assert (
        response is not None
    ), "Should get a comprehensive response from multiple sources"


@pytest.mark.asyncio
async def test_query_no_results(rag_ops_instance):
    """Test querying with a query that should return minimal results"""
    # Insert text chunks with specific content
    text_chunks = [
        "Weather patterns are influenced by atmospheric pressure and temperature variations.",
        "Climate change affects global weather systems and precipitation levels.",
    ]

    metadata = {
        "source": "weather_info.md",
        "document_type": "scientific",
        "domain": "meteorology",
        "created_date": "2025-06-26",
    }

    # Insert text chunks with metadata
    doc_ids = rag_ops_instance.insert_text(text_chunks, metadata=metadata)

    # Test with an unrelated query
    query = "quantum computing algorithms"
    logger.info(f"Testing retrieval with unrelated query: '{query}'")
    retrieved_docs = await rag_ops_instance.retrieve(query)

    # Log retrieved documents even for unrelated queries
    logger.info(f"Retrieved {len(retrieved_docs)} documents for unrelated query:")
    for i, doc in enumerate(retrieved_docs):
        logger.info(f"Document {i+1}: {doc}")

    # Even with unrelated queries, the system should still return some results
    # (the most similar available, even if not very relevant)
    assert isinstance(
        retrieved_docs, list
    ), "Should return a list even for unrelated queries"


@pytest.mark.asyncio
async def test_retrieve_with_metadata_filter(rag_ops_instance):
    """Test retrieving documents with metadata filtering"""
    # Insert text chunks with different metadata
    text_chunks_file1 = [
        "Content from file1 about machine learning algorithms.",
        "More content from file1 discussing neural networks.",
    ]

    text_chunks_file2 = [
        "Content from file2 about data science methods.",
        "Additional content from file2 covering statistics.",
    ]

    metadata_file1 = {"filename": "file1.pdf", "category": "AI"}
    metadata_file2 = {"filename": "file2.pdf", "category": "DataScience"}

    # Insert text chunks with different metadata
    rag_ops_instance.insert_text(text_chunks_file1, metadata=metadata_file1)
    rag_ops_instance.insert_text(text_chunks_file2, metadata=metadata_file2)

    # Test retrieval without filter (should return results from both files)
    query = "machine learning"
    all_docs = await rag_ops_instance.retrieve(query)
    logger.info(f"Retrieved {len(all_docs)} documents without filter")

    # Test retrieval with metadata filter for file1.pdf
    metadata_filter = {"filename": "file1.pdf"}
    filtered_docs = await rag_ops_instance.retrieve(
        query, metadata_filter=metadata_filter
    )

    logger.info(
        f"Retrieved {len(filtered_docs)} documents with filter {metadata_filter}"
    )
    for i, doc in enumerate(filtered_docs):
        logger.info(f"Filtered Document {i+1}: {doc}")

    # Assertions
    assert isinstance(filtered_docs, list), "retrieve with filter should return a list"
    assert len(filtered_docs) > 0, "Should retrieve at least one document with filter"

    # Test with multiple metadata filters
    multi_filter = {"filename": "file1.pdf", "category": "AI"}
    multi_filtered_docs = await rag_ops_instance.retrieve(
        query, metadata_filter=multi_filter
    )

    logger.info(
        f"Retrieved {len(multi_filtered_docs)} documents with multi-filter {multi_filter}"
    )

    assert isinstance(
        multi_filtered_docs, list
    ), "retrieve with multi-filter should return a list"
