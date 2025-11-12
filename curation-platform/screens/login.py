from data.api import get_auth_details
from data.chapter_lo_subtopic_models import User
from utils.st_oauth import st_oauth
import streamlit as st
from state_manager import StateManager as SM
from navigation import Navigation as nav
from screens import home_lo_edit

def app():
    _ = st_oauth()
    user: User = None
    with st.spinner('Logging In...'):
        email = SM.user_email.get()
        user = get_auth_details(email)
    if user == None:
        st.write("Not a registered user, refresh the page and login again")
        st.stop()
    if user.is_disabled:
        st.write("You have been disabled. Please contact curation administrator.")
        st.stop()
    else:
        SM.user.set(user)
        nav.set_current_page(home_lo_edit)
        