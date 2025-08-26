import json
from textwrap import dedent
from typing import Dict, Any, Optional

from core.models.workflow_models import (
    Mode,
    SectionDefinition,
)
from core.models.requests import LessonPlanGenerationInput, LPLevel
from core.base_query_generator import BaseQueryGenerator


class QueryGenerator(BaseQueryGenerator):
    """
    Class responsible for generating retrieval and synthesis queries for lesson plan generation
    """

    def __init__(
        self,
        lp_gen_input: LessonPlanGenerationInput,
        section: SectionDefinition,
    ):
        """
        Initialize the QueryGenerator

        Args:
            lp_gen_input: The lesson plan generation input
            section: The section for which queries will be generated
        """
        super().__init__(lp_gen_input, section)

    def generate_retrieval_query(self) -> str:
        # Use the default retrieval generation from BaseQueryGenerator
        return super().generate_retrieval_query()

    def generate_synthesis_query(
        self,
        dependencies: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate a synthesis query for the section specified in constructor

        Args:
            dependencies: The outputs of dependency sections

        Returns:
            The synthesis query string
        """
        if not self.section:
            raise ValueError(
                "Section must be provided either in constructor or method call"
            )

        section_title = self.section.title
        section_description = self.section.description
        mode = self.section.mode
        output_format = self.section.output_format

        retrieval_query = self.generate_retrieval_query()

        if self.lp_gen_input.lp_level == LPLevel.SUBTOPIC:
            synthesis_query = (
                f"You are creating the '{section_title}' section of a lesson plan. "
                f"Following are the subtopic(s) and their learning outcomes:\n\n"
                f"{retrieval_query}"
            )
        else:
            synthesis_query = (
                f"You are creating the '{section_title}' section of a lesson plan. "
                f"Following are the learning outcomes:\n\n"
                f"{retrieval_query}"
            )

        # Add additional context if available
        if self.lp_gen_input.additional_context.strip():
            synthesis_query += f"\n---\nAdditional Context:\n\n{self.lp_gen_input.additional_context.strip()}\n---\n"

        if dependencies:
            dependencies_str = "\n\n".join(
                [
                    f"# Section: {section_title}\n{json.dumps(content)}"
                    for section_title, content in dependencies.items()
                ]
            )
            synthesis_query += (
                "\nThe content of this section depends on the following previously generated sections:\n"
                "```\n"
                f"{dependencies_str}\n"
                "```"
            )

        synthesis_query += (
            f"\n# Section Description: {dedent(section_description)}\n\n"
            "**Note: Adhere to the mentioned learning outcomes and ensure the content is relevant to the chapter. Do NOT include section title in the output unless specifically mentioned in output format.**\n"
        )
        if mode == Mode.RAG:
            synthesis_query += "**Refer to the retrieved content for context.**"

        if output_format:
            synthesis_query += (
                "\nThe output should be in the following JSON format:\n"
                f"{json.dumps(output_format, indent=2)}"
            )
        else:
            synthesis_query += "\nThe output should be in plain string **Markdown** format for ease of readability. DO NOT annotate the output with any special characters. Do NOT repeat or regurgitate descriptions of sections provided above. Only generate relevant material as indicated in the section description."

        return dedent(self.replace_prompt_variables(synthesis_query))
