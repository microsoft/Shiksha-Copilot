from copy import deepcopy
from typing import Callable
import streamlit as st
from data.copy_data import update_pydantic_model
from data.data_models import Checklist, ChecklistActivity
from utils import clean_llm_response

def get_eng_text_area(label="", value="", key: str = "", height: int = 10):
    return st.text_area(label,
                    value=clean_llm_response(value.strip()), 
                    height=height,
                    disabled=True,
                    key = key)


def render_component(kn_checklist_activity: ChecklistActivity, eng_checklist_activity: ChecklistActivity, cpy_checklist_activity: ChecklistActivity, comp_name: str, base_widget_key: str, text_area_height=100):
    st.write(f"**{comp_name}**")
    col1, col2 = st.columns(2)
    with col1:
        cpy_checklist_activity.activity = st.text_area("Activity",
                                value=clean_llm_response(kn_checklist_activity.activity.strip()), 
                                height=text_area_height,
                                key = base_widget_key + comp_name +'_activity_checklist').strip()
    with col2:
        get_eng_text_area(
            label="Activity",
            value=eng_checklist_activity.activity,
            height=text_area_height,
            key=base_widget_key + comp_name +'_activity_checklist_eng'
        )
        # st.markdown(
        #     f'<div style="overflow-y: scroll; height: {text_area_height}px; border: 1px solid black; padding: 20px; margin: 20px;">{clean_llm_response(eng_checklist_activity.activity.strip())}</div>', 
        #     unsafe_allow_html=True
        # )
    
    with col1:
        cpy_checklist_activity.materials = st.text_area("Materials",
                                value=clean_llm_response(kn_checklist_activity.materials.strip()), 
                                height=text_area_height,
                                key = base_widget_key + comp_name +'_materials_checklist').strip()
    with col2:
        get_eng_text_area(
            label="Materials",
            value=eng_checklist_activity.materials,
            height=text_area_height,
            key=base_widget_key + comp_name +'_materials_checklist_eng'
        )
        # st.markdown(
        #     f'<div style="overflow-y: scroll; height: {text_area_height}px; border: 1px solid black; padding: 20px; margin: 20px;">{clean_llm_response(eng_checklist_activity.materials.strip())}</div>', 
        #     unsafe_allow_html=True
        # )

def app(lp_id: str,
        checklist: Checklist,
        checklist_eng: Checklist,
        on_save_lp_component: Callable, 
        text_area_height: int = 100):
    base_widget_key = lp_id + "Checklist"
   
    
    st.info("After editing the text below, while the cursor is still inside the text area, \
        please hit `Ctrl + Enter` keys and then click on the `Save` button")
    
    # Create a deepcopy of resources if not already done
    checklist_cpy_key = base_widget_key + 'checklist_copy'
    if checklist_cpy_key not in st.session_state:
        st.session_state[checklist_cpy_key] = deepcopy(checklist)

    checklist_cpy: Checklist = st.session_state[checklist_cpy_key]
    
    render_component(checklist.ENGAGE, checklist_eng.ENGAGE, checklist_cpy.ENGAGE, "Engage", base_widget_key, text_area_height)
    render_component(checklist.EXPLORE, checklist_eng.EXPLORE, checklist_cpy.EXPLORE, "Explore", base_widget_key, text_area_height)
    render_component(checklist.EXPLAIN, checklist_eng.EXPLAIN, checklist_cpy.EXPLAIN, "Explain", base_widget_key, text_area_height)
    render_component(checklist.ELABORATE, checklist_eng.ELABORATE, checklist_cpy.ELABORATE, "Elaborate", base_widget_key, text_area_height)
    render_component(checklist.EVALUATE, checklist_eng.EVALUATE, checklist_cpy.EVALUATE, "Evaluate", base_widget_key, text_area_height)
    
    if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
        update_pydantic_model(checklist, checklist_cpy)
        on_save_lp_component()
    
