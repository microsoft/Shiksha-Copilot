# RAG Wrapper

A Python library for Retrieval-Augmented Generation (RAG) operations using LlamaIndex, supporting document indexing, semantic retrieval, and AI-powered querying.

## Key Features
- **Document Indexing**: Index text chunks with optional metadata for both vector and graph-based retrieval
- **Semantic Retrieval**: Find relevant documents using vector similarity and graph relationships
- **Knowledge Graph Integration**: Extract entities and relationships for enhanced context understanding
- **Metadata Filtering**: Filter results by document attributes across all backend types
- **Chat Interface**: Conversational interactions with document collections and graph context
- **Azure OpenAI Integration**: Built-in support for Azure OpenAI models for embeddings and completions
- **Multiple Backends**: Support for in-memory, Azure AI Search, and property graph storage backends
- **Flexible Retrieval**: Configurable sub-retrievers for custom retrieval strategies
- **Graph Traversal**: Follow entity relationships with configurable path depth for richer context

## Installation

```bash
pip install -e .
```

## Quick Start

### In-Memory RAG

```python
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from rag_wrapper.rag_ops.in_mem_rag_ops import InMemRagOps

# Initialize models
embedding_model = AzureOpenAIEmbedding(
    model="text-embedding-ada-002",
    api_key="your-api-key",
    azure_endpoint="your-endpoint"
)

completion_model = AzureOpenAI(
    model="gpt-35-turbo",
    api_key="your-api-key", 
    azure_endpoint="your-endpoint"
)

# Create RAG instance
rag_ops = InMemRagOps(
    index_path="./index",
    emb_llm=embedding_model,
    completion_llm=completion_model
)

# Insert documents with metadata
text_chunks = ["Your document content here..."]
metadata = {"source": "document.pdf", "type": "manual"}
doc_ids = await rag_ops.insert_text_chunks(text_chunks, metadata)

# Query the index
response = await rag_ops.query_index("What does the document explain?")

# Chat interface
chat_response = await rag_ops.chat_with_index(
    curr_message="Explain the main concepts",
    chat_history=[]
)
```

### Azure AI Search RAG

```python
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from rag_wrapper.rag_ops.azure_ai_search_rag_ops import AzureAISearchRagOps

# Initialize models
embedding_model = AzureOpenAIEmbedding(
    model="text-embedding-ada-002",
    deployment_name="your-embedding-deployment",
    api_key="your-api-key",
    azure_endpoint="your-endpoint"
)

completion_model = AzureOpenAI(
    model="gpt-35-turbo",
    deployment_name="your-completion-deployment",
    api_key="your-api-key", 
    azure_endpoint="your-endpoint"
)

# Create Azure AI Search RAG instance (using API key)
rag_ops = AzureAISearchRagOps(
    search_service_name="your-search-service",
    index_name="your-index-name",
    emb_llm=embedding_model,
    completion_llm=completion_model,
    api_key="your-search-api-key",
    use_managed_identity=False,
    metadata_fields={"source": "documentation"}
)

# Alternative: Using managed identity (recommended for production)
rag_ops = AzureAISearchRagOps(
    search_service_name="your-search-service",
    index_name="your-index-name",
    emb_llm=embedding_model,
    completion_llm=completion_model,
    use_managed_identity=True,
    metadata_fields={"source": "documentation"}
)

# Create index with text chunks
text_chunks = ["Your Azure documentation content here..."]
doc_ids = await rag_ops.create_index(text_chunks)

# Query with metadata filtering
response = await rag_ops.query_index(
    "How to configure Azure AI Search?",
    metadata_filter={"source": "documentation"}
)

# Chat with conversation history
chat_response = await rag_ops.chat_with_index(
    curr_message="What are the best practices?",
    chat_history=[],
    metadata_filter={"source": "documentation"}
)
```

### Property Graph RAG

```python
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor
from rag_wrapper.rag_ops.in_mem_graph_rag_ops import InMemGraphRagOps

# Initialize models
embedding_model = AzureOpenAIEmbedding(
    model="text-embedding-ada-002",
    api_key="your-api-key",
    azure_endpoint="your-endpoint"
)

completion_model = AzureOpenAI(
    model="gpt-35-turbo",
    api_key="your-api-key", 
    azure_endpoint="your-endpoint"
)

# Create Property Graph RAG instance with custom knowledge extractors
from typing import Literal
entities = Literal["Person", "Organization", "Technology", "Concept"]

rag_ops = InMemGraphRagOps(
    persist_dir="./graph_index",
    emb_llm=embedding_model,
    completion_llm=completion_model,
    embed_kg_nodes=True,  # Enable vector embeddings for graph nodes
    kg_extractors=[
        SchemaLLMPathExtractor(
            llm=completion_model,
            possible_entities=entities,
            strict=False
        )
    ]
)

# Create index with knowledge graph extraction
text_chunks = ["Your document content with entities and relationships..."]
doc_ids = await rag_ops.create_index(text_chunks, metadata={"source": "research"})

# Query with graph-aware context
response = await rag_ops.query_index(
    "What are the relationships between different technologies mentioned?"
)

# Chat with graph context
chat_response = await rag_ops.chat_with_index(
    curr_message="Explain the connections between these concepts",
    chat_history=[]
)

# Use custom sub-retrievers for specific retrieval strategies
from llama_index.core.indices.property_graph import LLMSynonymRetriever, VectorContextRetriever

custom_retrievers = [
    LLMSynonymRetriever(
        graph_store=rag_ops.property_graph_store,
        llm=completion_model,
        include_text=True,
        path_depth=2  # Follow relationships 2 levels deep
    ),
    VectorContextRetriever(
        graph_store=rag_ops.property_graph_store,
        embed_model=embedding_model,
        similarity_top_k=5,
        path_depth=1
    )
]

# Query with custom retrievers
response = await rag_ops.query_index(
    "Find related concepts and their relationships",
    sub_retrievers=custom_retrievers
)
```

