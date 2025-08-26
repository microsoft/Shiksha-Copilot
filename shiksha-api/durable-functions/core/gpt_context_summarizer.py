import logging
from typing import Optional, Dict, Any
from textwrap import dedent

from .agents import AgentPool
from .models.workflow_models import GPTInput


class GPTContextSummarizer:
    """
    Uses GPT to intelligently summarize lesson plan context while preserving
    the most important information for avoiding duplication across lesson plans.
    """

    @staticmethod
    async def summarize_lesson_plan_context(
        lesson_plan_content: str, max_summary_length: int = 800
    ) -> str:
        """
        Use GPT to create an intelligent summary of lesson plan content.

        Args:
            lesson_plan_content: The full lesson plan content to summarize
            max_summary_length: Maximum length of the summary

        Returns:
            Intelligently summarized content focusing on key information
        """
        if not lesson_plan_content or len(lesson_plan_content.strip()) < 100:
            return ""

        # Create the summarization prompt
        summary_prompt = dedent(
            f"""
        You are an expert educational content analyzer. Please create a concise summary of the following lesson plan content that focuses on the most important information for avoiding content duplication in future lesson plans.

        Your summary should include:
        1. **Key Topics Covered**: Main subjects and concepts addressed
        2. **Learning Outcomes**: Primary learning objectives achieved
        3. **Pedagogical Strategies**: Teaching methods and approaches used
        4. **Activities**: Specific classroom activities or exercises mentioned
        5. **Keywords/Concepts**: Important terminology and concepts introduced

        Please format your response as a structured summary with clear sections. Keep it concise but comprehensive, focusing on information that would help avoid duplication in related lesson plans.

        Target length: Maximum {max_summary_length} characters.

        Lesson Plan Content to Summarize:
        ---
        {lesson_plan_content}
        ---

        Provide a structured summary:
        """
        ).strip()

        try:
            # Get GPT agent and generate summary
            gpt_agent = AgentPool.get_gpt_agent()
            gpt_input = GPTInput(prompt=summary_prompt)

            summary = await gpt_agent.generate_section(gpt_input)

            # Ensure summary doesn't exceed max length
            if len(summary) > max_summary_length:
                # Truncate gracefully at sentence boundaries
                truncated = summary[:max_summary_length]
                last_period = truncated.rfind(".")
                if (
                    last_period > max_summary_length * 0.8
                ):  # If we can keep 80% of content
                    summary = truncated[: last_period + 1]
                else:
                    summary = truncated + "..."

            logging.info(
                f"Successfully summarized lesson plan context: {len(lesson_plan_content)} -> {len(summary)} characters"
            )
            return summary.strip()

        except Exception as e:
            logging.error(f"Failed to summarize lesson plan context: {str(e)}")
            # Fallback to truncated original content
            return (
                lesson_plan_content[:max_summary_length] + "..."
                if len(lesson_plan_content) > max_summary_length
                else lesson_plan_content
            )
