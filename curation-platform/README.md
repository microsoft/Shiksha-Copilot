# Shiksha Karnataka Lesson Plan Editing Dashboard

A comprehensive Streamlit-based web application for editing and managing lesson plans for the Karnataka education system. The application supports both English and Kannada lesson plans, with features for managing learning outcomes, subtopics, videos, and lesson plan generation history.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [File Descriptions](#file-descriptions)
- [State Management](#state-management)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Docker Deployment](#docker-deployment)

## Overview

This application provides an intuitive interface for educators and administrators to:
- Edit chapter learning outcomes and subtopics
- Manage lesson plans in both English and Kannada
- Track lesson plan generation history
- Assign and manage educational videos to chapters
- Review and provide feedback on AI-generated lesson plans

## Features

### 1. **User Authentication & Authorization**
- Google OAuth integration
- Role-based access control (Admin/Teacher)
- User registration and management (Admin only)

### 2. **Learning Outcomes & Subtopics Management**
- Edit chapter-level learning outcomes
- Manage subtopics and subtopic groups
- Create and submit lesson plan generation requests
- Support for multiple boards, grades, and subjects

### 3. **Lesson Plan Editing**
- English lesson plan editing with CRISP 5E framework
  - Engage, Explore, Explain, Elaborate, Evaluate phases
- Kannada lesson plan editing with translation support
- Real-time feedback mechanism
- Version comparison (edited vs original)
- Resource recommendations and checklists

### 4. **Video Management**
- Assign educational videos to chapters
- Video metadata management
- Chapter-wise video organization

### 5. **Generation History**
- Track all lesson plan generation requests
- Monitor generation status (Running, Pending, Completed, Failed)
- Retrigger failed generations
- Release completed lesson plans

## Folder Structure

```
golden-lps-streamlit/
│
├── Main.py                      # Application entry point
├── navigation.py                # Navigation state management
├── state_manager.py             # Centralized state management
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Docker configuration
├── docker_commands.txt          # Docker helper commands
│
├── pages/                       # Streamlit multi-page routes
│   ├── Edit_LP.py              # English lesson plan editing page
│   ├── Edit_Kannada_LP.py      # Kannada lesson plan editing page
│   ├── LP_Gen_History.py       # Generation history tracking page
│   └── Choose_Videos.py        # Video assignment page
│
├── screens/                     # Screen components (UI logic)
│   ├── login.py                # Login screen with OAuth
│   ├── home_lo_edit.py         # Main dashboard for LO editing
│   ├── home_video_edit.py      # Main dashboard for video editing
│   ├── register_new_teacher.py # Teacher registration (Admin)
│   ├── edit_chapter_lo_subtopic.py    # Chapter LO/subtopic editor
│   ├── edit_chapter_videos.py         # Chapter video assignment
│   ├── edit_lp_list.py         # List of English lesson plans
│   ├── edit_lp_list_kn.py      # List of Kannada lesson plans
│   ├── modify_lp_v3.py         # Legacy LP editor (v3)
│   ├── modify_lp_v4.py         # Current English LP editor (v4)
│   ├── modify_lp_kn.py         # Kannada LP editor
│   ├── edit_resources.py       # Resource editing component
│   ├── gen_history_item_list.py       # History list view
│   └── gen_history_item_details.py    # History detail view
│
├── components/                  # Reusable UI components
│   ├── busy_loader.py          # Loading indicator
│   ├── modify_lp_component_4.py       # LP editing component v4
│   ├── modify_lp_component_5.py       # LP editing component v5
│   ├── modify_lp_kn_component.py      # Kannada LP component
│   ├── modify_lp_kn_list_item_component.py  # Kannada list item
│   ├── crisp_5e_component.py          # 5E framework component
│   ├── checklist_component.py         # Checklist for English
│   ├── checklist_component_kn.py      # Checklist for Kannada
│   ├── resources_component.py         # Resources for English
│   └── resources_component_kn.py      # Resources for Kannada
│
├── data/                        # Data layer (API & models)
│   ├── api.py                  # Legacy API functions
│   ├── api_v2.py               # Current API functions
│   ├── models.py               # Legacy data models (dataclass)
│   ├── data_models.py          # Current data models (Pydantic)
│   ├── chapter_lo_subtopic_models.py  # Chapter/LO models
│   └── copy_data.py            # Utility for copying Pydantic models
│
└── utils/                       # Utility functions
    ├── __init__.py             # Common utility functions
    ├── constants.py            # Application constants
    ├── mongo_db.py             # MongoDB connection wrapper
    └── st_oauth.py             # Streamlit OAuth integration
```

## File Descriptions

### Root Level Files

- **`Main.py`**: Entry point that handles routing between login and home screens
- **`navigation.py`**: Manages navigation state across different app sections
- **`state_manager.py`**: Centralized state management using Streamlit session state
- **`requirements.txt`**: Python package dependencies
- **`Dockerfile`**: Container configuration for deployment

### Pages Directory

Multi-page Streamlit apps that appear in the sidebar:
- **`Edit_LP.py`**: Access point for editing English lesson plans
- **`Edit_Kannada_LP.py`**: Access point for editing Kannada lesson plans
- **`LP_Gen_History.py`**: View and manage lesson plan generation requests
- **`Choose_Videos.py`**: Assign videos to chapters

### Screens Directory

Contains the main UI logic and screen components:
- **`login.py`**: Handles Google OAuth authentication
- **`home_lo_edit.py`**: Dashboard for selecting chapters to edit
- **`edit_chapter_lo_subtopic.py`**: Comprehensive editor for learning outcomes and subtopics
- **`modify_lp_v4.py`**: Latest version of English lesson plan editor
- **`modify_lp_kn.py`**: Kannada lesson plan editor with side-by-side comparison

### Components Directory

Reusable UI components:
- **`modify_lp_component_5.py`**: Latest modular LP editing component
- **`crisp_5e_component.py`**: Component for 5E instructional model
- **`checklist_component.py`**: Rubric-based feedback checklist
- **`resources_component.py`**: External resources and materials

### Data Directory

Data models and API layer:
- **`api_v2.py`**: Current API implementation with MongoDB operations
- **`data_models.py`**: Pydantic models for lesson plans, activities, assessments
- **`chapter_lo_subtopic_models.py`**: Models for chapters, topics, videos, users

### Utils Directory

Utility functions:
- **`constants.py`**: Application-wide constants (state keys, teaching methods, etc.)
- **`mongo_db.py`**: MongoDB connection and CRUD operations
- **`st_oauth.py`**: OAuth integration for Google authentication

## State Management

The application uses a centralized state management system through `StateManager` class defined in `state_manager.py`. State is managed using Streamlit's `st.session_state`.

### Key State Attributes

#### User State
```python
SM.user.get()                    # Current logged-in user
SM.user_name.get()               # User's display name
SM.user_email.get()              # User's email
SM.registered_users.get()        # All registered users (Admin)
```

#### Chapter & Learning Outcome State
```python
SM.chapter_summary.get()         # Summary of all chapters
SM.chosen_chapter_id.get()       # Currently selected chapter ID
SM.chosen_chapter_details.get()  # Full chapter details
SM.chosen_chapter_lo_list.get()  # Learning outcomes list
SM.chosen_chapter_subtopic_list.get()  # Subtopics list
```

#### Lesson Plan State
```python
# English Lesson Plans
SM.lp_list.get()                 # All lesson plans
SM.chosen_lp.get()               # Currently selected LP
SM.chosen_lp_feedback.get()      # Feedback for current LP

# Kannada Lesson Plans
SM.lp_list_kn.get()              # Kannada lesson plans
SM.chosen_lp_kn.get()            # Selected Kannada LP
SM.chosen_lp_kn_eng.get()        # Corresponding English LP
```

#### Generation History State
```python
SM.gen_history_items.get()       # All generation requests
SM.chosen_gen_history_item.get() # Selected history item
```

#### Video Management State
```python
SM.video_chapter_summary.get()   # Video chapter summary
SM.chosen_chapter_video_details.get()  # Video chapter details
SM.current_video_being_added.get()     # Video being added
```

### State Management Example

```python
from state_manager import StateManager as SM
from data.chapter_lo_subtopic_models import User

# Set user
user = User(_id="user@example.com", name="John Doe", role="TEACHER")
SM.user.set(user)

# Get user
current_user = SM.user.get()

# Get with alternative
chapter_id = SM.chosen_chapter_id.get(alternative="default_id")

# Delete state
SM.chosen_chapter_id.delete()
```

### Navigation State

Navigation is managed separately in `navigation.py`:

```python
from navigation import Navigation as nav

# Set current page
nav.set_current_page(home_lo_edit)

# Get current page
current_page = nav.get_current_page()

# Different navigation routes
nav.set_current_page_edit_lp(page)
nav.set_current_page_edit_lp_kn(page)
nav.set_current_page_gen_history(page)
nav.set_current_page_choose_video(page)
```

## Installation

### Prerequisites
- Python 3.10 or higher
- MongoDB instance
- Google OAuth credentials
- Access to backend API services

### Local Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd golden-lps-streamlit
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file (see Configuration section below)

5. Run the application:
```bash
streamlit run Main.py
```

For testing mode (bypass login):
```bash
streamlit run Main.py -- --mode=test
```

## Configuration

### Environment Variables (.env)

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=shiksha_lp_db

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
OAUTH_REDIRECT_URI=http://localhost:8501

# API Configuration
API_BASE_URL=https://your-backend-api.com
API_KEY=your-api-key-here

# Feature Flags
ENABLE_EDIT_LPS=True
ENABLE_SUBMIT_LP_REQ=True
ENABLE_VIDEO_EDITING=True

# Application Settings
APP_ENV=development
LOG_LEVEL=INFO

# Optional: Azure Functions (for LP Generation)
AZURE_FUNCTION_URL=https://your-function-app.azurewebsites.net
AZURE_FUNCTION_KEY=your-function-key

# Optional: Translation Service
TRANSLATION_API_URL=https://translation-service.com
TRANSLATION_API_KEY=your-translation-key
```

### MongoDB Collections

The application uses the following MongoDB collections:

- `users` - User authentication and profiles
- `uneditedChapters` - Original chapter data
- `editedChapters` - User-edited chapters
- `editedChapterVideo` - Video assignments
- `chapterSummary` - Chapter metadata
- `notEditedLps` - Original English lesson plans
- `editedLps` - Edited English lesson plans
- `notEditedKnLps` - Original Kannada lesson plans
- `editedLpsKn` - Edited Kannada lesson plans
- `lp_feedback` - Lesson plan feedback
- `genTaskStatus` - Generation request tracking

## Usage

### For Teachers

1. **Login**: Use Google account to authenticate
2. **Select Chapter**: Choose board, medium, grade, subject, and chapter
3. **Edit Learning Outcomes**: Add, modify, or remove learning outcomes
4. **Edit Subtopics**: Organize subtopics and create subtopic groups
5. **Edit Lesson Plans**: Review and modify AI-generated lesson plans
6. **Provide Feedback**: Rate and comment on lesson plan quality

### For Administrators

All teacher features, plus:
- **Register New Teachers**: Add new users to the system
- **View All Users**: Manage user accounts
- **Monitor Generation History**: Track all LP generation requests
- **Retrigger Failed Generations**: Restart failed generation jobs

### Running Tests

```bash
# Run in test mode (bypass authentication)
streamlit run Main.py -- --mode=test

# This will log you in as a test admin user
# Email: test-admin-msr@gmail.com
# Name: Kavyansh Chourasia
# Role: ADMIN
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t shiksha-lp-dashboard .
```

### Run Container

```bash
docker run -p 8501:8501 \
  --env-file .env \
  shiksha-lp-dashboard
```

### Docker Compose (Optional)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  streamlit-app:
    build: .
    ports:
      - "8501:8501"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
  
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

Run with:
```bash
docker-compose up -d
```

## Key Technologies

- **Streamlit**: Web application framework
- **PyMongo**: MongoDB driver
- **Pydantic**: Data validation and serialization
- **Python-dotenv**: Environment configuration
- **Requests**: HTTP client for API calls
- **Pytz**: Timezone handling

## Application Flow

```
Main.py (Entry Point)
    │
    ├─── Login (Google OAuth)
    │       └─── Verify User in MongoDB
    │
    └─── Home Dashboard
            │
            ├─── Edit Learning Outcomes & Subtopics
            │       └─── Submit LP Generation Request
            │
            ├─── Edit English Lesson Plans
            │       ├─── Select LP from list
            │       ├─── Edit using 5E framework
            │       └─── Submit feedback
            │
            ├─── Edit Kannada Lesson Plans
            │       ├─── Select LP from list
            │       ├─── Side-by-side editing
            │       └─── Submit changes
            │
            ├─── View Generation History
            │       ├─── Monitor status
            │       └─── Retrigger/Release
            │
            └─── Assign Videos (Admin)
                    ├─── Select chapter
                    └─── Add video metadata
```
