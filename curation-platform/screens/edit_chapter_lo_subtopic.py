from copy import deepcopy
from datetime import datetime
import os
import re
from typing import List
import uuid
from dotenv import load_dotenv
import pytz
import streamlit as st
from data.api import get_chapter_doc_edited, get_chapter_doc_unedited, get_unedited_lp_doc, reset_edits_in_chapter, save_edited_chapter_doc
from data.api_v2 import create_kannada_chapter_doc, submit_lp_generation_for_chapter, submit_lp_generation_for_subtopics
from data.chapter_lo_subtopic_models import Chapter, Topic, TopicGroup, UserRoleEnum
from navigation import Navigation as nav
from screens import home_lo_edit
from state_manager import StateManager as SM
from utils.constants import Language

load_dotenv()

def clear_state_vars():
    SM.subtopic_edit_expander_open.delete()
    SM.subtopic_group_edit_expander_open.delete()
    SM.chosen_chapter_details.delete()
    SM.chosen_chapter_details_in_db.delete()
    SM.chosen_unedited_chapter_details.delete()
    SM.chosen_chapter_lo_list.delete()
    SM.chosen_chapter_subtopic_list.delete()
    SM.chosen_chapter_subtopic_group_list.delete()
    SM.is_adding_subtopic_group.delete()
    SM.adding_subtopic_group_topic_indexes.delete()

def go_back():
    SM.chosen_chapter_id.delete()
    SM.chosen_chapter_name.delete()
    clear_state_vars()
    nav.set_current_page(home_lo_edit)

################################################################################################### 
# Function to add an empty string to the list
def add_chapter_lo_item():
    SM.chosen_chapter_lo_list.get().append("")

# Function to remove an item from the list at a specific index
def remove_chapter_lo_item(index):
    SM.chosen_chapter_lo_list.get().pop(index)

# Helper function to update an item in the list based on user input
def update_chapter_lo_item(index):
    SM.chosen_chapter_lo_list.get()[index] = st.session_state[f'chap_lo_item_{index}']
################################################################################################### 
# Function to add a new complex object to the list
def add_topic_item():
    SM.subtopic_edit_expander_open.set(True)
    SM.chosen_chapter_subtopic_list.get().append(Topic(title="", learning_outcomes=[""]))
    
def get_subtopic_group_index(topic_title: str):
    subtopic_groups = SM.chosen_chapter_subtopic_group_list.get()
    for index, group in enumerate(subtopic_groups):
        if topic_title in group.group_titles:
            return index
    return -1
 
# Function to remove a complex object from the list at a specific index
def remove_topic_item(subtopic_index):
    SM.subtopic_edit_expander_open.set(True)
    SM.chosen_chapter_subtopic_list.get().pop(subtopic_index)

# Function to add a new learning outcome to a specific complex object
def add_topic_learning_outcome(topic_index):
    SM.subtopic_edit_expander_open.set(True)
    SM.chosen_chapter_subtopic_list.get()[topic_index].learning_outcomes.append('')

# Function to remove a learning outcome from a specific complex object
def remove_topic_learning_outcome(topic_index, outcome_index):
    SM.subtopic_edit_expander_open.set(True)
    SM.chosen_chapter_subtopic_list.get()[topic_index].learning_outcomes.pop(outcome_index)

# Function to update title
def update_title():
    SM.subtopic_edit_expander_open.set(True)
    for index, topic in enumerate(SM.chosen_chapter_subtopic_list.get()):
        topic.title = st.session_state[f"title_{index}"]

# Function to update learning outcomes
def update_learning_outcome(topic_index, outcome_index):
    SM.subtopic_edit_expander_open.set(True)
    SM.chosen_chapter_subtopic_list.get()[topic_index].learning_outcomes[outcome_index] = st.session_state[f"outcome_{topic_index}_{outcome_index}"]

# Functions for Subtopic group edits
# Start
def get_unselected_topics_for_grouping(existing_groups: list[TopicGroup], all_subtopics: list[Topic]):
    selected_subtopics_titles = [topic_title for topic_group in existing_groups for topic_title in topic_group.group_titles]
    return [topic.title for topic in all_subtopics if topic.title not in selected_subtopics_titles]

def on_subtopics_chosen_from_group(index):
    subtopic_indexes = SM.adding_subtopic_group_topic_indexes.get()
    if index in subtopic_indexes:
        subtopic_indexes.remove(index)
    else:
        subtopic_indexes.append(index)

