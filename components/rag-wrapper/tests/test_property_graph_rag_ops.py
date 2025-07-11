"""
Property Graph RAG Operations Tests

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
from typing import List, Literal
import uuid
from dotenv import load_dotenv

from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor
from rag_wrapper.rag_ops.in_mem_graph_rag_ops import InMemGraphRagOps
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter

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
def metadata_fields():
    """Source metadata for group A test documents"""
    return {
        "source": "a_test_graph_rag_ops",
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
    """Initialize Azure OpenAI completion model and log environment values"""
    model = os.getenv("AZURE_OPENAI_COMPLETION_MODEL", "gpt-35-turbo")
    deployment_name = os.getenv("AZURE_OPENAI_COMPLETION_DEPLOYMENT", "gpt-35-turbo")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

    logger.info(
        f"\nAzure OpenAI Completion Model Env: "
        f"\nmodel={model}, deployment_name={deployment_name}, "
        f"\napi_key={'set' if api_key else 'not set'}, "
        f"\nazure_endpoint={azure_endpoint}, \napi_version={api_version}"
    )

    return AzureOpenAI(
        model=model,
        deployment_name=deployment_name,
        api_key=api_key,
        azure_endpoint=azure_endpoint,
        api_version=api_version,
    )


@pytest.fixture
def transformations():
    return [MarkdownNodeParser(), SentenceSplitter(chunk_size=512, chunk_overlap=50)]


@pytest.fixture
def temp_index_dir():
    """Create a directory for testing index storage inside tests/indexes"""
    # Get the tests directory path
    tests_dir = os.path.dirname(__file__)
    indexes_dir = os.path.join(tests_dir, "indexes")

    # Create indexes directory if it doesn't exist
    os.makedirs(indexes_dir, exist_ok=True)

    # Create a unique subdirectory for this test run
    test_index_dir = os.path.join(
        indexes_dir, f"test_in_mem_property_graph_{uuid.uuid4().hex}"
    )
    os.makedirs(test_index_dir, exist_ok=True)

    yield test_index_dir


@pytest.fixture(scope="function")
def graph_rag_ops_instance(temp_index_dir, embedding_llm, completion_llm):
    """Create an InMemGraphRagOps instance for testing"""
    return InMemGraphRagOps(
        persist_dir=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
        embed_kg_nodes=True,  # Enable embedding for real tests
    )


@pytest.fixture(scope="function")
def graph_rag_ops_instance_with_schema_extractor(
    temp_index_dir, embedding_llm, completion_llm
):
    """Create an InMemGraphRagOps instance for testing"""
    entities = Literal[
        "Alan Turing",
        "John McCarthy",
        "Marvin Minsky",
        "Geoffrey Hinton",
        "Yann LeCun",
        "Yoshua Bengio",
    ]
    return InMemGraphRagOps(
        persist_dir=temp_index_dir,
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
        embed_kg_nodes=True,  # Enable embedding for real tests
        kg_extractors=[
            SchemaLLMPathExtractor(
                llm=completion_llm,
                possible_entities=entities,
                strict=False,
            )
        ],
    )


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


# Integration tests with real Azure OpenAI LLMs
# @pytest.mark.asyncio
# async def test_create_index_with_metadata(
#     graph_rag_ops_instance: InMemGraphRagOps,
#     metadata_fields,
#     ai_scientists_markdown_content,
# ):
#     """Test index creation with AI scientists markdown content and metadata A"""

#     # Use the structured markdown content paragraphs as text chunks
#     text_chunks = ai_scientists_markdown_content

#     # Create a new index with AI scientists markdown content and metadata
#     doc_ids = await graph_rag_ops_instance.create_index(
#         text_chunks, metadata=metadata_fields
#     )

#     # Assertions
#     assert len(doc_ids) == len(
#         text_chunks
#     ), "Should return correct number of document IDs"
#     assert graph_rag_ops_instance.rag_index is not None, "RAG index should be created"

#     logger.info(
#         f"Successfully created graph index with {len(doc_ids)} AI scientists markdown chunks and metadata"
#     )


# @pytest.mark.asyncio
# async def test_query_index(
#     graph_rag_ops_instance: InMemGraphRagOps,
#     ai_scientists_markdown_content,
#     transformations,
# ):
#     """Test LLM query with AI scientists content"""

#     # Use the structured markdown content paragraphs
#     text_chunks = ai_scientists_markdown_content

#     # Create an index with the AI scientists markdown content
#     await graph_rag_ops_instance.create_index(
#         text_chunks, transformations=transformations
#     )

#     # Test query_index with questions about AI scientists
#     query = "What is the Turing Test and who created it?"
#     logger.info(f"Testing query_index with query: '{query}'")
#     response = await graph_rag_ops_instance.query_index(query)

#     # Log the response
#     logger.info(f"Query response: {response.response}")

#     # Assertions
#     assert response is not None, "query_index should return a response"
#     assert hasattr(response, "response"), "Response should have a response attribute"
#     assert isinstance(response.response, str), "Response text should be a string"


# @pytest.mark.asyncio
# async def test_chat(
#     graph_rag_ops_instance: InMemGraphRagOps,
#     ai_scientists_markdown_content,
#     transformations,
# ):
#     """Test conversational query with AI scientists content"""

#     # Use the structured markdown content paragraphs
#     text_chunks = ai_scientists_markdown_content

#     # Create an index with the AI scientists markdown content
#     await graph_rag_ops_instance.create_index(
#         text_chunks, transformations=transformations
#     )

#     # Test chat_with_index about AI scientists
#     message = "Tell me about the three scientists known as the Godfathers of AI"
#     chat_history = []  # Empty chat history for first interaction

#     logger.info(f"Testing chat_with_index with message: '{message}'")
#     response = await graph_rag_ops_instance.chat_with_index(
#         curr_message=message, chat_history=chat_history
#     )

#     # Log the chat response
#     logger.info(f"Chat response: {response}")

#     # Assertions
#     assert response is not None, "chat_with_index should return a response"
#     assert isinstance(response, str), "Chat response should be a string"


# @pytest.mark.asyncio
# async def test_index_persistence(
#     temp_index_dir,
#     embedding_llm,
#     completion_llm,
#     metadata_fields,
#     ai_scientists_markdown_content,
#     transformations,
# ):
#     """Test that the AI scientists index is persisted to disk and can be reloaded"""
#     # Create an initial RAG ops instance
#     initial_graph_rag_ops = InMemGraphRagOps(
#         persist_dir=temp_index_dir,
#         emb_llm=embedding_llm,
#         completion_llm=completion_llm,
#         embed_kg_nodes=True,
#     )

#     # Use the AI scientists markdown content
#     text_chunks = ai_scientists_markdown_content
#     doc_ids = await initial_graph_rag_ops.create_index(
#         text_chunks, metadata=metadata_fields, transformations=transformations
#     )
#     assert len(doc_ids) == len(
#         text_chunks
#     ), f"Should have indexed {len(text_chunks)} documents"

#     # Create a new RAG ops instance pointing to the same index location
#     # This simulates restarting the application
#     reloaded_graph_rag_ops = InMemGraphRagOps(
#         persist_dir=temp_index_dir,
#         emb_llm=embedding_llm,
#         completion_llm=completion_llm,
#         embed_kg_nodes=True,
#     )

#     # Test that the index was loaded correctly by querying about AI scientists
#     query = "Who shared the 2018 Turing Award for deep learning?"
#     response = await reloaded_graph_rag_ops.query_index(query)
#     assert response is not None, "Should get a response from the persisted index"
#     logger.info(f"Query response from persisted index: {response.response}")


# @pytest.mark.asyncio
# async def test_metadata_filtering(
#     graph_rag_ops_instance: InMemGraphRagOps,
#     ai_scientists_markdown_content,
#     transformations,
# ):
#     """Test metadata filtering with single field filter"""

#     # Create documents with different source metadata
#     text_chunks = ai_scientists_markdown_content
#     metadata_source_1 = {"source": "research_papers"}
#     metadata_source_2 = {"source": "textbooks"}
#     metadata_source_3 = {"source": "wikipedia"}

#     # Create index with first document
#     await graph_rag_ops_instance.create_index(
#         [text_chunks[0]], metadata=metadata_source_1, transformations=transformations
#     )

#     if len(text_chunks) > 1:
#         await graph_rag_ops_instance.insert_text_chunks(
#             [text_chunks[1]],
#             metadata=metadata_source_2,
#         )

#     if len(text_chunks) > 2:
#         await graph_rag_ops_instance.insert_text_chunks(
#             [text_chunks[2]],
#             metadata=metadata_source_3,
#         )

#     # Query about Turing Test - only answerable by document 0 (research_papers)
#     query_1 = "What is the Turing Test and when was it proposed?"
#     # Query about LISP programming language - only answerable by document 1 (textbooks)
#     query_2 = "Who developed the LISP programming language and what conference did they organize?"
#     # Query about 2018 Turing Award winners - only answerable by document 2 (wikipedia)
#     query_3 = "Which three scientists shared the 2018 Turing Award for deep learning?"

#     response_for_metadata_1 = await graph_rag_ops_instance.query_index(
#         text_str=query_2, metadata_filter=metadata_source_1
#     )
#     logger.info(f"Response for metadata source 1: {response_for_metadata_1.response}")
#     assert (
#         "empty response" in str(response_for_metadata_1.response).lower()
#     ), "Should return empty response"

#     response_for_metadata_2 = await graph_rag_ops_instance.query_index(
#         text_str=query_3, metadata_filter=metadata_source_2
#     )
#     logger.info(f"Response for metadata source 2: {response_for_metadata_2.response}")
#     assert (
#         "empty response" in str(response_for_metadata_2.response).lower()
#     ), "Should return empty response"

#     response_for_metadata_3 = await graph_rag_ops_instance.query_index(
#         text_str=query_1, metadata_filter=metadata_source_3
#     )
#     logger.info(f"Response for metadata source 3: {response_for_metadata_3.response}")
#     assert (
#         "empty response" in str(response_for_metadata_3.response).lower()
#     ), "Should return empty response"

#     response = await graph_rag_ops_instance.query_index(
#         text_str=query_1,
#     )
#     logger.info(f"Response for correct metadata: {response.response}")
#     assert (
#         "empty response" not in str(response.response).lower()
#     ), "Should NOT return empty response"


@pytest.mark.asyncio
async def test_query_index_with_schema_extractor(
    graph_rag_ops_instance_with_schema_extractor: InMemGraphRagOps,
    ai_scientists_markdown_content,
    transformations,
):
    """Test query_index with schema-based knowledge graph extraction"""

    # Use the structured markdown content paragraphs
    text_chunks = ai_scientists_markdown_content

    # Create an index with the AI scientists markdown content using schema extractor
    await graph_rag_ops_instance_with_schema_extractor.create_index(
        text_chunks, transformations=transformations
    )

    # Test query_index with questions about specific AI scientists defined in schema
    query = (
        "What are the main contributions of Geoffrey Hinton to artificial intelligence?"
    )
    logger.info(f"Testing query_index with schema extractor, query: '{query}'")
    response = await graph_rag_ops_instance_with_schema_extractor.query_index(query)

    # Log the response
    logger.info(f"Schema extractor query response: {response.response}")

    # Assertions
    assert response is not None, "query_index should return a response"
    assert hasattr(response, "response"), "Response should have a response attribute"
    assert isinstance(response.response, str), "Response text should be a string"
    assert len(response.response.strip()) > 0, "Response should not be empty"

    # Test another query about entities defined in the schema
    query2 = (
        "Who are Alan Turing and John McCarthy, and what did they contribute to AI?"
    )
    logger.info(f"Testing second query with schema extractor: '{query2}'")
    response2 = await graph_rag_ops_instance_with_schema_extractor.query_index(query2)

    logger.info(f"Second schema extractor query response: {response2.response}")
    assert response2 is not None, "Second query should return a response"
    assert isinstance(
        response2.response, str
    ), "Second response text should be a string"
    assert len(response2.response.strip()) > 0, "Second response should not be empty"
