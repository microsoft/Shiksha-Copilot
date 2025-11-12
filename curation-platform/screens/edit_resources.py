from copy import deepcopy
from dataclasses import fields
import streamlit as st
from data.api import fetch_lp_v2_by_id, save_lp_v2, save_lp_v2_to_not_edited
from data.models import Feedback, InstructionSetV2, LessonPlanV2, MethodOfTeachingLP
from state_manager import StateManager as SM
from components import modify_lp_component_4 as modify_lp_component
from screens import modify_lp_v3 as modify_lp
from navigation import Navigation as nav

def get_resource_name(mot_name: str):
    if mot_name == "handsonactivity":
        return "Hands-on Activity"
    elif mot_name == "questionbank":
        return "Question Bank"
    elif mot_name == "realworldscenario":
        return "Real World Example"
    return "Miscellaneous"

def go_back():
    SM.finished_lp_edits.delete()
    SM.current_mot_index.delete()
    SM.current_phase_index.delete()
    SM.has_chosen_preferred_teaching_model.delete()
    nav.set_current_page(modify_lp)

def app():
    if st.button('< Go Back', key="go back to LO Edit"):
        go_back()
    
    st.header("Edit Lesson Resources", divider="grey")
    
    lp_item = SM.chosen_lp_item.get()
    lp: LessonPlanV2 = SM.current_lp_v2.get()
    feedback_lp: LessonPlanV2 = SM.current_lp_v2_feedback.get()
    
    if not lp:
        lp = fetch_lp_v2_by_id(lp_item.id)
        SM.current_lp_v2.set(lp)
    if not feedback_lp:
        feedback_lp = deepcopy(lp)
        SM.current_lp_v2_feedback.set(feedback_lp)
        
    # UTILITY FUNCTIONS TO SAVE LP EDITS AND FEEDBACKS
    def save_lp():
        save_lp_v2(lp)
    
    def save_feedback_lp():
        save_lp_v2_to_not_edited(feedback_lp)
    
    with st.expander("Learning Outcomes", expanded=False):
        st.write(lp.learningOutcomes.strip())
    
    # st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
    
    for index, edit_resource in enumerate(lp.resources):
        feedback_resource = feedback_lp.resources[index]
        no_usage_flag = "`Cannot be used in classroom`" if feedback_resource.feedback.rating == 3 else ""
        with st.expander(get_resource_name(edit_resource.methodOfTeaching) + " " + no_usage_flag, 
                         expanded=False):
            modify_lp_component.app(
                method_of_teaching=edit_resource.methodOfTeaching,
                instruction_details=edit_resource.content,
                feedback_details=feedback_resource.feedback,
                on_save_lp_component=save_lp,
                on_save_feedback=save_feedback_lp
            )
    