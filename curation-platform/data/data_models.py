from enum import Enum
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field


class Instruction(BaseModel):
    content: str = "Default content goes here..."

class InstructionsSet(BaseModel):
    engage: Instruction = Instruction()
    explore: Instruction = Instruction()
    explain: Instruction = Instruction()
    elaborate: Instruction = Instruction()
    evaluate: Instruction = Instruction()

class Activity(BaseModel):
    title: str = ""
    preparation: str = "No preparation required"
    required_materials: str = ""
    obtaining_materials: str = ""
    recap: str = ""

class MCQ(BaseModel):
    question: str = "Default question"
    options: List[str] = ["Option 1", "Option 2", "Option 3", "Option 4"]

class AssessmentQuestion(BaseModel):
    question: str = "Default assessment question"

class Assessment(BaseModel):
    content: List[AssessmentQuestion] = [AssessmentQuestion()]

class MCQBank(BaseModel):
    content: List[MCQ] = [MCQ()]

class QuestionBankMCQsAndAssessment(BaseModel):
    MCQs: MCQBank = MCQBank()
    assessment: Assessment = Assessment()

class QuestionBank(BaseModel):
    beginner: QuestionBankMCQsAndAssessment = QuestionBankMCQsAndAssessment()
    intermediate: QuestionBankMCQsAndAssessment = QuestionBankMCQsAndAssessment()
    advanced: QuestionBankMCQsAndAssessment = QuestionBankMCQsAndAssessment()
    
class RWScenarioQuestionDescription(BaseModel):
    description: str = "Default scenario description"
    question: str = "Default scenario question"

class RealWorldScenario(BaseModel):
    title: str = ""
    scenario: RWScenarioQuestionDescription = RWScenarioQuestionDescription()

class RealWorldScenarioBank(BaseModel):
    beginner: Dict[str, RealWorldScenario] = {}
    intermediate: Dict[str, RealWorldScenario] = {}
    advanced: Dict[str, RealWorldScenario] = {}
    
class Resources(BaseModel):
    activities: Dict[str, Activity] = {}
    questionbank: QuestionBank = QuestionBank()
    realworldscenarios: RealWorldScenarioBank = RealWorldScenarioBank()

class ChecklistActivity(BaseModel):
    activity: str = "Default activity"
    materials: str = "No materials needed"

class Checklist(BaseModel):
    ENGAGE: ChecklistActivity = ChecklistActivity()
    EXPLORE: ChecklistActivity = ChecklistActivity()
    EXPLAIN: ChecklistActivity = ChecklistActivity()
    ELABORATE: ChecklistActivity = ChecklistActivity()
    EVALUATE: ChecklistActivity = ChecklistActivity()

class LPLevel(Enum):
    CHAPTER = "CHAPTER"
    SUBTOPIC = "SUBTOPIC"
    SUBTOPIC_GROUP = "SUBTOPIC-GROUP"

class LPEnglishType(Enum):
    PROSE = "PROSE"
    POEM = "POEM"
    NONE = "NONE"

