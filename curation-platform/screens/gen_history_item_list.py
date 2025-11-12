import streamlit as st
from data.api_v2 import get_gen_history_items
from data.chapter_lo_subtopic_models import UserRoleEnum
from data.data_models import LPLevel
from state_manager import StateManager as SM
from screens import gen_history_item_details
from navigation import Navigation as nav

PAGE_SIZE = 20
CURRENT_PAGE_STATE_KEY = 'CURRENT_PAGE_STATE_KEY_GEN_HISTORY'

def app():
    user = SM.user.get()
    if user.role != UserRoleEnum.ADMIN:
        st.header("You are not authorized to view this page. Only ADMINs can.")
        st.stop()
    st.header("Lesson Plan Generation History")
    items = SM.gen_history_items.get()
    if items == None:
        with st.spinner("Fetching items..."):
            items = get_gen_history_items()
        SM.gen_history_items.set(items)
    
    default_filter = 'All'

    # Extract unique filter options
    classes = sorted(list({item.curr_info.grade for item in items}), key=int)
    classes.insert(0, default_filter)  # For 'all' option
    subjects = list({item.curr_info.subject for item in items})
    subjects.insert(0, default_filter)  # For 'all' option
    statuses = list({item.latest_status for item in items})
    chapter_numbers = sorted(list({item.curr_info.chapter_number for item in items}), key=int)
    chapter_numbers.insert(0, default_filter)
    
    if st.button("Refresh", type="secondary"):
        SM.gen_history_items.delete()
        st.rerun()
    
    col1, col2, col3, col4 = st.columns(4)
    grade = col1.selectbox("Select Grade", options=classes, index=0)
    subject = col2.selectbox("Select Subject", options=subjects, index=0)
    chapter_number = col3.selectbox("Select Chapter Number", options=chapter_numbers, index=0)
    statuses = col4.multiselect('Select Statuses', options=statuses)
    filtered_items = [
        item for item in items if
        (item.curr_info.grade == grade or grade == default_filter) and
        (item.curr_info.subject == subject or subject == default_filter) and
        (item.latest_status in statuses or len(statuses) == 0) and
        (item.curr_info.chapter_number == chapter_number or chapter_number == default_filter)
    ]
    

    total_pages = 0
    if len(filtered_items) == 0:
        st.write("No such Generation Requests. Please change the filters.")
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
        headers = ["Current Status", "Grade", "Subject", "Chapter", "LP Level", "Topic"]
        font_size = "18px"
        for index, header in enumerate(headers):
            header_cols[index].markdown(f"<span style='font-size: {font_size};'><b>{header}</b></span>", unsafe_allow_html=True)

        st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
        
        # Display items as a list with buttons
        for item in current_items:
            edit_button_text = "View"

            # Create columns within the item
            cols = st.columns([2, 2, 2, 2, 2, 2, 3])
            
            cols[0].write(item.latest_status)
            cols[1].write(item.curr_info.grade)
            cols[2].write(item.curr_info.subject)
            cols[3].write(f"Chapter Number: {item.curr_info.chapter_number} {item.curr_info.chapter_title}")
            cols[4].write(item.lp_level)
            cols[5].write('ALL TOPICS' if item.lp_level == LPLevel.CHAPTER.value else item.subtopics)

            # Button in the last column
            if cols[6].button(edit_button_text, key=str(item)):
                SM.chosen_gen_history_item.set(item)
                nav.set_current_page_gen_history(gen_history_item_details)
                
            # Use one column for the entire item for consistent background color
            st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:0.5px;'>", unsafe_allow_html=True)
            # Close the div for background color
            st.markdown("</div>", unsafe_allow_html=True)
    
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
