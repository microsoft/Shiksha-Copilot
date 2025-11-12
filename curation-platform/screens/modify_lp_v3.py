from copy import deepcopy
from dataclasses import fields
import time
import streamlit as st
from state_manager import StateManager as SM
from data.api import completed_editing_v2, fetch_lp_v2_by_id, regenerate_lp, save_lp_v2, save_lp_v2_to_not_edited
from components import modify_lp_component_4 as modify_lp_component
from navigation import Navigation as nav
from screens import home, edit_lp, edit_resources
import pandas as pd

import streamlit as st

from utils import compare_strings_without_whitespaces_newlines, saveV2
    
def exit_to_home():
    SM.current_lp_v2.delete()
    SM.current_lp_v2_feedback.delete()
    SM.lp_list_v2.delete()
    SM.is_editing_lo.set(False)
    nav.set_current_page(home)
    
def app():
    if st.button('< Go Back', key="go back first"):
        exit_to_home()
        
    st.header("Modify Content", divider="grey")
            
    lp_item = SM.chosen_lp_item.get()
    lp = SM.current_lp_v2.get()
    
    if not lp:
        lp = fetch_lp_v2_by_id(lp_item.id)
        SM.current_lp_v2.set(lp)
    
    is_editing_lo = SM.is_editing_lo.get()
    
    selected_columns = {
        'Medium': lp_item.medium,
        'Grade': lp_item.grade,
        'Subject': lp_item.subject,
        'Chapter': lp_item.chapter,
        'Topic': "\n".join(lp.topics)
    }
    item_df = pd.DataFrame([selected_columns])
    st.markdown("""
    <style>
    table td:nth-child(1) {
        display: none;
    }
    thead th {
        font-weight: bold;
    }
    </style>
    """, unsafe_allow_html=True)

    # Display the DataFrame in Streamlit without the index
    st.dataframe(item_df, hide_index=True, use_container_width=True)
    
    def save_lp():
        save_lp_v2(lp)
    
    st.subheader("Learning Outcomes")
    if is_editing_lo:
        edited_text = st.text_area("Learning Outcomes", label_visibility="hidden", 
                                   value=lp.learningOutcomes.strip(), 
                                   height=300)

        if st.button('Save Changes', type="primary"):
            st.write("Saving changes. Please wait here...")
            lp.learningOutcomes = edited_text
            lp.prompt_context["LEARNING_OUTCOMES"] = lp.learningOutcomes
            save_lp()
            st.write("Submitting request to generate Lesson plan...")
            regenerate_lp(lp=lp)
            st.write("Done. Taking you back...")
            exit_to_home()
    else:
        st.markdown(lp.learningOutcomes.strip().replace("\n", "<br>"), unsafe_allow_html=True)
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("Edit Learning Outcomes", key="Choose to Edit LO"):
                SM.is_editing_lo.set(True)
                st.rerun()
        with col2:
            if st.button("View Lesson Plan", key="View LP button"):
                nav.set_current_page(edit_lp)
        if lp.is_chapter_lp:
            with col3:
                if st.button("View Resources", key="View Resources button"):
                    nav.set_current_page(edit_resources)
        
        # if total_mot_count > 1:
        #     preferred_method_of_teaching = st.radio("Choose a preferred method of teaching",
        #             options=[ mot_content.methodOfTeaching for mot_content in lp.instructionSet] )
        #     lp.preferredTeachingModel = preferred_method_of_teaching
        
        # with st.expander(ExpanderTitles.VIDEOS):
        #     st.write(lp.videos)
        
        # _, col, _ = st.columns([5,1,5])
        # with col:
        #     if st.button('< Go Back', key="go back last"):
        #         exit_to_home()
        
    
    



