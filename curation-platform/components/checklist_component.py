from typing import Callable
import streamlit as st
from data.data_models import Checklist, FeedbackUnit, InstructionsSet
from utils import CANNOT_BE_USED_FEEDBACK, NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, WELL_SUITED_FOR_CLASSROOM_FEEDBACK, clean_llm_response, get_feedback_str, get_score

def display_non_editable_content(checklist_ai: Checklist):
    disp_text = f"ENGAGE: <br>Activity: <br>{clean_llm_response(checklist_ai.ENGAGE.activity, replace_new_line=True)}\
        <br><br>Materials: <br>{clean_llm_response(checklist_ai.ENGAGE.materials, replace_new_line=True)}<br><br>"
    disp_text += f"EXPLORE: <br>Activity: <br>{clean_llm_response(checklist_ai.EXPLORE.activity, replace_new_line=True)}\
        <br><br>Materials: <br>{clean_llm_response(checklist_ai.EXPLORE.materials, replace_new_line=True)}<br><br>"
    disp_text += f"EXPLAIN: <br>Activity: <br>{clean_llm_response(checklist_ai.EXPLAIN.activity, replace_new_line=True)}\
        <br><br>Materials: <br>{clean_llm_response(checklist_ai.EXPLAIN.materials, replace_new_line=True)}<br><br>"
    disp_text += f"ELABORATE: <br>Activity: <br>{clean_llm_response(checklist_ai.ELABORATE.activity, replace_new_line=True)}\
        <br><br>Materials: <br>{clean_llm_response(checklist_ai.ELABORATE.materials, replace_new_line=True)}<br><br>"
    disp_text += f"EVALUATE: <br>Activity: <br>{clean_llm_response(checklist_ai.EVALUATE.activity, replace_new_line=True)}\
        <br><br>Materials: <br>{clean_llm_response(checklist_ai.EVALUATE.materials, replace_new_line=True)}<br><br>"
    
    st.markdown(
        f'<div style="overflow-y: scroll; height: 300px; border: 1px solid black; padding: 20px; margin: 20px;">{disp_text}</div>', 
        unsafe_allow_html=True
    )

def app(lp_id: str,
        component_name: str, 
        checklist: Checklist,
        checklist_ai: Checklist,
        feedback_unit: FeedbackUnit, 
        on_save_lp_component: Callable, 
        on_save_feedback: Callable, 
        text_area_height: int = 100):
    base_widget_key = lp_id + component_name
    is_editing_state_key = lp_id + component_name + 'isEditing'
    is_editing = st.session_state.get(is_editing_state_key, False) 

    # FEEDBACK RATING BETWEEN (-1,3)  --> Allow edit
    has_feedback = feedback_unit.rating != -1
    
    if is_editing:
        st.info("After editing the text below, while the cursor is still inside the text area, \
            please hit `Ctrl + Enter` keys and then click on the `Save` button")
        
        st.write("**Engage**")
        checklist.ENGAGE.activity = st.text_area("Activity",
                                value=clean_llm_response(checklist.ENGAGE.activity.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'engage_activity_checklist').strip()
        checklist.ENGAGE.materials = st.text_area("Materials",
                                value=clean_llm_response(checklist.ENGAGE.materials.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'engage_materials_checklist').strip()
        
        st.write("**Explore**")
        checklist.EXPLORE.activity = st.text_area("Activity",
                                value=clean_llm_response(checklist.EXPLORE.activity.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'explore_activity_checklist').strip()
        checklist.EXPLORE.materials = st.text_area("Materials",
                                value=clean_llm_response(checklist.EXPLORE.materials.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'explore_materials_checklist').strip()
        
        st.write("**Explain**")
        checklist.EXPLAIN.activity = st.text_area("Activity",
                                value=clean_llm_response(checklist.EXPLAIN.activity.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'explain_activity_checklist').strip()
        checklist.EXPLAIN.materials = st.text_area("Materials",
                                value=clean_llm_response(checklist.EXPLAIN.materials.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'explain_materials_checklist').strip()
        
        st.write("**Elaborate**")
        checklist.ELABORATE.activity = st.text_area("Activity",
                                value=clean_llm_response(checklist.ELABORATE.activity.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'elaborate_activity_checklist').strip()
        checklist.ELABORATE.materials = st.text_area("Materials",
                                value=clean_llm_response(checklist.ELABORATE.materials.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'elaborate_materials_checklist').strip()
        
        st.write("**Evaluate**")
        checklist.EVALUATE.activity = st.text_area("Activity",
                                value=clean_llm_response(checklist.EVALUATE.activity.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'eval_activity_checklist').strip()
        checklist.EVALUATE.materials = st.text_area("Materials",
                                value=clean_llm_response(checklist.EVALUATE.materials.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'eval_materials_checklist').strip()
        
        if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
            on_save_lp_component()
            st.session_state[is_editing_state_key] = False
            st.write("Changes saved.")
            st.rerun()
    # Else (Not Provided feedback or Provided feedback is 3) --> Do not Allow edit
    else:
        display_non_editable_content(checklist)
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
            display_non_editable_content(checklist_ai)
            st.write(f"**Feedback Given:** {get_feedback_str(feedback_unit.rating)}")
            if feedback_unit.comments:
                st.write(f"**Reasons:** {feedback_unit.comments}")
    
