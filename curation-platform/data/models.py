from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class Feedback:
    rating: int = -1
    message: str = ""

@dataclass
class InstructionDetail:
    main: str
    summary: str = ""
    original: str = ""
    ai: str = ""
    regenerated_text: str = ""
    should_edit_regenerated_text: bool = False
    
@dataclass
class Instruction:
    methodOfTeaching: str
    content: InstructionDetail
    feedback: Feedback = Feedback()
    
    def __post_init__(self):
        if isinstance(self.content, dict):
            self.content = InstructionDetail(**self.content)
        if isinstance(self.feedback, dict):
            self.feedback = Feedback(**self.feedback)


@dataclass
class InstructionSet:
    engage: List[Instruction]
    explain: List[Instruction]
    elaborate: List[Instruction]
    explore: List[Instruction]
    evaluate: List[Instruction]
    
    def __post_init__(self):
        self.engage = [Instruction(**item) if isinstance(item, dict) else item for item in self.engage]
        self.explain = [Instruction(**item) if isinstance(item, dict) else item for item in self.explain]
        self.elaborate = [Instruction(**item) if isinstance(item, dict) else item for item in self.elaborate]
        self.explore = [Instruction(**item) if isinstance(item, dict) else item for item in self.explore]
        self.evaluate = [Instruction(**item) if isinstance(item, dict) else item for item in self.evaluate]

@dataclass
class LessonPlan:
    _id: str
    userId: str
    timestamp: int
    board: str
    medium: str
    grade: int
    subject: str
    chapter_number: int
    chapter_title: str
    chapterId: str
    topics: List[str]
    learningOutcomes: str
    instructionSet: InstructionSet
    createdAt: int
    prompt_name: str
    prompt_context: dict
    is_chapter_lp: bool = False
    resources: List[Instruction] = field(default_factory=list)
    resource_prompt_name: str = ""
    videos: List[str] = field(default_factory=list)
    interactOutput: str = ""
    isEdited: bool = False
    preferredTeachingModel: str = ""
    
    def __post_init__(self):
        if not isinstance(self.instructionSet, InstructionSet):
            self.instructionSet = InstructionSet(**self.instructionSet)
        resources = []
        for resource in self.resources:
            resources.append(Instruction(**resource) if isinstance(resource, dict) else resource)
        self.resources = resources

@dataclass
class LPListItem:
    id: str
    last_edited_at: int
    medium: str
    grade: str
    subject: str
    chapter: str
    topic: str
    has_been_edited: bool
    status: str = "Undefined"

@dataclass
class InstructionDetailV2:
    instructions: InstructionDetail
    feedback: Feedback = Feedback()
    
    def __post_init__(self):
        self.instructions = InstructionDetail(**self.instructions) if isinstance(self.instructions, dict) else self.instructions
        self.feedback = Feedback(**self.feedback) if isinstance(self.feedback, dict) else self.feedback

@dataclass
class InstructionSetV2:
    engage: InstructionDetailV2
    explain: InstructionDetailV2
    elaborate: InstructionDetailV2
    explore: InstructionDetailV2
    evaluate: InstructionDetailV2
    
    def __post_init__(self):
        self.engage = InstructionDetailV2(**self.engage) if isinstance(self.engage, dict) else self.engage
        self.explain = InstructionDetailV2(**self.explain) if isinstance(self.explain, dict) else self.explain
        self.elaborate = InstructionDetailV2(**self.elaborate) if isinstance(self.elaborate, dict) else self.elaborate
        self.explore = InstructionDetailV2(**self.explore) if isinstance(self.explore, dict) else self.explore
        self.evaluate = InstructionDetailV2(**self.evaluate) if isinstance(self.evaluate, dict) else self.evaluate
        
@dataclass
class MethodOfTeachingLP:
    methodOfTeaching: str
    instructions: InstructionSetV2

@dataclass
class LessonPlanV2:
    _id: str
    userId: str
    timestamp: int
    board: str
    medium: str
    grade: int
    subject: str
    chapter_number: int
    chapter_title: str
    chapterId: str
    topics: List[str]
    learningOutcomes: str
    instructionSet: List[MethodOfTeachingLP]
    createdAt: int
    prompt_name: str
    prompt_context: dict
    is_chapter_lp: bool = False
    resources: List[Instruction] = field(default_factory=list)
    resource_prompt_name: str = ""
    videos: List[str] = field(default_factory=list)
    interactOutput: str = ""
    isEdited: bool = False
    preferredTeachingModel: str = "NONE_CHOSEN"
    
    def __post_init__(self):
        instruction_sets = []
        for set in self.instructionSet:
            instruction_sets.append(MethodOfTeachingLP(**set) if isinstance(set, dict) else set)
        self.instructionSet = instruction_sets
        resources = []
        for resource in self.resources:
            resources.append(Instruction(**resource) if isinstance(resource, dict) else resource)
        self.resources = resources
        

@dataclass
class UserWork:
    _id: str
    assignedLpIds: List[str] = field(default_factory=list)
    editedLpIds: List[str] = field(default_factory=list)
    assignedForReview: List[str] = field(default_factory=list)
    completedReviews: List[str] = field(default_factory=list)

@dataclass
class GenTask:
    created_timestamp: int
    lp_id: str
    statusURI: str
    doc: dict = None
    status: str = "NOT_SPECIFIED"

@dataclass
class GenTaskStatusDoc:
    _id: str
    tasks: dict[str, List[GenTask]]
    
    def __post_init__(self):
        if isinstance(self.tasks, dict):
            # Convert dictionaries in lists to GenTask objects if needed
            for key, value in self.tasks.items():
                if all(isinstance(item, dict) for item in value):
                    self.tasks[key] = [GenTask(**task) for task in value]
    
    