def on_subtopic_group_add():
    SM.chosen_chapter_subtopic_group_list.get().append(TopicGroup())
    SM.is_adding_subtopic_group.set(True)

def on_subtopic_group_remove(index):
    with st.spinner("Saving..."):
        chosen_chap_subtopic_group_list = SM.chosen_chapter_subtopic_group_list.get()
        chosen_chap_subtopic_group_list.pop(index)
        curr_chapter = SM.chosen_chapter_details.get()
        user_id = SM.user.get().id
        curr_chapter.topic_groups = chosen_chap_subtopic_group_list
        save_edited_chapter_doc(curr_chapter, user_id)
    st.write("Saved!")
    SM.adding_subtopic_group_topic_indexes.delete()
    SM.is_adding_subtopic_group.delete()

def on_subtopic_group_submit(index, curr_group: TopicGroup):
    SM.subtopic_edit_expander_open.set(False)
    with st.spinner("Saving..."):
        chosen_chap_subtopic_group_list = SM.chosen_chapter_subtopic_group_list.get()
        chosen_chap_subtopic_group_list[index] = curr_group
        curr_chapter = SM.chosen_chapter_details.get()
        user_id = SM.user.get().id
        curr_chapter.topic_groups = chosen_chap_subtopic_group_list
        save_edited_chapter_doc(curr_chapter, user_id)
    st.write("Saved!")
    SM.adding_subtopic_group_topic_indexes.delete()
    SM.is_adding_subtopic_group.delete()

# End

def on_subtopic_submit_find_errored_subtopic_group_index():
    subtopic_group_list = SM.chosen_chapter_subtopic_group_list.get()
    subtopic_list = SM.chosen_chapter_subtopic_list.get()
    
    subtopic_titles_set = {subtopic.title for subtopic in subtopic_list}
    for group_index, group in enumerate(subtopic_group_list):
        for title_index, title in enumerate(group.group_titles):
            if title not in subtopic_titles_set:
                return group_index, title_index
    return -1, -1

def check_subtopic_info_for_completeness():
    chosen_chap_subtopic_list = SM.chosen_chapter_subtopic_list.get()
    for index, subtopic in enumerate(chosen_chap_subtopic_list):
        if not subtopic.title.strip():
            st.error(f"Subtopic {index + 1} has an empty title. Please provide an appropriate title to save.")
            return True
        
        if not subtopic.learning_outcomes:
            st.error(f"Subtopic {index + 1} has no learning outcomes. Please provide appropriate learning outcomes to save.")
            return True

        for lo_index, lo in enumerate(subtopic.learning_outcomes):
            if not lo.strip():
                st.error(f"For subtopic {index + 1}, learning outcome #{lo_index + 1} is empty. Either remove this learning outcome or provide an appropriate one.")
                return True
    return False

def check_subtopic_group_for_inconsistencies_and_save():
    errored_group_index, errored_subtopic_title_index = on_subtopic_submit_find_errored_subtopic_group_index()
    if errored_group_index != -1 and errored_subtopic_title_index != -1:
        errored_subtopic_title = SM.chosen_chapter_subtopic_group_list.get()[errored_group_index].group_titles[errored_subtopic_title_index]
        error_message = f"Subtopic Group #{errored_group_index + 1} has a subtopic called `{errored_subtopic_title}` which is not present in the above set of subtopics. Submitting the above changes will delete subtopic group #{errored_group_index + 1}. Do you wish to proceed?"
        st.error(error_message)

        cols = st.columns([1, 1])
        if cols[0].button("Yes", key="confirm_yes", type="primary"):
            save_subtopics_by_deleting_subtopic_group(errored_group_index)
            st.rerun()
            
        if cols[1].button("No", key="confirm_no", type="primary"):
            st.session_state['confirm_subtopic_save'] = False  # Ensure the state is reset
            st.rerun()
    else:
        save_subtopics()
        st.rerun()

def save_subtopics():
    latest_chapter = SM.chosen_chapter_details.get()
    chosen_chap_subtopic_list = SM.chosen_chapter_subtopic_list.get()
    latest_chapter.topics = chosen_chap_subtopic_list
    with st.spinner("Saving..."):
        save_edited_chapter_doc(latest_chapter, SM.user.get().id)
    st.toast("Changes saved successfully!")
    st.session_state['confirm_subtopic_save'] = False  # Reset the state
    SM.chosen_chapter_details_in_db.delete()
    SM.subtopic_edit_expander_open.delete()

