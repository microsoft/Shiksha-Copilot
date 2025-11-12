from datetime import datetime
import json
import os
from typing import List
import uuid
from dotenv import load_dotenv
import requests
from data.chapter_lo_subtopic_models import Chapter, ChapterLPGenerationRequest, SubtopicLPGenerationRequest, Topic
from data.data_models import ChapterCurriculumInfo, DurableFunctionsConstants, GenHistoryItem, LPFeedback, LPLevel, LessonPlan
from utils.constants import Language
from utils.mongo_db import MongoDB
from utils import extract_curr_details, get_str_time, load_json_from_file

load_dotenv()

not_edited_lps_mongo = MongoDB("notEditedLps")
edited_lps_mongo = MongoDB("editedLps")
edited_lps_with_ext_resources_mongo = MongoDB("editedLpsWithExRes")
not_edited_lps_kn_mongo = MongoDB("notEditedKnLps")
edited_lps_kn_mongo = MongoDB("editedLpsKn")
gen_task_mongo = MongoDB("genTaskStatus")
feedback_mongo = MongoDB("lp_feedback")
edited_chapters_mongo = MongoDB("editedChapters")
unedited_chapters_mongo = MongoDB("uneditedChapters")

def save_kn_lp(lp: LessonPlan, user_id: str):
    lp.isEdited = True
    lp.userId = user_id
    lp.last_edited_at = int(datetime.now().timestamp())
    edited_lps_kn_mongo.insert_doc(lp.model_dump(by_alias=True))

def fetch_edited_unedited_chapters(chap_id: str) -> tuple[Chapter, Chapter]:
    edited_chap = edited_chapters_mongo.find_by_id(chap_id)
    unedited_chap = unedited_chapters_mongo.find_by_id(chap_id)

    if edited_chap == None or unedited_chap == None:
        raise ValueError("Either of edited or unedited chap is not found", chap_id, \
                         f'Edited {edited_chap}' if edited_chap == None else f'Unedited {unedited_chap}')
    return Chapter(**edited_chap), Chapter(**unedited_chap)

def fetch_eng_lp_for_kn_lp(id: str) -> LessonPlan:
    eng_id = id.replace("Medium=kannada", "Medium=english")
    doc = edited_lps_with_ext_resources_mongo.find_by_id(eng_id)
    if not doc:
        raise ValueError("ENGLISH LP WITH ID {eng_id} DOES NOT EXISTS")
    return LessonPlan(**doc)

def fetch_all_kn_lps():
    unedited_docs = not_edited_lps_kn_mongo.find_all()
    edited_docs = edited_lps_kn_mongo.find_all()
    return [LessonPlan(**doc) for doc in unedited_docs],\
            [LessonPlan(**doc) for doc in edited_docs]

def fetch_all_lps():
    unedited_docs = not_edited_lps_mongo.find_all()
    edited_docs = edited_lps_mongo.find_all()
    return [LessonPlan(**doc) for doc in unedited_docs],\
            [LessonPlan(**doc) for doc in edited_docs]

def save_lp(lp: LessonPlan, user_id: str):
    lp.isEdited = True
    lp.userId = user_id
    lp.last_edited_at = int(datetime.now().timestamp())
    edited_lps_mongo.insert_doc(lp.model_dump(by_alias=True))

def save_feedback(feedback: LPFeedback, user_id: str):
    feedback.user_id = user_id
    feedback.timestamp = int(datetime.now().timestamp())
    feedback_mongo.insert_doc(feedback.model_dump(by_alias=True))

def get_feedback_for_lp(lp: LessonPlan)->LPFeedback:
    doc = feedback_mongo.find_by_id(lp.id)
    if doc == None:
        res = LPFeedback()
        res.id = lp.id
        res.lp_level = lp.lp_level
        res.lp_type_english = lp.lp_type_english
        return res
    return LPFeedback(**doc)

def get_gen_history_items() -> List[GenHistoryItem]:
    gen_history_items = [
        GenHistoryItem(**doc)
        for doc in gen_task_mongo.find_all()
    ]
    return sorted(gen_history_items, key=lambda x: datetime.strptime(x.created_time, "%Y-%m-%dT%H:%M:%SZ"), reverse=True)