## Core Classes

The RAG Wrapper provides two main architectural approaches for document retrieval and querying:

### Base Classes

#### BaseVectorIndexRagOps
Abstract base class for traditional vector-based RAG operations using LlamaIndex. Provides core methods for:
- `query_index()`: Generate responses using retrieved context with metadata filtering
- `chat_with_index()`: Conversational interactions with chat history
- `create_index()`: Create a new vector index from text chunks
- `insert_text_chunks()`: Add new documents to an existing index
- `delete_documents()`: Remove documents from the index
- `persist_index()`: Save index to storage backend (abstract)
- `initiate_index()`: Load existing index from storage (abstract)
- `index_exists()`: Check if index exists in storage (abstract)
- `from_existing_vector_store()`: Create index from existing vector store

Key features:
- Vector similarity search using embeddings
- Metadata-based filtering with exact match filters
- Configurable response synthesis modes (tree_summarize, simple_summarize, etc.)
- Token counting and monitoring
- Retry logic for robust operations
- Support for multiple vector store backends
- Automatic index initialization when querying

#### BaseGraphIndexRagOps
Abstract base class for property graph-based RAG operations using LlamaIndex Property Graph. Provides advanced graph-aware retrieval with:
- `query_index()`: Generate responses using graph context and relationships with optional sub-retrievers
- `chat_with_index()`: Conversational interactions with graph-aware context and optional sub-retrievers
- `create_index()`: Create property graph index with knowledge extraction from text chunks
- `insert_text_chunks()`: Add documents with knowledge graph extraction to existing index
- `delete_documents()`: Remove documents from the graph
- `persist_index()`: Save graph index to storage backend (abstract)
- `initiate_index()`: Load existing graph index from storage (abstract) 
- `index_exists()`: Check if graph index exists in storage (abstract)
- `from_existing_graph_store()`: Create index from existing graph/vector stores
- `add_kg_extractor()`: Add knowledge graph extractors for entity/relation extraction

Key features:
- Entity and relationship extraction from documents using configurable extractors
- Graph traversal for enhanced context retrieval with configurable path depth
- Default knowledge graph extractors (SimpleLLMPathExtractor + ImplicitPathExtractor)
- Sub-retrievers for flexible retrieval strategies (LLMSynonymRetriever, VectorContextRetriever, etc.)
- Path depth control for relationship traversal (default: 1)
- Support for both embedded and non-embedded knowledge graph nodes
- Configurable text inclusion with retrieved graph paths
- Metadata filtering support for graph queries

### Vector Store Implementations

#### InMemRagOps
In-memory vector store implementation extending `BaseVectorIndexRagOps`:
- Local file-based persistence using JSON storage format
- Fast vector similarity search with in-memory operations
- Metadata-based filtering support
- Automatic index loading and saving with `.json` file detection
- Perfect for development, testing, and small-scale deployments
- Requires `index_path`, `emb_llm`, and `completion_llm` parameters

#### AzureAISearchRagOps
Azure AI Search implementation extending `BaseVectorIndexRagOps`:
- Cloud-based vector search with enterprise-grade scalability
- Managed identity and API key authentication support  
- Automatic index creation and management
- Distributed document storage across Azure regions
- Advanced metadata filtering capabilities with custom metadata fields
- Production-ready with high availability and security
- Automatic persistence (no manual `persist_index()` calls needed)
- Requires `search_service_name`, `index_name`, `emb_llm`, and `completion_llm`

### Property Graph Implementations

#### InMemGraphRagOps
In-memory property graph implementation extending `BaseGraphIndexRagOps`:
- Local property graph storage using SimplePropertyGraphStore
- Knowledge graph extraction and relationship mapping with default extractors
- File-based persistence for graph structures (JSON format)
- Support for custom knowledge extractors (SimpleLLMPathExtractor, SchemaLLMPathExtractor, etc.)
- Configurable embedding for knowledge graph nodes (`embed_kg_nodes` parameter)
- Ideal for development and scenarios requiring full control over graph data
- Requires `emb_llm` and `completion_llm` parameters, optional `persist_dir`

