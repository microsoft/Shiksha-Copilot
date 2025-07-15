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
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
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
def rag_ops_instance(temp_index_dir, embedding_llm, completion_llm):
    """Create an InMemRagOps instance for testing"""
    return InMemRagOps(
        persist_dir=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
    )


@pytest.fixture
def transformations():
    return [MarkdownNodeParser(), SentenceSplitter(chunk_size=512, chunk_overlap=50)]


@pytest.fixture
def ai_scientists_markdown_content():
    """List of markdown paragraphs about AI including scientists for creating effective knowledge graphs"""
    return [
        """# The Foundations of Artificial Intelligence

## Alan Turing: The Father of Computer Science

**Alan Turing** (1912-1954) is widely regarded as the father of computer science and artificial intelligence. His groundbreaking contributions include:

- **The Turing Test (1950)**: A method to determine if a machine can exhibit intelligent behavior equivalent to human intelligence
- **Theoretical foundations**: Established the mathematical framework for computational thinking
- **Wartime contributions**: His work at Bletchley Park during World War II on code-breaking laid crucial groundwork for modern computing
- **Universal computing**: Developed the concept of the Turing machine, a theoretical model of computation

> "A computer would deserve to be called intelligent if it could deceive a human into believing that it was human." - Alan Turing""",
        """## Early AI Pioneers and the Birth of the Field

### John McCarthy: Coining "Artificial Intelligence"

**John McCarthy** (1927-2011) made fundamental contributions to AI:

1. **Terminology**: Coined the term "artificial intelligence" in 1956
2. **Dartmouth Conference**: Organized the 1956 Dartmouth Conference, widely considered the birth of AI as an academic discipline
3. **LISP Programming Language**: Developed LISP, which became fundamental to AI research for decades
4. **Time-sharing systems**: Pioneered concepts in computer time-sharing and cloud computing

### Marvin Minsky: The Society of Mind

**Marvin Minsky** (1927-2016) advanced our understanding of intelligence:

- Co-founded the MIT AI Laboratory
- Made significant contributions to neural networks, robotics, and cognitive science
- Authored "The Society of Mind" proposing that intelligence emerges from simple, unintelligent agents
- Developed early neural network models and perceptrons""",
        """## The Deep Learning Revolution

### The Godfathers of Modern AI

The modern AI renaissance has been shaped by three visionary scientists, collectively known as the **"Godfathers of AI"**:

#### Geoffrey Hinton: The Godfather of Deep Learning
- **Backpropagation**: Pioneered the backpropagation algorithm for training neural networks
- **Deep belief networks**: Advanced understanding of deep neural architectures
- **Capsule networks**: Proposed novel architectures for better spatial understanding

#### Yann LeCun: Computer Vision Pioneer  
- **Convolutional Neural Networks (CNNs)**: Developed CNNs that became essential for computer vision
- **Image recognition**: Revolutionary work in automated image classification
- **Self-supervised learning**: Advanced techniques for learning from unlabeled data

#### Yoshua Bengio: Sequence Modeling Expert
- **Sequence modeling**: Advanced understanding of sequential data processing
- **Attention mechanisms**: Contributed to the development of attention mechanisms in neural networks
- **Generative models**: Pioneered work in generative adversarial networks

### Recognition and Impact

**2018 Turing Award**: These three scientists shared the prestigious 2018 Turing Award for their foundational work in deep learning that enabled the current AI renaissance in applications ranging from:

- Natural language processing and machine translation
- Computer vision and autonomous vehicles  
- Healthcare diagnostics and drug discovery
- Robotics and intelligent automation""",
    ]


def _log_token_usage(rag_ops_instance):
    """Log token usage for a given message"""
    if rag_ops_instance.token_counter:
        logger.info(
            "Embedding Tokens: %s",
            rag_ops_instance.token_counter.total_embedding_token_count,
        )
        logger.info(
            "LLM Prompt Tokens: %s",
            rag_ops_instance.token_counter.prompt_llm_token_count,
        )
        logger.info(
            "LLM Completion Tokens: %s",
            rag_ops_instance.token_counter.completion_llm_token_count,
        )
        logger.info(
            "Total LLM Token Count: %s",
            rag_ops_instance.token_counter.total_llm_token_count,
        )


@pytest.mark.asyncio
async def test_create_index_with_metadata(
    rag_ops_instance, metadata_fields_a, ai_scientists_markdown_content, transformations
):
    """Test index creation with AI scientists markdown content and metadata A"""

    # Use the structured markdown content paragraphs as text chunks
    text_chunks = ai_scientists_markdown_content

    # Create a new index with AI scientists markdown content and metadata
    doc_ids = await rag_ops_instance.create_index(
        text_chunks, metadata=metadata_fields_a, transformations=transformations
    )
    _log_token_usage(rag_ops_instance)
    # Assertions
    assert len(doc_ids) == len(
        text_chunks
    ), "Should return correct number of document IDs"
    assert rag_ops_instance.rag_index is not None, "RAG index should be created"

    logger.info(
        f"Successfully created index with {len(doc_ids)} AI scientists markdown chunks and metadata"
    )


