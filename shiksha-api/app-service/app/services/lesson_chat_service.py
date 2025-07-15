import os
from pathlib import Path
import logging
import re
import shutil
import tempfile
from collections import OrderedDict
from typing import Optional
from app.config import settings
from app.models.chat import LessonChatRequest
from app.utils.blob_store import BlobStore
from app.utils.prompt_template import PromptTemplate
from rag_wrapper import InMemRagOps
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.llms import ChatMessage

logger = logging.getLogger(__name__)


class LessonChatService:
    """Service for handling lesson chat interactions using RAGWrapper."""

    def __init__(self):
        """Initialize the lesson chat service with LLM models and blob store."""
        # Initialize prompt template with the chat prompts file
        prompts_file_path = (
            Path(__file__).parent.parent.parent / "prompts" / "chat_prompts.yaml"
        )
        self._prompt_template = PromptTemplate(str(prompts_file_path))

        # Initialize Azure OpenAI completion model
        self._completion_llm = AzureOpenAI(
            model=settings.azure_openai_deployment_name,
            deployment_name=settings.azure_openai_deployment_name,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )

        # Initialize Azure OpenAI embedding model
        self._embedding_llm = AzureOpenAIEmbedding(
            model=settings.azure_openai_embed_model,
            deployment_name=settings.azure_openai_embed_model,
            api_key=settings.azure_openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
        )

        # Initialize blob storage for retrieving index files
        self._blob_store = BlobStore()

        # Initialize LRU cache for RAGOps instances (max 32 items)
        self._rag_ops_cache: OrderedDict[str, InMemRagOps] = OrderedDict()
        self._cache_size = 32

    async def __call__(
        self,
        request: LessonChatRequest,
    ) -> str:
        """
        Process a lesson chat request and return the response.

        Args:
            request: The lesson chat request containing messages and index path

        Returns:
            str: The chat response from the RAG system
        """
        try:
            # Create local directory for storing downloaded index files
            index_persist_dir = os.path.join(
                tempfile.gettempdir(), request.index_path.replace("/", "_")
            )

            # Get or create cached RAGOps instance
            rag_ops = self._get_or_create_rag_ops(index_persist_dir)

            # Check if index exists locally, download if not
            index_exists = await rag_ops.index_exists()
            if not index_exists:
                logging.info(f"Downloading new RAG index at {index_persist_dir}...")

                # Download index files from blob storage
                downloaded_file_paths = await self._blob_store.download_blobs_to_folder(
                    prefix=request.index_path, target_folder=index_persist_dir
                )

                if not downloaded_file_paths:
                    raise RuntimeError(
                        f"No files downloaded for index path: {request.index_path}"
                    )

                file_paths_str = "\n".join(downloaded_file_paths)
                logging.info(f"Downloaded RAG index files: {file_paths_str}")

            # Extract chapter details and build system message
            system_message = self._prompt_template.get_prompt_with_variables(
                "lesson_chat", **self._extract_details(request.chapter_id)
            )

            # Convert request messages to chat format
            chat_messages = [
                ChatMessage(role=message.role.value, content=message.message)
                for message in request.messages
            ]

            # Build chat history with system message and previous messages
            chat_history = [
                ChatMessage(role="system", content=system_message)
            ] + chat_messages[:-1]

            # Get response from RAG system using current message and chat history
            return await rag_ops.chat_with_index(
                curr_message=chat_messages[-1].content, chat_history=chat_history
            )

        except Exception as e:
            logger.error(f"Error in lesson chat service: {e}", exc_info=True)
            raise

    def _clear_index_files(self, index_folder) -> None:
        """
        Clean up index files from the specified folder.

        Args:
            index_folder: Path to the folder containing index files to remove
        """
        if os.path.exists(index_folder):
            try:
                shutil.rmtree(index_folder)
                logging.info(f"Successfully cleared resources at {index_folder}")
            except Exception as e:
                logging.error(f"Failed to clear resources at {index_folder}: {e}")

    def _extract_details(self, chapter_id: str):
        """
        Extract chapter details from the chapter ID string.

        Args:
            chapter_id: Formatted string containing chapter metadata

        Returns:
            dict: Dictionary with extracted chapter details (board, medium, grade, etc.)

        Raises:
            ValueError: If chapter_id format is invalid
        """
        # Define regex pattern to parse chapter ID format
        pattern = r"Board=(?P<board>[^,]+),Medium=(?P<medium>[^,]+),Grade=(?P<grade>[^,]+),Subject=(?P<subject>[^,]+),Number=(?P<number>[^,]+),Title=(?P<title>.+)"
        match = re.match(pattern, chapter_id)

        if match:
            return {
                "BOARD": match.group("board"),
                "MEDIUM": match.group("medium"),
                "GRADE": match.group("grade"),
                "SUBJECT": match.group("subject"),
                "CHAPTER_NUMBER": match.group("number"),
                "CHAPTER_TITLE": match.group("title"),
            }
        else:
            raise ValueError(f"Invalid chapter_id format: {chapter_id}")

    def _get_or_create_rag_ops(self, index_persist_dir: str) -> InMemRagOps:
        """
        Get or create a RAGOps instance with LRU caching.

        Args:
            index_persist_dir: Directory path for the RAG index persistence

        Returns:
            InMemRagOps: Cached or newly created RAGOps instance
        """
        # Check if RAGOps instance exists in cache
        if index_persist_dir in self._rag_ops_cache:
            # Move to end (most recently used)
            rag_ops = self._rag_ops_cache.pop(index_persist_dir)
            self._rag_ops_cache[index_persist_dir] = rag_ops
            logger.debug(f"Retrieved RAGOps from cache for: {index_persist_dir}")
            return rag_ops

        # Create new RAGOps instance
        rag_ops = InMemRagOps(
            persist_dir=index_persist_dir,
            completion_llm=self._completion_llm,
            emb_llm=self._embedding_llm,
        )

        # Add to cache and handle LRU eviction
        self._rag_ops_cache[index_persist_dir] = rag_ops

        # Remove least recently used item if cache is full
        if len(self._rag_ops_cache) > self._cache_size:
            oldest_key = next(iter(self._rag_ops_cache))
            evicted_rag_ops = self._rag_ops_cache.pop(oldest_key)

            # Clean up index files for the evicted RAGOps instance
            self._clear_index_files(evicted_rag_ops.persist_dir)

            logger.debug(
                f"Evicted RAGOps from cache and cleared index files: {oldest_key}"
            )

        logger.debug(f"Created new RAGOps and cached for: {index_persist_dir}")
        return rag_ops

    def cleanup(self) -> None:
        """Clear the RAGOps cache and associated index files."""
        # Clean up index files for all cached RAGOps instances
        for rag_ops in self._rag_ops_cache.values():
            self._clear_index_files(rag_ops.persist_dir)

        self._rag_ops_cache.clear()
        logger.info("RAGOps cache cleared and index files cleaned up")

    def get_cache_info(self) -> dict:
        """
        Get information about the current cache state.

        Returns:
            dict: Dictionary containing cache size and keys
        """
        return {
            "cache_size": len(self._rag_ops_cache),
            "max_cache_size": self._cache_size,
            "cached_keys": list(self._rag_ops_cache.keys()),
        }


LESSON_CHAT_SERVICE_INSTANCE = LessonChatService()
