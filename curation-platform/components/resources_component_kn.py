from copy import deepcopy
from typing import Callable, Dict
from pydantic import BaseModel
import streamlit as st
from data.copy_data import update_pydantic_model
from data.data_models import Activity, QuestionBankMCQsAndAssessment, RealWorldScenario, Resources
from utils import clean_llm_response

def _is_empty_rwscenario(rwscenario_dict_kn):
    try:
        # Check if the dictionary is empty
        if not rwscenario_dict_kn:
            return True  # Consider empty dictionary as "empty"
        
        # Check if the first value is valid and has a title attribute
        first_value = list(rwscenario_dict_kn.values())[0]
        if not hasattr(first_value, 'title') or not isinstance(first_value.title, str):
            raise ValueError("The 'title' attribute is missing or is not a string.")
        
        # Check if the title is empty
        return len(first_value.title) == 0
    
    except (IndexError, ValueError, AttributeError) as e:
        # Handle exceptions and log or raise an appropriate error
        print(f"Error while checking for empty 'rwscenario_dict_kn': {e}")
        return True  # Treat as empty if there's any issue

def get_eng_text_area(label="", value="", key: str = "", height: int = 10):
    return st.text_area(label,
                    value=clean_llm_response(value.strip()), 
                    height=height,
                    disabled=True,
                    key = key)

def display_single_activity(activity_name: str, activity_kn: Activity, activity_eng: Activity, activity_cpy: Activity, base_activity_key: str):
    st.write(f"**{activity_name}**")
    activity_key = base_activity_key + activity_name
    col1, col2 = st.columns(2)

    with col1:
        activity_cpy.title = st.text_area("Title",
                    value=clean_llm_response(activity_kn.title.strip()), 
                    height=10,
                    key = activity_key + 'Title').strip()
    with col2:
        get_eng_text_area(label="Title", value=activity_eng.title, key = activity_key + 'Title_eng')

    with col1:
        activity_cpy.preparation = st.text_area("Preparation",
                    value=clean_llm_response(activity_kn.preparation.strip()), 
                    height=20,
                    key = activity_key + 'Preparation').strip()
    with col2:
        get_eng_text_area(label="Preparation", value=activity_eng.preparation, key = activity_key + 'Preparation_eng')
    
    with col1:
        activity_cpy.required_materials = st.text_area("Required Materials",
                    value=clean_llm_response(activity_kn.required_materials.strip()), 
                    height=20,
                    key = activity_key + 'Required Materials').strip()
    with col2:
        get_eng_text_area(label="Required Materials", value=activity_eng.required_materials, key = activity_key + 'Required Materials eng', height=20)

    with col1:
        activity_cpy.obtaining_materials = st.text_area("Obtaining Materials",
                    value=clean_llm_response(activity_kn.obtaining_materials.strip()), 
                    height=20,
                    key = activity_key + 'Obtaining Materials').strip()
    with col2:
        get_eng_text_area(label="Obtaining Materials", value=activity_eng.obtaining_materials, key = activity_key + 'Obtaining Materials Eng', height=20)
    
    with col1:
        activity_cpy.recap = st.text_area("Recap",
                    value=clean_llm_response(activity_kn.recap.strip()), 
                    height=20,
                    key = activity_key + 'Recap').strip()
    with col2:
        get_eng_text_area(label="Recap", value=activity_eng.recap, key = activity_key + 'Recap_eng', height=20)
        

def display_editable_realworldscenario(diff_level_str, rwscenario_dict_kn: Dict[str, RealWorldScenario], rwscenario_dict_eng: Dict[str, RealWorldScenario], rwscenario_dict_cpy: Dict[str, RealWorldScenario], base_widget_key: str = ""):
    if not _is_empty_rwscenario(rwscenario_dict_kn):
        base_rw_scneario_key = "Real World Scenarios"
        st.write(f"**{diff_level_str}**")
        for topic, rwscenario in rwscenario_dict_kn.items():
            st.write(f'**{topic}**')
            col1, col2 = st.columns(2)
            rwscenario_cpy = rwscenario_dict_cpy[topic]
            with col1:
                rwscenario_cpy.title = st.text_area(f"Title",
                                value=clean_llm_response(rwscenario.title.strip()), 
                                height=5,
                                key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.title.strip() +'RWScenarioTitle').strip()
            with col2:
                get_eng_text_area(label="Title", value=rwscenario_dict_eng[topic].title, key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.title.strip() +'RWScenarioTitle_eng', height=5)

            with col1:
                rwscenario_cpy.scenario.description = st.text_area(f"Description",
                                value=clean_llm_response(rwscenario.scenario.description.strip()), 
                                height=5,
                                key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.scenario.description.strip() + 'RWScenarioDescription').strip()
            with col2:
                get_eng_text_area(label="Description", value=rwscenario_dict_eng[topic].scenario.description, key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.scenario.description.strip() +'RWScenarioDescription_eng', height=5)
                
            with col1:
                rwscenario_cpy.scenario.question = st.text_area(f"Question",
                                value=clean_llm_response(rwscenario.scenario.question.strip()), 
                                height=5,
                                key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.scenario.question.strip() + 'RWScenarioQuestion').strip()
            with col2:
                get_eng_text_area(label="Question", value=rwscenario_dict_eng[topic].scenario.question, key = base_widget_key + base_rw_scneario_key + diff_level_str + rwscenario.scenario.question.strip() +'RWScenarioQuestion_eng', height=5)
            

