import os
from typing import List, Optional

from azure.core.exceptions import AzureError
from azure.identity.aio import DefaultAzureCredential
from azure.storage.blob.aio import BlobServiceClient as AsyncBlobServiceClient
import aiofiles

from app.config import settings


class BlobStore:
    """
    Async helper for interacting with Azure Blob Storage.

    Auth:
      - connection string (local/dev)
      - DefaultAzureCredential + account URL (prod/Azure)
    """

    def __init__(self):
        connection_string = settings.blob_store_connection_string
        account_url = settings.blob_store_url

        if connection_string:
            # async client from connection string
            self._async_svc = AsyncBlobServiceClient.from_connection_string(
                connection_string
            )
        elif account_url:
            cred = DefaultAzureCredential()
            self._async_svc = AsyncBlobServiceClient(
                account_url=account_url, credential=cred
            )
        else:
            raise ValueError(
                "Either BLOB_STORE_CONNECTION_STRING or BLOB_STORE_URL must be set."
            )

    async def download_blobs_to_folder(
        self, prefix: str, target_folder: str = "blob_downloads"
    ) -> List[str]:
        """
        Async download all blobs whose names start with `prefix`
        into a local subfolder under /tmp (or wherever you like).

        Args:
          prefix: in the form "container/prefix_path"
          target_folder: local directory root for downloads

        Returns:
          List of local file paths written.

        Raises:
          ValueError, RuntimeError
        """
        if not prefix or "/" not in prefix:
            raise ValueError("Prefix must be in the format 'container/prefix_path'.")

        container_name, blob_prefix = prefix.split("/", 1)
        container_client = self._async_svc.get_container_client(container_name)
        downloaded_files: List[str] = []

        try:
            # list_blobs is async iterable
            async for blob_props in container_client.list_blobs(
                name_starts_with=blob_prefix
            ):
                blob_name = blob_props.name
                blob_client = container_client.get_blob_client(blob_name)
                stream = await blob_client.download_blob()
                data = await stream.readall()

                file_name = blob_name.split("/")[-1]
                local_path = os.path.join(target_folder, file_name)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)

                # write without blocking the event loop
                async with aiofiles.open(local_path, "wb") as f:
                    await f.write(data)

                downloaded_files.append(local_path)

            return downloaded_files

        except AzureError as e:
            raise RuntimeError(f"Failed to download blobs asynchronously: {e}")
