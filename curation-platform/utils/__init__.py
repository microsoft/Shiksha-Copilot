"""
Utility functions. 
"""
from copy import deepcopy
from dataclasses import fields
import datetime
import random
import re
from typing import Dict, List
import uuid

import pytz
from data.data_models import ChapterCurriculumInfo, ChapterCurriculumInfo
from data.models import Feedback, Instruction, InstructionSet, InstructionSetV2, LPListItem, LessonPlan, LessonPlanV2, MethodOfTeachingLP
from difflib import ndiff

WELL_SUITED_FOR_CLASSROOM_FEEDBACK = "Well suited for classroom use"
NEEDS_MINOR_ADJUSTMENTS_FEEDBACK = "Needs minor adjustments"
CANNOT_BE_USED_FEEDBACK = "Cannot be used in classroom"
PREVIOUS_COMPONENT_WAS_FLAGGED = f"One of the previous components have been rated `{CANNOT_BE_USED_FEEDBACK}`"

def highlight_differences(text1, text2):
    words1 = text1.split()
    words2 = text2.split()
    diff = list(ndiff(words1, words2))

    html_diff = ""
    added_words = ""
    removed_words = ""
    
    for word in diff:
        if word.startswith("+ "):
            added_words += word[2:] + " "
        elif word.startswith("- "):
            removed_words += word[2:] + " "
        else:
            if added_words:
                html_diff += f'<span style="background-color: #d4edda;">{added_words.strip()}</span>'
                added_words = ""
            if removed_words:
                html_diff += f'<span style="background-color: #f8d7da;">{removed_words.strip()}</span>'
                removed_words = ""
            html_diff += word[2:] + " "

    if added_words:
        html_diff += f'<span style="background-color: #d4edda;">{added_words.strip()}</span>'
    if removed_words:
        html_diff += f'<span style="background-color: #f8d7da;">{removed_words.strip()}</span>'

    return html_diff

def get_feedback_str(score) -> str:
    if score == 1:
        return WELL_SUITED_FOR_CLASSROOM_FEEDBACK
    elif score == 2:
        return NEEDS_MINOR_ADJUSTMENTS_FEEDBACK
    elif score == 3:
        return CANNOT_BE_USED_FEEDBACK
    else:
        return PREVIOUS_COMPONENT_WAS_FLAGGED

def get_score(feedback_str) -> int:
    if feedback_str == WELL_SUITED_FOR_CLASSROOM_FEEDBACK:
        return 1
    elif feedback_str == NEEDS_MINOR_ADJUSTMENTS_FEEDBACK:
        return 2
    else:
        return 3

def clean_llm_response(ip: str, replace_new_line = False):
    if len(ip) > 1:
        if ip[0] == '"':
            ip = ip[1:]
        if ip[-1] == '"':
            ip = ip[:-1]
        ip = ip.replace('\\n', '  \n').replace('**', '').replace('\\"', '"').replace('#', '')
        # if replace_new_line:
        #     ip = ip.replace('\n', '<br>')
    return ip

def get_str_time():
    utc_now = datetime.datetime.now(pytz.utc)
    formatted_utc_time = utc_now.strftime('%Y-%m-%dT%H:%M:%SZ')
    return formatted_utc_time

def extract_curr_details(chapter_id) -> ChapterCurriculumInfo:
    # Regular expression to match the pattern of each element
    pattern = r'Board=(?P<board>[^,]+),Medium=(?P<medium>[^,]+),Grade=(?P<grade>[^,]+),Subject=(?P<subject>[^,]+),Number=(?P<number>[^,]+),Title=(?P<title>.+)'
    
    # Search the string using the defined pattern
    match = re.search(pattern, chapter_id)
    
    # Extract values if pattern matches
    if match:
        di = match.groupdict()
        return ChapterCurriculumInfo(
            board=di['board'],
            medium=di['medium'],
            grade=di['grade'],
            subject=di['subject'],
            chapter_number=di['number'],
            chapter_title=di['title']
        )
    else:
        return None

def logout():
    from state_manager import StateManager as SM
    
    SM.clear_all_state()

def remove_all_feedback(lp_list: list[LessonPlanV2]) -> list[LessonPlanV2]:
    res = []
    copy_lp_list = deepcopy(lp_list)
    for lp in copy_lp_list:
        for mot in lp.instructionSet:
            instructions_v2 = mot.instructions
            for phase in fields(InstructionSetV2):
                instruction_detail_v2 = getattr(instructions_v2, phase.name)
                instruction_detail_v2.feedback = Feedback()
        for resource in lp.resources:
            resource.feedback = Feedback()
        res.append(lp)
    return res

def convert_lesson_plan_v2_to_lp_list_item(lp: LessonPlanV2)->LPListItem:
    return LPListItem(
        id=lp._id,
        last_edited_at=lp.timestamp,
        medium=lp.medium,
        grade=lp.grade,
        subject=lp.subject,
        chapter=f"Chapter: {lp.chapter_number}  {lp.chapter_title}",
        topic="ALL TOPICS" if lp.is_chapter_lp else lp.topics[0],
        has_been_edited=lp.isEdited
    )