def display_editable_question_bank(diff_level_str: str, mcq_assessment_obj_kn: QuestionBankMCQsAndAssessment, mcq_assessment_obj_eng: QuestionBankMCQsAndAssessment, mcq_assessment_obj_cpy: QuestionBankMCQsAndAssessment, base_widget_key: str = ""):
    base_ques_bank_key = "Question Bank"
    st.write(f"**{diff_level_str}**")
    st.write("**MCQs**")
    
    for question_index, mcq in enumerate(mcq_assessment_obj_kn.MCQs.content):
        col1, col2 = st.columns(2)
        mcq_eng = mcq_assessment_obj_eng.MCQs.content[question_index]
        mcq_cpy = mcq_assessment_obj_cpy.MCQs.content[question_index]
        with col1:
            mcq_cpy.question = st.text_area(f"Question {question_index + 1}",
                        value=clean_llm_response(mcq.question.strip()), 
                        height=10,
                        key = base_widget_key + base_ques_bank_key + diff_level_str + str(question_index) + 'MCQQuestion').strip()
        with col2:
            get_eng_text_area(label=f"Question {question_index + 1}", value=mcq_eng.question, key = base_widget_key + base_ques_bank_key + diff_level_str + str(question_index) + 'MCQQuestion_eng', height=10)
        
        # Ensure Kannada options array has exactly 4 elements by truncating or padding with empty strings
        if len(mcq.options) > 4:
            mcq.options = mcq.options[:4]  # Truncate to 4
            mcq_cpy.options = mcq_cpy.options[:4] 
        elif len(mcq.options) < 4:
            mcq.options += [''] * (4 - len(mcq.options))  # Pad with empty strings
            mcq_cpy.options += [''] * (4 - len(mcq_cpy.options))
            
        cols = st.columns(len(mcq.options))
        for option_index, option in enumerate(mcq.options):
            with cols[option_index]:
                mcq_cpy.options[option_index] = st.text_area(f"Option {option_index + 1}",
                                                        value=clean_llm_response(option.strip()), 
                                                        height=5,
                                                        key = base_widget_key + base_ques_bank_key + diff_level_str + str(question_index) + str(option_index) + 'MCQOption').strip()
                get_eng_text_area(label=f"Option {option_index + 1}", value=mcq_eng.options[option_index], key = base_widget_key + base_ques_bank_key + diff_level_str + str(question_index) + str(option_index) + 'MCQOption_eng', height=5)
                
    st.write("**Assessments**")
    for assessment_question_index, assessment_question in enumerate(mcq_assessment_obj_kn.assessment.content):
        col1, col2 = st.columns(2)
        assessment_question_cpy = mcq_assessment_obj_cpy.assessment.content[assessment_question_index]
        with col1:
            assessment_question_cpy.question = st.text_area(f"Question {assessment_question_index + 1}",
                                                            value=clean_llm_response(assessment_question.question.strip()), 
                                                            height=5,
                                                            key = base_widget_key + base_ques_bank_key + diff_level_str + str(assessment_question_index) + 'AssessmentQuestion').strip()
        with col2:
            get_eng_text_area(label=f"Question {assessment_question_index + 1}", value=mcq_assessment_obj_eng.assessment.content[assessment_question_index].question, 
                key = base_widget_key + base_ques_bank_key + diff_level_str + str(assessment_question_index) + 'AssessmentQuestion_eng', height=5)
            
def app(lp_id: str,
        component_name: str, 
        resources: Resources,
        resources_eng: Resources,
        on_save_lp_component: Callable,  
        text_area_height: int = 200):
    base_widget_key = lp_id + component_name
   
    st.info("After editing the text below, while the cursor is still inside the text area, \
        please hit `Ctrl + Enter` keys and then click on the `Save` button")
    
    # Create a deepcopy of resources if not already done
    resources_cpy_key = base_widget_key + 'resources_copy'
    if resources_cpy_key not in st.session_state:
        st.session_state[resources_cpy_key] = deepcopy(resources)

    resources_copy: Resources = st.session_state[resources_cpy_key]
    
    st.subheader("Activities")
    for activity_name, activity_kn in resources.activities.items():
        activity_eng = resources_eng.activities[activity_name]
        activity_cpy = resources_copy.activities[activity_name]
        display_single_activity(activity_name, activity_kn, activity_eng, activity_cpy, base_widget_key + 'Activities')
    
    if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button_1'):
        update_pydantic_model(resources, resources_copy)
        on_save_lp_component()
   
    st.subheader("Question Bank")
    display_editable_question_bank("Beginner", resources.questionbank.beginner, resources_eng.questionbank.beginner, resources_copy.questionbank.beginner, base_widget_key)
    display_editable_question_bank("Intermediate", resources.questionbank.intermediate, resources_eng.questionbank.intermediate, resources_copy.questionbank.intermediate, base_widget_key)
    display_editable_question_bank("Advanced", resources.questionbank.advanced, resources_eng.questionbank.advanced, resources_copy.questionbank.advanced, base_widget_key)
    
    if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button_2'):
        update_pydantic_model(resources, resources_copy)
        on_save_lp_component()

    st.subheader("Real world Scenarios")
    display_editable_realworldscenario("Beginner", resources.realworldscenarios.beginner, resources_eng.realworldscenarios.beginner, resources_copy.realworldscenarios.beginner, base_widget_key)
    display_editable_realworldscenario("Intermediate", resources.realworldscenarios.intermediate, resources_eng.realworldscenarios.intermediate, resources_copy.realworldscenarios.intermediate, base_widget_key)
    display_editable_realworldscenario("Advanced", resources.realworldscenarios.advanced, resources_eng.realworldscenarios.advanced, resources_copy.realworldscenarios.advanced, base_widget_key)

    if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button_3'):
        update_pydantic_model(resources, resources_copy)
        on_save_lp_component()
        
    
    