@pytest.mark.asyncio
async def test_query_index(
    rag_ops_instance, ai_scientists_markdown_content, transformations
):
    """Test LLM query with AI scientists content"""

    # Use the structured markdown content paragraphs
    text_chunks = ai_scientists_markdown_content

    # Create an index with the AI scientists markdown content
    await rag_ops_instance.create_index(text_chunks, transformations=transformations)

    # Test query_index with questions about AI scientists
    query = "What is the Turing Test and who created it? Did he win a nobel prize?"
    logger.info(f"Testing query_index with query: '{query}'")
    response = await rag_ops_instance.query_index(query)

    # Log the response
    logger.info(f"Query response: {response.response}")
    _log_token_usage(rag_ops_instance)

    # Assertions
    assert response is not None, "query_index should return a response"
    assert hasattr(response, "response"), "Response should have a response attribute"
    assert isinstance(response.response, str), "Response text should be a string"


@pytest.mark.asyncio
async def test_chat(rag_ops_instance, ai_scientists_markdown_content, transformations):
    """Test conversational query with AI scientists content"""

    # Use the structured markdown content paragraphs
    text_chunks = ai_scientists_markdown_content

    # Create an index with the AI scientists markdown content
    await rag_ops_instance.create_index(text_chunks, transformations=transformations)

    # Test chat_with_index about AI scientists
    message = "Tell me about the three scientists known as the Godfathers of AI"
    chat_history = []  # Empty chat history for first interaction

    logger.info(f"Testing chat_with_index with message: '{message}'")
    response = await rag_ops_instance.chat_with_index(
        curr_message=message, chat_history=chat_history
    )

    # Log the chat response
    logger.info(f"Chat response: {response}")
    _log_token_usage(rag_ops_instance)

    # Assertions
    assert response is not None, "chat_with_index should return a response"
    assert isinstance(response, str), "Chat response should be a string"


@pytest.mark.asyncio
async def test_query_index_with_metadata_a(
    rag_ops_instance,
    metadata_fields_a,
    metadata_fields_b,
    ai_scientists_markdown_content,
    transformations,
):
    """Test metadata filtering by creating index with different metadata and verifying filtering works"""

    # Create content with metadata A (AI scientists)
    ai_chunks = ai_scientists_markdown_content
    await rag_ops_instance.create_index(
        ai_chunks, metadata=metadata_fields_a, transformations=transformations
    )

    # Add different content with metadata B (non-AI content)
    non_ai_chunks = [
        "This is content about cooking recipes. Chocolate chip cookies require flour, sugar, and chocolate chips.",
        "Sports news: The local basketball team won the championship last night.",
        "Weather forecast: Tomorrow will be sunny with a high of 75 degrees.",
    ]
    await rag_ops_instance.insert_text_chunks(
        non_ai_chunks, metadata=metadata_fields_b, transformations=transformations
    )

    # Test query with correct metadata filter (should find AI content)
    query = "Tell me about Alan Turing's contributions to AI"
    logger.info(
        f"Testing with CORRECT metadata filter - query: '{query}', metadata: {metadata_fields_a}"
    )
    response_with_correct_filter = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_a
    )

    logger.info(
        f"Response with CORRECT filter: {response_with_correct_filter.response}"
    )
    _log_token_usage(rag_ops_instance)

    # Test query with incorrect metadata filter (should not find relevant AI content)
    logger.info(
        f"Testing with INCORRECT metadata filter - query: '{query}', metadata: {metadata_fields_b}"
    )
    response_with_wrong_filter = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_b
    )

    logger.info(
        f"Response with INCORRECT filter: {response_with_wrong_filter.response}"
    )
    _log_token_usage(rag_ops_instance)

    # Test query without metadata filter (should potentially find both types of content)
    logger.info(f"Testing WITHOUT metadata filter - query: '{query}'")
    response_without_filter = await rag_ops_instance.query_index(query)

    logger.info(f"Response WITHOUT filter: {response_without_filter.response}")
    _log_token_usage(rag_ops_instance)

    # Assertions
    assert (
        response_with_correct_filter is not None
    ), "Should get response with correct filter"
    assert (
        response_with_wrong_filter is not None
    ), "Should get response with wrong filter"
    assert response_without_filter is not None, "Should get response without filter"

    # The response with correct metadata should contain AI-related content from the indexed documents
    correct_response_text = response_with_correct_filter.response.lower()
    assert (
        "turing" in correct_response_text
        or "artificial intelligence" in correct_response_text
        or "ai" in correct_response_text
    ), "Response with correct metadata filter should contain AI-related content"

    # Key test: Check the source nodes to verify metadata filtering worked correctly
    if hasattr(response_with_correct_filter, "source_nodes"):
        correct_sources = [
            node.metadata.get("source", "")
            for node in response_with_correct_filter.source_nodes
        ]
        logger.info(f"Sources with correct filter: {correct_sources}")
        assert all(
            source == metadata_fields_a["source"] for source in correct_sources
        ), "All source nodes with correct filter should have the correct metadata"

    if hasattr(response_with_wrong_filter, "source_nodes"):
        wrong_sources = [
            node.metadata.get("source", "")
            for node in response_with_wrong_filter.source_nodes
        ]
        logger.info(f"Sources with wrong filter: {wrong_sources}")
        assert all(
            source == metadata_fields_b["source"] for source in wrong_sources
        ), "All source nodes with wrong filter should have the wrong metadata (non-AI content)"

    # The response quality should be different - correct filter should be more detailed about AI topics
    # while wrong filter should be more generic or mention that information is not available in context
    logger.info("✅ Metadata filtering test completed successfully")
    logger.info(
        "✅ Demonstrated that metadata filters correctly restrict which documents are retrieved"
    )


