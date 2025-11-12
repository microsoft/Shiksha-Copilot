from copy import deepcopy
from datetime import datetime
import os
from typing import List
import uuid
from dotenv import load_dotenv
import pytz
import streamlit as st
from data.api import get_chapter_doc_edited, get_chapter_doc_unedited, get_chapter_video_doc_edited, reset_edits_in_chapter, save_edited_chapter_doc, save_edited_video_chapter
from data.api_v2 import submit_lp_generation_for_chapter, submit_lp_generation_for_subtopics
from data.chapter_lo_subtopic_models import Chapter, Topic, TopicGroup, UserRoleEnum, Video
from navigation import Navigation as nav
from screens import home_video_edit
from state_manager import StateManager as SM

load_dotenv()

def clear_state_vars():
    SM.chosen_chapter_video_details.delete()
    SM.chosen_video_chapter_id.delete()
    SM.chosen_video_chapter_name.delete()

def go_back():
    clear_state_vars()
    nav.set_current_page_choose_video(home_video_edit)
    
def fetch_chapter_details(chapId):
    unedited_chapter = get_chapter_doc_unedited(chapId)
    if unedited_chapter.vetted_videos:
        return get_chapter_video_doc_edited(chapId)  
    return unedited_chapter
    
################################################################################################### 
    
def app():
    if st.button('< Go Back', key="go back to Chapter chosing"):
        go_back()
    
    user_id = SM.user.get().id
    chapter_name = SM.chosen_video_chapter_name.get()
    chapter_id = SM.chosen_video_chapter_id.get()
    video_being_added = SM.current_video_being_added.get()
    st.header(chapter_name, divider="grey")
    
    latest_chapter = SM.chosen_chapter_video_details.get()
    if latest_chapter == None:
        with st.spinner("Getting chapter info..."):
            latest_chapter = fetch_chapter_details(chapter_id)
            SM.chosen_chapter_video_details.set(latest_chapter)
        
    if latest_chapter.vetted_videos:
        col1, _, col2 = st.columns([1, 5, 1])
        col1.write(f"Last Edited by: {latest_chapter.user_id}")
        if latest_chapter.last_edited_at != -1:
            utc_time = datetime.utcfromtimestamp(latest_chapter.last_edited_at)
            indian_tz = pytz.timezone('Asia/Kolkata')
            indian_time = utc_time.replace(tzinfo=pytz.utc).astimezone(indian_tz)
            human_readable = indian_time.strftime('%Y-%m-%d %H:%M:%S %Z')
            col2.write(f"Last Edited At: {human_readable}")
            
    for index, video in enumerate(latest_chapter.videos):
        st.subheader(f'{index + 1}. {video.title}')
        st.video(video.url)
        st.info("Selecting the below checkbox means the video is relevant to the chapter")
        video.selected = st.checkbox("Select", key=video.url, value = video.selected)
    
    if video_being_added != None:
        st.subheader(f"{len(latest_chapter.videos) + 1}. New Video")
        video_being_added.title = st.text_input("Video Title")
        video_being_added.url = st.text_input("Video URL")
        
        if st.button("Add", type="primary"):
            latest_chapter.videos.append(video_being_added)
            SM.current_video_being_added.delete()
            with st.spinner("Adding..."):
                save_edited_video_chapter(latest_chapter, editedBy=user_id)
            st.rerun()
        
    elif st.button("Add new video", type="secondary"):
        SM.current_video_being_added.set(Video(selected=True))
        st.rerun()
        
    if video_being_added == None:  
        if st.button("Submit Selection", type="primary"):
           with st.spinner("Saving Selection..."):
               save_edited_video_chapter(latest_chapter, editedBy=user_id)
           st.success("Saved!")
       
    if st.button('< Go Back', key="go back to Chapter chosing 1"):
        go_back() 