from typing import List
from pathlib import Path
import logging

from azure.ai.projects.aio import AIProjectClient
from azure.identity import DefaultAzureCredential
from azure.ai.agents.models import BingGroundingTool, MessageRole

from app.models.chat import ConversationMessage
from app.config import settings
from app.utils.prompt_template import PromptTemplate

logger = logging.getLogger(__name__)


class GeneralChatService:
    """Service for handling chat interactions using Azure AI Project client."""

    def __init__(self):
        # Initialize prompt template with the chat prompts file
        prompts_file_path = (
            Path(__file__).parent.parent.parent / "prompts" / "chat_prompts.yaml"
        )
        self.prompt_template = PromptTemplate(str(prompts_file_path))

        # Initialize Azure AI Project client
        if not settings.azure_project_endpoint:
            raise ValueError("AZURE_PROJECT_ENDPOINT environment variable is required")

        self.project_client = AIProjectClient(
            endpoint=settings.azure_project_endpoint,
            credential=DefaultAzureCredential(),
        )

        # Initialize Bing Grounding tool if connection ID is provided
        self.tools = []
        if settings.azure_bing_grounding_connection_id:
            bing = BingGroundingTool(
                connection_id=settings.azure_bing_grounding_connection_id
            )
            self.tools = bing.definitions

        # Store agent ID for reuse (will be created on first call)
        self.agent_id = None

    async def __call__(
        self,
        messages: List[ConversationMessage],
    ) -> str:
        """
        Core chat logic using Azure AI Project client with agents.

        Args:
            messages: List of conversation messages

        Returns:
            AI-generated response
        """
        try:
            # Get the system prompt from template
            system_prompt = self.prompt_template.get_prompt("general_chat")
            if system_prompt is None:
                raise ValueError("General chat prompt not found in chat_prompts.yaml")

            # Create agent if not exists
            if self.agent_id is None:
                await self._create_agent(system_prompt)

            # Create a thread for communication
            thread = await self.project_client.agents.threads.create()
            logger.info(f"Created thread, ID: {thread.id}")

            try:
                # Convert conversation history to a single message
                message_content = self._format_conversation_messages(messages)

                # Add message to the thread
                message = await self.project_client.agents.messages.create(
                    thread_id=thread.id,
                    role=MessageRole.USER,
                    content=message_content,
                )
                logger.info(f"Created message, ID: {message.id}")

                # Run the agent
                run = await self.project_client.agents.runs.create_and_process(
                    thread_id=thread.id,
                    agent_id=self.agent_id,
                )
                logger.info(f"Run finished with status: {run.status}")

                if run.status == "failed":
                    logger.error(f"Run failed: {run.last_error}")
                    return (
                        "I'm sorry, but I encountered an error processing your request."
                    )

                # Get the response messages
                messages_paged = self.project_client.agents.messages.list(
                    thread_id=thread.id
                )
                messages_list = [m async for m in messages_paged]

                if messages_list:
                    # Get the latest message from the assistant
                    msg = messages_list[0]
                    if msg.role == MessageRole.AGENT:
                        if getattr(msg, "text_messages", None):
                            last_text = msg.text_messages[-1]
                            return last_text.text.value.strip()

                # Fallback if no assistant message found
                return "I'm sorry, but I couldn't find an appropriate response."

            finally:
                # Clean up: delete the thread
                try:
                    await self.project_client.agents.threads.delete(thread.id)
                    logger.info("Deleted thread")
                except Exception as e:
                    logger.warning(f"Failed to delete thread: {e}")

        except Exception as e:
            logger.error(f"Error in Azure AI Project chat: {e}")
            raise

    async def _create_agent(self, assistant_system_prompt: str):
        """Create an Azure AI agent with the specified system prompt."""
        try:
            if not settings.azure_openai_deployment_name:
                raise ValueError(
                    "AZURE_OPENAI_DEPLOYMENT_NAME environment variable is required"
                )

            agent = await self.project_client.agents.create_agent(
                model=settings.azure_openai_deployment_name,
                name="shiksha-copilot-general-chat-agent",
                instructions=assistant_system_prompt,
                tools=self.tools,
            )
            self.agent_id = agent.id
            logger.info(f"Created agent, ID: {agent.id}")

        except Exception as e:
            logger.error(f"Error creating agent: {e}")
            raise

    def _format_conversation_messages(self, messages: List[ConversationMessage]) -> str:
        """Format conversation messages into a single string for the agent."""
        if len(messages) > 1:
            # Include all previous messages as context
            chat_context = "\n".join(
                [
                    f"Role: {msg.role.value}\nMessage: {msg.message}"
                    for msg in messages[:-1]
                ]
            )
            current_message = messages[-1].message
            return (
                f"Chat History:\n{chat_context}\n\nCurrent Message: {current_message}"
            )
        else:
            # Single message, no context needed
            return messages[0].message

    async def cleanup(self):
        """
        Cleanup method to properly close the project client connection.
        Should be called when the service is being shut down.
        """
        try:
            # Delete the agent if it exists
            if self.agent_id:
                await self.project_client.agents.delete_agent(self.agent_id)
                logger.info(f"Deleted agent: {self.agent_id}")

            # Close the project client
            await self.project_client.close()
            logger.info("Project client connection closed successfully")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Global instance
GENERAL_CHAT_SERVICE_INSTANCE = GeneralChatService()
