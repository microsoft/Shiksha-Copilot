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
    tags=["Chat"],
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Bad Request - Invalid input parameters",
        },
        404: {"model": ErrorResponse, "description": "Not Found - Resource not found"},
        500: {
            "model": ErrorResponse,
            "description": "Internal Server Error - Server processing error",
        },
    },
)


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="General Educational Chat",
    description="""
    **Process general educational queries with AI assistance**
    
    This endpoint provides an intelligent chat interface for general educational questions 
    and queries. The AI assistant has access to web search and video search capabilities 
    to provide comprehensive, educational responses.
    
    **Features:**
    - AI-powered educational assistance
    - Web search integration for up-to-date information
    - Video search capabilities for educational content
    - Context-aware conversation handling
    
    **Use Cases:**
    - General subject questions
    - Concept explanations
    - Educational research assistance
    - Study guidance and tips
    """,
    responses={
        200: {
            "description": "Successfully processed chat request",
            "model": ChatResponse,
            "content": {
                "application/json": {
                    "example": {
                        "user_id": "student123",
                        "response": "Based on your question about photosynthesis, it's the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen...",
                    }
                }
            },
        },
        400: {"description": "Invalid request format or empty messages"},
        500: {"description": "Internal server error during processing"},
    },
)
async def chat(
    request: ChatRequest,
):
    """
    **General Educational Chat Endpoint**

    Process general educational queries using an AI assistant with comprehensive capabilities.

    **Request Body:**
    - `user_id`: Unique identifier for the user
    - `messages`: List of conversation messages with role (user/assistant/system) and content

    **AI Capabilities:**
    - Educational content generation
    - Web search for current information
    - Video search for educational resources
    - Multi-turn conversation support

    **Example Request:**
    ```json
    {
        "user_id": "student123",
        "messages": [
            {
                "role": "user",
                "message": "Can you explain how photosynthesis works?"
            }
        ]
    }
    ```

    **Response:**
    Returns an AI-generated educational response addressing the user's query.

    **Error Handling:**
    - Validates message list is not empty
    - Handles configuration errors gracefully
    - Provides detailed error messages for debugging
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
    summary="Lesson-Specific Educational Chat",
    description="""
    **Process lesson-specific educational queries with contextual understanding**
    
    This endpoint provides specialized AI assistance for lesson-specific educational content.
    It leverages chapter-specific context and learning materials to provide targeted, 
    curriculum-aligned responses.
    
    **Key Features:**
    - Chapter-specific contextual understanding
    - Curriculum-aligned responses
    - Learning outcome focused assistance
    - RAG (Retrieval Augmented Generation) integration
    - Educational content retrieval from indexed materials
    
    **Use Cases:**
    - Chapter-specific questions and doubts
    - Concept clarification within lessons
    - Learning outcome achievement support
    - Curriculum-specific educational guidance
    """,
    responses={
        200: {
            "description": "Successfully processed lesson chat request",
            "model": LessonChatResponse,
            "content": {
                "application/json": {
                    "example": {
                        "user_id": "student123",
                        "response": "Based on Chapter 5 about Heredity and Evolution, the question about genetic inheritance can be explained as follows...",
                    }
                }
            },
        },
        400: {
            "description": "Invalid request format, missing chapter information, or empty messages"
        },
        500: {"description": "Internal server error during processing"},
    },
)
async def lesson_chat(
    request: LessonChatRequest,
):
    """
    **Lesson-Specific Educational Chat Endpoint**

    Process lesson-specific educational queries with deep contextual understanding
    of chapter content and curriculum alignment.

    **Request Body:**
    - `user_id`: Unique identifier for the user
    - `chapter_id`: Chapter identifier including board, medium, grade, subject, number and title
    - `index_path`: Path to the chapter's indexed content for retrieval
    - `messages`: List of conversation messages with role and content

    **AI Capabilities:**
    - Chapter-specific content understanding
    - RAG-based information retrieval from lesson materials
    - Curriculum-aligned response generation
    - Learning outcome focused assistance
    - Context-aware educational guidance

    **Example Request:**
    ```json
    {
        "user_id": "student123",
        "chapter_id": "NCERT_English_10_Science_5_Heredity_and_Evolution",
        "index_path": "/indexes/ncert/english/10/science/chapter_5",
        "messages": [
            {
                "role": "user",
                "message": "What is the difference between inherited and acquired traits?"
            }
        ]
    }
    ```

    **Response:**
    Returns a contextually relevant AI-generated response based on the specific
    chapter content and educational objectives.

    **Error Handling:**
    - Validates all required fields are present
    - Ensures chapter index path is accessible
    - Validates message list is not empty
    - Provides detailed error information for debugging
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
