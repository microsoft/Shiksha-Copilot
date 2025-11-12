"""
Handle all Navigation related Logic here.
"""
import streamlit as st

STATE = st.session_state
DEFAULT_ROUTE = "/"
EDIT_LP_ROUTE = "/EDIT_LP"
EDIT_KN_LP_ROUTE = "/EDIT_KN_LP_ROUTE"
GEN_HISTORY_ROUTE = "/GEN_HISTORY"
CHOOSE_VIDEO_ROUTE = "/CHOOSE_VIDEO"

class Navigation:
    @staticmethod
    def __get_value_or_none(key: str):
        """Private method to get a value from the session state or return None if not present."""
        if key in STATE:
            return STATE[key]
        return None
    
    @staticmethod
    def __set(key: str, value):
        """Private method to set a value in the session state."""
        STATE[key] = value

    @staticmethod
    def get_current_page():
        """Public method to get value of current page"""
        return Navigation.__get_value_or_none(DEFAULT_ROUTE)
    
    @staticmethod
    def set_current_page(page):
        """Public method to set value of current page"""
        Navigation.__set(DEFAULT_ROUTE, page)
        st.rerun()
    
    @staticmethod
    def get_current_page_edit_lp():
        """Public method to get value of current page"""
        return Navigation.__get_value_or_none(EDIT_LP_ROUTE)
    
    @staticmethod
    def set_current_page_edit_lp(page):
        """Public method to set value of current page"""
        Navigation.__set(EDIT_LP_ROUTE, page)
        st.rerun()
    
    @staticmethod
    def get_current_page_edit_lp_kn():
        """Public method to get value of current page"""
        return Navigation.__get_value_or_none(EDIT_KN_LP_ROUTE)
    
    @staticmethod
    def set_current_page_edit_lp_kn(page):
        """Public method to set value of current page"""
        Navigation.__set(EDIT_KN_LP_ROUTE, page)
        st.rerun()
    
    @staticmethod
    def get_current_page_gen_history():
        """Public method to get value of current page"""
        return Navigation.__get_value_or_none(GEN_HISTORY_ROUTE)
    
    @staticmethod
    def set_current_page_gen_history(page):
        """Public method to set value of current page"""
        Navigation.__set(GEN_HISTORY_ROUTE, page)
        st.rerun()
    
    @staticmethod
    def get_current_page_choose_video():
        """Public method to get value of current page"""
        return Navigation.__get_value_or_none(CHOOSE_VIDEO_ROUTE)
    
    @staticmethod
    def set_current_page_choose_video(page):
        """Public method to set value of current page"""
        Navigation.__set(CHOOSE_VIDEO_ROUTE, page)
        st.rerun()
