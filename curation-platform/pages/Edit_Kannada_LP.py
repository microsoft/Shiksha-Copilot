import os
from dotenv import load_dotenv
import streamlit as st
from data.chapter_lo_subtopic_models import UserRoleEnum
from state_manager import StateManager as SM
from navigation import Navigation as nav
from screens import edit_lp_list_kn


load_dotenv()


def main():
    user = SM.user.get()
    if user == None:
        st.write("You Have not logged in. Please Selected `Main` tab from left side and sign in using your google account.")
        st.stop()
    st.sidebar.title("Shiksha Karnataka Lesson Plan Editing Dashboard")
    st.sidebar.subheader(f"Welcome {user.name}")
    if user.role == UserRoleEnum.ADMIN:
        st.sidebar.subheader("ADMIN USER")
    
    curr_page = nav.get_current_page_edit_lp_kn()
    if not curr_page:
        curr_page = edit_lp_list_kn
    curr_page.app()

if __name__ == "__main__":
    main()