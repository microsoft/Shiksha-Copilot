import logging
import asyncio
from collections import OrderedDict
from typing import Optional
from app.services.rag_adapters import BaseRagAdapter, RagAdapterFactory

logger = logging.getLogger(__name__)


class RagAdapterCache:
    """
    A centralized LRU cache manager for RAG adapter instances.

    This class provides caching functionality to reuse RAG adapter instances
    across multiple requests, reducing initialization overhead and improving
    performance.
    """

    def __init__(self, max_cache_size: int = 32):
        """
        Initialize the RAG adapter cache.

        Args:
            max_cache_size: Maximum number of adapters to cache (default: 32)
        """
        self._rag_adapter_cache: OrderedDict[str, BaseRagAdapter] = OrderedDict()
        self._cache_size = max_cache_size

    async def get_or_create_adapter(
        self,
        index_path: str,
        completion_llm,
        embedding_llm,
    ) -> BaseRagAdapter:
        """
        Get or create a RAG adapter instance with LRU caching.

        Args:
            index_path: Path to the RAG index
            completion_llm: Completion language model instance
            embedding_llm: Embedding language model instance

        Returns:
            BaseRagAdapter: Cached or newly created RAG adapter instance
        """
        # Generate cache key using the index path
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
            completion_llm=completion_llm,
            embedding_llm=embedding_llm,
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
            await self._clear_adapter_resources(evicted_adapter)

            logger.debug(
                f"Evicted RAG adapter from cache and cleared resources: {oldest_key}"
            )

        logger.debug(f"Created new RAG adapter and cached for: {index_path}")
        return adapter

    async def _clear_adapter_resources(self, adapter: BaseRagAdapter) -> None:
        """
        Clean up resources used by the RAG adapter.

        Args:
            adapter: The RAG adapter instance to clean up
        """
        try:
            await adapter.cleanup()
        except Exception as e:
            logger.error(f"Failed to clean up adapter resources: {e}")

    async def cleanup(self) -> None:
        """Clear the RAG adapter cache and associated resources."""
        # Clean up resources for all cached adapters
        cleanup_tasks = [
            self._clear_adapter_resources(adapter)
            for adapter in self._rag_adapter_cache.values()
        ]

        if cleanup_tasks:
            await asyncio.gather(*cleanup_tasks, return_exceptions=True)

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


# Global cache instance that can be shared across services
RAG_ADAPTER_CACHE = RagAdapterCache()
