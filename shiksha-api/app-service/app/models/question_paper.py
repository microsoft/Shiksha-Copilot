# Models for question paper generation
# Extracted from the original standalone FastAPI application

from enum import Enum
from functools import reduce
from math import gcd
from typing import List, Dict, Any, Optional, Union, Tuple
from pydantic import BaseModel, computed_field, validator


# ==============================
# RESPONSE MODELS
# ==============================


class QuestionBankMetadata(BaseModel):
    user_id: str
    subject: str
    grade: str
    unit_names: List[str]
    school_name: str
    examination_name: str


class TextQuestion(BaseModel):
    question: str = ""


class FourOptionsQuestion(BaseModel):
    question: str = ""
    options: List[str] = []
    answer: str = ""


class MatchingListQuestion(BaseModel):
    value1: str = ""
    value2: str = ""


# ==============================
# SELF-DESCRIBING QUESTION TYPE
# ==============================


class QuestionType(str, Enum):
    # value, description, pydantic_model
    MCQ = (
        "Four alternatives are given for each of the following questions, choose the correct alternative",
        "These questions provide exactly four options, challenging students to select the correct answer from a set of alternatives.",
        FourOptionsQuestion,
    )
    FILL_BLANKS = (
        "Fill in the blanks with suitable words",
        "This type of question requires students to complete sentences or phrases by inserting the appropriate missing word(s).",
        TextQuestion,
    )
    ANSWER_WORD = (
        "Answer the following in a word, phrase or sentence",
        "These questions expect a very brief response—a single word, a short phrase, or a concise sentence.",
        TextQuestion,
    )
    ANSWER_SHORT = (
        "Answer the following in two or three sentences each",
        "Short answer questions require a concise yet complete response, typically in two or three sentences.",
        TextQuestion,
    )
    ANSWER_GENERAL = (
        "Answer the following questions",
        "These open-ended questions invite students to provide brief responses that are straightforward and to the point.",
        TextQuestion,
    )
    ANSWER_LONG = (
        "Answer the following question in four or five sentences",
        "Long answer questions require a detailed, well-structured response that spans four to five sentences.",
        TextQuestion,
    )
    MATCH_LIST = (
        "Match the following",
        "Generate a CORRECTLY matched item-pair",
        MatchingListQuestion,
    )

    def __new__(cls, value, description, pydantic_model):
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.description = description
        obj._model = pydantic_model
        return obj

    # Get required fields from Pydantic model
    def get_required_fields(self) -> List[str]:
        """Get list of required fields from the Pydantic model."""
        model_fields = self._model.model_fields
        required_fields = []
        for field_name, field_info in model_fields.items():
            # Check if field is required (not optional and no default)
            if field_info.is_required():
                required_fields.append(field_name)
        return required_fields

    # Get field types from Pydantic model
    def get_field_info(self) -> Dict[str, Any]:
        """Get field information from the Pydantic model."""
        return {
            name: {
                "type": field.annotation,
                "required": field.is_required(),
                "default": field.default if not field.is_required() else None,
            }
            for name, field in self._model.model_fields.items()
        }

    # Prompt/schema hint for LLM
    def schema_dict(self) -> str:
        return self._model().model_dump_json()

    # Cast generated dict to the right Pydantic model
    def cast(self, obj: dict):
        return self._model(**obj)

    # Lightweight, per-type validation using Pydantic model
    def validate_obj(self, obj: dict) -> bool:
        """Validate object against the Pydantic model requirements."""
        try:
            # Try to create an instance - this will validate all fields and types
            self._model(**obj)

            # Additional specific validations
            if self._model == FourOptionsQuestion:
                # For MCQ: ensure answer is in options
                options = obj.get("options", [])
                answer = obj.get("answer", "")
                if answer and answer not in options:
                    return False

            return True
        except Exception:
            # If Pydantic validation fails, object is invalid
            return False

    # Back-compat alias
    def get_question_format_dict(self) -> str:
        return self.schema_dict()


class QuestionTypeResponse(BaseModel):
    type: QuestionType
    number_of_questions: int
    marks_per_question: int
    questions: List[Union[TextQuestion, FourOptionsQuestion, MatchingListQuestion]] = []


class QuestionBankResponse(BaseModel):
    metadata: Optional[QuestionBankMetadata] = None
    questions: List[QuestionTypeResponse] = []


# ============================
# REQUEST MODELS
# ============================


class ChapterSubtopic(BaseModel):
    title: str
    learning_outcomes: List[str]


class Chapter(BaseModel):
    title: str
    index_path: str
    learning_outcomes: List[str]
    subtopics: Optional[List[ChapterSubtopic]] = None


class MarksDistribution(BaseModel):
    unit_name: str
    percentage_distribution: int
    marks: int


class ObjectiveDistribution(BaseModel):
    objective: str
    percentage_distribution: int


