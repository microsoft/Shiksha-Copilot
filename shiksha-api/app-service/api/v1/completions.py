"""
LiteLLM completion API endpoints.
"""

from typing import Dict, Any, AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import structlog
from api.models import (
    CompletionRequest,
    CompletionResponse,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    ErrorResponse,
)
from services import litellm_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/completions", tags=["Completions"])


@router.post("/chat", response_model=CompletionResponse)
async def chat_completion(request: CompletionRequest) -> CompletionResponse:
    """
    Generate a chat completion using Azure OpenAI via LiteLLM.
    """
    try:
        # Convert Pydantic models to dict for LiteLLM
        messages = [message.dict() for message in request.messages]

        if request.stream:
            # For streaming, return a different endpoint
            raise HTTPException(
                status_code=400,
                detail="Use /completions/chat/stream for streaming responses",
            )

        response = await litellm_service.complete(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=False,
        )

        # Convert LiteLLM response to our API model
        api_response = CompletionResponse(
            id=response.id,
            object=response.object,
            created=response.created,
            model=response.model,
            choices=[choice.dict() for choice in response.choices],
            usage=response.usage.dict() if response.usage else {},
        )

        logger.info(
            "Chat completion generated",
            model=request.model,
            message_count=len(messages),
        )
        return api_response

    except Exception as e:
        logger.error("Chat completion failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Chat completion failed: {str(e)}")


@router.post("/chat/stream")
async def chat_completion_stream(request: CompletionRequest):
    """
    Generate a streaming chat completion using Azure OpenAI via LiteLLM.
    """
    try:
        messages = [message.dict() for message in request.messages]

        async def generate_stream():
            async for chunk in litellm_service.complete_stream(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )

    except Exception as e:
        logger.error("Streaming chat completion failed", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Streaming chat completion failed: {str(e)}"
        )


@router.post("/simple", response_model=ChatCompletionResponse)
async def simple_chat(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """
    Simple chat completion endpoint for quick interactions.
    """
    try:
        # Convert conversation history to dict format
        conversation_history = None
        if request.conversation_history:
            conversation_history = [msg.dict() for msg in request.conversation_history]

        response_text = await litellm_service.chat_completion(
            user_message=request.message,
            system_message=request.system_message,
            conversation_history=conversation_history,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )

        api_response = ChatCompletionResponse(
            response=response_text,
            model=(
                litellm_service._litellm_service.model_name
                if hasattr(litellm_service, "_litellm_service")
                else "azure/gpt-4"
            ),
            usage={
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
            },  # Placeholder
        )

        logger.info(
            "Simple chat completion generated", message_length=len(request.message)
        )
        return api_response

    except Exception as e:
        logger.error("Simple chat completion failed", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Simple chat completion failed: {str(e)}"
        )


@router.get("/models")
async def get_available_models() -> Dict[str, Any]:
    """
    Get list of available models.
    """
    try:
        models = await litellm_service.get_available_models()
        return {
            "models": models,
            "default_model": litellm_service.get_stats().get("model", "azure/gpt-4"),
        }
    except Exception as e:
        logger.error("Failed to get available models", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to get available models: {str(e)}"
        )


@router.get("/stats")
async def completions_stats() -> Dict[str, Any]:
    """
    Get LiteLLM service statistics.
    """
    try:
        stats = litellm_service.get_stats()
        return {
            "service": "completions",
            "stats": stats,
            "healthy": stats.get("status") == "healthy",
        }
    except Exception as e:
        logger.error("Failed to get completions stats", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to get completions stats: {str(e)}"
        )
