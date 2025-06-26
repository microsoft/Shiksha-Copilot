# RAG Wrapper

## Introduction
This is a RAG (Retrieval-Augmented Generation) wrapper library that provides functionality for document indexing, text retrieval, and question answering using various backend implementations.

## Key Features
- **Document indexing**: Efficiently index documents for fast retrieval
- **Text retrieval**: Retrieve relevant text chunks based on semantic similarity
- **Question answering**: Generate answers based on retrieved context
- **Multiple backends**: Support for in-memory and Azure AI Search implementations

## Installation

```bash
pip install -e .
```

## Usage

### Basic Example

```python
from rag_wrapper.rag_ops.in_mem_rag_ops import InMemRagOps

# Initialize the RAG operations
rag_ops = InMemRagOps(
    index_path="./index",
    emb_llm=embedding_model,
    completion_llm=completion_model
)

# Insert text chunks
text_chunks = ["Document content here..."]
doc_ids = rag_ops.insert_text(text_chunks)

# Query the index
results = rag_ops.query("What is this document about?")
```

## Architecture

The library is built with a modular architecture:

- `base/`: Contains base classes and interfaces
- `rag_ops/`: Implementation of different RAG operations
  - `in_mem_rag_ops.py`: In-memory implementation
  - `azure_ai_search_rag_ops.py`: Azure AI Search implementation

## Testing

Run the tests using pytest:

```bash
pytest tests/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
