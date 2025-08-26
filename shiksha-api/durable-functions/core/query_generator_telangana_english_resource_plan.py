import json
from textwrap import dedent
from typing import Dict, Any, Optional

from core.models.workflow_models import (
    Mode,
    SectionDefinition,
)
from core.models.requests import LessonPlanGenerationInput, LPLevel
from core.base_query_generator import BaseQueryGenerator


class QueryGeneratorTelanganaEnglishResourcePlan(BaseQueryGenerator):
    """
    Class responsible for generating synthesis queries for English subject resource plan generation
    """

    def __init__(
        self,
        lp_gen_input: LessonPlanGenerationInput,
        section: SectionDefinition,
    ):
        """
        Initialize the QueryGeneratorTelanganaEnglishResourcePlan

        Args:
            lp_gen_input: The input parameters for lesson plan generation.
            section: The section for which synthesis queries will be generated.
        """
        super().__init__(lp_gen_input, section)

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

        synthesis_query = f"You are creating the '{section_title}' section of a resource plan for english subject."

        # Add additional context if available
        synthesis_query = self.add_additional_context_if_present(synthesis_query)

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
            f"\n# Current Section Description: {dedent(section_description)}\n\n"
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
