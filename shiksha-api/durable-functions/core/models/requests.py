from enum import Enum
import json
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from core.models.dag import DAGNode, NodeStatus
from core.models.workflow_models import WorkflowDefinition

PREVIOUSLY_GENERATED_DAG_NODE_TITLE_PREFIX = "Previously Generated Section: "


class LPLevel(str, Enum):
    CHAPTER = "CHAPTER"
    SUBTOPIC = "SUBTOPIC"
    TELANGANA_ENGLISH_RESOURCE_PLAN = "TELANGANA_ENGLISH_RESOURCE_PLAN"


class EnglishLPType(str, Enum):
    PROSE = "PROSE"
    POEM = "POEM"
    NONE = "NONE"


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

    def get_dag_node(self):
        return DAGNode(
            id=self.section_id,
            title=PREVIOUSLY_GENERATED_DAG_NODE_TITLE_PREFIX + self.section_title,
            mode="gpt",  # This node will NOT get executed, hence mode is irrelevant
            dependencies=[],  # No dependencies for this node
            status=NodeStatus.COMPLETED,
            output=(
                json.dumps(self.content, ensure_ascii=False)
                + f"\n\n**Feedback for regeneration: {self.regen_feedback}**"
                if self.regen_feedback
                else ""
            ),
        )


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
    chapter_info: ChapterInfo = Field(..., description="Information about the chapter")
    lp_level: LPLevel = Field(
        ...,
        description="Level of the lesson plan (CHAPTER or SUBTOPIC or TELANGANA_ENGLISH_RESOURCE_PLAN)",
    )
    learning_outcomes: List[str] = Field(
        ..., description="Learning outcomes for the lesson plan"
    )
    lp_type_english: Optional[EnglishLPType] = Field(
        default=EnglishLPType.NONE,
        description="Type of English lesson plan (PROSE, POEM, or NONE)",
    )
    start_from_section_id: Optional[str] = Field(
        None, description="ID of the section to start from for regeneration"
    )
    subtopics: Optional[List[str]] = Field(
        default_factory=list, description="List of subtopic names for the lesson plan"
    )
    lesson_plan: Optional[LessonPlanContent] = Field(
        None, description="Existing lesson plan content for regeneration"
    )
    prompt_variables: Optional[Dict] = Field(
        default_factory=dict,
        description="Optional variables for section prompts in workflow",
    )
    additional_context: Optional[str] = Field(
        None,
        description="Additional context from previously generated lesson plans (auto-summarized)",
    )
