import os
import streamlit as st
from data.chapter_lo_subtopic_models import UserRoleEnum
from state_manager import StateManager as SM
from navigation import Navigation as nav
from screens import gen_history_item_list

from dotenv import load_dotenv

load_dotenv()


def main():
    st.sidebar.title("Shiksha Karnataka Lesson Plan Editing Dashboard")
    if os.environ.get("ENABLE_SUBMIT_LP_REQ", "False") == "True":
        user = SM.user.get()
        if user == None:
            st.write("You Have not logged in. Please Selected `Main` tab from left side and sign in using your google account.")
            st.stop()
            
        st.sidebar.subheader(f"Welcome {user.name}")
        if user.role == UserRoleEnum.ADMIN:
            st.sidebar.subheader("ADMIN USER")
        
        curr_page = nav.get_current_page_gen_history()
        
        if not curr_page:
            curr_page = gen_history_item_list
        
        curr_page.app()
    else:
        st.write("Under development.")

if __name__ == "__main__":
    main()