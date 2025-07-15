from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ConversationMessage(BaseModel):
    role: MessageRole = Field(..., description="Role of the message sender")
    message: str = Field(..., description="Content of the message")


################# Request and Response Models #################


class ChatRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    messages: List[ConversationMessage] = Field(
        ..., description="List of conversation messages"
    )

    @field_validator("messages")
    @classmethod
    def validate_messages_not_empty(cls, v):
        if not v:
            raise ValueError("Messages list cannot be empty")
        return v


class ChatResponse(BaseModel):
    user_id: str = Field(..., description="User identifier")
    response: str = Field(..., description="AI-generated response")


class LessonChatRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    chapter_id: str = Field(
        ...,
        description="Chapter identifier with board, medium, grade, subject, number and title",
    )
    index_path: str = Field(..., description="Path to the chapter index for retrieval")
    messages: List[ConversationMessage] = Field(
        ..., description="List of conversation messages"
    )

    @field_validator("messages")
    @classmethod
    def validate_messages_not_empty(cls, v):
        if not v:
            raise ValueError("Messages list cannot be empty")
        return v


class LessonChatResponse(BaseModel):
    user_id: str = Field(..., description="User identifier")
    response: str = Field(..., description="AI-generated response")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)
