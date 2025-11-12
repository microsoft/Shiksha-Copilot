import streamlit as st
from data.api import get_all_chapter_docs_unedited, get_all_chapter_docs_videos_edited, get_chapters_summary_doc, get_video_chapters_summary_doc
from data.chapter_lo_subtopic_models import UserRoleEnum
from navigation import Navigation as nav
from screens import edit_chapter_videos
from state_manager import StateManager as SM
from utils import logout

def get_chapter_number_title(chap_id: str):
    parts = chap_id.split(',')
    split_index = -1
    for index in range(len(parts)):
        if parts[index].startswith("Number"):
            split_index = index
            break
        
    info = {x.split('=')[0]: x.split('=')[1] for x in parts[:split_index+1]}
    number = info['Number']
    title = parts[split_index+1].split("=")[1]
    return int(number), title

def app():
    user = SM.user.get()    
    st.header("Chapter Video Editing", divider="grey")
    
    
    with st.spinner('Getting chapter details...'):
        data = SM.video_chapter_summary.get()
        if data == None:
            data = get_video_chapters_summary_doc()
            SM.video_chapter_summary.set(data)
        
    if 'selected_board' not in st.session_state:
        st.session_state['selected_board'] = None
    if 'selected_medium' not in st.session_state:
        st.session_state['selected_medium'] = None
    if 'selected_grade' not in st.session_state:
        st.session_state['selected_grade'] = None
    if 'selected_subject' not in st.session_state:
        st.session_state['selected_subject'] = None

    # Board selection
    board = st.selectbox("Select Board", list(data.keys()))
    st.session_state['selected_board'] = board

    if st.session_state['selected_board']:
        # Medium selection
        medium = st.selectbox("Select Medium", list(data[board].keys()))
        st.session_state['selected_medium'] = medium

        if st.session_state['selected_medium']:
            # Grade selection
            grades = sorted([int(str_grade) for str_grade in list(data[board][medium].keys())])
            grade = st.selectbox("Select Grade", grades, index=grades.index(
                st.session_state['selected_grade'])\
                    if st.session_state['selected_grade'] and st.session_state['selected_grade'] in grades \
                        else None)
            st.session_state['selected_grade'] = grade

            if st.session_state['selected_grade']:
                # Subject selection
                subjects = list(data[board][medium][str(grade)].keys())
                subject = st.selectbox("Select Subject", subjects, index=subjects.index(
                    st.session_state['selected_subject'])\
                        if st.session_state['selected_subject'] and st.session_state['selected_subject'] in subjects\
                            else None)
                st.session_state['selected_subject'] = subject

                if st.session_state['selected_subject']:
                    if user.role == UserRoleEnum.ADMIN:
                        with st.spinner("Fetching chapters..."):
                            chapter_ids = data[board][medium][str(grade)][subject]
                            unedited_chapters = get_all_chapter_docs_unedited(chapter_ids)
                            edited_chap_ids = [chap.id for chap in unedited_chapters if chap.vetted_videos]
                            edited_chapters = get_all_chapter_docs_videos_edited(edited_chap_ids)
                            edited_chapter_map = {chap.id: chap for chap in edited_chapters}
                            chapters = [edited_chapter_map.get(chap.id, chap) for chap in unedited_chapters]
                            chapters.sort(key=lambda x: x.chapter_number)
                        
                        header_cols = st.columns([1, 2, 1, 3])
                        headers = ["Chapter Number", "Chapter Title", "Has been edited"]
                        font_size = "18px"
                        for index, header in enumerate(headers):
                            header_cols[index].markdown(f"<span style='font-size: {font_size};'><b>{header}</b></span>", unsafe_allow_html=True)
                        
                        for chapter in chapters:
                            cols = st.columns([1, 2, 1, 3])
                            cols[0].write(chapter.chapter_number)
                            cols[1].write(chapter.chapter_title)
                            cols[2].write('Yes' if chapter.vetted_videos else 'No')
                            if cols[3].button("View", key=str(chapter.id)):
                                number, title = get_chapter_number_title(chapter.id)
                                chosen_chapter_name = f"Chapter {number}: {title}"
                                SM.chosen_video_chapter_name.set(chosen_chapter_name)
                                SM.chosen_video_chapter_id.set(chapter.id)
                                nav.set_current_page_choose_video(edit_chapter_videos)
                    else:
                        chapter_ids = data[board][medium][str(grade)][subject]
                        chapter_option_to_id = {}
                        chapter_names = []
                        for chapter_id in chapter_ids:
                            number, title = get_chapter_number_title(chapter_id)
                            chapter_name = f"Chapter {number}: {title}"
                            chapter_names.append((number, chapter_name))
                            chapter_option_to_id[chapter_name] = chapter_id
                            
                        # Chapter selection
                        chapter_names_sorted = sorted(chapter_names, key=lambda x: x[0])
                        chosen_chapter_name = st.selectbox("Select Chapter", [name for num, name in chapter_names_sorted], index=None)
                        # Display the selected chapter ID
                        if chosen_chapter_name in chapter_option_to_id:
                            if st.button("Edit", type="primary"):
                                SM.chosen_video_chapter_name.set(chosen_chapter_name)
                                SM.chosen_video_chapter_id.set(chapter_option_to_id[chosen_chapter_name])
                                nav.set_current_page_choose_video(edit_chapter_videos)