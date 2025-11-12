import streamlit as st
from data.api import get_all_registered_users, register_teacher, save_user
from data.chapter_lo_subtopic_models import User, UserRoleEnum
from state_manager import StateManager as SM
from navigation import Navigation as nav
from screens import home_lo_edit
import pandas as pd

from utils import logout

def toggle_is_disabled(user: User):
    user.is_disabled = not user.is_disabled
    save_user(user)

def app():
    user = SM.user.get()
    st.sidebar.title("Shiksha Karnataka Lesson Plan Editing Dashboard")
    st.sidebar.subheader(f"Welcome {user.name}")
    if st.sidebar.button("Logout", key="Logout"):
        logout()
        st.toast("Logged out")
    
    if st.button('< Go Back', key="go back to Chapter chosing"):
        SM.registered_users.delete()
        nav.set_current_page(home_lo_edit)
        
    st.header("User Registration", divider="grey")
    
    st.subheader("Registered Users")
    all_users = SM.registered_users.get()
    if all_users == None:
        with st.spinner("Fetching current users info..."):
            all_users = get_all_registered_users()
            SM.registered_users.set(all_users)
    
    names = [user.name for user in all_users]
    emails = [user.id for user in all_users]  # Assuming it should be user.email
    is_disabled_list = [user.is_disabled for user in all_users]

    cols = st.columns(3)
    cols[0].subheader("**Name**")
    cols[1].subheader("**Email**")
    cols[2].subheader("**Action**")

    # Loop over each user to create a row with name, email, and action button
    for index, user in enumerate(all_users):
        # Create a new row of columns for each user
        cols = st.columns(3)
        
        # Fill in the name, email, and button in the respective columns
        cols[0].write(user.name)
        cols[1].write(user.id)
        
        # Determine the button text based on whether the user is disabled or not
        action_button_str = "Enable" if user.is_disabled else "Disable"
        
        # Create a button in the third column and give it a unique key
        cols[2].button(action_button_str, key=user.id, on_click=toggle_is_disabled, args=(user,), type="primary" if user.is_disabled else "secondary")
        
        # Add a small separator after each row
        st.markdown("<hr style='margin-top:0.5rem;margin-bottom:0.5rem;border-top:1px solid #ccc;'>", unsafe_allow_html=True)

        
    st.subheader("Register new user")
    name = st.text_input("Name")
    email = st.text_input("Google Email")
    
    if st.button("Submit", type="primary"):
        if len(name) == 0 or len(email) == 0:
            st.error("Please provide both `Name` and `Email`")
        else:
            with st.spinner("Saving..."):
                success = register_teacher(User(_id=email, role=UserRoleEnum.TEACHER, name=name))
            if not success:
                st.error("Teacher already exists.")
            else:
                st.write("Saved!")
                SM.registered_users.delete()
                st.rerun()
    