# New Shiksha API Documentation - v2

## Generate/Regenerate Lesson Plan

### Basic Information

- **URL:** `https://lpworkflowdurable.azurewebsites.net/api/v2/lesson-plans`
- **Method:** `POST`
- **Description:** Generates or Regenerates the lesson plan

### Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "user_id": "ADMIN",
  "workflow": {}, # COMPLETE WORKFLOW JSON
  "lp_id": "",
  "lp_level": "SUBTOPIC", # OR `CHAPTER`
  "learning_outcomes": [], # Empty if `lp_level` is `SUBTOPIC`
  "lp_type_english": "NONE", # `PROSE` or `POEM` in case of english LPs
  "chapter_info": {
    "id": "chapter_5",
    "index_path": "/data/indices/science/chapter_5",
    "chapter_title": "Matter and Its Properties"
  },
  "subtopics": [  # Empty if `lp_level` is `CHAPTER`
    {
      "name": "Solids",
      "learning_outcomes": []
    }
  ],
  "lesson_plan": { # `null` if complete regeneration is required after LO change.
    "sections": [
      {
        "section_id": "section_engage",
        "section_title": "Engage",
        "content": "", # CAN BE A DICTIONARY ALSO 
        "regen_feedback": ""
      },
      {
        "section_id": "section_explore",
        "section_title": "Explore",
        "content": "",
        "regen_feedback": ""
      }
    ]
  }
}
```

### Response Body

#### Success Response (200 OK)

```json
{
  "instance_id": "3c4be096f8ea4d958fea77149bcb01c0",
  "statusQueryGetUri": ""
}
```

Live status is sent to the associated Webhook URL as done previously.

Following LP structure is returned on successful generation:

```json
{
    "_id": "Board=KSEEB/Medium=english/Grade=8/Subject=science_2/Number=5/Level=CHAPTER/Topics=ALL",
    "created_at": 1752065241,
    "workflow_id": "karnataka-science-math-chapter-lesson-plan",
    "chapter_id": "Board=KSEEB,Medium=english,Grade=8,Subject=science_2,Number=5,Title=CONSERVATION OF PLANTS & ANIMALS",
    "subtopics": [],
    "learning_outcomes": [
      "Explain deforestation and its causes",
      "Discuss about the impact of deforestation on the environment",
    ],
    "lp_level": "CHAPTER",
    "lp_type_english": "NONE",
    "sections": [
      {
        "section_id": "section_engage",
        "section_title": "Engage",
        "content": "**Start with a captivating question or relatable real-world scenario:**\n\nImagine waking up one day to find that the trees in your neighborhood have..."
      },
      {
        "section_id": "section_explore",
        "section_title": "Explore",
        "content": "- What are the main causes of deforestation, and how can we classify them into..."
      },
      {
        "section_id": "section_explain",
        "section_title": "Explain",
        "content": "**Deforestation and Its Causes**\n\n- **Definition**: Deforestation refers to the clearing of forests for other uses such as agriculture, urban deve..."
      },
      {
        "section_id": "section_elaborate",
        "section_title": "Elaborate",
        "content": "**Pose ..."
      },
      {
        "section_id": "section_evaluate",
        "section_title": "Evaluate",
        "content": "1. Beginner Level Questions:\n   1. Identify the term that describes the variety of living organisms in a specific area.\n      - A. Ecosystem\n      - B. Biodiversity\n      - C. Endemic species\n      - D. Flora\n   2. Define th..."
      },
      {
        "section_id": "section_checklist",
        "section_title": "Checklist",
        "content": {
          "engage": {
            "activity": "Start with a captivating question or relatable real-world scenario about the importance of conserving plants and animals.",
            "materials": "Outline map of India, colored markers, flashcards with intriguing facts."
          },
          "explore": {
            "activity": "Conduct hands-on exploration activities to classify causes of deforestation and understand its impact on the environment.",
            "materials": "Textbook, chart paper, markers, research materials."
          },
          "explain": {
            "activity": "Provide conceptual explanations on deforestation, conservation areas, biodiversity, and related terms.",
            "materials": "Textbook, visual aids, diagrams."
          },
          "elaborate": {
            "activity": "Engage in application activities like debates, restoration planning, and interactive scenarios to apply concepts in new contexts.",
            "materials": "Scenario descriptions, group activity materials, presentation tools."
          },
          "evaluate": {
            "activity": "Use evaluation questions from the question bank to assess understanding of key concepts.",
            "materials": "Quiz questions, answer sheets, evaluation rubrics."
          }
        }
      }
    ]
  }
