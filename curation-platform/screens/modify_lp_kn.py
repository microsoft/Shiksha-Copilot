from copy import deepcopy
import streamlit as st
from data.api_v2 import fetch_eng_lp_for_kn_lp, save_kn_lp
from data.chapter_lo_subtopic_models import UserRoleEnum
from data.data_models import LPLevel
from state_manager import StateManager as SM
from components import modify_lp_kn_component, modify_lp_kn_list_item_component, checklist_component_kn, resources_component_kn
from navigation import Navigation as nav
from screens import edit_lp_list_kn
import pandas as pd

import streamlit as st

from utils import extract_curr_details, highlight_differences, timestamp_to_ist
    
def go_back():
    SM.chosen_lp_kn.delete()
    SM.chosen_lp_kn_eng.delete()
    SM.lp_list_kn.delete()
    SM.unedited_lp_list_kn.delete()
    SM.edited_lp_list_kn.delete()
    nav.set_current_page_edit_lp_kn(edit_lp_list_kn)
    
def app():
    if st.button('< Go Back', key="go back first"):
        go_back()
        
    st.header("Modify Lesson Plan Content", divider="grey")        
    lp = SM.chosen_lp_kn.get()
    unedited_kn_lp = None
    for unedited_lp in SM.unedited_lp_list_kn.get():
        if lp.id == unedited_lp.id:
            unedited_kn_lp = unedited_lp
            
    eng_lp = SM.chosen_lp_kn_eng.get()
    if eng_lp == None:
        with st.spinner("Fetching English LP details..."):
            eng_lp = fetch_eng_lp_for_kn_lp(lp.id)
        SM.chosen_lp_kn_eng.set(eng_lp)
    
    def on_save_lp_component():
        with st.spinner("Saving Lesson Plan..."):
            save_kn_lp(lp=lp, user_id=SM.user.get().id)
        st.write("Changes saved.")
    
    user = SM.user.get()
    if user.role == UserRoleEnum.ADMIN and lp.isCompletedEditing:
        with st.expander("Visualize Changes"):
            result_lp_diff = highlight_differences(unedited_kn_lp.__str__(newline_char="<br>"), lp.__str__(newline_char="<br>"))
            st.markdown(result_lp_diff, unsafe_allow_html=True)
    
    curriculum_info = extract_curr_details(lp.chapter_id)
    selected_columns = {
        'Medium': "kannada",
        'Grade': curriculum_info.grade,
        'Subject': curriculum_info.subject,
        'Chapter': curriculum_info.chapter_title,
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
    
    st.subheader("Lesson Plan")
    instruction_set = lp.instruction_set if lp.lp_level == LPLevel.CHAPTER.value else lp.crisp_instruction_set
    instruction_set_eng = eng_lp.instruction_set if lp.lp_level == LPLevel.CHAPTER.value else eng_lp.crisp_instruction_set

    with st.expander("Subtopics"):
        modify_lp_kn_list_item_component.app(
            lp.id,
            "Subtopics",
            lp.subtopics,
            eng_lp.subtopics,
            on_save_lp_component,
        )

    with st.expander("Learning Outcomes"):
        modify_lp_kn_list_item_component.app(
            lp.id,
            "Learning Outcomes",
            lp.learning_outcomes,
            eng_lp.learning_outcomes,
            on_save_lp_component,
        )
    
    with st.expander("Engage"):
        modify_lp_kn_component.app(
            lp.id,
            "Engage",
            instruction_set.engage,
            instruction_set_eng.engage,
            on_save_lp_component,
        )
    with st.expander("Explore"):
        modify_lp_kn_component.app(
            lp.id,
            "Explore",
            instruction_set.explore,
            instruction_set_eng.explore,
            on_save_lp_component,
        )
    with st.expander("Explain"):
        modify_lp_kn_component.app(
            lp.id,
            "Explain",
            instruction_set.explain,
            instruction_set_eng.explain,
            on_save_lp_component,
        )
    with st.expander("Elaborate"):
        modify_lp_kn_component.app(
            lp.id,
            "Elaborate",
            instruction_set.elaborate,
            instruction_set_eng.elaborate,
            on_save_lp_component,
        )
    with st.expander("Evaluate"):
        modify_lp_kn_component.app(
            lp.id,
            "Evaluate",
            instruction_set.evaluate,
            instruction_set_eng.evaluate,
            on_save_lp_component,
        )
    
    st.subheader("Checklist")
    with st.expander("Expand to see"):
        checklist_component_kn.app(
            lp.id,
            checklist=lp.checklist,
            checklist_eng=eng_lp.checklist,
            on_save_lp_component=on_save_lp_component
        )
    
    if lp.extracted_resources != None:
        st.subheader("Extracted Resources")
        with st.expander("Expand to see"):
            resources_component_kn.app(
                lp.id,
                "Extracted Resources",
                lp.extracted_resources,
                eng_lp.extracted_resources,
                on_save_lp_component=on_save_lp_component
            )
    
    if lp.additional_resources != None:
        st.subheader("Additional Resources")
        with st.expander("Expand to see"):
            resources_component_kn.app(
                lp.id,
                "Additional Resources",
                lp.additional_resources,
                eng_lp.additional_resources,
                on_save_lp_component=on_save_lp_component
            )
    
    if lp.isCompletedEditing:
        st.success("Lesson Plan editing has completed!")
    else:
        st.subheader("Completed Editing the Lesson Plan?")
        if st.button("Click here to mark it completed", type="primary"):
            lp.isCompletedEditing = True
            on_save_lp_component()
            st.rerun()
    
    # st.subheader("Feedback")
    # if feedback.is_feedback_complete_for_all_required_components() and\
    #     feedback.complete_feedback.rating == -1:
    #     # Display the horizontal radio buttons
    #     selected_option = st.radio("Please provide feedback for complete lesson plan:", 
    #                                [
    #                                     WELL_SUITED_FOR_CLASSROOM_FEEDBACK, 
    #                                     NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, 
    #                                     CANNOT_BE_USED_FEEDBACK
    #                                 ],
    #                                key=lp.id + 'complete_feedback_radio',
    #                                horizontal=True)
    #     message = ""
    #     needs_reasons = selected_option == CANNOT_BE_USED_FEEDBACK or selected_option == NEEDS_MINOR_ADJUSTMENTS_FEEDBACK
        
    #     if needs_reasons:
    #         message = st.text_input("Reasons", key = lp.id + 'complete_feedback_input')
        
    #     if st.button("Submit Feedback", key= lp.id + 'save_complete_feedback_button'):
    #         if needs_reasons and not message:
    #             st.error("Please provide a valid reason")
    #         else:
    #             feedback.complete_feedback.rating = get_score(selected_option)
    #             feedback.complete_feedback.comments = message
    #             on_save_feedback_for_component()
    #             st.rerun()
    # elif not feedback.is_feedback_complete_for_all_required_components():
    #     st.write("Please provide Feedback for all of the above components")
    # else:
    #     st.write(f"**Feedback Given:** {get_feedback_str(feedback.complete_feedback.rating)}")
    #     if feedback.complete_feedback.comments:
    #         st.write(f"**Reasons:** {feedback.complete_feedback.comments}")
    
    
        
        
    
    



