from copy import deepcopy
from typing import List
import streamlit as st
from data.data_models import LPLevel, LPListItem, LessonPlan
from state_manager import StateManager as SM
from data.api_v2 import fetch_all_kn_lps
from utils import extract_curr_details, timestamp_to_ist
from screens import modify_lp_kn
from navigation import Navigation as nav

PAGE_SIZE = 20
CURRENT_PAGE_STATE_KEY = 'CURRENT_PAGE_STATE_KEY_KN'

def get_lp_list_items(lps: list[LessonPlan])->List[LPListItem]:
    return [
        LPListItem(
            id=lp.id,
            last_edited_at=lp.last_edited_at,
            isEdited=lp.isEdited,
            isCompletedEditing=lp.isCompletedEditing,
            topics="; ".join(lp.subtopics) if lp.lp_level == LPLevel.SUBTOPIC.value else "ALL TOPICS",
            **(extract_curr_details(lp.chapter_id).model_dump())
        )
        for lp in lps
    ]
        

def app():
    st.header("Lesson Plan List")
    all_lps = SM.lp_list_kn.get()
    if all_lps == None:
        with st.spinner("Fetching Lesson Plans..."):
            unedited_lps, edited_lps = fetch_all_kn_lps()
            
        SM.unedited_lp_list_kn.set(unedited_lps)
        SM.edited_lp_list_kn.set(edited_lps)
        
        all_lps = deepcopy(edited_lps)
        edited_ids = {lp.id for lp in edited_lps}
        all_lps.extend(deepcopy(lp) for lp in unedited_lps if lp.id not in edited_ids)
        SM.lp_list_kn.set(all_lps)
    
    items = get_lp_list_items(all_lps)
    
    default_filter = 'All'

    # Extract unique filter options
    classes = sorted(list({item.grade for item in items}), key=int)
    classes.insert(0, default_filter)  # For 'all' option
    subjects = list({item.subject for item in items})
    subjects.insert(0, default_filter)  # For 'all' option
    chapter_numbers = sorted(list({item.chapter_number for item in items}), key=int)
    chapter_numbers.insert(0, default_filter)
    is_completed_options = list({item.isCompletedEditing for item in items})
    is_completed_options.insert(0, default_filter)
    
    col1, col2, col3, col4 = st.columns(4)
    grade = col1.selectbox("Select Grade", options=classes, index=0)
    subject = col2.selectbox("Select Subject", options=subjects, index=0)
    chapter_number = col3.selectbox("Select Chapter Number", options=chapter_numbers, index=0)
    is_completed = col4.selectbox("Is Completed?", options=is_completed_options, index=0)
    filtered_items = [
        item for item in items if
        (item.grade == grade or grade == default_filter) and
        (item.subject == subject or subject == default_filter) and
        (item.chapter_number == chapter_number or chapter_number == default_filter) and
        (item.isCompletedEditing == is_completed or is_completed == default_filter)
    ]
    
    if st.button("Refresh", type="secondary"):
        SM.lp_list_kn.delete()
        SM.unedited_lp_list_kn.delete()
        SM.edited_lp_list_kn.delete()
        st.rerun()
    
    total_pages = 0
    if len(filtered_items) == 0:
        st.write("No such LPs. Please change the filters.")
    else:
        total_pages = (len(filtered_items) - 1) // PAGE_SIZE + 1
        if CURRENT_PAGE_STATE_KEY not in st.session_state:
            st.session_state[CURRENT_PAGE_STATE_KEY] = 1

        # Calculate the starting and ending index for the current page
        start_idx = (st.session_state[CURRENT_PAGE_STATE_KEY] - 1) * PAGE_SIZE
        end_idx = start_idx + PAGE_SIZE
        current_items = filtered_items[start_idx:end_idx]

        # Display headers
        header_cols = st.columns([2, 2, 2, 2, 2, 2, 3])
        headers = ["Last Edited At", "Grade", "Subject", "Chapter", "Topic", "Is Completed?"]
        font_size = "18px"
        for index, header in enumerate(headers):
            header_cols[index].markdown(f"<span style='font-size: {font_size};'><b>{header}</b></span>", unsafe_allow_html=True)

        st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
        
        # Display items as a list with buttons
        for item in current_items:
            edit_button_text = "View" if item else "Start Editing"

            # Create columns within the item
            cols = st.columns([2, 2, 2, 2, 2, 2, 3])
            
            cols[0].write(timestamp_to_ist(item.last_edited_at) if item.isEdited else "Not started yet")
            cols[1].write(item.grade)
            cols[2].write(item.subject)
            cols[3].write(f"Chapter Number: {item.chapter_number} {item.chapter_title}")
            cols[4].write(item.topics)
            cols[5].write("**`YES`**" if item.isCompletedEditing else "**`NO`**")

            # Button in the last column
            if cols[6].button(edit_button_text, key=str(item)):
                flg = False
                for lp in all_lps:
                    if lp.id == item.id:
                        flg = True
                        SM.chosen_lp_kn.set(lp)
                if flg:
                    nav.set_current_page_edit_lp_kn(modify_lp_kn)
                
            # Use one column for the entire item for consistent background color
            st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:0.5px;'>", unsafe_allow_html=True)
            # Close the div for background color
            st.markdown("</div>", unsafe_allow_html=True)
        
         # Create navigation buttons at the bottom of the list
    _, col1, col2, col3, _ = st.columns([0.8, 0.2, 0.2, 0.2 ,0.8])

    if col1.button("Previous"):
        if st.session_state[CURRENT_PAGE_STATE_KEY] > 1:
            st.session_state[CURRENT_PAGE_STATE_KEY] -= 1
            st.rerun()
    
    with col2:
        st.markdown(f"<p style='text-align: center;'>Page {st.session_state[CURRENT_PAGE_STATE_KEY]} of {total_pages}</p>", unsafe_allow_html=True)

    if col3.button("Next"):
        if st.session_state[CURRENT_PAGE_STATE_KEY] < total_pages:
            st.session_state[CURRENT_PAGE_STATE_KEY] += 1
            st.rerun()
        
        
