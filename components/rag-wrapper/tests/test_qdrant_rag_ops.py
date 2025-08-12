"""
Qdrant RAG Operations Tests

Tests require a running Qdrant service and OpenAI API with these environment variables:

Required:
- QDRANT_URL: Qdrant service URL (e.g., http://localhost:6333)
- QDRANT_COLLECTION_NAME: Collection name for testing

Optional:
- QDRANT_API_KEY: Qdrant API key (if required)

Note: Creates real data in Qdrant and may incur costs if using paid OpenAI endpoints.
"""

import pytest
import os
import logging
from typing import List
from dotenv import load_dotenv

from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.llms import ChatMessage
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from rag_wrapper.base.base_vector_index_rag_ops import BaseVectorIndexRagOps
from rag_wrapper.rag_ops.qdrant_rag_ops import QdrantRagOps

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logging.getLogger("llama_index").setLevel(logging.WARNING)
logging.getLogger().setLevel(logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

@pytest.fixture
def metadata_fields_a():
    return {
        "source": "a_test_qdrant_rag_ops",
        "created_date": "2025-06-27",
    }

@pytest.fixture
def metadata_fields_b():
    return {
        "source": "b_test_qdrant_rag_ops",
        "created_date": "2025-06-27",
    }

@pytest.fixture
def embedding_llm():
    """Initialize Azure OpenAI embedding model and print credentials"""
    model = os.getenv("AZURE_OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")
    deployment_name = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    print(f"Embedding Model: {model}")
    print(f"Deployment Name: {deployment_name}")
    print(f"API Key: {api_key}")
    print(f"Azure Endpoint: {azure_endpoint}")
    print(f"API Version: {api_version}")
    return AzureOpenAIEmbedding(
        model=model,
        deployment_name=deployment_name,
        api_key=api_key,
        azure_endpoint=azure_endpoint,
        api_version=api_version,
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
def qdrant_config():
    return {
        "url": os.getenv("QDRANT_URL", "http://localhost:6333"),
        "collection_name": os.getenv("QDRANT_COLLECTION_NAME", "test_collection"),
        "api_key": os.getenv("QDRANT_API_KEY"),
    }

@pytest.fixture(scope="function")
def rag_ops_instance(qdrant_config, embedding_llm, completion_llm, metadata_fields_a) -> BaseVectorIndexRagOps:
    return QdrantRagOps(
        url=qdrant_config["url"],
        collection_name=qdrant_config["collection_name"],
        emb_llm=embedding_llm,
        completion_llm=completion_llm,
        api_key=qdrant_config["api_key"],
    )

@pytest.fixture
def transformations():
    return [MarkdownNodeParser(), SentenceSplitter(chunk_size=512, chunk_overlap=50)]

@pytest.fixture
def ai_scientists_markdown_content():
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

@pytest.mark.asyncio
async def test_create_index_with_metadata(
    rag_ops_instance, metadata_fields_a, ai_scientists_markdown_content, transformations
):
    text_chunks = ai_scientists_markdown_content
    doc_ids = await rag_ops_instance.create_index(
        text_chunks, metadata=metadata_fields_a, transformations=transformations
    )
    assert len(doc_ids) == len(text_chunks)
    assert rag_ops_instance.rag_index is not None
    logger.info(f"Successfully created index with {len(doc_ids)} AI scientists markdown chunks and metadata")

@pytest.mark.asyncio
async def test_query_index(
    rag_ops_instance: BaseVectorIndexRagOps, ai_scientists_markdown_content, transformations
):
    text_chunks = ai_scientists_markdown_content
    await rag_ops_instance.create_index(text_chunks, transformations=transformations)
    query = "What is the Turing Test and who created it?"
    logger.info(f"Testing query_index with query: '{query}'")
    response = await rag_ops_instance.query_index(query)
    logger.info(f"Query response: {response.response}")
    assert response is not None
    assert hasattr(response, "response")
    assert isinstance(response.response, str)

@pytest.mark.asyncio
async def test_chat(rag_ops_instance: BaseVectorIndexRagOps, ai_scientists_markdown_content, transformations):
    text_chunks = ai_scientists_markdown_content
    await rag_ops_instance.create_index(text_chunks, transformations=transformations)
    message = "Tell me about the three scientists known as the Godfathers of AI"
    chat_history = []
    logger.info(f"Testing chat_with_index with message: '{message}'")
    response = await rag_ops_instance.chat_with_index(
        curr_message=message, chat_history=chat_history
    )
    logger.info(f"Chat response: {response}")
    assert response is not None
    assert isinstance(response, str)

@pytest.mark.asyncio
async def test_query_index_with_metadata_filtering(
    rag_ops_instance: BaseVectorIndexRagOps,
    metadata_fields_a,
    metadata_fields_b,
    ai_scientists_markdown_content,
    transformations,
):
    ai_chunks = ai_scientists_markdown_content
    await rag_ops_instance.create_index(
        ai_chunks, metadata=metadata_fields_a, transformations=transformations
    )
    non_ai_chunks = [
        "This is content about cooking recipes. Chocolate chip cookies require flour, sugar, and chocolate chips.",
        "Sports news: The local basketball team won the championship last night.",
        "Weather forecast: Tomorrow will be sunny with a high of 75 degrees.",
    ]
    await rag_ops_instance.insert_text_chunks(
        non_ai_chunks, metadata=metadata_fields_b, transformations=transformations
    )
    query = "Tell me about Alan Turing's contributions to AI"
    logger.info(f"Testing with CORRECT metadata filter - query: '{query}', metadata: {metadata_fields_a}")
    response_with_correct_filter = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_a
    )
    logger.info(f"Response with CORRECT filter: {response_with_correct_filter.response}")
    logger.info(f"Testing with INCORRECT metadata filter - query: '{query}', metadata: {metadata_fields_b}")
    response_with_wrong_filter = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_b
    )
    logger.info(f"Response with INCORRECT filter: {response_with_wrong_filter.response}")
    logger.info(f"Testing WITHOUT metadata filter - query: '{query}'")
    response_without_filter = await rag_ops_instance.query_index(query)
    logger.info(f"Response WITHOUT filter: {response_without_filter.response}")
    assert response_with_correct_filter is not None
    assert response_with_wrong_filter is not None
    assert response_without_filter is not None
    correct_response_text = response_with_correct_filter.response.lower()
    assert (
        "turing" in correct_response_text
        or "artificial intelligence" in correct_response_text
        or "ai" in correct_response_text
    )
    if hasattr(response_with_correct_filter, "source_nodes"):
        correct_sources = [
            node.metadata.get("source", "")
            for node in response_with_correct_filter.source_nodes
        ]
        logger.info(f"Sources with correct filter: {correct_sources}")
        assert all(
            source == metadata_fields_a["source"] for source in correct_sources
        )
    if hasattr(response_with_wrong_filter, "source_nodes"):
        wrong_sources = [
            node.metadata.get("source", "")
            for node in response_with_wrong_filter.source_nodes
        ]
        logger.info(f"Sources with wrong filter: {wrong_sources}")
        assert all(
            source == metadata_fields_b["source"] for source in wrong_sources
        )
    logger.info("✅ Metadata filtering test completed successfully")
    logger.info("✅ Demonstrated that metadata filters correctly restrict which documents are retrieved")

