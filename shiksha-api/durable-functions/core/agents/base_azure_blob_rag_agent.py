import abc
import json
import os
from typing import Dict, Union, Type
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
import tempfile
import logging
import shutil

from rag_wrapper import InMemRagOps, InMemGraphRagOps
from core.blob_store import BlobStore
from core.config import Config
from core.models.workflow_models import RAGInput


class BaseAzureBlobRAGAgent(abc.ABC):
    """
    Base implementation for Azure RAG agents that handles common functionality.

    This class provides the shared implementation for Azure OpenAI setup, blob storage
    management, and generation logic. Concrete implementations must override the
    get_rag_ops_class method to provide their RAG operations class.

    Implements the BaseRagAgent abstract class.
    """

    def __init__(self, index_path: str):
        """
        Initializes the Azure RAG Agent with Azure OpenAI LLM and embedding models.

        Sets up the language model and embedding model using configuration from the
        environment, and initializes the RAG operations by instantiating the class
        returned by get_rag_ops_class.

        Args:
            index_path (str): Path to the RAG index in blob storage.
        """
        # Initialize Azure OpenAI LLM with JSON response format for structured output
        self._llm = AzureOpenAI(
            model=Config.AZURE_OPENAI_MODEL,
            deployment_name=Config.AZURE_OPENAI_MODEL,
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_version=Config.AZURE_OPENAI_API_VERSION,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

        # Initialize Azure OpenAI embedding model
        self._embed_llm = AzureOpenAIEmbedding(
            model=Config.AZURE_OPENAI_EMBED_MODEL,
            deployment_name=Config.AZURE_OPENAI_EMBED_MODEL,
            api_key=Config.AZURE_OPENAI_API_KEY,
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_version=Config.AZURE_OPENAI_API_VERSION,
        )

        # Sanitize index path for file system usage
        index_path = index_path.replace("/", "_")

        # Initialize blob store for downloading index files
        self._blob_store = BlobStore()

        # Set up local index path in temp directory
        self._local_index_path = os.path.join(tempfile.gettempdir(), index_path)

        # Initialize RAG operations using the class provided by the subclass
        rag_ops_class = self.get_rag_ops_class()
        self._rag_ops = rag_ops_class(
            persist_dir=self._local_index_path,
            completion_llm=self._llm,
            emb_llm=self._embed_llm,
        )

    @abc.abstractmethod
    def get_rag_ops_class(self) -> Type[Union[InMemRagOps, InMemGraphRagOps]]:
        """
        Returns the RAG operations class to be instantiated.

        This method must be implemented by subclasses to provide their specific
        RAG operations class.

        Returns:
            Type[Union[InMemRagOps, InMemGraphRagOps]]: The RAG operations class to instantiate.
        """
        pass

    def clear_resources(self) -> None:
        """
        Clears resources associated with the current index path by deleting the downloaded folder.

        This method ensures proper cleanup of temporary files and prevents disk space issues
        from accumulated downloaded indexes.
        """
        if os.path.exists(self._local_index_path):
            try:
                shutil.rmtree(self._local_index_path)
                logging.info(
                    f"Successfully cleared resources at {self._local_index_path}"
                )
            except Exception as e:
                logging.error(
                    f"Failed to clear resources at {self._local_index_path}: {e}"
                )

    async def generate(self, rag_input: RAGInput) -> Union[str, Dict]:
        """
        Generates content using Retrieval-Augmented Generation (RAG).

        Downloads the required RAG index if not present locally, performs retrieval and synthesis
        using the provided queries, and returns the generated content as a string or JSON object.

        Args:
            rag_input (RAGInput): Input containing the index path, retrieval query, and synthesis query.

        Returns:
            Union[str, Dict]: The generated content, either as a JSON object or a string if parsing fails.

        Raises:
            RuntimeError: If index download or initialization fails.
            Exception: For other unexpected errors during generation.
        """
        try:
            # Check if the RAG index exists locally
            index_exists = await self._rag_ops.index_exists()

            if not index_exists:
                logging.info(
                    f"Downloading new RAG index at {self._local_index_path}..."
                )

                # Download index files from blob storage
                downloaded_file_paths = await self._blob_store.download_blobs_to_folder(
                    prefix=rag_input.index_path, target_folder=self._local_index_path
                )

                if not downloaded_file_paths:
                    raise RuntimeError(
                        f"No files downloaded for index path: {rag_input.index_path}"
                    )

                file_paths_str = "\n".join(downloaded_file_paths)
                logging.info(f"Downloaded RAG index files: {file_paths_str}")

            # Initialize the index if needed (for property graph operations)
            if hasattr(self._rag_ops, "initiate_index"):
                await self._rag_ops.initiate_index()

            # Perform query with retrieval and synthesis
            content_text = str(
                await self._rag_ops.query_index(
                    text_str=rag_input.response_synthesis_query,
                )
            )

            # Attempt to parse response as JSON for structured output
            try:
                content = json.loads(content_text.strip("```json").strip("```"))
                logging.info("Successfully parsed RAG response as JSON")
            except json.JSONDecodeError as e:
                logging.warning(f"Failed to parse RAG agent response as JSON: {str(e)}")
                logging.warning(
                    f"Response text: {content_text[:200]}..."
                )  # Log first 200 chars
                content = content_text

            return content

        except Exception as e:
            logging.error(f"Error in RAG generation: {str(e)}")
            raise