def save_subtopics_by_deleting_subtopic_group(index):
    latest_chapter = SM.chosen_chapter_details.get()
    chosen_chap_subtopic_list = SM.chosen_chapter_subtopic_list.get()
    new_subtopic_group_list = SM.chosen_chapter_subtopic_group_list.get()
    
    new_subtopic_group_list.pop(index)
    latest_chapter.topics = chosen_chap_subtopic_list
    latest_chapter.topic_groups = new_subtopic_group_list
    with st.spinner("Saving..."):
        save_edited_chapter_doc(latest_chapter, SM.user.get().id)
    st.toast("Changes saved successfully!")
    st.session_state['confirm_subtopic_save'] = False  # Reset the state
    SM.chosen_chapter_details_in_db.delete()
    SM.subtopic_edit_expander_open.delete()

def has_unsaved_lo_changes():
    latest_chapter_in_db = SM.chosen_chapter_details_in_db.get()
    chosen_chap_lo = SM.chosen_chapter_lo_list.get()
    
    if len(latest_chapter_in_db.learning_outcomes) != len(chosen_chap_lo):
        return True
    
    for db_lo, chosen_lo in zip(latest_chapter_in_db.learning_outcomes, chosen_chap_lo):
        if db_lo.strip() != chosen_lo.strip():
            return True
    return False

def has_unsaved_subtopic_changes():
    latest_chapter_in_db = SM.chosen_chapter_details_in_db.get()
    chosen_subtopic_info = SM.chosen_chapter_subtopic_list.get()
    
    if len(latest_chapter_in_db.topics) != len(chosen_subtopic_info):
        return True
    
    for db_topic, chosen_topic in zip(latest_chapter_in_db.topics, chosen_subtopic_info):
        if db_topic.title.strip() != chosen_topic.title.strip():
            return True
        if len(db_topic.learning_outcomes) != len(chosen_topic.learning_outcomes):
            return True
        for db_lo, chosen_lo in zip(db_topic.learning_outcomes, chosen_topic.learning_outcomes):
            if db_lo.strip() != chosen_lo.strip():
                return True
    return False

def fetch_chapter_details(chap_id: str):
    chapter = get_chapter_doc_unedited(chap_id)
    if chapter.isEdited:
        chapter: Chapter = get_chapter_doc_edited(chap_id)
    return chapter

def extract_details(details_string):
    # Regular expression to match the pattern of each element
    pattern = r'Board=(?P<board>[^,]+),Medium=(?P<medium>[^,]+),Grade=(?P<grade>[^,]+),Subject=(?P<subject>[^,]+),Number=(?P<number>[^,]+)'
    
    # Search the string using the defined pattern
    match = re.search(pattern, details_string)
    
    # Extract values if pattern matches
    if match:
        return match.groupdict()
    else:
        return "No match found"

def find_if_chapter_level_lp_exists(chap_id: str):
    chapter_curr_info = extract_details(chap_id)
    lp_id = f"Board={chapter_curr_info['board']}/Medium={chapter_curr_info['medium']}/Grade={chapter_curr_info['grade']}/Subject={chapter_curr_info['subject']}/Number={chapter_curr_info['number']}/Level=CHAPTER/Topics=ALL"
    lp = get_unedited_lp_doc(lp_id)
    return lp != None

def find_if_subtopic_level_lp_exists(chap_id: str, subtopics: List[Topic]):
    chapter_curr_info = extract_details(chap_id)
    lp_id = f"Board={chapter_curr_info['board']}/Medium={chapter_curr_info['medium']}/Grade={chapter_curr_info['grade']}/Subject={chapter_curr_info['subject']}/Number={chapter_curr_info['number']}/Level=SUBTOPIC/Topics={';'.join([topic.title for topic in subtopics])}"
    lp = get_unedited_lp_doc(lp_id)
    return lp != None
        
################################################################################################### 
    