## Implementing New RAG Backends

The RAG Wrapper supports two different architectural approaches for implementing new backends:

### Vector Store Backends

To add support for a new vector store backend, create a class that inherits from `BaseVectorIndexRagOps` and implement these methods:

```python
from rag_wrapper.base.base_vector_index_rag_ops import BaseVectorIndexRagOps
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.llms import LLM

class YourCustomVectorRagOps(BaseVectorIndexRagOps):
    def __init__(self, completion_llm: LLM, emb_llm: LLM = None, **kwargs):
        # Initialize your vector store connections and resources
        super().__init__(completion_llm=completion_llm, emb_llm=emb_llm, **kwargs)
        self.vector_store = YourVectorStoreImplementation()
        # Set up storage context with your vector store
        self.storage_context = StorageContext.from_defaults(
            vector_store=self.vector_store
        )
        
    async def persist_index(self):
        """Persist the index to your storage backend."""
        # Implement persistence logic specific to your backend
        if self.rag_index:
            self.rag_index.storage_context.persist(persist_dir=self.your_persist_path)
        
    async def initiate_index(self):
        """Initialize the RAG index only if it already exists."""
        # Check if index exists and load it
        if await self.index_exists():
            # Load existing index from your backend
            self.storage_context = StorageContext.from_defaults(
                persist_dir=self.your_persist_path,
                vector_store=self.vector_store
            )
            self.rag_index = load_index_from_storage(
                storage_context=self.storage_context,
                embed_model=self.emb_llm
            )
        
    async def index_exists(self) -> bool:
        """Check if the index already exists in the storage backend."""
        # Return True if index exists in your backend
        return your_backend_has_index()
```

### Property Graph Backends

To add support for a new property graph backend, create a class that inherits from `BaseGraphIndexRagOps`:

```python
from rag_wrapper.base.base_graph_index_rag_ops import BaseGraphIndexRagOps
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.llms import LLM

class YourCustomGraphRagOps(BaseGraphIndexRagOps):
    def __init__(self, completion_llm: LLM, emb_llm: LLM = None, **kwargs):
        # Initialize your graph store connections and resources
        super().__init__(completion_llm=completion_llm, emb_llm=emb_llm, **kwargs)
        self.property_graph_store = YourCustomGraphStore()
        # Initialize vector store if needed for hybrid retrieval
        self.vector_store = YourVectorStore() if self.embed_kg_nodes else None
        self.storage_context = StorageContext.from_defaults(
            property_graph_store=self.property_graph_store,
            vector_store=self.vector_store
        )
        
    async def persist_index(self):
        """Persist the property graph index to storage backend."""
        # Implement persistence logic for your graph backend
        if self.rag_index:
            self.rag_index.storage_context.persist(persist_dir=self.your_persist_path)
        
    async def initiate_index(self):
        """Initialize the property graph index from existing storage."""
        if await self.index_exists():
            # Load existing graph index from your backend
            self.storage_context = StorageContext.from_defaults(
                persist_dir=self.your_persist_path,
                property_graph_store=self.property_graph_store,
                vector_store=self.vector_store
            )
            self.rag_index = load_index_from_storage(
                storage_context=self.storage_context,
                embed_model=self.emb_llm if self.embed_kg_nodes else None,
                llm=self.completion_llm
            )
            
    async def index_exists(self) -> bool:
        """Check if the property graph index exists in storage."""
        # Return True if graph index exists in your backend
        return your_graph_backend_has_index()
```

### Key Design Considerations

**For Vector Store Backends:**
- Handle authentication securely (API keys, managed identity, etc.)
- Implement efficient vector similarity search
- Support metadata filtering with exact match capabilities
- Add appropriate error handling and retries
- Optimize for performance with large document collections
- Support async operations for scalability

**For Property Graph Backends:**
- Implement graph storage and retrieval efficiently
- Support entity and relationship extraction
- Handle knowledge graph traversal with configurable path depth
- Support both embedded and non-embedded graph nodes
- Provide flexible sub-retriever implementations
- Maintain graph consistency during document updates and deletions

**Common Patterns:**
- Use dependency injection for external services
- Implement comprehensive logging for debugging
- Add configuration validation in constructors
- Support both synchronous and asynchronous operations
- Follow LlamaIndex patterns for storage contexts and index management

## Testing

```bash
# Test in-memory vector RAG operations
pytest tests/test_in_mem_rag_ops.py -v

# Test Azure AI Search vector RAG operations (requires Azure credentials)
pytest tests/test_azure_ai_search_rag_ops.py -v

# Test in-memory property graph RAG operations
pytest tests/test_property_graph_rag_ops.py -v
```

Tests cover:
- **Vector Operations**: Document insertion, retrieval, querying, chat interactions, and metadata filtering
- **Graph Operations**: Knowledge graph extraction, entity/relationship mapping, graph traversal, and sub-retriever functionality
- **Integration**: End-to-end workflows combining vector and graph capabilities
- **Error Handling**: Robust error scenarios and recovery mechanisms
