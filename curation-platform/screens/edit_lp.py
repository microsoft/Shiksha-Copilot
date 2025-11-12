from copy import deepcopy
from dataclasses import fields
import streamlit as st
from data.api import fetch_lp_v2_by_id, save_lp_v2, save_lp_v2_to_not_edited
from data.models import Feedback, InstructionSetV2, LessonPlanV2, MethodOfTeachingLP
from state_manager import StateManager as SM
from components import modify_lp_component_4 as modify_lp_component
from screens import modify_lp_v3 as modify_lp
from navigation import Navigation as nav

    
def go_back():
    SM.finished_lp_edits.delete()
    SM.current_mot_index.delete()
    SM.current_phase_index.delete()
    SM.has_chosen_preferred_teaching_model.delete()
    nav.set_current_page(modify_lp)

def get_first_incomplete_feedback_index(motLP: MethodOfTeachingLP) -> int:
    instructions_v2 = motLP.instructions
    for index, phase in enumerate(fields(InstructionSetV2)):
        # phase = "engage"
        instruction_detail_v2 = getattr(instructions_v2, phase.name)
        feedback: Feedback = instruction_detail_v2.feedback
        if feedback.rating == -1:
            return index
    return len(fields(InstructionSetV2))

def get_has_missing_feedback(motLP: MethodOfTeachingLP) -> bool:
    instructions_v2 = motLP.instructions
    for phase in fields(InstructionSetV2):
        # phase = "engage"
        instruction_detail_v2 = getattr(instructions_v2, phase.name)
        feedback: Feedback = instruction_detail_v2.feedback
        if feedback.rating == -1:
            return True
    return False

def get_is_flagged_for_no_usage(motLP: MethodOfTeachingLP) -> bool:
    instructions_v2 = motLP.instructions
    for phase in fields(InstructionSetV2):
        # phase = "engage"
        instruction_detail_v2 = getattr(instructions_v2, phase.name)
        feedback: Feedback = instruction_detail_v2.feedback
        if feedback.rating == 3:
            return True
    return False

