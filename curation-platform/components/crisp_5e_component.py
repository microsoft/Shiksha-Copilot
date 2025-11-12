from typing import Callable
import streamlit as st
from data.data_models import FeedbackUnit, InstructionsSet
from utils import CANNOT_BE_USED_FEEDBACK, NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, WELL_SUITED_FOR_CLASSROOM_FEEDBACK, clean_llm_response, get_feedback_str, get_score

def display_non_editable_content(instruction_set_ai: InstructionsSet):
    disp_text = f"ENGAGE: <br> {clean_llm_response(instruction_set_ai.engage.content, replace_new_line=True)}<br><br>"
    disp_text += f"EXPLORE: <br> {clean_llm_response(instruction_set_ai.explore.content, replace_new_line=True)}<br><br>"
    disp_text += f"EXPLAIN: <br> {clean_llm_response(instruction_set_ai.explain.content, replace_new_line=True)}<br><br>"
    disp_text += f"ELABORATE: <br> {clean_llm_response(instruction_set_ai.elaborate.content, replace_new_line=True)}<br><br>"
    disp_text += f"EVALUATE: <br> {clean_llm_response(instruction_set_ai.evaluate.content, replace_new_line=True)}<br><br>"
    
    st.markdown(
        f'<div style="overflow-y: scroll; height: 300px; border: 1px solid black; padding: 20px; margin: 20px;">{disp_text}</div>', 
        unsafe_allow_html=True
    )
     
def app(lp_id: str, 
        instruction_set: InstructionsSet,
        instruction_set_ai: InstructionsSet,
        feedback_unit: FeedbackUnit, 
        on_save_lp_component: Callable, 
        on_save_feedback: Callable, 
        text_area_height: int = 200):
    base_widget_key = lp_id + str(instruction_set) + str(feedback_unit) 
    is_editing_state_key = lp_id + str(instruction_set) + 'isEditing'
    is_editing = st.session_state.get(is_editing_state_key, False) 

    # FEEDBACK RATING BETWEEN (-1,3)  --> Allow edit
    has_feedback = feedback_unit.rating != -1
    
    if is_editing:
        st.info("After editing the text below, while the cursor is still inside the text area, \
            please hit `Ctrl + Enter` keys and then click on the `Save` button")
        
        edited_text_engage = st.text_area("Engage",
                                value=clean_llm_response(instruction_set.engage.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'engage_text_area')
        edited_text_explore = st.text_area("Explore",
                                value=clean_llm_response(instruction_set.explore.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'explore_text_area')
        edited_text_explain = st.text_area("Explain",
                                value=clean_llm_response(instruction_set.explain.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'explain_text_area')
        edited_text_elaborate = st.text_area("Elaborate",
                                value=clean_llm_response(instruction_set.elaborate.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'elaborate_text_area')
        edited_text_evaluate = st.text_area("Evaluate",
                                value=clean_llm_response(instruction_set.evaluate.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'evauate_text_area')
        
        instruction_set.engage.content = edited_text_engage.strip()
        instruction_set.explore.content = edited_text_explore.strip()
        instruction_set.explain.content = edited_text_explain.strip()
        instruction_set.elaborate.content = edited_text_elaborate.strip()
        instruction_set.evaluate.content = edited_text_evaluate.strip()
        
        if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
            on_save_lp_component()
            st.session_state[is_editing_state_key] = False
            st.write("Changes saved.")
            st.rerun()
    # Else (Not Provided feedback or Provided feedback is 3) --> Do not Allow edit
    else:
        display_non_editable_content(instruction_set)
        if not is_editing and has_feedback:
            if st.button("Edit", key=base_widget_key + '_edit_button', type="secondary"):
                st.session_state[is_editing_state_key] = True
                st.rerun()
    
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
        if st.button("Show AI Generated Content and Feedback", key=base_widget_key + 'ai content feedback'):
            display_non_editable_content(instruction_set_ai)
            st.write(f"**Feedback Given:** {get_feedback_str(feedback_unit.rating)}")
            if feedback_unit.comments:
                st.write(f"**Reasons:** {feedback_unit.comments}")
    
