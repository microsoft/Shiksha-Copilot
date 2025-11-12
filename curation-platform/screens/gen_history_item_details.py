import json
import streamlit as st
from data.api_v2 import release_lp, retrigger_lp_generation
from data.data_models import DurableFunctionsConstants
from navigation import Navigation as nav
from screens import gen_history_item_list
from state_manager import StateManager as SM
from utils import str_to_ist

def go_back():
    SM.chosen_gen_history_item.delete()
    SM.gen_history_items.delete()
    nav.set_current_page_gen_history(gen_history_item_list)

def app():
    if st.button('< Go Back', key="go back first"):
        go_back()
    
    st.header("Generation Details")
    item = SM.chosen_gen_history_item.get()
    if item == None:
        raise ValueError("GEN HISTORY ITEM NOT FOUND IN SESSION STATE")

    curriculum_info = item.curr_info
    selected_columns = {
        'Status': item.latest_status,
        'Status URI': item.status_uri,
        'Medium': curriculum_info.medium,
        'Grade': curriculum_info.grade,
        'Subject': curriculum_info.subject,
        'Chapter': curriculum_info.chapter_title,
        'Topic(s)': item.subtopics,
        'Lesson Plan Level': item.lp_level,
        'Created Time': str_to_ist(item.created_time),
        'Last Status Update Time': str_to_ist(item.last_updated_time) if item.last_updated_time else "Not Started yet"
    }
    if curriculum_info.subject.lower().startswith('english'):
        selected_columns['Lesson Plan Level'] = item.lp_level_english
    
    if item.latest_status == DurableFunctionsConstants.COMPLETED_STATUS:
        st.success("Lesson Plan released")
        
    if item.output != None:
        st.write('**Response**')
        if item.latest_status == DurableFunctionsConstants.FAILED_STATUS:
            st.error(item.output)
        else:
            st.write(item.output)
        
    for key, value in selected_columns.items():
        st.write(f"**{key}**: {value}")
    
    if item.input != None:
        st.write('**Generation Request Payload**')
        try:
            json_input = json.loads(item.input)
            st.write(json_input)
        except:
            st.write(item.input)
    
    if item.latest_status == DurableFunctionsConstants.FAILED_STATUS:
        if st.button("Retrigger Generation", type='primary'):
            with st.spinner("Retriggering..."):
                retrigger_lp_generation(item)
            st.success("Successfully retriggered.")
    

    
    