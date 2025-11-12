import sys
import streamlit as st
from data.chapter_lo_subtopic_models import User, UserRoleEnum
from screens import home_lo_edit, login
from navigation import Navigation as nav
from state_manager import StateManager as SM

st.set_page_config(layout="wide")

# For testing and bypassing login page, start the streamlit app with `streamlit run Main.py -- --mode=test`

def main():
    args = sys.argv[1:]
    args_dict = {arg.split("=")[0].replace("--", ""): arg.split("=")[1] for arg in args}
    mode = "production"  # default mode
    if 'mode' in args_dict:
        mode = args_dict['mode']
        
    print(f"Running in {mode} mode")
    curr_page = nav.get_current_page()
    
    if mode == "test":
        SM.user.set(User(_id="test-admin-msr@gmail.com", name="Kavyansh Chourasia", role="ADMIN"))
        if not curr_page:
            curr_page = home_lo_edit
    else:
        if not curr_page:
            curr_page = login
    
        if curr_page == login:
            st.sidebar.title("Shiksha Karnataka Lesson Plan Editing Dashboard")
    
    curr_page.app()        
    # if not curr_page:
    #     curr_page = home
    
    # if curr_page == home:
    #     st.sidebar.title("Shiksha Karnataka Lesson Plan Editing Dashboard")
    #     st.sidebar.subheader(f"Welcome {user_name}")
    #     if st.sidebar.button("Logout", key="Logout"):
    #         st.toast("Not implemented yet")

      
    
    

if __name__ == "__main__":
    main()
