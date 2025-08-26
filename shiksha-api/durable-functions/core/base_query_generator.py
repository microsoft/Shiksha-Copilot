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
            synthesis_query += f"\n---\nAdditional Context:\n\n{self.lp_gen_input.additional_context.strip()}\n---\n"
        return synthesis_query

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
            retrieval_query = "\n\n".join(
                [
                    f"Topic Title: {subtopic_info.name}\n"
                    f"Learning Outcomes: {chr(10).join(subtopic_info.learning_outcomes)}"
                    for subtopic_info in self.lp_gen_input.subtopics
                ]
            )
        else:
            retrieval_query = (
                f"Chapter Title: {self.lp_gen_input.chapter_info.chapter_title}\n"
                f"Learning Outcomes: {chr(10).join(self.lp_gen_input.learning_outcomes)}"
            )

        return dedent(retrieval_query)
