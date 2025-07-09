# RAG Wrapper

A Python library for Retrieval-Augmented Generation (RAG) operations using LlamaIndex, supporting document indexing, semantic retrieval, and AI-powered querying.

## Key Features
- **Document Indexing**: Index text chunks with optional metadata
- **Semantic Retrieval**: Find relevant documents using vector similarity
- **Metadata Filtering**: Filter results by document attributes
- **Chat Interface**: Conversational interactions with document collections
- **Azure OpenAI Integration**: Built-in support for Azure OpenAI models
- **Multiple Backends**: Support for in-memory and Azure AI Search backends

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
doc_ids = rag_ops.insert_text(text_chunks, metadata)

# Query the index
response = await rag_ops.query_index("What does the document explain?")

# Retrieve with filtering
results = await rag_ops.retrieve(
    "machine learning", 
    metadata_filter={"type": "manual"}
)

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
    chat_mode="context"  # Options: "context", "condense_question", or "context_condense"
)
```

## Core Classes

### BaseRagOps
Abstract base class defining the RAG interface with methods:
- `retrieve()`: Semantic document retrieval with metadata filtering
- `query_index()`: Generate responses using retrieved context
- `chat_with_index()`: Conversational interactions
- `insert_text()`: Add new documents to the index

### InMemRagOps
In-memory implementation supporting:
- Vector similarity search
- Metadata-based filtering
- Persistent index storage
- Retry logic for robust operations

### AzureAISearchRagOps
Azure AI Search implementation providing:
- Cloud-based vector search
- Managed identity support
- Automatic index creation and management
- Metadata filtering
- Distributed document storage

## Implementing New RAG Backends

To add support for a new RAG backend, create a class that inherits from `BaseRagOps` and implement these methods:

```python
class YourCustomRagOps(BaseRagOps):
    def __init__(self, emb_llm: Any, completion_llm: Any, **kwargs):
        # Initialize your backend connections and resources
        super().__init__(emb_llm, completion_llm)
        
    async def insert_text(self, text_chunks: List[str], metadata: Optional[Dict] = None) -> List[str]:
        # Add documents to your backend
        # Return list of document IDs
        
    async def retrieve(self, query: str, limit: int = 5, metadata_filter: Optional[Dict] = None) -> List[Any]:
        # Retrieve documents from your backend
        # Apply metadata filtering if specified
        # Return list of relevant documents
        
    async def query_index(self, query: str, metadata_filter: Optional[Dict] = None) -> Any:
        # Retrieve documents and generate response
        # Return response with source documents
        
    async def chat_with_index(self, curr_message: str, chat_history: List[Any], 
                              chat_mode: str = "context") -> str:
        # Handle conversation with document context
        # Return response as string
```

Key design considerations:
- Handle authentication securely
- Implement metadata filtering
- Add appropriate error handling and retries
- Optimize for performance with large document collections
- Support async operations for scalability

## Testing

```bash
# Test in-memory RAG
pytest tests/test_in_mem_rag_ops.py -v

# Test Azure AI Search RAG (requires Azure credentials)
pytest tests/test_azure_ai_search_rag_ops.py -v
```

Tests cover document insertion, retrieval, querying, chat interactions, and metadata filtering.
