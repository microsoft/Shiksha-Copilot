"""
RAG Wrapper - A simple RAG wrapper for easy-to-use APIs to create, update or query indexes using llama index library.

This package provides implementations for different vector stores and RAG operations:
- InMemRagOps: In-memory vector store implementation
- AzureAISearchRagOps: Azure AI Search vector store implementation
"""

from .base.base_vector_index_rag_ops import BaseVectorIndexRagOps
from .base.base_graph_index_rag_ops import BaseGraphIndexRagOps
from .rag_ops.in_mem_rag_ops import InMemRagOps
from .rag_ops.azure_ai_search_rag_ops import AzureAISearchRagOps
from .rag_ops.in_mem_graph_rag_ops import InMemGraphRagOps

__version__ = "1.0.0"
__all__ = [
    "BaseVectorIndexRagOps",
    "BaseGraphIndexRagOps",
    "InMemRagOps",
    "AzureAISearchRagOps",
    "InMemGraphRagOps",
]
