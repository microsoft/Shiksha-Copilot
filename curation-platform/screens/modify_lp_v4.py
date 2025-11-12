from copy import deepcopy
import streamlit as st
from data.api_v2 import fetch_edited_unedited_chapters, get_feedback_for_lp, save_feedback, save_lp
from data.chapter_lo_subtopic_models import UserRoleEnum
from data.data_models import LPLevel
from state_manager import StateManager as SM
from components import modify_lp_component_5 as modify_lp_component
from components import crisp_5e_component, checklist_component, resources_component
from navigation import Navigation as nav
from screens import edit_lp_list
import pandas as pd

import streamlit as st

from utils import CANNOT_BE_USED_FEEDBACK, NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, WELL_SUITED_FOR_CLASSROOM_FEEDBACK, extract_curr_details, get_feedback_str, get_score, highlight_differences, saveV2, timestamp_to_ist
    
def go_back():
    SM.chosen_lp.delete()
    SM.chosen_lp_feedback.delete()
    SM.lp_list.delete()
    SM.unedited_lp_list.delete()
    SM.edited_lp_list.delete()
    nav.set_current_page_edit_lp(edit_lp_list)
    
def app():
    if st.button('< Go Back', key="go back first"):
        go_back()
        
    st.header("Modify Lesson Plan Content", divider="grey")        
    lp = SM.chosen_lp.get()
    for unedited_lp in SM.unedited_lp_list.get():
        if unedited_lp.id == lp.id:
            ai_lp = deepcopy(unedited_lp)
    if ai_lp == None:
        raise ValueError("NO UNEDITED LP FOUND. WIERD.")
    
    feedback = SM.chosen_lp_feedback.get()
    if feedback == None:
        with st.spinner("Fetching feedback details..."):
            feedback = get_feedback_for_lp(lp)
        SM.chosen_lp_feedback.set(feedback)
    
    def on_save_lp_component():
        with st.spinner("Saving Lesson Plan..."):
            save_lp(lp=lp, user_id=SM.user.get().id)
        st.write("Changes saved.")
        
    
    def on_save_feedback_for_component():
        with st.spinner("Saving Feedback..."):
            save_feedback(feedback, user_id=SM.user.get().id)
    
    user = SM.user.get()
    if user.role == UserRoleEnum.ADMIN and lp.isCompletedEditing:
        with st.spinner("Fetching details to visualize changes..."):
                edited_chap, unedited_chap = fetch_edited_unedited_chapters(lp.chapter_id)
        with st.expander("Visualize Changes"):
            result_lo = highlight_differences(unedited_chap.__str__(newline_char="<br>"), 
                                              edited_chap.__str__(newline_char="<br>"))
            result_lp_diff = highlight_differences(ai_lp.__str__(newline_char="<br>"), lp.__str__(newline_char="<br>"))
            result_feedback_str = feedback.__str__(newline_char="<br>")
            st.markdown(result_feedback_str + result_lo + result_lp_diff, unsafe_allow_html=True)
        
    curriculum_info = extract_curr_details(lp.chapter_id)
    selected_columns = {
        'Medium': curriculum_info.medium,
        'Grade': curriculum_info.grade,
        'Subject': curriculum_info.subject,
        'Chapter': curriculum_info.chapter_title,
        'Topic(s)': ", ".join(lp.subtopics),
        'Method of Teaching': lp.preferred_mot,
        'Lesson Plan Level': lp.lp_level,
        'Last Edited By': lp.userId
    }
    if curriculum_info.subject.lower().startswith('english'):
        selected_columns['Lesson Plan Level'] = lp.lp_type_english
    if lp.last_edited_at != -1:
        selected_columns['Last Edited At'] = timestamp_to_ist(lp.last_edited_at)
        
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
    
    st.subheader("Learning Outcomes")
    for i, item in enumerate(lp.learning_outcomes, start=1):
        st.write(f"{i}. {item}")
    
    st.subheader("Lesson Plan")
    instruction_set = lp.instruction_set if lp.lp_level == LPLevel.CHAPTER.value else lp.crisp_instruction_set
    ai_instruction_set = ai_lp.instruction_set if lp.lp_level == LPLevel.CHAPTER.value else ai_lp.crisp_instruction_set
    
    with st.expander("Engage"):
        modify_lp_component.app(
            lp.id,
            "Engage",
            instruction_set.engage,
            ai_instruction_set.engage,
            feedback.instruction_set.engage,
            on_save_lp_component,
            on_save_feedback_for_component
        )
    with st.expander("Explore"):
        modify_lp_component.app(
            lp.id,
            "Explore",
            instruction_set.explore,
            ai_instruction_set.explore,
            feedback.instruction_set.explore,
            on_save_lp_component,
            on_save_feedback_for_component
        )
    with st.expander("Explain"):
        modify_lp_component.app(
            lp.id,
            "Explain",
            instruction_set.explain,
            ai_instruction_set.explain,
            feedback.instruction_set.explain,
            on_save_lp_component,
            on_save_feedback_for_component
        )
    with st.expander("Elaborate"):
        modify_lp_component.app(
            lp.id,
            "Elaborate",
            instruction_set.elaborate,
            ai_instruction_set.elaborate,
            feedback.instruction_set.elaborate,
            on_save_lp_component,
            on_save_feedback_for_component
        )
    with st.expander("Evaluate"):
        modify_lp_component.app(
            lp.id,
            "Evaluate",
            instruction_set.evaluate,
            ai_instruction_set.evaluate,
            feedback.instruction_set.evaluate,
            on_save_lp_component,
            on_save_feedback_for_component
        )
    
    st.subheader("Checklist")
    with st.expander("Expand to see"):
        checklist_component.app(
            lp_id=lp.id,
            component_name="Checklist",
            checklist=lp.checklist,
            checklist_ai=ai_lp.checklist,
            feedback_unit=feedback.checklist,
            on_save_lp_component=on_save_lp_component,
            on_save_feedback=on_save_feedback_for_component
        )
    
    if lp.extracted_resources != None:
        st.subheader("Extracted Resources")
        with st.expander("Expand to see"):
            resources_component.app(
                lp.id,
                "Extracted Resources",
                lp.extracted_resources,
                ai_lp.extracted_resources,
                feedback.extracted_resources,
                on_save_lp_component=on_save_lp_component,
                on_save_feedback=on_save_feedback_for_component
            )
    
    if lp.additional_resources != None:
        st.subheader("Additional Resources")
        with st.expander("Expand to see"):
            resources_component.app(
                lp.id,
                "Additional Resources",
                lp.additional_resources,
                ai_lp.additional_resources,
                feedback.additional_resources,
                on_save_lp_component=on_save_lp_component,
                on_save_feedback=on_save_feedback_for_component
            )
    
    st.subheader("Feedback")
    if feedback.is_feedback_complete_for_all_required_components() and\
        feedback.complete_feedback.rating == -1:
        # Display the horizontal radio buttons
        selected_option = st.radio("Please provide feedback for complete lesson plan:", 
                                   [
                                        WELL_SUITED_FOR_CLASSROOM_FEEDBACK, 
                                        NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, 
                                        CANNOT_BE_USED_FEEDBACK
                                    ],
                                   key=lp.id + 'complete_feedback_radio',
                                   horizontal=True)
        message = ""
        needs_reasons = selected_option == CANNOT_BE_USED_FEEDBACK or selected_option == NEEDS_MINOR_ADJUSTMENTS_FEEDBACK
        
        if needs_reasons:
            message = st.text_input("Reasons", key = lp.id + 'complete_feedback_input')
        
        if st.button("Submit Feedback", key= lp.id + 'save_complete_feedback_button'):
            if needs_reasons and not message:
                st.error("Please provide a valid reason")
            else:
                feedback.complete_feedback.rating = get_score(selected_option)
                feedback.complete_feedback.comments = message
                on_save_feedback_for_component()
                st.rerun()
    elif not feedback.is_feedback_complete_for_all_required_components():
        st.write("Please provide Feedback for all of the above components")
    else:
        st.write(f"**Feedback Given:** {get_feedback_str(feedback.complete_feedback.rating)}")
        if feedback.complete_feedback.comments:
            st.write(f"**Reasons:** {feedback.complete_feedback.comments}")
    
    if lp.isCompletedEditing:
        st.success("Lesson Plan editing has completed!")
    else:
        if feedback.is_feedback_complete_for_all_required_components() and feedback.complete_feedback.rating != -1:
            if st.button("Click to complete lesson plan editing", type="primary"):
                lp.isCompletedEditing = True
                on_save_lp_component()
                st.rerun()
        
        
    
    # if is_editing_lo:
    #     edited_text = st.text_area("Learning Outcomes", label_visibility="hidden", 
    #                                value=lp.learningOutcomes.strip(), 
    #                                height=300)

    #     if st.button('Save Changes', type="primary"):
    #         st.write("Saving changes. Please wait here...")
    #         lp.learningOutcomes = edited_text
    #         lp.prompt_context["LEARNING_OUTCOMES"] = lp.learningOutcomes
    #         save_lp()
    #         st.write("Submitting request to generate Lesson plan...")
    #         regenerate_lp(lp=lp)
    #         st.write("Done. Taking you back...")
    #         exit_to_home()
    # else:
        # st.markdown(lp.learningOutcomes.strip().replace("\n", "<br>"), unsafe_allow_html=True)
    #     col1, col2, col3 = st.columns(3)
    #     with col1:
    #         if st.button("Edit Learning Outcomes", key="Choose to Edit LO"):
    #             SM.is_editing_lo.set(True)
    #             st.rerun()
    #     with col2:
    #         if st.button("View Lesson Plan", key="View LP button"):
    #             nav.set_current_page(edit_lp)
    #     if lp.is_chapter_lp:
    #         with col3:
    #             if st.button("View Resources", key="View Resources button"):
    #                 nav.set_current_page(edit_resources)
        
    #     # if total_mot_count > 1:
    #     #     preferred_method_of_teaching = st.radio("Choose a preferred method of teaching",
    #     #             options=[ mot_content.methodOfTeaching for mot_content in lp.instructionSet] )
    #     #     lp.preferredTeachingModel = preferred_method_of_teaching
        
    #     # with st.expander(ExpanderTitles.VIDEOS):
    #     #     st.write(lp.videos)
        
    #     # _, col, _ = st.columns([5,1,5])
    #     # with col:
    #     #     if st.button('< Go Back', key="go back last"):
    #     #         exit_to_home()
        
    
    



