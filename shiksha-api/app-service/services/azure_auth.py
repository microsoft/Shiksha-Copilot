"""
Azure authentication service using Managed Identity.
Follows Azure security best practices with proper credential management.
"""

import asyncio
from typing import Optional, Dict, Any
from azure.identity.aio import DefaultAzureCredential, ClientSecretCredential
from azure.core.exceptions import AzureError
import structlog
from config import settings

logger = structlog.get_logger(__name__)


class AzureAuthService:
    """
    Handles Azure authentication.
    Uses Managed Identity in production and service principal for development.
    """

    def __init__(self):
        self._credential: Optional[DefaultAzureCredential] = None

    async def initialize(self) -> None:
        """Initialize Azure credentials."""
        try:
            # Use managed identity in production, service principal in development
            if settings.azure_auth.client_id and settings.azure_auth.client_secret:
                logger.info("Using service principal authentication")
                self._credential = ClientSecretCredential(
                    tenant_id=settings.azure_auth.tenant_id,
                    client_id=settings.azure_auth.client_id,
                    client_secret=settings.azure_auth.client_secret,
                )
            else:
                logger.info("Using managed identity authentication")
                self._credential = DefaultAzureCredential()

        except AzureError as e:
            logger.error("Failed to initialize Azure authentication", error=str(e))
            raise

    async def get_token(
        self, scope: str = "https://cognitiveservices.azure.com/.default"
    ) -> Optional[str]:
        """
        Get Azure access token for the specified scope.

        Args:
            scope: The scope for which to request the token

        Returns:
            Access token or None if failed
        """
        if not self._credential:
            logger.error("Azure credential not initialized")
            return None

        try:
            token = await self._credential.get_token(scope)
            return token.token
        except AzureError as e:
            logger.error("Failed to get access token", scope=scope, error=str(e))
            return None

    async def close(self) -> None:
        """Clean up resources."""
        if self._credential:
            await self._credential.close()
        logger.info("Azure auth service closed")


# Global instance
azure_auth_service = AzureAuthService()
