from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from textwrap import dedent
import json
import re

from core.models.workflow_models import SectionDefinition, Mode
from core.models.requests import LessonPlanGenerationInput, LPLevel


class BaseQueryGenerator(ABC):
    """
    Abstract base class for query generators. Provides shared initialization and a
    default retrieval query generator. Concrete subclasses must implement
    generate_synthesis_query.
    """

    def __init__(
        self, lp_gen_input: LessonPlanGenerationInput, section: SectionDefinition
    ):
        self.lp_gen_input = lp_gen_input
        self.section = section

    def add_additional_context_if_present(self, synthesis_query: str) -> str:
        if (
            self.lp_gen_input
            and self.lp_gen_input.additional_context
            and self.lp_gen_input.additional_context.strip()
        ):
            synthesis_query += f"\n=== ADDITIONAL CONTEXT ===\n{self.lp_gen_input.additional_context.strip()}\n===\n"
        return synthesis_query

    def get_all_section_names_and_journey_context(self) -> str:
        """
        Extract all section names from the workflow and provide learning journey context.

        Returns:
            A formatted string containing all section names and learning journey guidance.
        """
        if not self.lp_gen_input or not self.lp_gen_input.workflow:
            return ""

        # Extract all section titles from the workflow
        section_names = [
            section.title for section in self.lp_gen_input.workflow.sections
        ]

        if not section_names:
            return ""

        # Format the section names list
        section_list = ", ".join(section_names)

        # Get current section name for context
        current_section = self.section.title if self.section else "Current Section"

        journey_context = f"""=== LESSON PLAN STRUCTURE & LEARNING JOURNEY ===
All sections in this lesson plan: {section_list}

IMPORTANT: This lesson plan should take students on a structured learning journey from the UNKNOWN to the KNOWN with respect to the topic. Each section should build upon previous sections and contribute to this progression:

- Early sections should introduce foundational concepts and engage student curiosity
- Middle sections should explore, explain, and elaborate on key concepts  
- Later sections should help students apply, evaluate, and consolidate their learning

The current section '{current_section}' should fit logically into this learning progression, considering:
1. What students should already know from previous sections
2. What new knowledge/skills this section should develop
3. How this section prepares students for subsequent sections
4. The overall journey from unfamiliarity to mastery of the topic

==="""

        return journey_context

    @abstractmethod
    def generate_synthesis_query(
        self, dependencies: Optional[Dict[str, Any]] = None
    ) -> str:
        """Return a synthesis query for the configured section."""
        raise NotImplementedError

    def replace_prompt_variables(self, text: str) -> str:
        """
        Replace placeholders of the form ${VAR_NAME} in `text` with values from
        `self.lp_gen_input.prompt_variables`.

        - If `text` is not a string or there are no prompt variables available,
          the original `text` is returned unchanged.
        - Placeholders without a corresponding entry in the prompt_variables
          dict are removed from the returned string.
        """
        if not isinstance(text, str):
            return text

        vars_map = {}
        if self.lp_gen_input is not None:
            vars_map = self.lp_gen_input.prompt_variables

        # If prompt_variables is empty or not provided, remove all ${VAR} placeholders
        if not vars_map:
            return re.sub(r"\$\{[A-Za-z0-9_]+\}", "", text)

        pattern = re.compile(r"\$\{([A-Za-z0-9_]+)\}")

        def _replace(match: re.Match) -> str:
            key = match.group(1)
            if key in vars_map:
                return str(vars_map[key])
            # Remove placeholder when key is not present in prompt variables
            return ""

        return pattern.sub(_replace, text)

    def generate_retrieval_query(self) -> str:
        """
        Default retrieval query generation logic used by lesson plan generators.
        Subclasses may override if they need different behavior.
        """
        if not self.lp_gen_input:
            return ""

        if self.lp_gen_input.lp_level == LPLevel.SUBTOPIC:
            if not self.lp_gen_input.subtopics or len(self.lp_gen_input.subtopics) == 0:
                raise ValueError(
                    "Subtopics must be provided for SUBTOPIC level lesson plans"
                )
            retrieval_query = (
                f"Topic(s): {'; '.join(self.lp_gen_input.subtopics) }\n"
                f"Learing Outcomes: {chr(10).join(self.lp_gen_input.learning_outcomes)}"
            )
        else:
            retrieval_query = (
                f"Chapter Title: {self.lp_gen_input.chapter_info.chapter_title}\n"
                f"Learning Outcomes: {chr(10).join(self.lp_gen_input.learning_outcomes)}"
            )

        return dedent(retrieval_query)