@pytest.mark.asyncio
async def test_metadata_filtering_effectiveness(
    rag_ops_instance: BaseVectorIndexRagOps,
    metadata_fields_a,
    metadata_fields_b,
    ai_scientists_markdown_content,
    transformations,
):
    ai_chunks = ai_scientists_markdown_content
    await rag_ops_instance.create_index(
        ai_chunks, metadata=metadata_fields_a, transformations=transformations
    )
    specific_chunks = [
        "The zebra is a unique animal with black and white stripes found in Africa.",
        "Purple elephants dance under the moonlight in magical forests every Tuesday.",
        "The secret recipe for invisible soup contains exactly 42 rainbow crystals.",
    ]
    await rag_ops_instance.insert_text_chunks(
        specific_chunks, metadata=metadata_fields_b, transformations=transformations
    )
    query = "What is the Turing Test?"
    response = await rag_ops_instance.query_index(
        query, metadata_filter=metadata_fields_b
    )
    logger.info(f"Query for AI content with non-AI metadata filter: {response.response}")
    response_text = response.response.lower()
    specific_ai_terms = [
        "bletchley park",
        "wartime contributions",
        "computational thinking framework",
    ]
    contains_specific_ai = any(term in response_text for term in specific_ai_terms)
    assert not contains_specific_ai
    logger.info("✅ Metadata filtering effectively blocked retrieval of irrelevant content")