def app():
    if st.button('< Go Back', key="go back to Chapter chosing"):
        go_back()
    
    user_id = SM.user.get().id
    chapter_name = SM.chosen_chapter_name.get()
    chapter_id = SM.chosen_chapter_id.get()
    chapter_subject = extract_details(chapter_id)['subject']
    st.header(chapter_name, divider="grey")
    
    latest_chapter = SM.chosen_chapter_details.get()
    if latest_chapter == None:
        with st.spinner("Getting chapter info..."):
            latest_chapter = fetch_chapter_details(chapter_id)
            SM.chosen_chapter_details.set(latest_chapter)
    
    latest_chapter_in_db = SM.chosen_chapter_details_in_db.get()
    if latest_chapter_in_db == None:
        with st.spinner("Getting chapter info..."):
            latest_chapter_in_db = fetch_chapter_details(chapter_id)
            SM.chosen_chapter_details_in_db.set(latest_chapter_in_db)
        
    unedited_chapter = SM.chosen_unedited_chapter_details.get()
    if unedited_chapter == None:
        with st.spinner("Getting unedited chapter info..."):
            unedited_chapter = get_chapter_doc_unedited(chapter_id)
            SM.chosen_unedited_chapter_details.set(unedited_chapter)

    chosen_chap_lo_list = SM.chosen_chapter_lo_list.get()
    if chosen_chap_lo_list == None:
        chosen_chap_lo_list = deepcopy(latest_chapter.learning_outcomes)
        SM.chosen_chapter_lo_list.set(chosen_chap_lo_list)
    
    if SM.user.get().role == UserRoleEnum.ADMIN and latest_chapter.isEdited:
        cols = st.columns([0.2, 0.5, 0.3])
        if cols[0].button("Reset edits to this chapter"):
            with st.spinner("Resetting..."):
                reset_edits_in_chapter(latest_chapter)
                clear_state_vars()
                st.rerun()
        cols[1].write("FOR ADMIN ONLY. This will DELETE ALL user edits for this chapter until now. \
            <br>Note: The deleted changes cannot be recovered.", unsafe_allow_html=True)
    
    if latest_chapter.isEdited:
        col1, _, col2 = st.columns([1, 5, 1])
        col1.write(f"Last Edited by: {latest_chapter.user_id}")
        if latest_chapter.last_edited_at != -1:
            utc_time = datetime.utcfromtimestamp(latest_chapter.last_edited_at)
            indian_tz = pytz.timezone('Asia/Kolkata')
            indian_time = utc_time.replace(tzinfo=pytz.utc).astimezone(indian_tz)
            human_readable = indian_time.strftime('%Y-%m-%d %H:%M:%S %Z')
            col2.write(f"Last Edited At: {human_readable}")
            
        with st.expander("AI Generated Chapter Details"):
            st.subheader("Learning Outcomes")
            for lo in unedited_chapter.learning_outcomes:
                st.write(lo)
            st.subheader("Subtopics")
            for index, topic in enumerate(unedited_chapter.topics):
                st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
                st.write(f"Subtopic {index + 1} Title: {topic.title}")
                st.write("Learning Outcomes")
                for lo in topic.learning_outcomes:
                    st.write(f"     - {lo}")
            
    with st.expander("Edit Chapter Learning Outcomes"):
        if has_unsaved_lo_changes():
            st.info("Unsaved changes are present.")
                    
        st.markdown("""
            <style>
                .stTextInput > div > div > input {
                    margin-top: 0px; /* Adjust top margin */
                    margin-bottom: 0px; /* Adjust bottom margin */
                }
                .stButton > button {
                    margin-top: 30px;  /* Adjust this value to align the button as needed */
                }
            </style>
        """, unsafe_allow_html=True)
        # Display the list with an option to remove each item
        for index, item in enumerate(chosen_chap_lo_list):
            col1, col2 = st.columns([0.9, 0.1])
            with col1:
                st.text_input(f"Learning Outcome #{index + 1}", key=f'chap_lo_item_{index}', value=item, on_change=lambda idx=index: update_chapter_lo_item(idx))
            with col2:
                st.button("Remove", key=f"chap_lo_item_remove_{index}", on_click=remove_chapter_lo_item, args=(index,))

        # Button to add a new empty item to the list
        st.button("Add learning outcome", on_click=add_chapter_lo_item)
        
        if st.button("Submit", key="LO edit submit", type="primary"):
            SM.subtopic_edit_expander_open.set(False)
            flg = False
            if len(chosen_chap_lo_list) == 0:
                st.error("All learning outcomes have been removed. Please provide some chapter level learing outcomes.")
                flg = True
            else:
                for index, lo in enumerate(chosen_chap_lo_list):
                    if len(lo.strip()) == 0:
                        st.error(f"Learning outcome #{index + 1} is empty. Please either remove it or provide some appropriate learning outcomes.")
                        flg = True
                        break
            
            if not flg:
                SM.chosen_chapter_details_in_db.delete()
                latest_chapter.learning_outcomes = chosen_chap_lo_list
                with st.spinner("Saving..."):
                    save_edited_chapter_doc(latest_chapter, user_id)
                st.write("Saved!")
                st.rerun()
    
    chosen_chap_subtopic_list = SM.chosen_chapter_subtopic_list.get()
    if chosen_chap_subtopic_list == None:
        chosen_chap_subtopic_list = deepcopy(latest_chapter.topics)
        SM.chosen_chapter_subtopic_list.set(chosen_chap_subtopic_list)
    
    with st.expander("Edit Chapter Subtopics and their learning outcomes", expanded=SM.subtopic_edit_expander_open.get(False)):
        if has_unsaved_subtopic_changes():
            st.info("Unsaved changes are present.")
        # Display each complex object with options to edit and remove
        for index, topic in enumerate(chosen_chap_subtopic_list):
            st.subheader(f"Subtopic {index + 1}")
            st.text_input(f"Title", value=topic.title, key=f"title_{index}", on_change=update_title)

            # Display learning outcomes for each complex object
            st.markdown("""
                <style>
                    .stTextInput > div > div > input {
                        margin-top: 0px; /* Adjust top margin */
                        margin-bottom: 0px; /* Adjust bottom margin */
                    }
                    .stButton > button {
                        margin-top: 30px;  /* Adjust this value to align the button as needed */
                    }
                </style>
            """, unsafe_allow_html=True)
            st.write("Learning Outcomes")
            for outcome_index, outcome in enumerate(topic.learning_outcomes):
                col1, col2 = st.columns([0.9, 0.1])
                with col1:
                    st.text_input(
                        f"Learning outcome #{outcome_index + 1}",
                        value=outcome,
                        key=f"outcome_{index}_{outcome_index}",
                        on_change=update_learning_outcome,
                        args=(index, outcome_index)
                    )
                with col2:
                    st.button("Remove", key=f"remove_outcome_{index}_{outcome_index}", on_click=remove_topic_learning_outcome, args=(index, outcome_index))

            
            # Button to add new learning outcome
            st.button("Add Learning Outcome", key=f"add_outcome_{index}", on_click=add_topic_learning_outcome, args=(index,))
            
            # Button to remove current complex item
            st.button("Remove Subtopic", key=f"remove_subtopic_{index}", on_click=remove_topic_item, args=(index,))
                
            st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)

        # Button to add a new complex item to the list
        st.button("Add new subtopic", on_click=add_topic_item)
        
        if st.button("Submit", key="Subtopic edit submit", type="primary"):
            SM.subtopic_edit_expander_open.set(True)
            if not check_subtopic_info_for_completeness():
                st.session_state['confirm_subtopic_save'] = True

        if st.session_state.get('confirm_subtopic_save', False):
            SM.subtopic_edit_expander_open.set(True)
            check_subtopic_group_for_inconsistencies_and_save()

    
    chosen_chap_subtopic_group_list = SM.chosen_chapter_subtopic_group_list.get()
    if chosen_chap_subtopic_group_list == None:
        chosen_chap_subtopic_group_list = deepcopy(latest_chapter.topic_groups)
        SM.chosen_chapter_subtopic_group_list.set(chosen_chap_subtopic_group_list)
        
    is_adding_subtopic_group = SM.is_adding_subtopic_group.get()
    if is_adding_subtopic_group == None:
        is_adding_subtopic_group = False
        
    adding_subtopic_group_topics_indexes = SM.adding_subtopic_group_topic_indexes.get()
    if adding_subtopic_group_topics_indexes == None:
        adding_subtopic_group_topics_indexes = []
        SM.adding_subtopic_group_topic_indexes.set(adding_subtopic_group_topics_indexes)
    
    unselected_topics_titles = get_unselected_topics_for_grouping(chosen_chap_subtopic_group_list, chosen_chap_subtopic_list)
    
    with st.expander("Edit Subtopic Groups", expanded=is_adding_subtopic_group):
        for index, topic_group in enumerate(chosen_chap_subtopic_group_list):
            st.subheader(f"Subtopics Group #{index + 1}")
            if is_adding_subtopic_group and index == len(chosen_chap_subtopic_group_list) - 1:
                st.write("Choose subtopics to include in new group: ")
                for topic_index, topic_title in enumerate(unselected_topics_titles):
                    st.checkbox(topic_title,
                                    key=f"subtopic_group_checkbox_{topic_index}_{topic_title}", 
                                    value=topic_index in adding_subtopic_group_topics_indexes, 
                                    on_change=on_subtopics_chosen_from_group, 
                                    args=(topic_index,))
                    
                curr_group = TopicGroup()
                for i in range(len(unselected_topics_titles)):
                    if i in adding_subtopic_group_topics_indexes:
                        curr_group.group_titles.append(unselected_topics_titles[i])
                
                if len(curr_group.group_titles) > 1:
                    st.button("Submit Group", key=f"submit_group_{index}", on_click=on_subtopic_group_submit, args=(index, curr_group), type="primary")
                        
            else:
                for topic_index, topic_title in enumerate(topic_group.group_titles):
                    st.write(f"#{topic_index + 1} {topic_title}")
                    
                st.button("Remove", key=f"subtopic_group_remove_{index}", on_click=on_subtopic_group_remove, args=(index,))

        st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:0.5px;'>", unsafe_allow_html=True)
        if not is_adding_subtopic_group and len(unselected_topics_titles) > 0:
            _ = st.button("Add Group", on_click=on_subtopic_group_add)
    
    if SM.user.get().role == UserRoleEnum.ADMIN and os.environ.get("ENABLE_SUBMIT_LP_REQ", "False") == "True":
        # CHAPTER LEVEL LP, NOT FOR ENGLISH SUBJECT
        chapter = None
        with st.spinner("Fetching Chapter Details..."):
            chapter = fetch_chapter_details(chapter_id)
        if not chapter_subject.lower().startswith("english"):
            with st.spinner("Fetching Chapter LP Generation details..."):
                chap_lp_exists = find_if_chapter_level_lp_exists(chapter_id)
            if chap_lp_exists:
                st.success("Chapter Level LP Already Created")
                st.success("Successfully created Kannada chapter metadata!")
            else:
                if st.button("Start Chapter Level LP Generation", type="primary"):
                    with st.spinner("Submitting..."):  
                        submit_lp_generation_for_chapter(chapter_id)
                    st.success("Submitted chapter level lp for generation!")
                    # with st.spinner("Creating Kannada Chapter Metadata..."):
                    #     create_kannada_chapter_doc(chapter_id)
                    # st.success("Successfully created Kannada chapter metadata!")
        
        # SUBTOPIC LEVEL LP
        subtopics_without_lps = []
        subtopic_included_in_group = set()
        with st.spinner("Fetching subtopic lp generation details..."):
            for topic_group in chapter.topic_groups:
                topics_list = []
                for title in topic_group.group_titles:
                    subtopic_included_in_group.add(title)
                    for topic in chapter.topics:
                        if topic.title == title:
                            topics_list.append(topic)
                if find_if_subtopic_level_lp_exists(chap_id=chapter_id, subtopics=topics_list):
                    st.success(f"SUBTOPIC LEVEL LP FOR SUBTOPIC `{'; '.join([topic.title for topic in topics_list])}` Already Created")
                else:
                    subtopics_without_lps.append(topics_list)
                
            for topic in chapter.topics:
                if topic.title not in subtopic_included_in_group:
                    if find_if_subtopic_level_lp_exists(chap_id=chapter_id, subtopics=[topic]):
                        st.success(f"SUBTOPIC LEVEL LP FOR SUBTOPIC `{topic.title}` Already Created")
                    else:
                        subtopics_without_lps.append([topic])
        
        if len(subtopics_without_lps) > 0:
            if st.button("Start Subtopic(s) Level LP Generation", type="primary"):
                for subtopic_list in subtopics_without_lps:
                    with st.spinner(f"Submitting request for subtopic(s) `{[topic.title for topic in subtopic_list]}`"):
                        submit_lp_generation_for_subtopics(chapter_id=chapter_id, subtopics=subtopic_list)
                    st.success(f"Submitted request for subtopic(s) `{[topic.title for topic in subtopic_list]}`")
            
            
            
        
        
