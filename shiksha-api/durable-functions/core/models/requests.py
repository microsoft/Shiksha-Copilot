from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from core.models.workflow_models import WorkflowDefinition


class LPLevel(str, Enum):
    CHAPTER = "CHAPTER"
    SUBTOPIC = "SUBTOPIC"


class EnglishLPType(str, Enum):
    PROSE = "PROSE"
    POEM = "POEM"
    NONE = "NONE"


class SubtopicInfo(BaseModel):
    name: str = Field(..., description="Name of the subtopic")
    learning_outcomes: List[str] = Field(
        default_factory=list, description="Learning outcomes for the subtopic"
    )


class ChapterInfo(BaseModel):
    id: str = Field(..., description="ID of the chapter")
    index_path: str = Field(..., description="Path to the index for content retrieval")
    chapter_title: str = Field(..., description="Title of the chapter")


class Section(BaseModel):
    section_id: str = Field(..., description="ID of the section")
    section_title: str = Field(..., description="Title of the section")
    content: Union[str, Dict[str, Any]] = Field(
        ..., description="Content of the section"
    )
    regen_feedback: Optional[str] = Field(None, description="Feedback for regeneration")


class LessonPlanContent(BaseModel):
    sections: List[Section] = Field(
        default_factory=list, description="Sections of the lesson plan"
    )


class LessonPlanGenerationInput(BaseModel):
    """Input for generating a lesson plan"""

    user_id: str = Field(
        default="ADMIN", description="ID of the user generating the lesson plan"
    )
    workflow: WorkflowDefinition = Field(
        ..., description="Legacy workflow definition field"
    )
    lp_id: str = Field(default="", description="ID of the lesson plan")
    lp_level: LPLevel = Field(
        ..., description="Level of the lesson plan (CHAPTER or SUBTOPIC)"
    )
    learning_outcomes: List[str] = Field(
        default_factory=list, description="Learning outcomes for the lesson plan"
    )
    lp_type_english: EnglishLPType = Field(
        default=EnglishLPType.NONE,
        description="Type of English lesson plan (PROSE, POEM, or NONE)",
    )
    start_from_section_id: Optional[str] = Field(
        None, description="ID of the section to start from for regeneration"
    )
    chapter_info: ChapterInfo = Field(..., description="Information about the chapter")
    subtopics: List[SubtopicInfo] = Field(
        default_factory=list, description="List of subtopics for the lesson plan"
    )
    lesson_plan: Optional[LessonPlanContent] = Field(
        None, description="Existing lesson plan content for regeneration"
    )
