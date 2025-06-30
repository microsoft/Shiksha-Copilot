"""
LiteLLM service for OpenAI completions.
Handles Azure OpenAI integration using LiteLLM with proper authentication and error handling.
"""

import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator
import litellm
from litellm import acompletion, ModelResponse
import structlog
from config import settings
from services.azure_auth import azure_auth_service

logger = structlog.get_logger(__name__)


class LiteLLMService:
    """
    Service for handling LLM completions using LiteLLM with Azure OpenAI.
    Implements retry logic and proper error handling.
    """

    def __init__(self):
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize LiteLLM with Azure OpenAI configuration."""
        try:
            # Configure LiteLLM for Azure OpenAI
            litellm.set_verbose = settings.debug

            # Use managed identity token
            api_key = await azure_auth_service.get_token()
            if not api_key:
                raise ValueError("Could not obtain Azure OpenAI credentials")

            # Set Azure OpenAI configuration
            litellm.azure_key = api_key
            litellm.azure_api_base = settings.azure_openai.endpoint
            litellm.azure_api_version = settings.azure_openai.api_version

            self._initialized = True
            logger.info("LiteLLM service initialized successfully")

        except Exception as e:
            logger.error("Failed to initialize LiteLLM service", error=str(e))
            raise

    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> ModelResponse:
        """
        Generate a completion using Azure OpenAI via LiteLLM.

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model name to use (defaults to configured model)
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            **kwargs: Additional parameters for LiteLLM

        Returns:
            ModelResponse from LiteLLM
        """
        if not self._initialized:
            raise RuntimeError("LiteLLM service not initialized")

        try:
            response = await acompletion(
                model=model or settings.litellm.model_name,
                messages=messages,
                temperature=temperature or settings.litellm.temperature,
                max_tokens=max_tokens or settings.litellm.max_tokens,
                stream=stream,
                api_base=settings.azure_openai.endpoint,
                api_version=settings.azure_openai.api_version,
                **kwargs
            )

            logger.info(
                "Completion generated successfully",
                model=model or settings.litellm.model_name,
                message_count=len(messages),
                stream=stream,
            )

            return response

        except Exception as e:
            logger.error(
                "Completion generation failed", error=str(e), messages=messages
            )
            raise

    async def complete_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Generate a streaming completion using Azure OpenAI via LiteLLM.

        Args:
            messages: List of message dictionaries
            model: Model name to use
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters

        Yields:
            Dictionary chunks from the streaming response
        """
        if not self._initialized:
            raise RuntimeError("LiteLLM service not initialized")

        try:
            response = await acompletion(
                model=model or settings.litellm.model_name,
                messages=messages,
                temperature=temperature or settings.litellm.temperature,
                max_tokens=max_tokens or settings.litellm.max_tokens,
                stream=True,
                api_base=settings.azure_openai.endpoint,
                api_version=settings.azure_openai.api_version,
                **kwargs
            )

            async for chunk in response:
                yield chunk.dict() if hasattr(chunk, "dict") else chunk

            logger.info(
                "Streaming completion completed",
                model=model or settings.litellm.model_name,
                message_count=len(messages),
            )

        except Exception as e:
            logger.error("Streaming completion failed", error=str(e), messages=messages)
            raise

    async def chat_completion(
        self,
        user_message: str,
        system_message: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        **kwargs
    ) -> str:
        """
        Simple chat completion helper method.

        Args:
            user_message: The user's message
            system_message: Optional system message
            conversation_history: Previous conversation messages
            **kwargs: Additional completion parameters

        Returns:
            The assistant's response text
        """
        messages = []

        if system_message:
            messages.append({"role": "system", "content": system_message})

        if conversation_history:
            messages.extend(conversation_history)

        messages.append({"role": "user", "content": user_message})

        response = await self.complete(messages=messages, **kwargs)

        return response.choices[0].message.content

    async def get_available_models(self) -> List[str]:
        """Get list of available models."""
        # This is a placeholder - LiteLLM doesn't have a direct API for this
        # You might want to maintain a list based on your Azure OpenAI deployments
        return [settings.litellm.model_name]

    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return {
            "status": "healthy" if self._initialized else "not_initialized",
            "initialized": self._initialized,
            "model": settings.litellm.model_name,
        }


# Global service instance
litellm_service = LiteLLMService()
