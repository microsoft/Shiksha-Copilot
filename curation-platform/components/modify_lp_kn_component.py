from copy import deepcopy
from typing import Callable
import streamlit as st
from data.copy_data import update_pydantic_model
from data.data_models import Instruction

from utils import clean_llm_response

def get_eng_text_area(label="", value="", key: str = "", height: int = 10):
    return st.text_area(label,
                    value=clean_llm_response(value.strip()), 
                    height=height,
                    disabled=True,
                    key = key)
    
def app(lp_id: str,
        component_name: str, 
        instruction: Instruction,
        instruction_eng: Instruction,
        on_save_lp_component: Callable,
        text_area_height: int = 300):
    base_widget_key = lp_id + component_name
    
    st.info("After editing the text below, while the cursor is still inside the text area, \
        please hit `Ctrl + Enter` keys and then click on the `Save` button")
    
    col1, col2 = st.columns(2)
    
    # Create a deepcopy of resources if not already done
    instructions_cpy_key = base_widget_key + 'instructions_copy'
    if instructions_cpy_key not in st.session_state:
        st.session_state[instructions_cpy_key] = deepcopy(instruction)
    instruction_cpy: Instruction = st.session_state[instructions_cpy_key]
    
    with col1:
        instruction_cpy.content = st.text_area("Edit here manually", label_visibility="hidden",
                                value=clean_llm_response(instruction.content.strip()), 
                                height=text_area_height,
                                key = base_widget_key + 'text_area').strip()
    
    with col2:
        get_eng_text_area(
            label=component_name,
            value=instruction_eng.content,
            height=text_area_height,
            key=base_widget_key + 'text_area_eng'
        )
        # disp_text = clean_llm_response(instruction_eng.content.strip())
        # disp_text = disp_text.replace('\\n', '<br>').replace('\\"', '"')
        # st.markdown(
        #     f'<div style="overflow-y: scroll; height: 300px; border: 1px solid black; padding: 20px; margin: 20px;">{disp_text}</div>', 
        #     unsafe_allow_html=True
        # )
        # _ = st.text_area("For your reference",
        #                         value=clean_llm_response(instruction_eng.content.strip()), 
        #                         height=text_area_height,
        #                         disabled=True,
        #                         key = base_widget_key + 'text_area_eng_disabled')
        # st.markdown(
        #     """
        #     <style>
        #     textarea[disabled] {
        #         color: #00FF00; /* Set the text color to a darker shade */
        #         background-color: #FFFFFF; /* Optional: change background for better visibility */
        #     }
        #     </style>
        #     """, 
        #     unsafe_allow_html=True
        # )

    if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
        update_pydantic_model(instruction, instruction_cpy)
        on_save_lp_component()
    