class LessonPlan(BaseModel):
    id: str = Field(default="Default ID", alias='_id')
    userId: str = "ADMIN"
    last_edited_at: int = -1
    created_at: int = -1
    isEdited: bool = False
    isCompletedEditing: bool = False
    chapter_id: str = "Default Chapter ID"
    subtopics: List[str] = ["Subtopic 1", "Subtopic 2"]
    learning_outcomes: List[str] = ["Default learning outcome"]
    preferred_mot: str = "Default Method of Teaching"
    interact_output: str = "Default Interaction Output"
    lp_level: str = LPLevel.CHAPTER.value
    lp_type_english: str = LPEnglishType.NONE.value
    teacher_location: str = "Default Location"
    index_path: Optional[str] = None
    instruction_set: Optional[InstructionsSet] = None
    crisp_instruction_set: Optional[InstructionsSet] = None
    extracted_resources: Optional[Resources] = None
    additional_resources: Optional[Resources] = None
    checklist: Checklist = Checklist()

    def __str__(self, newline_char="\n") -> str:
        solid_line = f'{newline_char}<hr style="border: none; border-top: 1px solid #000;">{newline_char}'
        dashed_line = f'{newline_char}<hr style="border: none; border-top: 1px dashed #000;">{newline_char}'

        def represent_instruction_set(instruction_set: Optional[InstructionsSet]) -> str:
            if not instruction_set:
                return f"**No Instructions available.**{newline_char}"
            return (
                f"**Engage:** {newline_char}{instruction_set.engage.content}{newline_char}"
                f"{dashed_line}"
                f"**Explore:** {newline_char}{instruction_set.explore.content}{newline_char}"
                f"{dashed_line}"
                f"**Explain:** {newline_char}{instruction_set.explain.content}{newline_char}"
                f"{dashed_line}"
                f"**Elaborate:** {newline_char}{instruction_set.elaborate.content}{newline_char}"
                f"{dashed_line}"
                f"**Evaluate:** {newline_char}{instruction_set.evaluate.content}{newline_char}"
            )

        def represent_activity(activity: Activity) -> str:
            return (
                f"  - Title: {activity.title}{newline_char}"
                f"  - Preparation: {activity.preparation}{newline_char}"
                f"  - Required Materials: {activity.required_materials}{newline_char}"
                f"  - Obtaining Materials: {activity.obtaining_materials}{newline_char}"
                f"  - Recap: {activity.recap}{newline_char}"
            )

        def represent_resources(resources: Optional[Resources]) -> str:
            if not resources:
                return f"**No Resources available.**{newline_char}"

            activities_str = "".join(
                f"***{key}:***{newline_char}{represent_activity(activity)}{newline_char}" 
                for key, activity in resources.activities.items()
            )

            questionbank_str = (
                f"Beginner MCQs:{newline_char}" +
                "".join(
                    f"- **Q:** {mcq.question}{newline_char}  - **Options:** {', '.join(mcq.options)}{newline_char}" 
                    for mcq in resources.questionbank.beginner.MCQs.content
                ) +
                f"Intermediate MCQs:{newline_char}" +
                "".join(
                    f"- **Q:** {mcq.question}{newline_char}  - **Options:** {', '.join(mcq.options)}{newline_char}" 
                    for mcq in resources.questionbank.intermediate.MCQs.content
                ) +
                f"Advanced MCQs:{newline_char}" +
                "".join(
                    f"- **Q:** {mcq.question}{newline_char}  - **Options:** {', '.join(mcq.options)}{newline_char}" 
                    for mcq in resources.questionbank.advanced.MCQs.content
                )
            )

            scenarios_str = (
                f"Beginner:{newline_char}" +
                "".join(
                    f"- **Title:** {scenario.title}{newline_char}  - **Description:** {scenario.scenario.description}{newline_char}  - **Question:** {scenario.scenario.question}{newline_char}" 
                    for scenario in resources.realworldscenarios.beginner.values()
                ) +
                f"Intermediate:{newline_char}" +
                "".join(
                    f"- **Title:** {scenario.title}{newline_char}  - **Description:** {scenario.scenario.description}{newline_char}  - **Question:** {scenario.scenario.question}{newline_char}" 
                    for scenario in resources.realworldscenarios.intermediate.values()
                ) +
                f"Advanced:{newline_char}" +
                "".join(
                    f"- **Title:** {scenario.title}{newline_char}  - **Description:** {scenario.scenario.description}{newline_char}  - **Question:** {scenario.scenario.question}{newline_char}" 
                    for scenario in resources.realworldscenarios.advanced.values()
                )
            )

            return (
                f"**Activities:**{newline_char}{activities_str}{newline_char}"
                f"{dashed_line}"
                f"**Question Bank:**{newline_char}{questionbank_str}{newline_char}"
                f"{dashed_line}"
                f"**Real-World Scenarios:**{newline_char}{scenarios_str}{newline_char}"
            )

        def represent_checklist(checklist: Checklist) -> str:
            return (
                f"**ENGAGE:** {checklist.ENGAGE.activity} - {checklist.ENGAGE.materials}{newline_char}"
                f"**EXPLORE:** {checklist.EXPLORE.activity} - {checklist.EXPLORE.materials}{newline_char}"
                f"**EXPLAIN:** {checklist.EXPLAIN.activity} - {checklist.EXPLAIN.materials}{newline_char}"
                f"**ELABORATE:** {checklist.ELABORATE.activity} - {checklist.ELABORATE.materials}{newline_char}"
                f"**EVALUATE:** {checklist.EVALUATE.activity} - {checklist.EVALUATE.materials}{newline_char}"
            )

        instruction_set_obj = self.instruction_set if self.lp_level == LPLevel.CHAPTER.value else self.crisp_instruction_set
        instruction_set_str = represent_instruction_set(instruction_set_obj)
        extracted_resources_str = represent_resources(self.extracted_resources)
        additional_resources_str = represent_resources(self.additional_resources) if self.additional_resources else f"**No Additional Resources available.**{newline_char}"
        checklist_str = represent_checklist(self.checklist)
        
        return (
            f"{instruction_set_str}{newline_char}"
            f"{solid_line}"
            f"**Extracted Resources:**{newline_char}{extracted_resources_str}{newline_char}"
            f"{solid_line}"
            f"**Additional Resources:**{newline_char}{additional_resources_str}{newline_char}"
            f"{solid_line}"
            f"**Checklist:**{newline_char}{checklist_str}"
        )

    class Config:
        allow_population_by_field_name = True





class ChapterCurriculumInfo(BaseModel):
    board: str
    medium: str
    grade: str
    subject: str
    chapter_number: str
    chapter_title: str

class LPListItem(BaseModel):
    id: str = ""
    last_edited_at: int = -1
    isEdited: bool = False
    isCompletedEditing: bool = False
    topics: str = ""
    board: str = ""
    medium: str = ""
    grade: str = ""
    subject: str = ""
    chapter_number: str = ""
    chapter_title: str = ""
    