def convert_lesson_plan_v2_to_v1(new_lesson_plan: LessonPlanV2) -> LessonPlan:
    new_lesson_plan = deepcopy(new_lesson_plan)
    mot_instruction_sets = new_lesson_plan.instructionSet

    # Create a dictionary to store lists of instructions per phase, initially empty
    phase_instructions: Dict[str, List[Instruction]] = {
        "engage": [],
        "explain": [],
        "elaborate": [],
        "explore": [],
        "evaluate": []
    }

    # Populate the dictionary with instructions from each method of teaching
    for mot_lp in mot_instruction_sets:
        instruction_set_v2 = mot_lp.instructions
        for phase in fields(InstructionSetV2):
            # phase = "engage", ...
            phase_name = phase.name
            instruction_detail_v2 = getattr(instruction_set_v2, phase_name)
            instruction = Instruction(
                methodOfTeaching=mot_lp.methodOfTeaching,
                content=instruction_detail_v2.instructions,
                feedback=instruction_detail_v2.feedback
            )
            phase_instructions[phase_name].append(instruction)

    # Create the original instruction set structure
    original_instruction_set = InstructionSet(
        engage=phase_instructions["engage"],
        explain=phase_instructions["explain"],
        elaborate=phase_instructions["elaborate"],
        explore=phase_instructions["explore"],
        evaluate=phase_instructions["evaluate"]
    )

    # Rebuild the original lesson plan
    old_di = new_lesson_plan.__dict__
    del old_di['instructionSet']

    return LessonPlan(**old_di, instructionSet=original_instruction_set)

def convert_lesson_plan_to_v2(old_lesson_plan: LessonPlan) -> LessonPlanV2:
    old_lesson_plan = deepcopy(old_lesson_plan)
    old_lp_instruction_set = old_lesson_plan.instructionSet
    lp_data_with_mot = {}
    for field in fields(old_lp_instruction_set):
        # field = "engage", ...
        instructions_list = getattr(old_lp_instruction_set, field.name)
        for instruction in instructions_list:
            if instruction.methodOfTeaching not in lp_data_with_mot:
                lp_data_with_mot[instruction.methodOfTeaching] = {}
                
            lp_data_with_mot[instruction.methodOfTeaching][field.name] = {"instructions": instruction.content.__dict__, 
                                                                          "feedback": instruction.feedback.__dict__}
    
    mot_lp_list = []
    for methodOfTeaching in lp_data_with_mot:
        instruction_set_v2 = InstructionSetV2(**lp_data_with_mot[methodOfTeaching])
        mot_lp_list.append(MethodOfTeachingLP(methodOfTeaching, instruction_set_v2))
    old_di = old_lesson_plan.__dict__
    del old_di['instructionSet']    
    return LessonPlanV2(**old_di, instructionSet=mot_lp_list)
    
def save(lp: LessonPlan):
    from data.api import save_lp
    from state_manager import StateManager as SM
    
    save_lp(lp=lp)
    # REMOVE FROM STATE
    SM.delete_current_lp(lp._id)

def saveV2(lp: LessonPlanV2):
    from state_manager import StateManager as SM
    from data.api import save_lp
    
    save_lp(lp=lp)
    # REMOVE FROM STATE
    SM.delete_current_lp_v2(lp._id)

def compare_strings_without_whitespaces_newlines(str1, str2):
    # Remove whitespaces and newlines, then compare
    return ''.join(str1.split()) == ''.join(str2.split())

def load_json_from_file(fp: str):
    import json
    with open(fp, 'r') as file:
        data = json.load(file)
    return data

def str_to_ist(datetime_str):
    utc_dt = datetime.datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M:%SZ")
    utc_dt = utc_dt.replace(tzinfo=pytz.UTC)
    ist_tz = pytz.timezone('Asia/Kolkata')
    ist_dt = utc_dt.astimezone(ist_tz)
    human_readable = ist_dt.strftime("%Y-%m-%d %I:%M:%S %p %Z")
    return human_readable

def timestamp_to_ist(timestamp):
    ist_timezone = pytz.timezone('Asia/Kolkata')
    datetime_obj = datetime.datetime.fromtimestamp(timestamp, tz=pytz.utc)
    datetime_ist = datetime_obj.astimezone(ist_timezone)
    return datetime_ist.strftime('%d-%m-%Y %I:%M %p')

def generate_dummy_lp_list(count: int):
    # List of dummy data for each attribute
    mediums = ["English", "Hindi", "French"]
    grades = ["1", "2", "3", "4", "5"]
    subjects = ["Mathematics", "Science", "History", "Geography"]
    chapters = ["Chapter 1", "Chapter 2", "Chapter 3"]
    topics = ["Topic A", "Topic B", "Topic C"]

    # Generate list of LPListItem objects
    dummy_list = []
    for _ in range(count):
        # Generate random last_edited_at timestamp (from last 10 days)
        last_edited_days = random.randint(0, 9)
        last_edited_at = int((datetime.datetime.now() - datetime.timedelta(days=last_edited_days)).timestamp())

        dummy_list.append(LPListItem(
            id=str(uuid.uuid4()),
            last_edited_at=last_edited_at,
            medium=random.choice(mediums),
            grade=random.choice(grades),
            subject=random.choice(subjects),
            chapter=random.choice(chapters),
            topic=random.choice(topics),
            has_been_edited=random.choice([True, False])
        ))

    return dummy_list

def get_teaching_methodologies(lp: LessonPlan):
    res = set()
    for instruction in lp.instructionSet.ENGAGE:
        res.add(instruction.methodOfTeaching)
    return sorted(list(res))
    
        