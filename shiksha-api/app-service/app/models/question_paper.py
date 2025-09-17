# Models for question paper generation
# Extracted from the original standalone FastAPI application

from enum import Enum
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, computed_field


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

    def filter_qb_distribution_on_unit(self, units_str: list) -> Optional["Template"]:
        if self.question_distribution:
            qb_list = [
                qb_dist
                for qb_dist in self.question_distribution
                if qb_dist.unit_name.strip() in units_str
            ]
            if len(qb_list) > 0:
                return Template(
                    type=self.type,
                    marks_per_question=self.marks_per_question,
                    number_of_questions=len(qb_list),
                    question_distribution=qb_list,
                )
        return None


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


# =============================
# HOW TO ADD A NEW QUESTION TYPE
# =============================
#
# The system is now fully extensible! To add a new question type:
#
# 1) Define a Pydantic model for the new type (e.g., True/False):
#
# class TrueFalseQuestion(BaseModel):
#     question: str = ""
#     answer: bool = False
#
# 2) Add ONE enum member to QuestionType with:
#    - value (title shown to students)
#    - description (for prompt)
#    - pydantic model class
#
# TRUE_FALSE = (
#     "State whether the following is True or False",
#     "Binary judgment items testing key concept recognition.",
#     TrueFalseQuestion,
# )
#
# That's it! The system will automatically:
# - Extract required fields from the Pydantic model
# - Generate appropriate format instructions from the model structure
# - Use the correct Pydantic model for validation and casting
# - Handle the new type in all existing workflows
#
# No changes needed to prompts, validation logic, or generation code!
# The Pydantic model itself defines the structure and validation rules.
