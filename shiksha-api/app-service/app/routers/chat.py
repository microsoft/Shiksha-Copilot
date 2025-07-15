from fastapi import APIRouter, Depends, HTTPException, status
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    LessonChatRequest,
    LessonChatResponse,
    ErrorResponse,
)
from app.services.general_chat_service import GENERAL_CHAT_SERVICE_INSTANCE
from typing import Dict, Any
import logging

from app.services.lesson_chat_service import LESSON_CHAT_SERVICE_INSTANCE

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="General chat endpoint",
    description="Handle general chat messages and return AI responses",
)
async def chat(
    request: ChatRequest,
):
    """
    General chat endpoint for handling user messages.

    Processes general educational queries using AI assistant with
    access to web search and video search capabilities.
    """
    try:
        logger.info(f"Processing general chat request for user: {request.user_id}")

        response_content = await GENERAL_CHAT_SERVICE_INSTANCE(request.messages)

        logger.info(f"Successfully processed general chat for user: {request.user_id}")

        return ChatResponse(user_id=request.user_id, response=response_content)

    except ValueError as e:
        logger.error(f"Configuration error in general chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"General chat failed for user {request.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat request",
        )


@router.post(
    "/lesson",
    response_model=LessonChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Lesson-specific chat endpoint",
    description="Handle lesson-specific chat messages with contextual understanding",
)
async def lesson_chat(
    request: LessonChatRequest,
):
    """
    Lesson-specific chat endpoint for handling educational content queries.

    Processes lesson-specific queries with contextual understanding of the
    chapter content and educational context.
    """
    try:
        logger.info(
            f"Processing lesson chat request for user: {request.user_id}, chapter: {request.chapter_id}"
        )

        response_content = await LESSON_CHAT_SERVICE_INSTANCE(request)

        logger.info(f"Successfully processed lesson chat for user: {request.user_id}")

        return LessonChatResponse(user_id=request.user_id, response=response_content)

    except ValueError as e:
        logger.error(f"Configuration error in lesson chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Lesson chat failed for user {request.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process lesson chat request",
        )
