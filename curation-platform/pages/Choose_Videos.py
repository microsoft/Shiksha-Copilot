import os
from dotenv import load_dotenv
import streamlit as st
from data.chapter_lo_subtopic_models import UserRoleEnum
from state_manager import StateManager as SM
from navigation import Navigation as nav
from screens import home_video_edit


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
    
    if os.environ.get("ENABLE_EDIT_LPS", "False") == "True":
        curr_page = nav.get_current_page_choose_video()
        if not curr_page:
            curr_page = home_video_edit
        curr_page.app()
    else:
        st.write("DISABLED RIGHT NOW.")

if __name__ == "__main__":
    main()