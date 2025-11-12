import os
import random
import string
from urllib.parse import urlencode
from dotenv import load_dotenv
import requests
from state_manager import StateManager as SM

load_dotenv()


import streamlit as st

_STKEY = 'ST_OAUTH'

@st.cache_resource(ttl=300)
def qparms_cache(key):
    return {}

def logout():
    if _STKEY in st.session_state:
        del st.session_state[_STKEY]

def string_num_generator(size):
    chars = string.ascii_uppercase + string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(size))

def show_auth_link(config, label):
    state_parameter = string_num_generator(15)
    query_params = urlencode({'redirect_uri': config['redirect_uri'], 'client_id': config['client_id'], 'response_type': 'code', 'state': state_parameter, 'scope': config['scope']})
    request_url = f"{config['authorization_endpoint']}?{query_params}"
    if st.experimental_get_query_params():
        qpcache = qparms_cache(state_parameter)
        qpcache = st.experimental_get_query_params()

                     
    st.markdown(f'<a href="{request_url}" target="_self" style="display: inline-block; padding: 10px 20px; background-color: rgb(255, 75, 75); color: #FFFFFF; text-align: center; text-decoration: none; border-radius: 10px; cursor: pointer;">{label}</a>', unsafe_allow_html=True)
    st.stop()

def get_user_name_email(token):
    response = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
    data = response.json()
    name = ""
    if "name" in data:
        name = data["name"]
    return name, data["email"]
    

def st_oauth(label="Login using Google Account"):
    ## Configuration
    config = {
        "authorization_endpoint": "https://accounts.google.com/o/oauth2/auth",
        "token_endpoint": "https://oauth2.googleapis.com/token",
        "redirect_uri": os.environ["OAUTH_REDIRECT_URI"],
        "client_id": os.environ["OAUTH_CLIENT_ID"],
        "client_secret": os.environ["OAUTH_CLIENT_SECRET"],
        "scope": "email"
    }
    print("OAUTH CONFIG: ", config)
    if isinstance(config, str):
        config = st.secrets[config]
    if _STKEY in st.session_state:
        token = st.session_state[_STKEY]
    if _STKEY not in st.session_state:
        if 'code' not in st.experimental_get_query_params():
            show_auth_link(config, label)
        code = st.experimental_get_query_params()['code'][0]
        state = st.experimental_get_query_params()['state'][0]
        qpcache = qparms_cache(state)
        qparms = qpcache
        qpcache = {}
        st.experimental_set_query_params(**qparms)
        theaders = {
                        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
                    }
        tdata = {
                    'grant_type': 'authorization_code', 
                    'redirect_uri': config['redirect_uri'],
                    'client_id': config['client_id'],
                    'client_secret': config['client_secret'],
                    'scope': config['scope'],
                    'state': state,
                    'code': code,
                }
        try:
            ret = requests.post(config["token_endpoint"], headers=theaders, data=urlencode(tdata).encode("utf-8"))
            ret.raise_for_status()
        except requests.exceptions.RequestException as e:
            st.error(e)
            show_auth_link(label)
        token = ret.json()
        st.session_state[_STKEY] = token

    if _STKEY in st.session_state:
        name, email = get_user_name_email(st.session_state[_STKEY]["access_token"])
        SM.user_name.set(name)
        SM.user_email.set(email)
    return