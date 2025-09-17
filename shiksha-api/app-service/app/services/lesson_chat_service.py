import os
from pathlib import Path
import logging
import re
from collections import OrderedDict
from typing import Optional
from app.config import settings
from app.models.chat import LessonChatRequest
from app.utils.prompt_template import PromptTemplate
from app.services.rag_adapters import BaseRagAdapter, RagAdapterFactory
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

        # Initialize LRU cache for RAG adapter instances (max 32 items)
        self._rag_adapter_cache: OrderedDict[str, BaseRagAdapter] = OrderedDict()
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
            # Get or create cached RAG adapter instance
            rag_adapter = await self._get_or_create_rag_adapter(request.index_path)

            # Initiate the index (download files for InMem, no-op for Qdrant)
            await rag_adapter.initiate_index()

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
            return await rag_adapter.chat_with_index(
                curr_message=chat_messages[-1].content, chat_history=chat_history
            )

        except Exception as e:
            logger.error(f"Error in lesson chat service: {e}", exc_info=True)
            raise

    def _clear_adapter_resources(self, adapter: BaseRagAdapter) -> None:
        """
        Clean up resources used by the RAG adapter.

        Args:
            adapter: The RAG adapter instance to clean up
        """
        try:
            # Use asyncio to run the async cleanup method
            import asyncio

            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Create a task for cleanup if we're in an async context
                asyncio.create_task(adapter.cleanup())
            else:
                loop.run_until_complete(adapter.cleanup())
        except Exception as e:
            logging.error(f"Failed to clean up adapter resources: {e}")

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

    async def _get_or_create_rag_adapter(self, index_path: str) -> BaseRagAdapter:
        """
        Get or create a RAG adapter instance with LRU caching.

        Args:
            index_path: Path to the RAG index

        Returns:
            BaseRagAdapter: Cached or newly created RAG adapter instance
        """
        # Generate cache key using the factory method
        cache_key = index_path

        # Check if adapter instance exists in cache
        if cache_key in self._rag_adapter_cache:
            # Move to end (most recently used)
            adapter = self._rag_adapter_cache.pop(cache_key)
            self._rag_adapter_cache[cache_key] = adapter
            logger.debug(f"Retrieved RAG adapter from cache for: {index_path}")
            return adapter

        # Create new adapter instance
        adapter = RagAdapterFactory.create_adapter(
            index_path=index_path,
            completion_llm=self._completion_llm,
            embedding_llm=self._embedding_llm,
        )

        # Initialize the adapter
        await adapter.initialize()

        # Add to cache and handle LRU eviction
        self._rag_adapter_cache[cache_key] = adapter

        # Remove least recently used item if cache is full
        if len(self._rag_adapter_cache) > self._cache_size:
            oldest_key = next(iter(self._rag_adapter_cache))
            evicted_adapter = self._rag_adapter_cache.pop(oldest_key)

            # Clean up resources for the evicted adapter
            self._clear_adapter_resources(evicted_adapter)

            logger.debug(
                f"Evicted RAG adapter from cache and cleared resources: {oldest_key}"
            )

        logger.debug(f"Created new RAG adapter and cached for: {index_path}")
        return adapter

    def cleanup(self) -> None:
        """Clear the RAG adapter cache and associated resources."""
        # Clean up resources for all cached adapters
        for adapter in self._rag_adapter_cache.values():
            self._clear_adapter_resources(adapter)

        self._rag_adapter_cache.clear()
        logger.info("RAG adapter cache cleared and resources cleaned up")

    def get_cache_info(self) -> dict:
        """
        Get information about the current cache state.

        Returns:
            dict: Dictionary containing cache size and keys
        """
        return {
            "cache_size": len(self._rag_adapter_cache),
            "max_cache_size": self._cache_size,
            "cached_keys": list(self._rag_adapter_cache.keys()),
        }


LESSON_CHAT_SERVICE_INSTANCE = LessonChatService()