class FeedbackUnit(BaseModel):
    rating: int = -1
    comments: str = ""

    def __str__(self):
        return f"Rating: {self.rating}, Comments: {self.comments}"

class FiveEFeedback(BaseModel):
    engage: FeedbackUnit = FeedbackUnit()
    explore: FeedbackUnit = FeedbackUnit()
    explain: FeedbackUnit = FeedbackUnit()
    elaborate: FeedbackUnit = FeedbackUnit()
    evaluate: FeedbackUnit = FeedbackUnit()
    
    def is_feedback_complete(self):
        return self.engage.rating != -1 and\
            self.explore.rating != -1 and\
                 self.explain.rating != -1 and\
                     self.elaborate.rating != -1 and\
                         self.evaluate.rating != -1

    def __str__(self, newline_char="\n"):
        return (
            f"{newline_char}**Engage:** {self.engage}"
            f"{newline_char}**Explore:** {self.explore}"
            f"{newline_char}**Explain:** {self.explain}"
            f"{newline_char}**Elaborate:** {self.elaborate}"
            f"{newline_char}**Evaluate:** {self.evaluate}"
        )


class ResourcesFeedback(BaseModel):
    activities: FeedbackUnit = FeedbackUnit()
    questionbank: FeedbackUnit = FeedbackUnit()
    realworldscenarios: FeedbackUnit = FeedbackUnit()
    
    def is_feedback_complete(self):
         return self.activities.rating != -1 and\
            self.questionbank.rating != -1 and\
                 self.realworldscenarios.rating != -1

class LPFeedback(BaseModel):
    id: str = Field(default="Default ID", alias='_id')
    user_id: str = "ADMIN"
    timestamp: int = -1
    lp_level: str = LPLevel.CHAPTER.value
    lp_type_english: str = LPEnglishType.NONE.value
    instruction_set: FiveEFeedback = FiveEFeedback()
    checklist: FeedbackUnit = FeedbackUnit()
    extracted_resources: FeedbackUnit = FeedbackUnit()
    additional_resources: FeedbackUnit = FeedbackUnit()
    complete_feedback: FeedbackUnit = FeedbackUnit()
    
    class Config:
        allow_population_by_field_name = True
    
    def is_feedback_complete_for_all_required_components(self):
        return self.instruction_set.is_feedback_complete()
    
    def __str__(self, newline_char="\n"):
        solid_line = f'{newline_char}<hr style="border: none; border-top: 1px solid #000;">{newline_char}'
        return (
            f"{solid_line}"
            f"**Feedback Details**"
            f"{newline_char}**Complete LP Feedback:** {self.complete_feedback}"
            f"{self.instruction_set.__str__(newline_char)}"
            f"{newline_char}**Checklist:** {self.checklist}"
            f"{newline_char}**Extracted Resources:** {self.extracted_resources}"
            f"{newline_char}**Additional Resources:** {self.additional_resources}"
        )

        

class DurableFunctionsConstants:
    STATUS_URI_KEY = "statusQueryGetUri"
    STATUS_KEY = "runtimeStatus"
    CREATED_TIME_KEY = "createdTime"
    LAST_UPDATED_TIME_KEY = "lastUpdatedTime"
    INPUT_KEY = "input"
    OUTPUT_KEY = "output"
    RUNNING_STATUS = "Running"
    PENDING_STATUS = "Pending"
    FAILED_STATUS = "Failed"
    COMPLETED_STATUS = "Completed"
    UNDEFINED_STATUS = "Undefined"
    QUEUED_STATUS = "Queued"
    
    @staticmethod
    def get_status(resp_status: str):
        if resp_status == DurableFunctionsConstants.RUNNING_STATUS:
            return DurableFunctionsConstants.RUNNING_STATUS
        elif resp_status == DurableFunctionsConstants.COMPLETED_STATUS:
            return DurableFunctionsConstants.COMPLETED_STATUS
        elif resp_status == DurableFunctionsConstants.FAILED_STATUS:
            return DurableFunctionsConstants.FAILED_STATUS
        elif resp_status == DurableFunctionsConstants.PENDING_STATUS:
            return DurableFunctionsConstants.PENDING_STATUS    
        elif resp_status == DurableFunctionsConstants.QUEUED_STATUS:
            return DurableFunctionsConstants.QUEUED_STATUS
        return DurableFunctionsConstants.UNDEFINED_STATUS

class GenHistoryItem(BaseModel):
    id: str = Field(default="Default ID", alias='_id')
    curr_info: ChapterCurriculumInfo
    status_uri: str = ""
    latest_status: str = DurableFunctionsConstants.UNDEFINED_STATUS
    input: str | None = None
    output: Union[Dict, str] | None = None
    created_time: str = ""
    last_updated_time: str = ""
    released: bool = False
    lp_level: str = LPLevel.SUBTOPIC.value
    lp_level_english: str = LPEnglishType.NONE.value
    subtopics: str = ""
    
    class Config:
        allow_population_by_field_name = True
    