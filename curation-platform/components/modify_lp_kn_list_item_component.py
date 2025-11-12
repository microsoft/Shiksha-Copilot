from typing import Callable, List
import streamlit as st
from data.data_models import Instruction

from utils import clean_llm_response
    
def app(lp_id: str,
        component_name: str, 
        kn_items: List[str],
        eng_items: List[str],
        on_save_lp_component: Callable,
        text_area_height: int = 50):
    base_widget_key = lp_id + component_name
    
    st.info("After editing the text below, while the cursor is still inside the text area, \
        please hit `Ctrl + Enter` keys and then click on the `Save` button")
    
    col1, col2 = st.columns(2)
    
    for i, (kn_item, eng_item) in enumerate(zip(kn_items, eng_items)):
        with col1:
            edited_text = st.text_area("Edit here manually", label_visibility="hidden",
                                    value=clean_llm_response(kn_item.strip()), 
                                    height=text_area_height,
                                    key = base_widget_key + 'text_area_' + str(i))
            kn_items[i] = edited_text.strip()  # Update the list directly
        
        with col2:
            disp_text = clean_llm_response(eng_item.strip())
            disp_text = disp_text.replace('\\n', '<br>').replace('\\"', '"')
            st.markdown(
                f'<div style="overflow-y: scroll; height: {text_area_height * 2}px; border: 1px solid black; padding: 20px; margin: 20px;">{disp_text}</div>', 
                unsafe_allow_html=True
            )
        
    if st.button(f'Save Changes', type="primary", key= base_widget_key + 'save_changes_button'):
        on_save_lp_component()

    