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

    def generate_synthesis_query(
        self,
        dependencies: Optional[Dict[str, Any]] = None,
    ) -> str:
        if not self.section:
            raise ValueError(
                "Section must be provided either in constructor or method call"
            )

        section_title = self.section.title
        section_description = self.section.description
        mode = self.section.mode
        output_format = self.section.output_format

        # Build the instructional prompt for the LLM (NOT the retriever)
        if self.lp_gen_input.lp_level == LPLevel.SUBTOPIC:
            synthesis_query = (
                f"You are creating the '{section_title}' section of a lesson plan.\n"
                f"Focus on the given subtopic(s) and their learning outcomes.\n"
            )
        else:
            synthesis_query = (
                f"You are creating the '{section_title}' section of a lesson plan.\n"
                f"Focus on the given learning outcomes.\n"
            )

        # Optional: show LOs to the LLM for grounding (kept compact).
        # This is NOT used for retrieval; retrieval will use QueryBundle.embedding_strs.
        retrieval_seed = self.generate_retrieval_query().strip()
        if retrieval_seed:
            synthesis_query += "=== CURRENT SECTION'S LEARNING OUTCOMES ===\n"
            synthesis_query += retrieval_seed + "\n===\n"

        # Additional context from caller (if any)
        synthesis_query = self.add_additional_context_if_present(synthesis_query)

        # Dependencies (previous sections) remain inline so LLM can use them
        if dependencies:
            deps_str = "\n\n".join(
                [
                    f"# Section: {title}\n{json.dumps(content, ensure_ascii=False)}"
                    for title, content in dependencies.items()
                ]
            )
            synthesis_query += (
                "\n=== PREVIOUSLY GENERATED SECTIONS ===\n"
                "\nThe content of this section depends on the following previously generated sections:\n"
                f"{deps_str}"
                "\n===\n"
            )

        # Section instructions (source of truth)
        synthesis_query += (
            f"=== CURRENT SECTION DESCRIPTION ===\n{dedent(section_description)}\n"
            "**IMPORTANT: Follow the above section description EXACTLY. "
            "Adhere to the **CURRENT SECTION'S LEARNING OUTCOMES** to generate content for this section. All references of learning outcomes in the above description belong to **CURRENT SECTION'S LEARNING OUTCOMES** ONLY. "
            "Do NOT include the section title unless the output format asks for it.**"
            "\n===\n"
        )

        if mode == Mode.RAG:
            synthesis_query += "**Use the attached context passages (from the system) when relevant.**\n"

        if output_format:
            synthesis_query += (
                "\nReturn a single JSON object ONLY matching this schema (no prose, no fences):\n"
                f"{json.dumps(output_format, ensure_ascii=False, indent=2)}\n"
                'If a field is empty, use "" or [] appropriately.'
            )
        else:
            synthesis_query += (
                "\nReturn Markdown ONLY (no code fences). "
                "Do NOT repeat the section description; generate the requested content."
            )

        return dedent(self.replace_prompt_variables(synthesis_query))
