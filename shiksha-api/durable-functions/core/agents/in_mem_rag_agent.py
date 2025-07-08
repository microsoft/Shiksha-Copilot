import json
import os
from typing import Dict, Union
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from rag_wrapper import InMemRagOps
import tempfile
import logging

from core.agents.base_rag_agent import BaseRagAgent
from core.blob_store import BlobStore
from core.config import Config
from core.models.workflow_models import RAGInput
import shutil


class InMemRAGAgent(BaseRagAgent):
    """
    Handles Retrieval-Augmented Generation (RAG) operations using Azure OpenAI services.

    This class manages the setup of LLM and embedding models, downloads and manages RAG indexes,
    and provides an interface to generate content using RAG workflows.

    Implements the BaseRagAgent abstract class.
    """

    def __init__(self, index_path: str):
        """
        Initializes the InMemRAGAgent with Azure OpenAI LLM and embedding models.

        Sets up the language model and embedding model using configuration from the environment.
        """
        self._llm = AzureOpenAI(
            model=Config.AZURE_OPENAI_MODEL,
            deployment_name=Config.AZURE_OPENAI_MODEL,
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_version=Config.AZURE_OPENAI_API_VERSION,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

        self._embed_llm = AzureOpenAIEmbedding(
            model=Config.AZURE_OPENAI_EMBED_MODEL,
            deployment_name=Config.AZURE_OPENAI_EMBED_MODEL,
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_version=Config.AZURE_OPENAI_API_VERSION,
        )

        logging.info(f"Creating InMemRAGAgent with index path {index_path} ...")
        index_path = index_path.replace("/", "_")
        self._blob_store = BlobStore()
        self._local_index_path = os.path.join(tempfile.gettempdir(), index_path)
        self._rag_ops = InMemRagOps(
            index_path=self._local_index_path,
            completion_llm=self._llm,
            emb_llm=self._embed_llm,
        )

    def clear_resources(self) -> None:
        """
        Clears resources associated with the current index path by deleting the downloaded folder.
        """
        if os.path.exists(self._local_index_path):
            shutil.rmtree(self._local_index_path)

    async def generate(self, rag_input: RAGInput) -> Union[str, Dict]:
        """
        Generates a section using Retrieval-Augmented Generation (RAG).

        Downloads the required RAG index if not present locally, performs retrieval and synthesis
        using the provided queries, and returns the generated content as a string or JSON object.

        Args:
            rag_input (RAGInput): Input containing the index path, retrieval query, and synthesis query.

        Returns:
            Union[str, Dict]: The generated content, either as a JSON object or a string if parsing fails.
        """
        index_exists = await self._rag_ops.index_exists()
        if not index_exists:
            logging.info(f"Downloading new RAG index at {self._local_index_path} ...")

            downloaded_file_paths = await self._blob_store.download_blobs_to_folder(
                prefix=rag_input.index_path, target_folder=self._local_index_path
            )
            fp = "\n".join(downloaded_file_paths)
            logging.info(f"Downloaded RAG index files: {fp}")

        content_text = str(
            await self._rag_ops.query_index(
                text_str=rag_input.response_synthesis_query,
                retrieval_query=rag_input.retrieval_query,
            )
        )

        try:
            content = json.loads(content_text.strip("```json").strip("```"))
        except Exception as e:
            logging.warning(f"Failed to parse RAG agent response as JSON: {str(e)}")
            content = content_text

        return content
