"""
Autogen agent service for multi-agent conversations.
Handles agent creation, conversation management, and interaction flows.
"""

import asyncio
from typing import Dict, Any, List, Optional, Callable
import autogen
from autogen import ConversableAgent, GroupChat, GroupChatManager
import structlog
from config import settings
from services.azure_auth import azure_auth_service

logger = structlog.get_logger(__name__)


class AgentConfig:
    """Configuration for an Autogen agent."""

    def __init__(
        self,
        name: str,
        system_message: str,
        llm_config: Optional[Dict[str, Any]] = None,
        human_input_mode: str = "NEVER",
        max_consecutive_auto_reply: int = 10,
        code_execution_config: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.system_message = system_message
        self.llm_config = llm_config
        self.human_input_mode = human_input_mode
        self.max_consecutive_auto_reply = max_consecutive_auto_reply
        self.code_execution_config = code_execution_config


class ConversationResult:
    """Result of an agent conversation."""

    def __init__(self, messages: List[Dict[str, Any]], summary: str, success: bool):
        self.messages = messages
        self.summary = summary
        self.success = success
        self.metadata = {}


class AutogenService:
    """
    Service for managing Autogen multi-agent conversations.
    Supports different agent types and conversation patterns.
    """

    def __init__(self):
        self._initialized = False
        self._llm_config = None
        self._agents_cache: Dict[str, ConversableAgent] = {}

    async def initialize(self) -> None:
        """Initialize the Autogen service with Azure OpenAI configuration."""
        try:
            # Get API key from Azure auth service using managed identity
            api_key = await azure_auth_service.get_token()
            if not api_key:
                raise ValueError("Could not obtain Azure OpenAI credentials")

            # Configure LLM settings for Autogen
            self._llm_config = {
                "config_list": [
                    {
                        "model": settings.azure_openai.deployment_name,
                        "api_type": "azure",
                        "api_base": settings.azure_openai.endpoint,
                        "api_version": settings.azure_openai.api_version,
                        "api_key": api_key,
                    }
                ],
                "cache_seed": settings.autogen.cache_seed,
                "temperature": 0.7,
                "timeout": 120,
            }

            self._initialized = True
            logger.info("Autogen service initialized successfully")

        except Exception as e:
            logger.error("Failed to initialize Autogen service", error=str(e))
            raise

    def create_agent(self, config: AgentConfig) -> ConversableAgent:
        """
        Create a new Autogen agent with the given configuration.

        Args:
            config: Agent configuration

        Returns:
            ConversableAgent instance
        """
        if not self._initialized:
            raise RuntimeError("Autogen service not initialized")

        # Check cache first
        if config.name in self._agents_cache:
            return self._agents_cache[config.name]

        try:
            agent = ConversableAgent(
                name=config.name,
                system_message=config.system_message,
                llm_config=config.llm_config or self._llm_config,
                human_input_mode=config.human_input_mode,
                max_consecutive_auto_reply=config.max_consecutive_auto_reply,
                code_execution_config=config.code_execution_config,
            )

            # Cache the agent
            self._agents_cache[config.name] = agent

            logger.info("Agent created", name=config.name)
            return agent

        except Exception as e:
            logger.error("Failed to create agent", name=config.name, error=str(e))
            raise

    async def two_agent_chat(
        self,
        initiator_config: AgentConfig,
        recipient_config: AgentConfig,
        message: str,
        max_turns: Optional[int] = None,
    ) -> ConversationResult:
        """
        Conduct a conversation between two agents.

        Args:
            initiator_config: Configuration for the initiating agent
            recipient_config: Configuration for the recipient agent
            message: Initial message to start the conversation
            max_turns: Maximum number of conversation turns

        Returns:
            ConversationResult with the conversation history
        """
        if not self._initialized:
            raise RuntimeError("Autogen service not initialized")

        try:
            # Create agents
            initiator = self.create_agent(initiator_config)
            recipient = self.create_agent(recipient_config)

            # Start the conversation
            chat_result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: initiator.initiate_chat(
                    recipient,
                    message=message,
                    max_turns=max_turns or settings.autogen.max_round,
                ),
            )

            # Extract conversation details
            messages = []
            if hasattr(chat_result, "chat_history"):
                messages = chat_result.chat_history

            summary = getattr(chat_result, "summary", "Conversation completed")
            success = True

            logger.info(
                "Two-agent chat completed",
                initiator=initiator_config.name,
                recipient=recipient_config.name,
                turns=len(messages),
            )

            return ConversationResult(messages, summary, success)

        except Exception as e:
            logger.error("Two-agent chat failed", error=str(e))
            return ConversationResult([], f"Error: {str(e)}", False)

    async def group_chat(
        self,
        agents_configs: List[AgentConfig],
        message: str,
        max_round: Optional[int] = None,
    ) -> ConversationResult:
        """
        Conduct a group conversation with multiple agents.

        Args:
            agents_configs: List of agent configurations
            message: Initial message to start the conversation
            max_round: Maximum number of conversation rounds

        Returns:
            ConversationResult with the conversation history
        """
        if not self._initialized:
            raise RuntimeError("Autogen service not initialized")

        if len(agents_configs) < 2:
            raise ValueError("At least 2 agents required for group chat")

        try:
            # Create all agents
            agents = [self.create_agent(config) for config in agents_configs]

            # Create group chat
            group_chat = GroupChat(
                agents=agents,
                messages=[],
                max_round=max_round or settings.autogen.max_round,
            )

            # Create group chat manager
            manager = GroupChatManager(
                groupchat=group_chat, llm_config=self._llm_config
            )

            # Start the group conversation
            chat_result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: agents[0].initiate_chat(manager, message=message)
            )

            # Extract conversation details
            messages = []
            if hasattr(chat_result, "chat_history"):
                messages = chat_result.chat_history
            elif hasattr(group_chat, "messages"):
                messages = group_chat.messages

            summary = getattr(chat_result, "summary", "Group conversation completed")
            success = True

            logger.info(
                "Group chat completed", agent_count=len(agents), rounds=len(messages)
            )

            return ConversationResult(messages, summary, success)

        except Exception as e:
            logger.error("Group chat failed", error=str(e))
            return ConversationResult([], f"Error: {str(e)}", False)

    async def code_execution_chat(
        self, user_message: str, code_execution_config: Optional[Dict[str, Any]] = None
    ) -> ConversationResult:
        """
        Create a conversation with code execution capabilities.

        Args:
            user_message: The user's request
            code_execution_config: Configuration for code execution

        Returns:
            ConversationResult with the conversation history
        """
        if not self._initialized:
            raise RuntimeError("Autogen service not initialized")

        # Default code execution config
        if code_execution_config is None:
            code_execution_config = {
                "work_dir": "/tmp/autogen_code",
                "use_docker": False,  # Set to True if Docker is available
                "timeout": 60,
                "last_n_messages": 3,
            }

        # Create user proxy agent (for user interaction)
        user_proxy_config = AgentConfig(
            name="user_proxy",
            system_message="You are a helpful assistant that can execute code.",
            human_input_mode="NEVER",
            code_execution_config=code_execution_config,
        )

        # Create assistant agent (for code generation)
        assistant_config = AgentConfig(
            name="assistant",
            system_message="You are an AI assistant that writes and explains code. When asked to solve a problem, write Python code to solve it.",
            human_input_mode="NEVER",
        )

        return await self.two_agent_chat(
            user_proxy_config, assistant_config, user_message
        )

    def clear_agents_cache(self) -> None:
        """Clear the agents cache."""
        self._agents_cache.clear()
        logger.info("Agents cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return {
            "status": "healthy" if self._initialized else "not_initialized",
            "initialized": self._initialized,
            "cached_agents": len(self._agents_cache),
            "max_round": settings.autogen.max_round,
            "cache_seed": settings.autogen.cache_seed,
        }


# Global service instance
autogen_service = AutogenService()
