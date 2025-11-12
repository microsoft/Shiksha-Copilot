from typing import Callable, Dict
from pydantic import BaseModel
import streamlit as st
from data.data_models import FeedbackUnit, InstructionsSet, QuestionBankMCQsAndAssessment, RealWorldScenario, Resources
from utils import CANNOT_BE_USED_FEEDBACK, NEEDS_MINOR_ADJUSTMENTS_FEEDBACK, WELL_SUITED_FOR_CLASSROOM_FEEDBACK, clean_llm_response, get_feedback_str, get_score

def display_non_editable_content(resource: Resources) -> str:
    st.subheader("Activities")
    for activity_name, activity in resource.activities.items():
        st.subheader(activity_name)
        st.markdown(f"**Title:** {clean_llm_response(activity.title)}")
        st.markdown(f"**Preparation:** {clean_llm_response(activity.preparation)}")
        st.markdown(f"**Required Materials:** {clean_llm_response(activity.required_materials)}")
        st.markdown(f"**Obtaining Materials:** {clean_llm_response(activity.obtaining_materials)}")
        st.markdown(f"**Recap:** {clean_llm_response(activity.recap)}")

    st.subheader("Question Bank")
    for level_name, question_bank in resource.questionbank.__dict__.items():
        st.subheader(f"{level_name.capitalize()} Level")
        st.markdown("**MCQs**")
        for mcq in question_bank.MCQs.content:
            st.markdown(f"- **Question:** {clean_llm_response(mcq.question)}")
            st.markdown(f"  - **Options:** {', '.join(mcq.options)}")
        st.markdown("**Assessment**")
        for assessment in question_bank.assessment.content:
            st.markdown(f"- **Question:** {clean_llm_response(assessment.question)}")

    st.subheader("Real World Scenarios")
    for level_name, scenarios in resource.realworldscenarios.__dict__.items():
        st.subheader(f"{level_name.capitalize()} Level")
        for scenario_name, scenario in scenarios.items():
            st.markdown(f"**{scenario_name}**")
            st.markdown(f"- **Title:** {clean_llm_response(scenario.title)}")
            st.markdown(f"- **Description:** {clean_llm_response(scenario.scenario.description)}")
            st.markdown(f"- **Question:** {clean_llm_response(scenario.scenario.question)}")
    

def display_editable_realworldscenario(diff_level_str, rwscenario_dict: Dict[str, RealWorldScenario], base_widget_key: str = ""):
    base_rw_scneario_key = "Real World Scenarios"
    st.write(f"**{diff_level_str}**")
    for topic, rwscenario in rwscenario_dict.items():
        st.write(topic)
        rwscenario.title = st.text_area(f"Title",
                        value=clean_llm_response(rwscenario.title.strip()), 
                        height=5,
                        key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.title.strip() +'RWScenarioTitle').strip()
        
        rwscenario.scenario.description = st.text_area(f"Description",
                        value=clean_llm_response(rwscenario.scenario.description.strip()), 
                        height=5,
                        key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.scenario.description.strip() + 'RWScenarioDescription').strip()
        
        rwscenario.scenario.question = st.text_area(f"Question",
                        value=clean_llm_response(rwscenario.scenario.question.strip()), 
                        height=5,
                        key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.scenario.question.strip() + 'RWScenarioQuestion').strip()
    

