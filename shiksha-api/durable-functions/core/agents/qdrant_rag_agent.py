import json
import os
import tempfile
import logging
import shutil
import abc
from typing import Dict, Union
from core.blob_store import BlobStore
from core.config import Config
from core.models.workflow_models import RAGInput
from rag_wrapper.rag_ops.qdrant_rag_ops import QdrantRagOps


class QdrantRAGAgent:
    """
    RAG agent for Qdrant vector store, handling index management and content generation.
    """

    INDEX_NAME = "qdrant"

    def __init__(self, index_path: str):
        """
        Index path is supposed to be in the format "qdrant/<collection_name>/<metadata_filter_key>:<value>"
        """
        [_, qdrant_collection, metadata_filter_key_val] = index_path.split("/", 2)
        [key, val] = metadata_filter_key_val.split(":", 1)
        self.metadata_filter = {key: val}
        # LLMs
        self._llm = self._get_llm()
        self._embed_llm = self._get_embed_llm()
        # Qdrant RAG ops
        self._rag_ops = QdrantRagOps(
            url=Config.QDRANT_URL,
            collection_name=qdrant_collection,
            api_key=Config.QDRANT_API_KEY,
            emb_llm=self._embed_llm,
            completion_llm=self._llm,
        )

    def _get_llm(self):
        from llama_index.llms.azure_openai import AzureOpenAI

        return AzureOpenAI(
            model=Config.AZURE_OPENAI_MODEL,
            deployment_name=Config.AZURE_OPENAI_MODEL,
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_version=Config.AZURE_OPENAI_API_VERSION,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    def _get_embed_llm(self):
        from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding

        return AzureOpenAIEmbedding(
            model=Config.AZURE_OPENAI_EMBED_MODEL,
            deployment_name=Config.AZURE_OPENAI_EMBED_MODEL,
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_version=Config.AZURE_OPENAI_API_VERSION,
        )

    async def generate(self, rag_input: RAGInput) -> Union[str, Dict]:
        try:
            # Query
            content_text = str(
                await self._rag_ops.query_index(
                    text_str=rag_input.response_synthesis_query,
                    retrieval_query=rag_input.retrieval_query,
                    metadata_filter=self.metadata_filter,
                )
            )
            try:
                content = json.loads(content_text.strip("```json").strip("````"))
                logging.info("Successfully parsed RAG response as JSON")
            except json.JSONDecodeError as e:
                logging.warning(f"Failed to parse RAG agent response as JSON: {str(e)}")
                logging.warning(f"Response text: {content_text[:200]}...")
                content = content_text
            return content
        except Exception as e:
            logging.error(f"Error in Qdrant RAG generation: {str(e)}")
            raise

    def clear_resources(self):
        pass