```

## Regenerate LP Checklist for 5E PDF

### Basic Information

- **URL:** `https://lpworkflowdurable.azurewebsites.net/api/v2/lesson-plans/checklist`
- **Method:** `POST`
- **Description:** Regenerates Checklist taking into account the lp edits

### Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Body

```json
{
  "user_id": "ADMIN",
  "workflow": {}, # COMPLETE WORKFLOW JSON
  "lp_id": "",
  "lp_level": "SUBTOPIC", # OR `CHAPTER`
  "learning_outcomes": [], # Empty if `lp_level` is `SUBTOPIC`
  "lp_type_english": "NONE", # `PROSE` or `POEM` in case of english LPs
  "start_from_section_id": "section_checklist", # CONSTANT
  "chapter_info": {
    "id": "chapter_5",
    "index_path": "/data/indices/science/chapter_5",
    "chapter_title": "Matter and Its Properties"
  },
  "subtopics": [  # Empty if `lp_level` is `CHAPTER`
    {
      "name": "Solids",
      "learning_outcomes": []
    }
  ],
  "lesson_plan": { # 5E sections
    "sections": [
      {
        "section_id": "section_engage",
        "section_title": "Engage",
        "content": "",
      },
      {
        "section_id": "section_explore",
        "section_title": "Explore",
        "content": "",
      },
      {
        "section_id": "section_explain",
        "section_title": "Explain",
        "content": "",
      },
      {
        "section_id": "section_elaborate",
        "section_title": "Elaborate",
        "content": "",
      },
      {
        "section_id": "section_evaluate",
        "section_title": "Evaluate",
        "content": "",
      }
    ]
  }
}
```

### Response Body

#### Success Response (200 OK)

```json
{
  "_id": "lp_001",
  "created_at": 1625074800,
  "workflow_id": "science-subtopic-workflow",
  "chapter_id": "chapter_001",
  "subtopics": ["Introduction to Matter", "Properties of Matter"],
  "learning_outcomes": ["Describe states of matter", "Explain phase changes"],
  "lp_level": "CHAPTER",
  "lp_type_english": "NONE",
  "sections": [
    { # SAME CONTENT FROM REQUEST PAYLOAD
      "section_id": "section_engage",
      "section_title": "Engage",
      "content": "",
      "regen_feedback": ""
    },
    { # SAME CONTENT FROM REQUEST PAYLOAD
      "section_id": "section_explore",
      "section_title": "Explore",
      "content": "",
      "regen_feedback": ""
    },
    { # SAME CONTENT FROM REQUEST PAYLOAD
      "section_id": "section_explain",
      "section_title": "Explain",
      "content": ""
    },
    { # SAME CONTENT FROM REQUEST PAYLOAD
      "section_id": "section_elaborate",
      "section_title": "Elaborate",
      "content": ""
    },
    { # SAME CONTENT FROM REQUEST PAYLOAD
      "section_id": "section_evaluate",
      "section_title": "Evaluate",
      "content": ""
    },
    { # UPDATED CHECKLIST SECTION. JSON FORMAT.
      "section_id": "section_checklist",
      "section_title": "Checklist",
      "content": {
        "engage": {
          "activity": "",
          "materials": ""
        },
        "explore": {
          "activity": "",
          "materials": ""
        },
        "explain": {
          "activity": "",
          "materials": ""
        },
        "elaborate": {
          "activity": "",
          "materials": ""
        },
        "evaluate": {
          "activity": "",
          "materials": ""
        }
      }
    }
  ]
}
```