class QuestionDistribution(BaseModel):
    unit_name: str
    objective: str


class Template(BaseModel):
    type: QuestionType
    number_of_questions: int
    marks_per_question: int
    question_distribution: Optional[List[QuestionDistribution]] = None

    @computed_field
    @property
    def description(self) -> str:
        return self.type.description


class QuestionBankPartsGenerationRequest(BaseModel):
    user_id: str
    board: str
    medium: str
    grade: int
    subject: str
    chapters: List[Chapter]
    total_marks: int
    template: List[Template]
    existing_questions: List[QuestionTypeResponse] = []


class QBQuestionDistributionGenerationRequest(BaseModel):
    user_id: str
    board: str
    medium: str
    grade: int
    subject: str
    chapters: List[Chapter]
    total_marks: int
    marks_distribution: List[MarksDistribution]
    objective_distribution: List[ObjectiveDistribution]
    template: List[Template]

    @validator("chapters")
    def check_chapters_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("The 'chapters' field must contain at least one Chapter.")
        return v

    def verify_template_for_marks_and_objective_distribution(
        self, new_template: List[Template]
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifies if the given `new_template` follows:
        1. The total marks match `self.total_marks`.
        2. The marks distribution per unit (chapter) aligns with `self.marks_distribution`.
        3. The objective-based percentage distribution aligns with `self.objective_distribution`.

        Returns:
            Tuple[bool, Optional[str]]: (True, None) if the new template is valid, (False, "Reason for failure") otherwise.
        """

        # **Step 1: Verify Total Marks**
        new_template_total_marks = sum(
            q_type.marks_per_question * q_type.number_of_questions
            for q_type in new_template
        )
        if new_template_total_marks != self.total_marks:
            return (
                False,
                f"Total marks mismatch: expected {self.total_marks}, got {new_template_total_marks}",
            )

        # **Step 2: Verify Unit (Chapter) Marks Distribution**
        new_unit_marks_distribution = {}

        for q_type in new_template:
            if q_type.question_distribution:
                for q_dist in q_type.question_distribution:
                    unit_name = q_dist.unit_name
                    new_unit_marks_distribution[unit_name] = (
                        new_unit_marks_distribution.get(unit_name, 0)
                        + q_type.marks_per_question
                    )

        # Convert `self.marks_distribution` to a dictionary for faster lookup
        expected_unit_marks = {md.unit_name: md.marks for md in self.marks_distribution}

        # Ensure the unit names match
        if set(new_unit_marks_distribution.keys()) != set(expected_unit_marks.keys()):
            return (
                False,
                "Mismatch in unit names between template and expected distribution",
            )

        # Ensure marks are correctly distributed
        for unit_name, marks in new_unit_marks_distribution.items():
            if marks != expected_unit_marks[unit_name]:
                return (
                    False,
                    f"Marks distribution mismatch for unit '{unit_name}': expected {expected_unit_marks[unit_name]}, got {marks}",
                )

        # **Step 3: Verify Objective-Based Percentage Distribution**
        new_objective_marks_distribution = {}

        for q_type in new_template:
            if q_type.question_distribution:
                for q_dist in q_type.question_distribution:
                    objective = q_dist.objective
                    new_objective_marks_distribution[objective] = (
                        new_objective_marks_distribution.get(objective, 0)
                        + q_type.marks_per_question
                    )

        # Convert `self.objective_distribution` to a dictionary for faster lookup
        expected_objective_distribution = {
            obj_dist.objective: obj_dist.percentage_distribution
            for obj_dist in self.objective_distribution
        }

        # Convert new marks distribution to percentage
        new_objective_percentage_distribution = {
            obj: (marks / self.total_marks) * 100
            for obj, marks in new_objective_marks_distribution.items()
        }

        # Ensure the objectives match
        if set(new_objective_percentage_distribution.keys()) != set(
            expected_objective_distribution.keys()
        ):
            return False, "Mismatch in objective distribution keys"

        # Ensure percentage distributions are within ±1% tolerance
        for objective, percentage in new_objective_percentage_distribution.items():
            if abs(percentage - expected_objective_distribution[objective]) > 1:
                return (
                    False,
                    f"Objective '{objective}' percentage mismatch: expected {expected_objective_distribution[objective]}%, got {percentage:.2f}%",
                )

        return True, None  # If all checks pass


class QBTemplateGenerationRequest(BaseModel):
    user_id: str
    board: str
    medium: str
    grade: int
    subject: str
    chapters: List[Chapter]
    total_marks: int
    marks_distribution: List[MarksDistribution]

    def get_template(self) -> List[Template]:
        """
        Generates a List of Template objects, with the following question types:
            1) QuestionType.MCQ
            2) QuestionType.ANSWER_SHORT
            3) QuestionType.ANSWER_LONG

        Adhering to the self.marks_distribution such that the sum of marks
        allocated to each unit equals self.total_marks. Here, we simply
        verify consistency and then evenly split marks among these 3 question
        types. Finally, set `question_distribution=None` in each Template.
        """

        sum_of_md_marks = sum(md.marks for md in self.marks_distribution)
        if sum_of_md_marks != self.total_marks:
            raise ValueError(
                f"Sum of 'marks' in marks_distribution ({sum_of_md_marks}) "
                f"does not match 'total_marks' ({self.total_marks})."
            )

        question_types = [
            QuestionType.MCQ,
            QuestionType.ANSWER_SHORT,
            QuestionType.ANSWER_LONG,
        ]

        marks_per_q = {
            QuestionType.MCQ: 1,  # e.g., each MCQ is 1 mark
            QuestionType.ANSWER_SHORT: 2,  # each short-answer question is 2 marks
            QuestionType.ANSWER_LONG: 5,  # each long-answer question is 5 marks
        }

        total_marks_per_q = self._divide_into_k_parts_with_divisors(
            self.total_marks,
            [marks_per_q[q_type] for q_type in question_types],
        )

        templates: List[Template] = []
        for q_type, total_marks in zip(question_types, total_marks_per_q):
            num_of_questions = total_marks // marks_per_q[q_type]
            if num_of_questions > 0:
                template_obj = Template(
                    type=q_type,
                    number_of_questions=num_of_questions,
                    marks_per_question=marks_per_q[q_type],
                    question_distribution=None,
                )
                templates.append(template_obj)

        return templates

    def _divide_into_k_parts_with_divisors(self, n: int, d: list[int]) -> list[int]:
        """
        Divide the integer 'n' into 'k' parts (where k = len(d)),
        such that each part p[i] is:
            - an integer multiple of d[i],
            - the sum of all p[i] is 'n',
            - and all p[i] are as close to each other as possible (heuristically).

        Parameters:
        -----------
        n : int
            The total integer to be divided.
        d : list[int]
            A list of k divisors. Each resulting part p[i] must be a multiple of d[i].

        Returns:
        --------
        p : list[int]
            A list of length k, where p[i] is a multiple of d[i], and sum(p) = n.

        Raises:
        -------
        ValueError
            If it's impossible to distribute 'n' as the sum of multiples of d[i].
            (For example, if gcd(d) does not divide n.)
        """

        k = len(d)
        if k == 0:
            raise ValueError("Empty 'd' list; cannot divide into 0 parts.")

        # 1) Check gcd(d[0], d[1], ..., d[k-1]) must divide n
        common_divisor = reduce(gcd, d)
        if n % common_divisor != 0:
            raise ValueError(
                "Impossible to distribute n as a sum of multiples of each d[i]. "
                f"gcd(d) = {common_divisor} does not divide n = {n}."
            )

        # 2) We'll try to keep each part near n/k
        target = n / k  # float, "ideal" size if no constraints
        p = [0] * k

        # 3) Initialize each p[i] to the largest multiple of d[i] that doesn't exceed target
        #    i.e. p[i] = floor(target / d[i]) * d[i]
        for i in range(k):
            base_count = int(target // d[i])  # how many times d[i] fits in 'target'
            p[i] = base_count * d[i]

        # 4) Calculate how many units we still need to add or remove
        leftover = n - sum(p)

        # Helper cost functions to see how 'close' p[i] gets to the target if we add/subtract d[i]
        def cost_if_add(i: int) -> float:
            return abs((p[i] + d[i]) - target)

        def cost_if_sub(i: int) -> float:
            return abs((p[i] - d[i]) - target)

        # 5) Greedily add or remove multiples of d[i] to fix leftover
        while leftover != 0:
            if leftover > 0:
                # We want to add increments of d[i] to whichever part yields the smallest 'cost'
                candidates = [i for i in range(k) if leftover >= d[i]]
                if not candidates:
                    raise ValueError(
                        "Cannot distribute leftover>0. Possibly leftover < some d[i]."
                    )
                # Pick the index that yields minimal 'cost' after adding d[i]
                i_best = min(candidates, key=cost_if_add)
                p[i_best] += d[i_best]
                leftover -= d[i_best]

            else:  # leftover < 0
                # We want to remove increments of d[i] (i.e., subtract d[i])
                # from whichever part yields the smallest 'cost'.
                candidates = [i for i in range(k) if p[i] >= d[i]]
                if not candidates:
                    raise ValueError(
                        "Cannot reduce leftover<0. All parts are smaller than their divisor."
                    )
                i_best = min(candidates, key=cost_if_sub)
                p[i_best] -= d[i_best]
                leftover += d[i_best]

        # Now sum(p) == n, and each p[i] is multiple of d[i]
        return p