def create_kannada_chapter_doc(chapter_id: str):
    chapter_doc = edited_chapters_mongo.find_by_id(chapter_id)
    if chapter_doc == None:
        raise ValueError(f"No such chapter {chapter_id}")
    chapter = Chapter(**chapter_doc)
    translate_payload = chapter.model_dump(by_alias=True)
    fields_to_remove = [
        '_id',
        'user_id',
        'last_edited_at',
        'chapter_number',
        'isEdited',
        'index_path',
        'preferred_mot',
        'vetted_videos',
        'videos'
    ]
    for field in fields_to_remove:
        if field in translate_payload:
            del translate_payload[field]
    response = requests.post(os.environ.get("TRANSLATION_API_BASE", ""), 
                             data=json.dumps(translate_payload), 
                             headers={'Content-Type': 'application/json'})
    new_chapter_doc = response.json()
    new_chapter_doc['_id'] = chapter.id.replace("Medium=english", "Medium=kannada")
    new_chapter_doc['chapter_number'] = chapter.chapter_number
    new_chapter_doc['index_path'] = chapter.index_path
    new_chapter_doc['preferred_mot'] = chapter.preferred_mot
    new_chapter_doc['language'] = Language.KANNADA.value
    new_chapter = Chapter(**new_chapter_doc)
    unedited_chapters_mongo.insert_doc(new_chapter.model_dump(by_alias=True))
    
def submit_lp_generation_for_chapter(chapter_id: str):
    chapter_doc = edited_chapters_mongo.find_by_id(chapter_id)
    if chapter_doc == None:
        raise ValueError(f"No such chapter {chapter_id}")
    
    chapter_obj = Chapter(**chapter_doc)
    chapter_dict = chapter_obj.model_dump(by_alias=True)
    chapter_req = ChapterLPGenerationRequest(**chapter_dict)
    if not chapter_req.index_path:
        raise ValueError("This chapter doesn't have `index path` attribute set.")

    gen_history_item = GenHistoryItem(
        _id=str(uuid.uuid4()),
        created_time=get_str_time(),
        input=json.dumps(chapter_req.model_dump(by_alias=True)),
        curr_info=extract_curr_details(chapter_id),
        latest_status=DurableFunctionsConstants.QUEUED_STATUS,
        subtopics='; '.join([topic.title for topic in chapter_req.topics]),
        lp_level=LPLevel.CHAPTER.value,
        lp_level_english=chapter_req.chapter_type_english
    )
    gen_task_mongo.insert_doc(gen_history_item.model_dump(by_alias=True))

def submit_lp_generation_for_subtopics(chapter_id: str, subtopics: List[Topic]):
    chapter_doc = edited_chapters_mongo.find_by_id(chapter_id)
    if chapter_doc == None:
        raise ValueError(f"No such chapter {chapter_id} in edited_chapters mongo collection")
    
    chapter_obj = Chapter(**chapter_doc)
    chapter_dict = chapter_obj.model_dump(by_alias=True)
    chapter_req = ChapterLPGenerationRequest(**chapter_dict)
    if not chapter_req.index_path:
        raise ValueError("This chapter doesn't have `index path` attribute set.")
    
    subtopic_req = SubtopicLPGenerationRequest(chapter_details=chapter_req, subtopic_info=subtopics)
    gen_history_item = GenHistoryItem(
        _id=str(uuid.uuid4()),
        created_time=get_str_time(),
        curr_info=extract_curr_details(chapter_id),
        input=json.dumps(subtopic_req.model_dump(by_alias=True)),
        latest_status=DurableFunctionsConstants.QUEUED_STATUS,
        subtopics='; '.join([topic.title for topic in subtopics]),
        lp_level=LPLevel.SUBTOPIC.value,
        lp_level_english=chapter_req.chapter_type_english,
    )
    gen_task_mongo.insert_doc(gen_history_item.model_dump(by_alias=True))

def release_lp(lp_dict: dict, gen_history_item: GenHistoryItem):
    gen_history_item.released = True
    gen_task_mongo.update_doc(gen_history_item.model_dump(by_alias=True), gen_history_item.id)
    
    lp = LessonPlan(**lp_dict)
    not_edited_lps_mongo.insert_doc(lp.model_dump(by_alias=True))

def retrigger_lp_generation(failed_gen_history: GenHistoryItem):
    gen_history_item = GenHistoryItem(
        _id=str(uuid.uuid4()),
        created_time=get_str_time(),
        curr_info=failed_gen_history.curr_info,
        input=failed_gen_history.input,
        latest_status=DurableFunctionsConstants.QUEUED_STATUS,
        subtopics=failed_gen_history.subtopics,
        lp_level=failed_gen_history.lp_level,
        lp_level_english=failed_gen_history.lp_level_english
    )
    gen_task_mongo.insert_doc(gen_history_item.model_dump(by_alias=True))
    