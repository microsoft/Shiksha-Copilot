"""
Handle all state-related logic.
Modify st.session_state through this file.
"""
from typing import Any, Dict, Generic, List, TypeVar
import streamlit as st

from data.chapter_lo_subtopic_models import Chapter, Topic, TopicGroup, User, Video
from data.data_models import GenHistoryItem, LPFeedback, LessonPlan
from data.models import LPListItem, LessonPlanV2
from utils.constants import StateKeys  # Ensure that this import is correctly pointing to your StateKeys which should contain constants like LP_LIST and CHOSEN_LP_ITEM

STATE = st.session_state

T = TypeVar('T')

class StateAttribute(Generic[T]):
    def __init__(self, key: str):
        self.key = key
    
    def get_or_set(self, alternative: T = None) -> T:
        if self.get() is None:
            self.set(alternative)
        return self.get()
    
    def get(self, alternative: T = None) -> T:
        return STATE.get(self.key, alternative)
    
    def set(self, value: T):
        STATE[self.key] = value
    
    def delete(self):
        if self.key in STATE:
            del STATE[self.key]

class StateManager:
    user = StateAttribute[User](StateKeys.USER)
    registered_users = StateAttribute[List[User]](StateKeys.ALL_REGISTERED_USERS)
    user_name = StateAttribute[str](StateKeys.USER_NAME)
    user_email = StateAttribute[str](StateKeys.USER_EMAIL)
    subtopic_edit_expander_open = StateAttribute[bool](StateKeys.SUBTOPIC_EDIT_EXPANDER_OPEN)
    subtopic_group_edit_expander_open = StateAttribute[bool](StateKeys.SUBTOPOC_GROUP_EXPANDER_OPEN)
    is_editing_lo = StateAttribute[bool](StateKeys.IS_EDITING_LO)
    chapter_summary = StateAttribute[dict](StateKeys.CHAPTER_SUMMARY)
    chosen_lp_item = StateAttribute[LPListItem](StateKeys.CHOSEN_LP_ITEM)
    chosen_chapter_id = StateAttribute[str](StateKeys.CHOSEN_CHAPTER_ID)
    chosen_chapter_name = StateAttribute[str](StateKeys.CHOSEN_CHAPTER_NAME)
    chosen_chapter_details = StateAttribute[Chapter](StateKeys.CHOSEN_CHAPTER_DETAILS)
    chosen_chapter_details_in_db = StateAttribute[Chapter](StateKeys.CHOSEN_CHAPTER_DETAILS_IN_DB)
    chosen_unedited_chapter_details = StateAttribute[Chapter](StateKeys.CHOSEN_UNEDITED_CHAPTER_DETAILS)
    chosen_chapter_lo_list = StateAttribute[List[str]](StateKeys.CHOSEN_CHAPTER_LO_LIST)
    chosen_chapter_subtopic_list = StateAttribute[List[Topic]](StateKeys.CHOSEN_CHAPTER_SUBTOPIC_LIST)
    chosen_chapter_subtopic_group_list = StateAttribute[List[TopicGroup]](StateKeys.CHOSEN_CHAPTER_SUBTOPIC_GROUP_LIST)
    is_adding_subtopic_group = StateAttribute[bool](StateKeys.IS_ADDING_SUBTOPIC_GROUP)
    adding_subtopic_group_topic_indexes = StateAttribute[List[Topic]](StateKeys.ADDING_SUBTOPIC_GROUP_TOPIC_INDEXES)
    current_lp_v2 = StateAttribute[LessonPlanV2](StateKeys.CURRENT_LP_V2)
    current_lp_v2_feedback = StateAttribute[LessonPlanV2](StateKeys.CURRENT_LP_V2_FEEDBACK)
    # lp_list_v2 = StateAttribute[List[LessonPlanV2]](StateKeys.LP_LIST)
    current_phase_index = StateAttribute[int](StateKeys.CURRENT_PHASE_INDEX)
    current_mot_index = StateAttribute[int](StateKeys.CURRENT_MOT_INDEX)
    has_chosen_preferred_teaching_model = StateAttribute[bool](StateKeys.HAS_CHOSEN_PREFERRED_TEACHING_MODEL)
    finished_lp_edits = StateAttribute[bool](StateKeys.FINISHED_LP_EDITS)
    
    lp_list = StateAttribute[List[LessonPlan]](StateKeys.LP_LIST)
    unedited_lp_list = StateAttribute[List[LessonPlan]](StateKeys.UNEDITED_LP_LIST)
    edited_lp_list = StateAttribute[List[LessonPlan]](StateKeys.EDITED_LP_LIST)
    chosen_lp = StateAttribute[LessonPlan](StateKeys.CHOSEN_LP)
    chosen_lp_feedback = StateAttribute[LPFeedback](StateKeys.CHOSEN_LP_FEEDBACK)

    lp_list_kn = StateAttribute[List[LessonPlan]](StateKeys.LP_LIST_KN)
    unedited_lp_list_kn = StateAttribute[List[LessonPlan]](StateKeys.UNEDITED_LP_LIST_KN)
    edited_lp_list_kn = StateAttribute[List[LessonPlan]](StateKeys.EDITED_LP_LIST_KN)
    chosen_lp_kn = StateAttribute[LessonPlan](StateKeys.CHOSEN_LP_KN)
    chosen_lp_kn_eng = StateAttribute[LessonPlan](StateKeys.CHOSEN_LP_KN_ENG)
    
    gen_history_items = StateAttribute[List[GenHistoryItem]](StateKeys.GEN_HISTORY_ITEMS)
    chosen_gen_history_item = StateAttribute[GenHistoryItem](StateKeys.CHOSEN_GEN_HISTORY_ITEM)
    
    video_chapter_summary = StateAttribute[dict](StateKeys.VIDEO_CHAPTER_SUMMARY)
    chosen_chapter_video_details = StateAttribute[Chapter](StateKeys.CHOSEN_VIDEO_CHAPTER_DETAILS)
    chosen_video_chapter_name = StateAttribute[str](StateKeys.CHOSEN_VIDEO_CHAPTER_NAME)
    chosen_video_chapter_id = StateAttribute[str](StateKeys.CHOSEN_VIDEO_CHAPTER_ID)
    current_video_being_added = StateAttribute[Video](StateKeys.CURRENT_VIDEO_BEING_ADDED)
    
    @staticmethod
    def clear_all_state():
        for key in st.session_state.keys():
            del st.session_state[key]
        st.cache_data.clear()
        st.rerun()