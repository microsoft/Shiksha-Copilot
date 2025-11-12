from enum import Enum
import uuid
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional

from utils.constants import Language

class UserRoleEnum(str, Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"

class User(BaseModel):
    id: str = Field(..., alias='_id')
    role: Literal[UserRoleEnum.ADMIN, UserRoleEnum.TEACHER]
    name: str
    is_disabled: bool = False

class Topic(BaseModel):
    title: str
    learning_outcomes: List[str]

class TopicGroup(BaseModel):
    group_titles: List[str] = Field(default_factory=list)

class Video(BaseModel):
    title: str = ""
    url: str = ""
    selected: bool = False

class ChapterTypeEnglish(Enum):
    PROSE = "PROSE"
    POEM = "POEM"
    NONE = "NONE"

class Chapter(BaseModel):
    id: str = Field(..., alias='_id')
    user_id: str = "DEFAULT USER"
    last_edited_at: int = -1
    chapter_number: int
    chapter_title: str
    topics: List[Topic]
    topic_groups: List[TopicGroup] = []
    summary: str
    learning_outcomes: List[str]
    isEdited: bool = False
    index_path: str = ""
    preferred_mot: str = ""
    vetted_videos: bool = False
    videos: List[Video] = []
    language: str = Language.ENGLISH.value
    skills: Dict[str, Any] = {}
    chapter_type_english: str = ChapterTypeEnglish.NONE.value

    def __str__(self, newline_char="\n") -> str:
        solid_line = f'{newline_char}<hr style="border: none; border-top: 1px solid #000;">{newline_char}'
        los = "; ".join(self.learning_outcomes)
        topics_los = ""
        for topic_index, topic in enumerate(self.topics):
            topic_los = ';'.join(topic.learning_outcomes)
            topics_los += f'{newline_char}**Subtopic {topic_index + 1}:** {topic.title}{newline_char}**Learning Outcomes:** {topic_los}'

        return f'{solid_line}**Chapter Learning Outcomes:**' + newline_char + los + newline_char + f'**Subtopic Learning Outcomes:**' + topics_los + solid_line
    
class ChapterLPGenerationRequest(BaseModel):
    id: str = Field(..., alias='_id')
    chapter_number: int
    chapter_title: str
    topics: List[Topic] = []
    summary: str
    learning_outcomes: List[str] = []
    isEdited: bool = True
    preferred_mot: str = ""
    index_path: str = ""
    skills: Dict[str, Any] = {}
    chapter_type_english: str = ChapterTypeEnglish.NONE.value

class SubtopicLPGenerationRequest(BaseModel):
    chapter_details: ChapterLPGenerationRequest
    subtopic_info: List[Topic] = []