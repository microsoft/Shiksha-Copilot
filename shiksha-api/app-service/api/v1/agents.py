"""
Autogen multi-agent conversation API endpoints.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException
import structlog
from api.models import (
    TwoAgentChatRequest,
    GroupChatRequest,
    CodeExecutionRequest,
    ConversationResponse,
    AgentConfigRequest,
    ErrorResponse,
)
from services import autogen_service
from services.autogen_service import AgentConfig

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/agents", tags=["Agents"])


def _convert_agent_config(request: AgentConfigRequest) -> AgentConfig:
    """Convert API model to service model."""
    return AgentConfig(
        name=request.name,
        system_message=request.system_message,
        human_input_mode=request.human_input_mode,
        max_consecutive_auto_reply=request.max_consecutive_auto_reply,
    )


@router.post("/two-agent-chat", response_model=ConversationResponse)
async def two_agent_chat(request: TwoAgentChatRequest) -> ConversationResponse:
    """
    Conduct a conversation between two agents.
    """
    try:
        # Convert API models to service models
        initiator_config = _convert_agent_config(request.initiator)
        recipient_config = _convert_agent_config(request.recipient)

        result = await autogen_service.two_agent_chat(
            initiator_config=initiator_config,
            recipient_config=recipient_config,
            message=request.message,
            max_turns=request.max_turns,
        )

        response = ConversationResponse(
            messages=result.messages,
            summary=result.summary,
            success=result.success,
            metadata=result.metadata,
        )

        logger.info(
            "Two-agent chat completed",
            initiator=request.initiator.name,
            recipient=request.recipient.name,
            success=result.success,
        )

        return response

    except Exception as e:
        logger.error("Two-agent chat failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Two-agent chat failed: {str(e)}")


@router.post("/group-chat", response_model=ConversationResponse)
async def group_chat(request: GroupChatRequest) -> ConversationResponse:
    """
    Conduct a group conversation with multiple agents.
    """
    try:
        # Convert API models to service models
        agents_configs = [_convert_agent_config(agent) for agent in request.agents]

        result = await autogen_service.group_chat(
            agents_configs=agents_configs,
            message=request.message,
            max_round=request.max_round,
        )

        response = ConversationResponse(
            messages=result.messages,
            summary=result.summary,
            success=result.success,
            metadata=result.metadata,
        )

        logger.info(
            "Group chat completed",
            agent_count=len(request.agents),
            success=result.success,
        )

        return response

    except Exception as e:
        logger.error("Group chat failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Group chat failed: {str(e)}")


@router.post("/code-execution", response_model=ConversationResponse)
async def code_execution_chat(request: CodeExecutionRequest) -> ConversationResponse:
    """
    Create a conversation with code execution capabilities.
    """
    try:
        # Prepare code execution config
        code_execution_config = {
            "work_dir": "/tmp/autogen_code",
            "use_docker": request.use_docker,
            "timeout": request.timeout,
            "last_n_messages": 3,
        }

        result = await autogen_service.code_execution_chat(
            user_message=request.message, code_execution_config=code_execution_config
        )

        response = ConversationResponse(
            messages=result.messages,
            summary=result.summary,
            success=result.success,
            metadata=result.metadata,
        )

        logger.info(
            "Code execution chat completed",
            message_length=len(request.message),
            success=result.success,
        )

        return response

    except Exception as e:
        logger.error("Code execution chat failed", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Code execution chat failed: {str(e)}"
        )


@router.post("/clear-cache")
async def clear_agents_cache() -> Dict[str, str]:
    """
    Clear the agents cache.
    """
    try:
        autogen_service.clear_agents_cache()
        logger.info("Agents cache cleared")
        return {"message": "Agents cache cleared successfully"}

    except Exception as e:
        logger.error("Failed to clear agents cache", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to clear agents cache: {str(e)}"
        )

        return {
            "service": "agents",
            "healthy": False,
            "status": "error",
            "error": str(e),
        }


@router.get("/stats")
async def agents_stats() -> Dict[str, Any]:
    """
    Get Autogen service statistics.
    """
    try:
        stats = autogen_service.get_stats()
        return {
            "service": "agents",
            "stats": stats,
            "healthy": stats.get("status") == "healthy",
        }
    except Exception as e:
        logger.error("Failed to get agents stats", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to get agents stats: {str(e)}"
        )
