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
from rag_wrapper import QdrantRagOps

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
def qdrant_config():
    return {
        "url": os.getenv("QDRANT_URL", "http://localhost:6333"),
        "collection_name": os.getenv("QDRANT_COLLECTION_NAME", "test_collection"),
        "api_key": os.getenv("QDRANT_API_KEY"),
    }

@pytest.fixture(scope="function")
def rag_ops_instance(qdrant_config, embedding_llm, completion_llm, metadata_fields_a):
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
    rag_ops_instance, ai_scientists_markdown_content, transformations
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
async def test_chat(rag_ops_instance, ai_scientists_markdown_content, transformations):
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
    rag_ops_instance,
    metadata_fields_a,
    metadata_fields_b,
    transformations,
):
    # Create highly specific fictional content that LLM cannot know from training data
    fictional_technical_docs_a = [
        """XQ-7742 Protocol Specification: The quantum entanglement synchronizer operates at 47.832 THz with 
        a crystalline matrix efficiency of 99.2%. Serial number XQ-7742-Alpha requires recalibration every 
        3,847 operational cycles. The flux capacitor integration module (Model: FC-9881-Beta) must maintain 
        temperature at exactly 273.847 Kelvin for optimal performance.""",
        
        """ZV-9351 Security Manual: Access Code Delta-7-7-9-2 grants Level 4 clearance to the Neural Interface 
        Chamber. Dr. Mikhail Volkov's research on Project Constellation shows that the bio-neural implant 
        (Designation: BNI-4492) has a success rate of 87.34% when calibrated with quantum frequency 891.247 MHz.""",
        
        """RT-5563 Maintenance Log: The antimatter containment field generator (Unit ID: ACF-2290) experienced 
        anomalous readings on Stardate 4827.3. Chief Engineer Sarah Chen reported power fluctuations in the 
        primary dilithium chamber, requiring replacement of crystal assembly RT-5563-Gamma."""
    ]
    
    fictional_technical_docs_b = [
        """PS-1188 Manufacturing Guide: The nano-fabrication unit produces exactly 12,847 micro-processors 
        per cycle using Element-X compound (Formula: X₇Y₃Z₁₁). Quality Inspector Maria Santos documented 
        that batch PS-1188-Charlie meets specification tolerance of 0.0034 nanometers.""",
        
        """WK-4429 Energy Report: The fusion reactor core (Reactor ID: FR-8834) achieved 94.7% efficiency 
        during Test Run Omega-Prime. Dr. James Liu's calculations show optimal plasma temperature of 
        15,847,293 Kelvin with magnetic confinement field strength of 47.2 Tesla.""",
        
        """LM-7796 Research Notes: The temporal displacement device created a stable wormhole lasting 
        14.6 seconds. Professor Elena Rodriguez observed chronoton emissions at 662.411 TeV during 
        Experiment LM-7796-Delta, confirming theoretical predictions."""
    ]
    
    # Index first set of documents with metadata_a
    await rag_ops_instance.create_index(
        fictional_technical_docs_a, metadata=metadata_fields_a, transformations=transformations
    )
    
    # Insert second set with different metadata
    await rag_ops_instance.insert_text_chunks(
        fictional_technical_docs_b, metadata=metadata_fields_b, transformations=transformations
    )
    
    # Query that should only be answerable from docs_a (with correct metadata filter)
    query_for_a = "What is the serial number of the quantum entanglement synchronizer and its recalibration cycle?"
    
    logger.info(f"Testing with CORRECT metadata filter - query: '{query_for_a}', metadata: {metadata_fields_a}")
    response_with_correct_filter = await rag_ops_instance.query_index(
        query_for_a, metadata_filter=metadata_fields_a
    )
    logger.info(f"Response with CORRECT filter: {response_with_correct_filter.response}")
    
    logger.info(f"Testing with INCORRECT metadata filter - query: '{query_for_a}', metadata: {metadata_fields_b}")
    response_with_wrong_filter = await rag_ops_instance.query_index(
        query_for_a, metadata_filter=metadata_fields_b
    )
    logger.info(f"Response with INCORRECT filter: {response_with_wrong_filter.response}")
    
    # Verify responses exist
    assert response_with_correct_filter is not None
    assert response_with_wrong_filter is not None
    
    # The correct filter should contain specific information from docs_a
    correct_response_text = response_with_correct_filter.response.lower()
    assert (
        "xq-7742" in correct_response_text 
        or "3,847" in correct_response_text
        or "quantum entanglement" in correct_response_text
    ), f"Response with correct filter should contain specific info from docs_a: {response_with_correct_filter.response}"
    
    # The wrong filter should NOT contain specific information from docs_a
    # Since it can only access docs_b which don't contain XQ-7742 info
    wrong_response_text = response_with_wrong_filter.response.lower()
    assert not (
        "xq-7742" in wrong_response_text and "3,847" in wrong_response_text
    ), f"Response with wrong filter should NOT contain specific XQ-7742 info: {response_with_wrong_filter.response}"
    
    # Verify source metadata if available
    if hasattr(response_with_correct_filter, "source_nodes") and response_with_correct_filter.source_nodes:
        correct_sources = [
            node.metadata.get("source", "")
            for node in response_with_correct_filter.source_nodes
        ]
        logger.info(f"Sources with correct filter: {correct_sources}")
        assert all(
            source == metadata_fields_a["source"] for source in correct_sources
        ), f"All sources should match metadata_a: {correct_sources}"
    
    if hasattr(response_with_wrong_filter, "source_nodes") and response_with_wrong_filter.source_nodes:
        wrong_sources = [
            node.metadata.get("source", "")
            for node in response_with_wrong_filter.source_nodes
        ]
        logger.info(f"Sources with wrong filter: {wrong_sources}")
        assert all(
            source == metadata_fields_b["source"] for source in wrong_sources
        ), f"All sources should match metadata_b: {wrong_sources}"
    
    logger.info("✅ Metadata filtering test completed successfully")
    logger.info("✅ Demonstrated that metadata filters correctly restrict which documents are retrieved")
