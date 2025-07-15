from typing import List
from pathlib import Path
import logging

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

from app.models.chat import ConversationMessage
from app.config import settings
from app.utils.prompt_template import PromptTemplate
from app.services.bing_search import bing_search_service

logger = logging.getLogger(__name__)

# Constants for internal logic
CHAT_HISTORY_IRRELEVANT = "HISTORY IS NOT RELEVANT"
TERMINATE = "TERMINATE"


class GeneralChatService:
    """Service for handling chat interactions using AutoGen agents."""

    def __init__(self):
        # Initialize prompt template with the chat prompts file
        prompts_file_path = (
            Path(__file__).parent.parent.parent / "prompts" / "chat_prompts.yaml"
        )
        self.prompt_template = PromptTemplate(str(prompts_file_path))

        # Initialize Azure OpenAI model client
        self.model_client = AzureOpenAIChatCompletionClient(
            azure_deployment=settings.azure_openai_deployment_name,
            model=settings.azure_openai_deployment_name,  # Using deployment name as model
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_api_key,
        )

    async def __call__(
        self,
        messages: List[ConversationMessage],
    ) -> str:
        """
        Core chat logic using AutoGen agents with the new autogen-agentchat API.

        Args:
            messages: List of conversation messages
            assistant_system_prompt: System prompt for the assistant

        Returns:
            AI-generated response
        """
        try:
            system_prompt = self.prompt_template.get_prompt("general_chat")
            if system_prompt is None:
                raise ValueError("General chat prompt not found in chat_prompts.yaml")

            assistant_system_prompt = self._get_assistant_prompt_with_termination(
                system_prompt
            )

            # Convert messages to the format expected by the new API
            message_list = [
                {"role": msg.role.value, "message": msg.message} for msg in messages
            ]

            # Step 1: Create the main assistant agent
            assistant = AssistantAgent(
                name="assistant",
                model_client=self.model_client,
                system_message=assistant_system_prompt,
                reflect_on_tool_use=True,
                tools=[
                    bing_search_service.search_videos,
                    bing_search_service.search_web,
                ],
            )

            # Step 2: Extract relevant context from chat history
            current_message = message_list[-1]["message"]
            chat_history_items = message_list[:-1]

            extracted_context = await self._extract_relevant_context(
                chat_history_items, current_message
            )

            # Step 3: Create the user message with context
            user_content = f"Chat Context: {extracted_context}\n\nCurrent Message: {current_message}"

            # Log user_content for debugging
            logger.info(f"User content for assistant: {user_content}")

            # Step 4: Run the assistant agent
            task_result = await assistant.run(task=user_content)

            # Step 5: Extract the final response
            final_content = task_result.messages[-1].content

            logger.info(f"Final content: {final_content}")

            if not final_content or final_content.strip() == "":
                # Return default message when content is filtered out
                logger.warning(
                    "Content filter was triggered. Returning default message."
                )
                return "I'm sorry, but I can't help with that."

            # Return the final content after removing the TERMINATE marker
            return final_content.replace(TERMINATE, "").strip()

        except Exception as e:
            logger.error(f"Error in _chat_with_autogen_agent: {e}")
            raise

    async def _extract_relevant_context(
        self,
        chat_history: List[dict],
        current_message: str,
    ) -> str:
        """
        Extract relevant context from the chat history using the new autogen-agentchat API.

        Args:
            chat_history: List of previous messages excluding the current message
            current_message: The latest message from the user

        Returns:
            Extracted context or CHAT_HISTORY_IRRELEVANT if no relevant context is found
        """
        try:
            if not chat_history:
                return CHAT_HISTORY_IRRELEVANT

            # Get context generator prompt
            context_generator_system_prompt = (
                self.prompt_template.get_prompt_with_variables(
                    "general_chat_context_generator",
                    HISTORY_IS_NOT_RELEVANT=CHAT_HISTORY_IRRELEVANT,
                )
            )
            if context_generator_system_prompt is None:
                raise ValueError(
                    "Context generator prompt not found in chat_prompts.yaml"
                )

            # [WebSearchResult(name='Grade 4 Order of Operations Practice - K5 Learning', url='https://www.k5learning.com/blog/grade-4-order-of-operations', datePublished='', snippet='Order of operations. For students in grade 4 who need to practice order of operations, K5 has free worksheets for them to add, subtract, multiply and divide with parentheses.', language='en'),
            #  WebSearchResult(name='35 Games and Puzzles for the Four Operations | Teach Starter', url='https://www.teachstarter.com/au/blog/four-operations-games-and-puzzles/', datePublished='', snippet='35 games and puzzles to use when teaching and learning about the four operations in mathematics.', language='en'),
            #  WebSearchResult(name='Arithmetic - Math Steps, Examples & Questions - Third Space Learning', url='https://thirdspacelearning.com/us/math-resources/topic-guides/number-and-quantity/arithmetic/', datePublished='', snippet='Arithmetic Here you will learn about arithmetic, including key terminology and mathematical symbols, using the four operations with positive and negative integers, and inverse operations. Students will first learn about arithmetic as part of number and operations in 4th and 5th grade and continue to build on this knowledge in the number system in 6th and 7th grade.', language='en'),
            #  WebSearchResult(name='Basic Math Operations Lesson Plans - TeAch-nology.com', url='https://www.teach-nology.com/teachers/lesson_plans/math/basic/', datePublished='', snippet='Basic Math Operations Lesson Plans Addition and Subtraction Practice - Students will be able to explain what carry forward and what borrow means in relation to math. Card Play - The ability to use mental math and come up with problem solving techniques.', language='en'),
            #  WebSearchResult(name='How to Teach 4th Grade Math - Enjoy Teaching with Brenda Kovich', url='https://enjoy-teaching.com/fourth-grade-math/', datePublished='', snippet='Teach 4th grade math so kids understand. Begin with necessary background concepts, then scaffold slowly to more complex applications.', language='en')]

            # Create context generator agent
            context_gen_assistant = AssistantAgent(
                name="context_generator",
                model_client=self.model_client,
                system_message=context_generator_system_prompt,
            )

            end = len(chat_history)
            while end > 0:
                # Process the last 4 messages in the chat history
                start = max(0, end - 4)
                slice_segment = chat_history[start:end]
                formatted_history = "\n".join(
                    [
                        f"\nRole: {message['role']}\nMessage: {message['message']}"
                        for message in slice_segment
                    ]
                )

                # Generate context based on the sliced history
                context_task = f"Chat History: {formatted_history}\n\nCurrent Message: {current_message}"
                context_result = await context_gen_assistant.run(task=context_task)

                # Extract the content from the result
                context_content = context_result.messages[-1].content

                end = start

                # Check if the extracted context is relevant
                if context_content and CHAT_HISTORY_IRRELEVANT not in context_content:
                    return context_content

            # Return CHAT_HISTORY_IRRELEVANT if no relevant context is found
            return CHAT_HISTORY_IRRELEVANT

        except Exception as e:
            logger.error(f"Error in context extraction: {e}")
            return CHAT_HISTORY_IRRELEVANT

    def _get_assistant_prompt_with_termination(self, base_prompt: str) -> str:
        """
        Add termination logic to the base assistant prompt.

        Args:
            base_prompt: Base system prompt for the assistant

        Returns:
            Enhanced prompt with termination and formatting instructions
        """
        termination_instructions = self.prompt_template.get_prompt_with_variables(
            "general_chat_termination_instructions", TERMINATE=TERMINATE
        )
        if termination_instructions is None:
            raise ValueError(
                "Termination instructions prompt not found in chat_prompts.yaml"
            )

        return base_prompt + termination_instructions

    async def cleanup(self):
        """
        Cleanup method to properly close the model client connection.
        Should be called when the service is being shut down.
        """
        try:
            await self.model_client.close()
            logger.info("Model client connection closed successfully")
        except Exception as e:
            logger.error(f"Error closing model client: {e}")


# Global instance
GENERAL_CHAT_SERVICE_INSTANCE = GeneralChatService()
