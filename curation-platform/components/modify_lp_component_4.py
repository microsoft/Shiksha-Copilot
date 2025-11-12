from typing import Callable, List
import uuid
from data.api import regenerate
from data.models import Feedback, Instruction, InstructionDetail
import streamlit as st
from state_manager import StateManager as SM

WELL_SUITED_FOR_CLASSROOM_FEEDBACK = "Well suited for classroom use"
NEEDS_MINOR_ADJUSTMENTS_FEEDBACK = "Needs minor adjustments"
CANNOT_BE_USED_FEEDBACK = "Cannot be used in classroom"
PREVIOUS_COMPONENT_WAS_FLAGGED = f"One of the previous components have been rated `{CANNOT_BE_USED_FEEDBACK}`"

def get_score(feedback_str) -> int:
    if feedback_str == WELL_SUITED_FOR_CLASSROOM_FEEDBACK:
        return 1
    elif feedback_str == NEEDS_MINOR_ADJUSTMENTS_FEEDBACK:
        return 2
    else:
        return 3

def get_feedback_str(score) -> str:
    if score == 1:
        return WELL_SUITED_FOR_CLASSROOM_FEEDBACK
    elif score == 2:
        return NEEDS_MINOR_ADJUSTMENTS_FEEDBACK
    elif score == 3:
        return CANNOT_BE_USED_FEEDBACK
    else:
        return PREVIOUS_COMPONENT_WAS_FLAGGED
    
def app(method_of_teaching: str, 
        instruction_details: InstructionDetail,
        feedback_details: Feedback, 
        on_save_lp_component: Callable, 
        on_save_feedback: Callable, 
        text_area_height: int = 300,
        is_flagged_for_no_usage: bool = False,
        instruction_name: str = ""):
    if instruction_name:
        st.subheader(instruction_name)
    base_widget_key = method_of_teaching + str(instruction_details) + str(feedback_details)
    original_text = instruction_details.main.strip()
    value = original_text
    
    # FEEDBACK RATING BETWEEN (-1,3) AND CURRENT MOT IS NOT FLAGGED FOR NO USAGE --> Allow edit
    show_text_area = feedback_details.rating > -1 and feedback_details.rating < 3 and not is_flagged_for_no_usage
    
    if show_text_area:
        st.info("After editing the text below, while the cursor is still inside the text area, \
            please hit `Ctrl + Enter` keys and then click on the `Save` button")
        
        edited_text = st.text_area("Edit here manually", label_visibility="hidden",
                                value=value, 
                                height=text_area_height,
                                key = base_widget_key + 'text_area')
        instruction_details.main = edited_text.strip()
        if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
            on_save_lp_component()
            st.write("Changes saved.")
    # Else (Not Provided feedback or Provided feedback is 3) --> Do not Allow edit
    else:
        edited_text = value
        disp_text = value.replace("\n", "<br>")
        st.markdown(
            f'<div style="overflow-y: scroll; height: 300px; border: 1px solid black; padding: 20px; margin: 20px;">{disp_text}</div>', 
            unsafe_allow_html=True
        )
    
    # st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
    
    # FEEDBACK 
    has_no_feedback = feedback_details.rating == -1 and not is_flagged_for_no_usage
    if has_no_feedback:
        # Display the horizontal radio buttons
        selected_option = st.radio("Please provide feedback:", 
                                   [
                                        WELL_SUITED_FOR_CLASSROOM_FEEDBACK, 
                                        NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, 
                                        CANNOT_BE_USED_FEEDBACK
                                    ],
                                   key=base_widget_key + 'feedback_radio',
                                   horizontal=True)
        message = ""
        
        if selected_option == CANNOT_BE_USED_FEEDBACK:
            message = st.text_input("Reasons", key = base_widget_key + 'feedback_message_input')
        
        if st.button("Submit Feedback", key= base_widget_key + 'save_feedback_button'):
            if selected_option == CANNOT_BE_USED_FEEDBACK and not message:
                st.error("Please provide a valid reason")
            else:
                feedback_details.rating = get_score(selected_option)
                feedback_details.message = message
                on_save_feedback()
                if selected_option == CANNOT_BE_USED_FEEDBACK:
                    if SM.current_phase_index.get() and SM.current_mot_index.get():
                        SM.current_phase_index.set(0)
                        SM.current_mot_index.set(SM.current_mot_index.get() + 1)
                st.rerun()
    else:
        if len(instruction_details.ai) > 0 and feedback_details.rating > -1:
            if st.button("Show AI Generated Content and Feedback", key=base_widget_key + 'ai content feedback'):
                st.markdown(
                    f'<div style="overflow-y: scroll; height: 200px; border: 1px solid #ccc; padding: 10px;">{instruction_details.ai}</div>', 
                    unsafe_allow_html=True
                )
                st.write(f"**Feedback Given:** {get_feedback_str(feedback_details.rating)}")
                if feedback_details.message:
                    st.write(f"**Reasons:** {feedback_details.message}")
        
    