def display_editable_question_bank(diff_level_str: str, mcq_assessment_obj: QuestionBankMCQsAndAssessment, base_widget_key: str = ""):
    base_ques_bank_key = "Question Bank"
    st.write(f"**{diff_level_str}**")
    st.write("**MCQs**")
    for question_index, mcq in enumerate(mcq_assessment_obj.MCQs.content):
        mcq.question = st.text_area(f"Question {question_index + 1}",
                    value=clean_llm_response(mcq.question.strip()), 
                    height=10,
                    key = base_widget_key + base_ques_bank_key + diff_level_str + str(question_index) + 'MCQQuestion').strip()
        cols = st.columns(len(mcq.options))
        for option_index, option in enumerate(mcq.options):
            with cols[option_index]:
                mcq.options[option_index] = st.text_area(f"Option {option_index + 1}",
                                                        value=clean_llm_response(option.strip()), 
                                                        height=5,
                                                        key = base_widget_key + base_ques_bank_key + diff_level_str + str(question_index) + str(option_index) + 'MCQOption').strip()
                
    st.write("**Assessments**")
    for assessment_question_index, assessment_question in enumerate(mcq_assessment_obj.assessment.content):
        assessment_question.question = st.text_area(f"Question {assessment_question_index + 1}",
                                                        value=clean_llm_response(assessment_question.question.strip()), 
                                                        height=5,
                                                        key = base_widget_key + base_ques_bank_key + diff_level_str + str(assessment_question_index) + 'AssessmentQuestion').strip()
            
def app(lp_id: str,
        component_name: str, 
        resources: Resources,
        resources_ai: Resources,
        feedback_unit: FeedbackUnit, 
        on_save_lp_component: Callable, 
        on_save_feedback: Callable, 
        text_area_height: int = 200):
    base_widget_key = lp_id + component_name
    is_editing_state_key = lp_id + component_name + 'isEditing'
    is_editing = st.session_state.get(is_editing_state_key, False) 

    # FEEDBACK RATING BETWEEN (-1,3)  --> Allow edit
    has_feedback = feedback_unit.rating != -1
    
    if is_editing:
        st.info("After editing the text below, while the cursor is still inside the text area, \
            please hit `Ctrl + Enter` keys and then click on the `Save` button")
        
        st.subheader("Activities")
        for activity_name, activity in resources.activities.items():
            st.write(f"**{activity_name}**")
            base_activity_key = lp_id + 'activities' + activity_name
            activity.title = st.text_area("Title",
                        value=clean_llm_response(activity.title.strip()), 
                        height=10,
                        key = base_widget_key + base_activity_key + 'Title').strip()
            activity.preparation = st.text_area("Preparation",
                        value=clean_llm_response(activity.preparation.strip()), 
                        height=20,
                        key = base_widget_key + base_activity_key + 'Preparation').strip()
            activity.required_materials = st.text_area("Required Materials",
                        value=clean_llm_response(activity.required_materials.strip()), 
                        height=20,
                        key = base_widget_key + base_activity_key + 'Required Materials').strip()
            activity.obtaining_materials = st.text_area("Obtaining Materials",
                        value=clean_llm_response(activity.obtaining_materials.strip()), 
                        height=20,
                        key = base_widget_key + base_activity_key + 'Obtaining Materials').strip()
            activity.recap = st.text_area("Recap",
                        value=clean_llm_response(activity.recap.strip()), 
                        height=20,
                        key = base_widget_key + base_activity_key + 'Recap').strip()
        
        st.subheader("Question Bank")
        display_editable_question_bank("Beginner", resources.questionbank.beginner, base_widget_key)
        display_editable_question_bank("Intermediate", resources.questionbank.intermediate, base_widget_key)
        display_editable_question_bank("Advanced", resources.questionbank.advanced, base_widget_key)
        
        st.subheader("Real world Scenarios")
        display_editable_realworldscenario("Beginner", resources.realworldscenarios.beginner, base_widget_key)
        display_editable_realworldscenario("Intermediate", resources.realworldscenarios.intermediate, base_widget_key)
        display_editable_realworldscenario("Advanced", resources.realworldscenarios.advanced, base_widget_key)
        
        if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
            on_save_lp_component()
            st.session_state[is_editing_state_key] = False
            st.write("Changes saved.")
            st.rerun()
    # Else (Not Provided feedback or Provided feedback is 3) --> Do not Allow edit
    else:
        display_non_editable_content(resources)
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
            display_non_editable_content(resources_ai)
            st.write(f"**Feedback Given:** {get_feedback_str(feedback_unit.rating)}")
            if feedback_unit.comments:
                st.write(f"**Reasons:** {feedback_unit.comments}")
    
