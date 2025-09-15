import logging
from typing import Any, Dict, Optional, List

from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.http.models import (
    VectorParams,
    Distance,
    PayloadSchemaType,
    Filter as QFilter,
    FieldCondition,
    MatchValue,
)
from llama_index.vector_stores.qdrant.base import DEFAULT_DENSE_VECTOR_NAME


class QdrantUtils:
    """Utility wrapper around qdrant-client operations.

    Encapsulates client creation (sync/async), collection creation, payload index
    management, filter conversion, and lightweight existence checks.

    This keeps qdrant-specific code in a single place so higher-level classes
    (like QdrantRagOps) can remain focused on RAG logic.
    """

    def __init__(
        self,
        url: str = "http://localhost:6333",
        collection_name: str = "default",
        api_key: Optional[str] = None,
        payload_fields: Optional[List[str]] = None,
        vector_store_kwargs: Optional[Dict] = None,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        self.url = url
        self.collection_name = collection_name
        self.api_key = api_key
        self.payload_fields = payload_fields or []
        self.vector_store_kwargs = vector_store_kwargs or {}
        self.logger = logger or logging.getLogger(__name__)

    def create_sync_client(self) -> QdrantClient:
        """Create a synchronous Qdrant client."""
        return QdrantClient(url=self.url, api_key=self.api_key)

    def create_async_client(self) -> AsyncQdrantClient:
        """Create an asynchronous Qdrant client."""
        return AsyncQdrantClient(url=self.url, api_key=self.api_key)

    def get_vector_store_config(
        self, dense_vector_name: str = DEFAULT_DENSE_VECTOR_NAME
    ) -> Dict:
        """Return a dict suitable for QdrantVectorStore initialization.

        Includes both sync and async clients to support llama_index's Qdrant wrapper.
        """
        return {
            "collection_name": self.collection_name,
            "client": self.create_sync_client(),
            "aclient": self.create_async_client(),
            "dense_vector_name": dense_vector_name,
            **self.vector_store_kwargs,
        }

    def create_payload_indexes(self, client: QdrantClient) -> None:
        """Create keyword payload indexes for all configured payload fields.

        This is a noop when no payload fields are configured. Any errors are
        logged and suppressed to avoid failing creation in environments where
        indexes may already exist or permissions are restricted.
        """
        if not self.payload_fields:
            return

        for field_name in self.payload_fields:
            try:
                client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=PayloadSchemaType.KEYWORD,
                )
                self.logger.info(
                    f"Created keyword payload index for field: {field_name}"
                )
            except Exception as exc:  # pragma: no cover - defensive logging
                self.logger.warning(
                    f"Failed to create payload index for field {field_name}: {exc}"
                )

    async def index_exists(self) -> bool:
        """Asynchronously check whether the target collection exists."""
        try:
            aclient = self.create_async_client()
            collections = await aclient.get_collections()
            collection_names = [c.name for c in collections.collections]
            exists = self.collection_name in collection_names
            self.logger.info(
                f"Qdrant collection '{self.collection_name}' exists: {exists}"
            )
            return exists
        except Exception as exc:  # pragma: no cover - surface connectivity errors
            self.logger.error(f"Error checking Qdrant collection existence: {exc}")
            return False

    def create_collection(self, dim: int) -> None:
        """Create a Qdrant collection with the default dense vector name and given dimension.

        Also attempts to create configured payload indexes.
        """
        client = self.create_sync_client()
        client.create_collection(
            collection_name=self.collection_name,
            vectors_config={
                DEFAULT_DENSE_VECTOR_NAME: VectorParams(
                    size=dim, distance=Distance.COSINE
                )
            },
        )
        # try to create payload indexes (safe to call even if no fields)
        self.create_payload_indexes(client)
        self.logger.info(
            f"Created Qdrant collection: {self.collection_name} (dim={dim})"
        )

    def to_qdrant_filter(self, metadata_filter: Dict[str, Any]) -> QFilter:
        """Convert a simple dict of exact match metadata into a Qdrant Filter."""
        return QFilter(
            must=[
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in metadata_filter.items()
            ]
        )

    async def prequery_filter_guard(
        self, metadata_filter: Optional[Dict[str, Any]]
    ) -> None:
        """Check whether any points match the metadata filter before running a query.

        Raises ValueError if the filter matches no points. This performs a fast
        scroll with limit=1 that requests no payloads or vectors.
        """
        if not metadata_filter:
            return

        aclient = self.create_async_client()
        qf = self.to_qdrant_filter(metadata_filter)

        points, _ = await aclient.scroll(
            collection_name=self.collection_name,
            scroll_filter=qf,
            with_payload=False,
            with_vectors=False,
            limit=1,
        )
        if not points:
            raise ValueError(f"No data matches metadata filter: {metadata_filter}")
