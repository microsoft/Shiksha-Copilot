from typing import List, Optional
from pydantic import BaseModel, Field

# Import models from requests.py
from core.models.requests import LPLevel, EnglishLPType, Section


class LessonPlan(BaseModel):
    """Response model for a lesson plan"""

    id: str = Field(..., description="ID of the lesson plan", alias="_id")
    created_at: int = Field(..., description="Unix timestamp of creation time")
    workflow_id: str = Field(
        ..., description="ID of the workflow used to generate the lesson plan"
    )
    chapter_id: str = Field(..., description="ID of the chapter")
    subtopics: Optional[List[str]] = Field(
        default_factory=list, description="List of subtopic names"
    )
    learning_outcomes: List[str] = Field(
        default_factory=list, description="Learning outcomes for the lesson plan"
    )
    lp_level: LPLevel = Field(
        ..., description="Level of the lesson plan (CHAPTER or SUBTOPIC)"
    )
    lp_type_english: EnglishLPType = Field(
        default=EnglishLPType.NONE,
        description="Type of English lesson plan (PROSE, POEM, or NONE)",
    )
    sections: List[Section] = Field(
        default_factory=list, description="Sections of the lesson plan"
    )
