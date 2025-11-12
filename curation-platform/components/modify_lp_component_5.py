from typing import Callable, List
import uuid
import streamlit as st
from data.data_models import FeedbackUnit, Instruction
from state_manager import StateManager as SM
from utils import CANNOT_BE_USED_FEEDBACK, NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, WELL_SUITED_FOR_CLASSROOM_FEEDBACK, clean_llm_response, get_feedback_str, get_score
    
def app(lp_id: str,
        component_name: str, 
        instruction: Instruction,
        instruction_ai: Instruction,
        feedback_unit: FeedbackUnit, 
        on_save_lp_component: Callable, 
        on_save_feedback: Callable, 
        text_area_height: int = 300):
    base_widget_key = lp_id + component_name
    is_editing_state_key = lp_id + component_name + 'isEditing'
    is_editing = st.session_state.get(is_editing_state_key, False)

    # FEEDBACK RATING BETWEEN (-1,3)  --> Allow edit
    has_feedback = feedback_unit.rating > -1
    
    if is_editing:
        st.info("After editing the text below, while the cursor is still inside the text area, \
            please hit `Ctrl + Enter` keys and then click on the `Save` button")
        
        edited_text = st.text_area("Edit here manually", label_visibility="hidden",
                                value=clean_llm_response(instruction.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'text_area')
        instruction.content = edited_text.strip()
        if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
            on_save_lp_component()
            st.session_state[is_editing_state_key] = False
            st.rerun()
    # Else (Not Provided feedback or Provided feedback is 3) --> Do not Allow edit
    else:
        disp_text = clean_llm_response(instruction.content)
        disp_text = disp_text.replace('\\n', '<br>').replace('\\"', '"')
        st.markdown(
            f'<div style="overflow-y: scroll; height: 300px; border: 1px solid black; padding: 20px; margin: 20px;">{disp_text}</div>', 
            unsafe_allow_html=True
        )
        if not is_editing and has_feedback:
            if st.button("Edit", key=base_widget_key + '_edit_button', type="secondary"):
                st.session_state[is_editing_state_key] = True
                st.rerun()
    
    # st.markdown(f"<div style='background-color: black;padding:1px;border-radius:1px;margin:1px 0;height:1px;'>", unsafe_allow_html=True)
    
    # FEEDBACK 
    if not has_feedback:
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
        needs_reasons = selected_option == CANNOT_BE_USED_FEEDBACK or selected_option == NEEDS_MINOR_ADJUSTMENTS_FEEDBACK
        
        if needs_reasons:
            message = st.text_input("Reasons", key = base_widget_key + 'feedback_message_input')
        
        if st.button("Submit Feedback", key= base_widget_key + 'save_feedback_button'):
            if needs_reasons and not message:
                st.error("Please provide a valid reason")
            else:
                feedback_unit.rating = get_score(selected_option)
                feedback_unit.comments = message
                on_save_feedback()
                st.rerun()
    else:
        if len(instruction_ai.content) > 0 and feedback_unit.rating > -1:
            if st.button("Show AI Generated Content and Feedback", key=base_widget_key + 'ai content feedback'):
                disp_text = clean_llm_response(instruction_ai.content)
                disp_text = disp_text.replace('\\n', '<br>').replace('\\"', '"')
                st.markdown(
                    f'<div style="overflow-y: scroll; height: 200px; border: 1px solid #ccc; padding: 10px;">{disp_text}</div>', 
                    unsafe_allow_html=True
                )
                st.write(f"**Feedback Given:** {get_feedback_str(feedback_unit.rating)}")
                if feedback_unit.comments:
                    st.write(f"**Reasons:** {feedback_unit.comments}")
        
    