def app():
    if st.button('< Go Back', key="go back to LO Edit"):
        go_back()
    
    st.header("Edit Lesson Plan", divider="grey")
    
    lp_item = SM.chosen_lp_item.get()
    lp: LessonPlanV2 = SM.current_lp_v2.get()
    feedback_lp: LessonPlanV2 = SM.current_lp_v2_feedback.get()
    has_chosen_preferred_teaching_model = SM.has_chosen_preferred_teaching_model.get_or_set(lp.preferredTeachingModel != "")
    
    if not lp:
        lp = fetch_lp_v2_by_id(lp_item.id)
        SM.current_lp_v2.set(lp)
    if not feedback_lp:
        feedback_lp = deepcopy(lp)
        SM.current_lp_v2_feedback.set(feedback_lp)
    
    # INIT CURRENT PHASE INDEX WITH FIRST NO-FEEDBACK COMPONENT FROM EITHER MOT
    current_phase_index = SM.current_phase_index.get()
    current_mot_index = SM.current_mot_index.get()
    if current_phase_index == None: 
        for mot_index, mot in enumerate(feedback_lp.instructionSet):
            if get_has_missing_feedback(mot):
                current_mot_index = mot_index
                SM.current_mot_index.set(current_mot_index)
                
                first_index = get_first_incomplete_feedback_index(mot)
                SM.current_phase_index.set(first_index)
                current_phase_index = first_index
                
                break
    if current_phase_index == None:
        current_phase_index = 5
        SM.current_phase_index.set(current_phase_index)
    if current_mot_index == None:
        current_mot_index = len(feedback_lp.instructionSet) - 1
        SM.current_mot_index.set(current_mot_index)
    
    # FINISHED LP EDIT BOOL
    finished_lp_edits = SM.finished_lp_edits.get()
    if finished_lp_edits == None:
        finished_lp_edits = True
        for mot in feedback_lp.instructionSet:
            if get_has_missing_feedback(mot):
                finished_lp_edits = False
                break
        SM.finished_lp_edits.set(finished_lp_edits)
    
    # UTILITY FUNCTIONS TO SAVE LP EDITS AND FEEDBACKS
    def save_lp():
        save_lp_v2(lp)
    
    def save_feedback_lp():
        save_lp_v2_to_not_edited(feedback_lp)
    
    with st.expander("Learning Outcomes", expanded=False):
        st.write(lp.learningOutcomes.strip())
    
    # st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
    
    mot_with_incomplete_feedback_exists = False
    for index in range(current_mot_index + 1):
        mot = lp.instructionSet[index]
        feedback_content = feedback_lp.instructionSet[index]
        
        if get_is_flagged_for_no_usage(feedback_content):
            # THIS MOT HAS BEEN FLAGGED AS "CANNOT BE USED IN CLASSROOM". No further edits will be allowed now.
            with st.expander(f"**{mot.methodOfTeaching}** : `{modify_lp_component.CANNOT_BE_USED_FEEDBACK}`", 
                             expanded = False):
                for field in fields(mot.instructions):
                    instruction_details_v2 = getattr(mot.instructions, field.name)
                    feedback_instruction_details_v2 = getattr(feedback_content.instructions, field.name)
                    st.subheader(field.name.upper())
                    modify_lp_component.app(
                        is_flagged_for_no_usage=True,
                        method_of_teaching=mot.methodOfTeaching,
                        instruction_details=instruction_details_v2.instructions,
                        feedback_details=feedback_instruction_details_v2.feedback,
                        on_save_lp_component=save_lp,
                        on_save_feedback=save_feedback_lp
                    )
        else:
            st.subheader(mot.methodOfTeaching)
            has_missing_feedback = get_has_missing_feedback(feedback_content)
            if not has_missing_feedback and (index < current_mot_index or finished_lp_edits):
                # COMPLETED FEEDBACK FOR THIS MOT
                with st.expander("LP Content", expanded=False):
                    for field in fields(mot.instructions):
                        instruction_details_v2 = getattr(mot.instructions, field.name)
                        feedback_instruction_details_v2 = getattr(feedback_content.instructions, field.name)
                        feedback_details: Feedback = feedback_instruction_details_v2.feedback
                        modify_lp_component.app(
                            method_of_teaching=mot.methodOfTeaching,
                            instruction_details=instruction_details_v2.instructions,
                            feedback_details=feedback_details,
                            on_save_lp_component=save_lp,
                            on_save_feedback=save_feedback_lp,
                            instruction_name=field.name.upper()
                        )
                        if feedback_details.rating == -1:
                            break
            else:
                # INCOMPLETE FEEDBACK FOR THIS MOT OR EVALUATE FEEDBACK HAS JUST BEEN GIVEN
                mot_with_incomplete_feedback_exists = True
                for phase_index, field in enumerate(fields(mot.instructions)):
                    if phase_index <= current_phase_index:
                        instruction_details_v2 = getattr(mot.instructions, field.name)
                        feedback_instruction_details_v2 = getattr(feedback_content.instructions, field.name)
                        feedback_details: Feedback = feedback_instruction_details_v2.feedback
                        with st.expander(field.name.upper(), expanded = phase_index == current_phase_index):
                            modify_lp_component.app(
                                method_of_teaching=mot.methodOfTeaching,
                                instruction_details=instruction_details_v2.instructions,
                                feedback_details=feedback_details,
                                on_save_lp_component=save_lp,
                                on_save_feedback=save_feedback_lp
                            )
                current_phase_feedback: Feedback = getattr(feedback_content.instructions, fields(mot.instructions)[current_phase_index].name).feedback
                if current_phase_feedback.rating != -1:
                    if st.button("Next >"):
                        current_phase_index = (current_phase_index + 1) % 5
                        SM.current_phase_index.set(current_phase_index)
                        
                        if current_phase_index == 0:
                            current_mot_index = current_mot_index + 1
                            if current_mot_index < len(lp.instructionSet):
                                SM.current_mot_index.set(current_mot_index)
                            else:
                                finished_lp_edits = True
                                SM.finished_lp_edits.set(finished_lp_edits)
                            
                        st.rerun()
                    
                break
            
    # st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)       
    
    options = []
    for mot in feedback_lp.instructionSet:
        if not get_is_flagged_for_no_usage(mot) and not get_has_missing_feedback(mot):
            options.append(mot.methodOfTeaching)
    
    if not mot_with_incomplete_feedback_exists:
        with st.expander("**Preferred Teaching model selection**", expanded=not has_chosen_preferred_teaching_model):
            if len(options) > 0:
                if len(options) == 1:
                    lp.preferredTeachingModel = options[0]
                    has_chosen_preferred_teaching_model = True
                    SM.has_chosen_preferred_teaching_model.set(has_chosen_preferred_teaching_model)
                if lp.preferredTeachingModel:
                    st.write(f"**Chosen teaching model:** {lp.preferredTeachingModel}")
                if len(options) > 1:
                    initial_radio_index = 0
                    if lp.preferredTeachingModel:
                        initial_radio_index = options.index(lp.preferredTeachingModel)
                    
                    chosen_model = st.radio("", options, index=initial_radio_index, horizontal=True, label_visibility="hidden")
                    if st.button("Submit Selection"):
                        lp.preferredTeachingModel = chosen_model
                        has_chosen_preferred_teaching_model = True
                        SM.has_chosen_preferred_teaching_model.set(has_chosen_preferred_teaching_model)
                        save_lp()
                        st.rerun()
            else:
                st.write("No teaching model can be chosen")
                
    