@pytest.mark.asyncio
async def test_metadata_filtering_effectiveness(
    rag_ops_instance,
    metadata_fields_a,
    metadata_fields_b,
    ai_scientists_markdown_content,
    transformations,
):
    """Additional test to verify metadata filtering blocks irrelevant content retrieval"""

    # Create content with metadata A (AI scientists)
    ai_chunks = ai_scientists_markdown_content
    await rag_ops_instance.create_index(
        ai_chunks, metadata=metadata_fields_a, transformations=transformations
    )

    # Add very specific content with metadata B that would be easy to detect if retrieved
    specific_chunks = [
        "The zebra is a unique animal with black and white stripes found in Africa.",
        "Purple elephants dance under the moonlight in magical forests every Tuesday.",
        "The secret recipe for invisible soup contains exactly 42 rainbow crystals.",
    ]
    await rag_ops_instance.insert_text_chunks(
        specific_chunks, metadata=metadata_fields_b, transformations=transformations
    )
    _log_token_usage(rag_ops_instance)

    # Query for AI content with wrong metadata filter - should not retrieve AI content
    query = "What is the Turing Test?"
    response = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_b
    )

    logger.info(
        f"Query for AI content with non-AI metadata filter: {response.response}"
    )
    _log_token_usage(rag_ops_instance)

    # The response should not contain specific AI details from our indexed content
    # because the metadata filter should have blocked access to AI documents
    response_text = response.response.lower()

    # If metadata filtering is working, the response should either:
    # 1. Be very generic (using LLM's prior knowledge)
    # 2. Mention that information is not available in the provided context
    # 3. Reference the non-AI content that was actually retrieved

    specific_ai_terms = [
        "bletchley park",
        "wartime contributions",
        "computational thinking framework",
    ]
    contains_specific_ai = any(term in response_text for term in specific_ai_terms)

    assert (
        not contains_specific_ai
    ), "Response should not contain specific AI details from indexed content when using wrong metadata filter"

    logger.info(
        "✅ Metadata filtering effectively blocked retrieval of irrelevant content"
    )


@pytest.mark.asyncio
async def test_index_persistence(
    temp_index_dir,
    embedding_llm,
    completion_llm,
    metadata_fields_a,
    ai_scientists_markdown_content,
    transformations,
):
    """Test that the AI scientists index is persisted to disk and can be reloaded"""
    # Create an initial RAG ops instance
    initial_rag_ops = InMemRagOps(
        persist_dir=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
    )

    # Use the AI scientists markdown content
    text_chunks = ai_scientists_markdown_content
    doc_ids = await initial_rag_ops.create_index(
        text_chunks, metadata=metadata_fields_a, transformations=transformations
    )
    _log_token_usage(initial_rag_ops)
    assert len(doc_ids) == len(
        text_chunks
    ), f"Should have indexed {len(text_chunks)} documents"

    # Create a new RAG ops instance pointing to the same index location
    # This simulates restarting the application
    reloaded_rag_ops = InMemRagOps(
        persist_dir=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
    )

    # Test that the index was loaded correctly by querying it with AI-related questions
    query = "What is the Turing Test?"
    response = await reloaded_rag_ops.query_index(query)
    _log_token_usage(reloaded_rag_ops)
    # Assertions
    assert response is not None, "Should get a response from the persisted index"
    logger.info(f"Query response from persisted index: {response.response}")

    # Verify content is retrievable with another query about AI scientists
    second_response = await reloaded_rag_ops.query_index(
        "Tell me about Geoffrey Hinton"
    )
    _log_token_usage(reloaded_rag_ops)
    assert (
        second_response is not None
    ), "Should get a response for second query from persisted index"
    logger.info(
        f"Second query response from persisted index: {second_response.response}"
    )
