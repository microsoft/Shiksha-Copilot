"""
Pydantic models for API requests and responses.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# RAG Models
class RAGQueryRequest(BaseModel):
    """Request model for RAG queries."""

    query: str = Field(..., description="The user's question")
    context: Optional[str] = Field(None, description="Additional context for the query")
    top_k: Optional[int] = Field(
        5, ge=1, le=20, description="Number of results to retrieve"
    )
    filters: Optional[Dict[str, Any]] = Field(None, description="Search filters")


class RAGSource(BaseModel):
    """Source document information for RAG results."""

    document_id: str
    title: Optional[str] = None
    content: str
    score: float = Field(ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RAGQueryResponse(BaseModel):
    """Response model for RAG queries."""

    answer: str
    sources: List[RAGSource]
    confidence: float = Field(ge=0.0, le=1.0)
    query: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentAddRequest(BaseModel):
    """Request model for adding documents to RAG index."""

    documents: List[Dict[str, Any]] = Field(..., description="List of documents to add")


class DocumentAddResponse(BaseModel):
    """Response model for document addition."""

    success: bool
    message: str
    documents_added: int


# LiteLLM Models
class ChatMessage(BaseModel):
    """Chat message model."""

    role: str = Field(..., description="Message role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")


class CompletionRequest(BaseModel):
    """Request model for LLM completions."""

    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    model: Optional[str] = Field(None, description="Model to use for completion")
    temperature: Optional[float] = Field(
        0.7, ge=0.0, le=2.0, description="Temperature for generation"
    )
    max_tokens: Optional[int] = Field(
        None, ge=1, le=8000, description="Maximum tokens to generate"
    )
    stream: bool = Field(False, description="Whether to stream the response")


class CompletionResponse(BaseModel):
    """Response model for LLM completions."""

    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Dict[str, int]


class ChatCompletionRequest(BaseModel):
    """Simple chat completion request."""

    message: str = Field(..., description="User message")
    system_message: Optional[str] = Field(None, description="System message")
    conversation_history: Optional[List[ChatMessage]] = Field(
        None, description="Previous conversation"
    )
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=8000)


class ChatCompletionResponse(BaseModel):
    """Simple chat completion response."""

    response: str
    model: str
    usage: Dict[str, int] = Field(default_factory=dict)


# Autogen Models
class AgentConfigRequest(BaseModel):
    """Configuration for an Autogen agent."""

    name: str = Field(..., description="Agent name")
    system_message: str = Field(..., description="System message for the agent")
    human_input_mode: str = Field("NEVER", description="Human input mode")
    max_consecutive_auto_reply: int = Field(
        10, ge=1, le=50, description="Max auto replies"
    )


class TwoAgentChatRequest(BaseModel):
    """Request for two-agent chat."""

    initiator: AgentConfigRequest
    recipient: AgentConfigRequest
    message: str = Field(..., description="Initial message")
    max_turns: Optional[int] = Field(
        None, ge=1, le=50, description="Maximum conversation turns"
    )


class GroupChatRequest(BaseModel):
    """Request for group chat."""

    agents: List[AgentConfigRequest] = Field(
        ..., min_items=2, description="List of agents"
    )
    message: str = Field(..., description="Initial message")
    max_round: Optional[int] = Field(None, ge=1, le=50, description="Maximum rounds")


class CodeExecutionRequest(BaseModel):
    """Request for code execution chat."""

    message: str = Field(..., description="User request")
    timeout: Optional[int] = Field(
        60, ge=10, le=300, description="Execution timeout in seconds"
    )
    use_docker: bool = Field(False, description="Use Docker for execution")


class ConversationResponse(BaseModel):
    """Response for agent conversations."""

    messages: List[Dict[str, Any]]
    summary: str
    success: bool
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Error Models


# Error Models
class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
    timestamp: str
