from dataclasses import asdict, dataclass, fields
from datetime import datetime
import json
import os
import time
from typing import List

from dotenv import load_dotenv
import requests

from data.chapter_lo_subtopic_models import Chapter, User
from data.models import GenTask, GenTaskStatusDoc, Instruction, InstructionDetailV2, LessonPlan, LessonPlanV2, UserWork
from utils import convert_lesson_plan_to_v2, convert_lesson_plan_v2_to_lp_list_item, convert_lesson_plan_v2_to_v1, generate_dummy_lp_list, remove_all_feedback
from utils.constants import DurableFunctionsStatus
from utils.mongo_db import MongoDB

load_dotenv()

user_work_mongo = MongoDB("userWork")
not_edited_lps_mongo = MongoDB("notEditedLps")
edited_lps_mongo = MongoDB("editedLps")
gen_task_mongo = MongoDB("genTaskStatus")
unedited_chapters_mongo = MongoDB("uneditedChapters")
edited_chapters_mongo = MongoDB("editedChapters")
edited_videos_chapters_mongo = MongoDB("editedChapterVideo")
chapters_summary_mongo = MongoDB("chapterSummary")
users_auth_mongo = MongoDB("users")


CHAPTER_SUMMARY_DOC_ID = "complete-chapter-summary"
VIDEO_CHAPTER_SUMMARY_DOC_ID = "compelete_chapter_summary_video"

def save_user(user: User):
    users_auth_mongo.update_doc(user.dict(), user.id)

def reset_edits_in_chapter(chapter: Chapter):
    edited_chapters_mongo.delete_by_id(chapter.id)
    unedited_chapters_mongo.update_doc({'isEdited': False}, chapter.id)

def get_all_registered_users():
    user_docs = users_auth_mongo.find_all()
    users = [User(**doc) for doc in user_docs]
    return users

def register_teacher(user: User):
    user.id = user.id.lower()
    user_doc = users_auth_mongo.find_by_id(user.id)
    if user_doc != None:
        return False
    users_auth_mongo.insert_doc(user.dict(by_alias=True))
    return True

def get_auth_details(email: str):
    user_doc = users_auth_mongo.find_by_id(email.lower())
    if user_doc != None:
        return User(**user_doc)
    return None

def save_edited_chapter_doc(chapter: Chapter, editedBy: str):
    chapter.isEdited = True
    chapter.user_id = editedBy
    chapter.last_edited_at = int(datetime.now().timestamp())
    edited_chapters_mongo.insert_doc(chapter.dict(by_alias=True))
    
    unedited_chapter = get_chapter_doc_unedited(chapter.id)
    unedited_chapter.isEdited = True
    unedited_chapters_mongo.insert_doc(unedited_chapter.dict(by_alias=True))

def get_chapter_doc_edited(chap_id: str):
    edited_doc = edited_chapters_mongo.find_by_id(chap_id)
    if edited_doc == None:
        raise ValueError(f"UNEDITED CHAPTER DOC WITH ID {chap_id} HAS `isEdited` set to True but no corresponding edited chapter doc found in `editedChapters` collection")
    chapter_edited = Chapter(**edited_doc)
    return chapter_edited

def get_chapter_doc_unedited(chap_id: str):
    doc = unedited_chapters_mongo.find_by_id(chap_id)
    if doc == None:
        raise ValueError(f"NO SUCH DOC IN NOT-EDITED CHAPTER COLLECTION {chap_id}")
    chapter_unedited = Chapter(**doc)
    return chapter_unedited

def get_all_chapter_docs_unedited(chap_ids: list):
    docs = unedited_chapters_mongo.find_all_by_ids(chap_ids)
    return [Chapter(**doc) for doc in docs]

def get_all_chapter_docs_edited(chap_ids: list):
    docs = edited_chapters_mongo.find_all_by_ids(chap_ids)
    return [Chapter(**doc) for doc in docs]

def get_all_chapter_docs_videos_edited(chap_ids: list):
    docs = edited_videos_chapters_mongo.find_all_by_ids(chap_ids)
    return [Chapter(**doc) for doc in docs]

def get_chapter_video_doc_edited(chap_id: str):
    doc = edited_videos_chapters_mongo.find_by_id(chap_id)
    return Chapter(**doc)

def save_edited_video_chapter(chapter: Chapter, editedBy: str):
    chapter.user_id = editedBy
    chapter.last_edited_at = int(datetime.now().timestamp())
    chapter.vetted_videos = True
    unedited_chapters_mongo.update_doc({'vetted_videos': True}, chapter.id)
    edited_videos_chapters_mongo.insert_doc(chapter.model_dump(by_alias=True))
    
def get_unedited_lp_doc(lp_id: str):
    return not_edited_lps_mongo.find_by_id(lp_id)

def get_chapters_summary_doc():
    doc = chapters_summary_mongo.find_by_id(CHAPTER_SUMMARY_DOC_ID)
    if doc == None:
        raise ValueError(f"CHAPTER SUMMARY DOC WITH ID: {CHAPTER_SUMMARY_DOC_ID} IS NOT PRESENT")
    return doc["data"]

def get_video_chapters_summary_doc():
    doc = chapters_summary_mongo.find_by_id(VIDEO_CHAPTER_SUMMARY_DOC_ID)
    if doc == None:
        raise ValueError(f"CHAPTER SUMMARY DOC WITH ID: {VIDEO_CHAPTER_SUMMARY_DOC_ID} IS NOT PRESENT")
    return doc["data"]


def get_gen_task_status(uri: str):
    response = requests.get(uri).json()
    return DurableFunctionsStatus.get_status(response[DurableFunctionsStatus.STATUS_KEY]), response

def completed_editing(lp: LessonPlan):
    pass

def completed_editing_v2(lp: LessonPlanV2):
    save_lp_v2(lp)

def save_lp(lp: LessonPlan):
    # SAVE USING DB API
    pass

def replace_all_feedback(lp_list: list[LessonPlanV2]):
    for lp in remove_all_feedback(lp_list):
        lp.isEdited = False
        lp.preferredTeachingModel = ""
        lp_v1 = convert_lesson_plan_v2_to_v1(lp)
        not_edited_lps_mongo.insert_doc(asdict(lp_v1))

def save_lp_v2(lp: LessonPlanV2):
    now = datetime.now()
    print("************* SAVING LP AT", now)
    lp.isEdited = True
    not_edited_lps_mongo.update_doc({"isEdited": True}, lp._id)
    lp.timestamp = int(now.timestamp())
    lp_v1 = convert_lesson_plan_v2_to_v1(lp)
    document = asdict(lp_v1)
    edited_lps_mongo.insert_doc(document)

def save_lp_v2_to_not_edited(lp: LessonPlanV2):
    now = datetime.now()
    print("************* SAVING FEEDBACK LP AT", now)
    lp.timestamp = int(now.timestamp())
    lp_v1 = convert_lesson_plan_v2_to_v1(lp)
    for field in fields(lp_v1.instructionSet):
        instruction_list: List[Instruction] = getattr(lp_v1.instructionSet, field.name)
        for instruction in instruction_list:
            instruction.content.main = instruction.content.ai
            instruction.content.ai = ""
    for resource in lp_v1.resources:
        resource.content.main = resource.content.ai
        resource.content.ai = ""
            
    document = asdict(lp_v1)
    not_edited_lps_mongo.update_doc(document, lp._id)
    
################## NOT USED ANYMORE #########################
    
# def regenerate_lp(lp: LessonPlanV2):
#     index_blob_url = f"{os.environ['BLOB_STORE_BASE_URL']}/shiksha/data/{lp.board}/{lp.medium}/{lp.grade}/{lp.subject}/{lp.chapter_number}/index/pdf_idx"
#     payload = {
#         "lp": asdict(convert_lesson_plan_v2_to_v1(lp)),
#         "index_url": index_blob_url
#     }
#     print("***************** MAKING DURABLE FUNCTIONS CALL", payload)
#     response = requests.post(os.environ["DURABLE_FUNCTIONS_URL"], json=payload)
#     response_json = response.json()
    
#     # UPDATE GEN TASK DOC
#     gen_task_status_doc = fetch_user_gen_tasks(lp.userId)
#     status, resp = get_gen_task_status(response_json[DurableFunctionsStatus.STATUS_URI_KEY])
#     curr_gen_task = GenTask(created_timestamp=int(datetime.now().timestamp()), 
#                             lp_id=lp._id, 
#                             statusURI=response_json[DurableFunctionsStatus.STATUS_URI_KEY],
#                             doc=resp, 
#                             status=status,
#                             )

#     if lp._id not in gen_task_status_doc.tasks:
#         gen_task_status_doc.tasks[lp._id] = []
    
#     gen_task_status_doc.tasks[lp._id].append(curr_gen_task)
#     save_user_gen_task(gen_task_status_doc)
    
    
def regenerate(lp_id: str, lp_component: str, method_of_teaching: str = "", usr_msg: str = ""):
    return f"""
    {lp_id} {lp_component} {method_of_teaching} {usr_msg}
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. 
    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.
    """

def fetch_items(user_id: str):
    from state_manager import StateManager as SM
    
    lps_v2 = SM.lp_list_v2.get()
    gen_tasks_doc = fetch_user_gen_tasks(user_id)
    if lps_v2 is None:
        print("*************** FETCHING LP LIST AT", datetime.now())
        user_work = fetch_user_work(user_id)
        lp_docs = not_edited_lps_mongo.find_all_by_ids(user_work.assignedLpIds)
        lps = [convert_lesson_plan_to_v2(LessonPlan(**doc)) for doc in lp_docs]
        # replace_all_feedback(lps)
        not_edited_lps = []
        edited_lps = []
        for lp in lps:
            # INIT AI VALUES IN NON-EDITED LPs
            for mot in lp.instructionSet:
                for field in fields(mot.instructions):
                    instructions_v2: InstructionDetailV2 = getattr(mot.instructions, field.name)
                    instructions_v2.instructions.ai = instructions_v2.instructions.main
            for resource in lp.resources:
                resource.content.ai = resource.content.main
            
            if not lp.isEdited:
                not_edited_lps.append(lp)
            else:
                doc = edited_lps_mongo.find_by_id(lp._id)
                if doc is None:
                    raise ValueError("EDITED LP DOC IS NONE: ", lp._id)
                lp_v2_edited = convert_lesson_plan_to_v2(LessonPlan(**doc))
                lp.timestamp = lp_v2_edited.timestamp
                lp.learningOutcomes = lp_v2_edited.learningOutcomes
                
                # UPDATE MAIN VALUE IN NOT-EDITED LP, WITH MAIN VALUE FROM EDITED LP
                for mot_not_edited, mot_edited in zip(lp.instructionSet, lp_v2_edited.instructionSet):
                    for field in fields(mot_not_edited.instructions):
                        # field = "engage"...
                        instructions_v2_not_edited: InstructionDetailV2 = getattr(mot_not_edited.instructions, field.name)
                        instructions_v2_edited: InstructionDetailV2 = getattr(mot_edited.instructions, field.name)
                        
                        instructions_v2_not_edited.instructions.main = instructions_v2_edited.instructions.main
                
                for resource_not_edited, resource_edited in zip(lp.resources, lp_v2_edited.resources):
                    resource_not_edited.content.main = resource_edited.content.main
                
                edited_lps.append(lp)
        
        lps_v2 = not_edited_lps + edited_lps
        for lp in lps_v2:
            lp.userId = user_id

        SM.lp_list_v2.set(lps_v2)
    
    all_lp_list_items = [convert_lesson_plan_v2_to_lp_list_item(lp) for lp in lps_v2]  
    for lp_list_item in all_lp_list_items:
        if lp_list_item.id in gen_tasks_doc.tasks:
            tasks = gen_tasks_doc.tasks[lp_list_item.id]
            latest_task = max(tasks, key=lambda x: x.created_timestamp)
            lp_list_item.status = latest_task.status
    
    has_not_been_edited = [item for item in all_lp_list_items if not item.has_been_edited]    
    has_not_been_edited = sorted(has_not_been_edited, key=lambda item: (int(item.grade), item.subject), reverse=True)
    
    has_been_edited = [item for item in all_lp_list_items if item.has_been_edited]
    has_been_edited = sorted(has_been_edited, key=lambda item: (item.last_edited_at, int(item.grade), item.subject), reverse=True)

    items = has_not_been_edited + has_been_edited
    
    return items

def fetch_lp_by_id(id: str):
    print("FETCHING LP FOR FIRST TIME")
    json_data = {
        "_id" : id,
        "userId" : "833b140f-78db-499c-b90f-4db17bfd283a",
        "timestamp" : 1704761617,
        "chapterId" : "0ce1ea4e-69fe-11ee-87aa-d03c1f059da2",
        "topics" : [
            "2.4 Properties of Whole Numbers"
        ],
        "learningOutcomes" : "Learn about the various properties of whole numbers, such as commutative, associative, and distributive properties.\n Apply these properties to solve mathematical problems involving whole numbers.",
        "videos" : [ ],
        "interactOutput" : "",
        "isEmpty" : False,
        "instructionSet" : {
            "ENGAGE" : [
                {
                    "methodOfTeaching": "Method A",
                    "content": {
                        "main" : "\n\nIntroduction: Imagine that you and your friend want to split a candy bar into equal parts. How would you do it? Would you cut it in half? What if there were more people? In this lesson, we will explore the properties of whole numbers that will help us solve problems like this one.\n\nKey Concepts: In this lesson, we will learn about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily.\n\nReal-world Scenario: Imagine you are at a grocery store with your parents, and they ask you to calculate the total cost of the items in their cart. How can you use the properties of whole numbers to make this calculation easier and faster?\n\nNarrative: Whole numbers are an essential part of our daily lives, from counting money to telling time. Understanding the properties of whole numbers can help us solve problems in various fields, including science, technology, and engineering.\n\nVocabulary: whole numbers, commutative property, associative property, distributive property\n\nClassroom Process (Facilitating Activities):\n1. Candy Bar Challenge: Students will work in pairs to divide a candy bar into equal parts using whole numbers.\n2. Grocery Store Challenge: Students will work in groups to calculate the total cost of items in a hypothetical grocery cart using the properties of whole numbers.\n3. Number Patterns: Students will explore number patterns and how they relate to the properties of whole numbers.\n\nMaterials/Resources Required (TML):\n- Candy bars\n- Grocery receipts\n- Whiteboard and markers\n- Worksheets on number patterns\n\nCCE Tools & Techniques: \n- Observation: Observe students' engagement and participation during the activities.\n- Questioning: Ask students questions to gauge their understanding of the properties of whole numbers.\n- Peer assessment: Have students evaluate each other's work during the activities.\n\nTeacher Reflection: After the ENGAGE phase, reflect on the effectiveness of the activities, student engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : " In this lesson, we learned about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily. We also explored real-world scenarios where understanding the properties of whole numbers can be helpful, such as dividing a candy bar or calculating the total cost of items in a grocery cart.",
                        "original" : "MAIN_CONTENT:\n\nIntroduction: Imagine that you and your friend want to split a candy bar into equal parts. How would you do it? Would you cut it in half? What if there were more people? In this lesson, we will explore the properties of whole numbers that will help us solve problems like this one.\n\nKey Concepts: In this lesson, we will learn about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily.\n\nReal-world Scenario: Imagine you are at a grocery store with your parents, and they ask you to calculate the total cost of the items in their cart. How can you use the properties of whole numbers to make this calculation easier and faster?\n\nNarrative: Whole numbers are an essential part of our daily lives, from counting money to telling time. Understanding the properties of whole numbers can help us solve problems in various fields, including science, technology, and engineering.\n\nVocabulary: whole numbers, commutative property, associative property, distributive property\n\nClassroom Process (Facilitating Activities):\n1. Candy Bar Challenge: Students will work in pairs to divide a candy bar into equal parts using whole numbers.\n2. Grocery Store Challenge: Students will work in groups to calculate the total cost of items in a hypothetical grocery cart using the properties of whole numbers.\n3. Number Patterns: Students will explore number patterns and how they relate to the properties of whole numbers.\n\nMaterials/Resources Required (TML):\n- Candy bars\n- Grocery receipts\n- Whiteboard and markers\n- Worksheets on number patterns\n\nCCE Tools & Techniques: \n- Observation: Observe students' engagement and participation during the activities.\n- Questioning: Ask students questions to gauge their understanding of the properties of whole numbers.\n- Peer assessment: Have students evaluate each other's work during the activities.\n\nTeacher Reflection: After the ENGAGE phase, reflect on the effectiveness of the activities, student engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT: In this lesson, we learned about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily. We also explored real-world scenarios where understanding the properties of whole numbers can be helpful, such as dividing a candy bar or calculating the total cost of items in a grocery cart."
                    }
                },
                {
                    "methodOfTeaching": "Method B",
                    "content": {
                        "main" : "\n\nIntroduction: Imagine that you and your friend want to split a candy bar into equal parts. How would you do it? Would you cut it in half? What if there were more people? In this lesson, we will explore the properties of whole numbers that will help us solve problems like this one.\n\nKey Concepts: In this lesson, we will learn about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily.\n\nReal-world Scenario: Imagine you are at a grocery store with your parents, and they ask you to calculate the total cost of the items in their cart. How can you use the properties of whole numbers to make this calculation easier and faster?\n\nNarrative: Whole numbers are an essential part of our daily lives, from counting money to telling time. Understanding the properties of whole numbers can help us solve problems in various fields, including science, technology, and engineering.\n\nVocabulary: whole numbers, commutative property, associative property, distributive property\n\nClassroom Process (Facilitating Activities):\n1. Candy Bar Challenge: Students will work in pairs to divide a candy bar into equal parts using whole numbers.\n2. Grocery Store Challenge: Students will work in groups to calculate the total cost of items in a hypothetical grocery cart using the properties of whole numbers.\n3. Number Patterns: Students will explore number patterns and how they relate to the properties of whole numbers.\n\nMaterials/Resources Required (TML):\n- Candy bars\n- Grocery receipts\n- Whiteboard and markers\n- Worksheets on number patterns\n\nCCE Tools & Techniques: \n- Observation: Observe students' engagement and participation during the activities.\n- Questioning: Ask students questions to gauge their understanding of the properties of whole numbers.\n- Peer assessment: Have students evaluate each other's work during the activities.\n\nTeacher Reflection: After the ENGAGE phase, reflect on the effectiveness of the activities, student engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : " In this lesson, we learned about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily. We also explored real-world scenarios where understanding the properties of whole numbers can be helpful, such as dividing a candy bar or calculating the total cost of items in a grocery cart.",
                        "original" : "MAIN_CONTENT:\n\nIntroduction: Imagine that you and your friend want to split a candy bar into equal parts. How would you do it? Would you cut it in half? What if there were more people? In this lesson, we will explore the properties of whole numbers that will help us solve problems like this one.\n\nKey Concepts: In this lesson, we will learn about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily.\n\nReal-world Scenario: Imagine you are at a grocery store with your parents, and they ask you to calculate the total cost of the items in their cart. How can you use the properties of whole numbers to make this calculation easier and faster?\n\nNarrative: Whole numbers are an essential part of our daily lives, from counting money to telling time. Understanding the properties of whole numbers can help us solve problems in various fields, including science, technology, and engineering.\n\nVocabulary: whole numbers, commutative property, associative property, distributive property\n\nClassroom Process (Facilitating Activities):\n1. Candy Bar Challenge: Students will work in pairs to divide a candy bar into equal parts using whole numbers.\n2. Grocery Store Challenge: Students will work in groups to calculate the total cost of items in a hypothetical grocery cart using the properties of whole numbers.\n3. Number Patterns: Students will explore number patterns and how they relate to the properties of whole numbers.\n\nMaterials/Resources Required (TML):\n- Candy bars\n- Grocery receipts\n- Whiteboard and markers\n- Worksheets on number patterns\n\nCCE Tools & Techniques: \n- Observation: Observe students' engagement and participation during the activities.\n- Questioning: Ask students questions to gauge their understanding of the properties of whole numbers.\n- Peer assessment: Have students evaluate each other's work during the activities.\n\nTeacher Reflection: After the ENGAGE phase, reflect on the effectiveness of the activities, student engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT: In this lesson, we learned about the commutative, associative, and distributive properties of whole numbers. These properties help us add, subtract, multiply, and divide whole numbers more easily. We also explored real-world scenarios where understanding the properties of whole numbers can be helpful, such as dividing a candy bar or calculating the total cost of items in a grocery cart."
                    }
                }
            ],
            "EXPLAIN" : [
                {
                    "methodOfTeaching": "Method A",
                    "content": {
                        "main" : "\nEXPLAIN Phase Outline:\nConcept Title: Properties of Whole Numbers\n- \"Definition\": The properties of whole numbers are the characteristics or rules that apply to the operations of addition and multiplication of whole numbers.\n- \"Characteristics\": The properties of whole numbers include commutativity, associativity, distributivity, and identity.\n- \"Key Features and Facts\":\n    - Commutativity: The order of numbers does not affect the outcome of addition or multiplication. For example, 2 + 3 = 3 + 2 and 2 x 3 = 3 x 2.\n    - Associativity: The grouping of numbers does not affect the outcome of addition or multiplication. For example, (2 + 3) + 4 = 2 + (3 + 4) and (2 x 3) x 4 = 2 x (3 x 4).\n    - Distributivity: Multiplication distributes over addition. For example, 2 x (3 + 4) = (2 x 3) + (2 x 4).\n    - Identity: The identity for addition is 0 and the identity for multiplication is 1.\nClassroom Process (Facilitating Activities):\n1. Commutativity Activity: Provide students with a list of addition and multiplication problems and have them rearrange the order of the numbers to demonstrate commutativity.\n2. Associativity Activity: Provide students with a list of addition and multiplication problems and have them group the numbers differently to demonstrate associativity.\n3. Distributivity Activity: Provide students with a list of addition and multiplication problems and have them use distributivity to simplify the expressions.\n4. Identity Activity: Provide students with addition and multiplication problems and have them identify the identity element in each operation.\nMaterials/Resources Required (TML):\n1. Handouts with addition and multiplication problems\n2. Whiteboard and markers\nCCE Tools & Techniques:\n1. Formative Assessment: Observe students during the activities to gauge their understanding of the properties of whole numbers.\n2. Exit Ticket: Have students complete a short quiz on the properties of whole numbers before leaving the class to assess their understanding.\nTeacher Reflection: After the activities, reflect on the effectiveness of each activity and adjust them if necessary. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : "\nIn this topic, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties. They also learned how to apply these properties to solve mathematical problems involving whole numbers. Through interactive activities, students explored the properties and demonstrated their understanding.",
                        "original" : "MAIN_CONTENT:\nEXPLAIN Phase Outline:\nConcept Title: Properties of Whole Numbers\n- \"Definition\": The properties of whole numbers are the characteristics or rules that apply to the operations of addition and multiplication of whole numbers.\n- \"Characteristics\": The properties of whole numbers include commutativity, associativity, distributivity, and identity.\n- \"Key Features and Facts\":\n    - Commutativity: The order of numbers does not affect the outcome of addition or multiplication. For example, 2 + 3 = 3 + 2 and 2 x 3 = 3 x 2.\n    - Associativity: The grouping of numbers does not affect the outcome of addition or multiplication. For example, (2 + 3) + 4 = 2 + (3 + 4) and (2 x 3) x 4 = 2 x (3 x 4).\n    - Distributivity: Multiplication distributes over addition. For example, 2 x (3 + 4) = (2 x 3) + (2 x 4).\n    - Identity: The identity for addition is 0 and the identity for multiplication is 1.\nClassroom Process (Facilitating Activities):\n1. Commutativity Activity: Provide students with a list of addition and multiplication problems and have them rearrange the order of the numbers to demonstrate commutativity.\n2. Associativity Activity: Provide students with a list of addition and multiplication problems and have them group the numbers differently to demonstrate associativity.\n3. Distributivity Activity: Provide students with a list of addition and multiplication problems and have them use distributivity to simplify the expressions.\n4. Identity Activity: Provide students with addition and multiplication problems and have them identify the identity element in each operation.\nMaterials/Resources Required (TML):\n1. Handouts with addition and multiplication problems\n2. Whiteboard and markers\nCCE Tools & Techniques:\n1. Formative Assessment: Observe students during the activities to gauge their understanding of the properties of whole numbers.\n2. Exit Ticket: Have students complete a short quiz on the properties of whole numbers before leaving the class to assess their understanding.\nTeacher Reflection: After the activities, reflect on the effectiveness of each activity and adjust them if necessary. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT:\nIn this topic, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties. They also learned how to apply these properties to solve mathematical problems involving whole numbers. Through interactive activities, students explored the properties and demonstrated their understanding."
                    }
                },
                {
                    "methodOfTeaching": "Method B",
                    "content": {
                        "main" : "\nEXPLAIN Phase Outline:\nConcept Title: Properties of Whole Numbers\n- \"Definition\": The properties of whole numbers are the characteristics or rules that apply to the operations of addition and multiplication of whole numbers.\n- \"Characteristics\": The properties of whole numbers include commutativity, associativity, distributivity, and identity.\n- \"Key Features and Facts\":\n    - Commutativity: The order of numbers does not affect the outcome of addition or multiplication. For example, 2 + 3 = 3 + 2 and 2 x 3 = 3 x 2.\n    - Associativity: The grouping of numbers does not affect the outcome of addition or multiplication. For example, (2 + 3) + 4 = 2 + (3 + 4) and (2 x 3) x 4 = 2 x (3 x 4).\n    - Distributivity: Multiplication distributes over addition. For example, 2 x (3 + 4) = (2 x 3) + (2 x 4).\n    - Identity: The identity for addition is 0 and the identity for multiplication is 1.\nClassroom Process (Facilitating Activities):\n1. Commutativity Activity: Provide students with a list of addition and multiplication problems and have them rearrange the order of the numbers to demonstrate commutativity.\n2. Associativity Activity: Provide students with a list of addition and multiplication problems and have them group the numbers differently to demonstrate associativity.\n3. Distributivity Activity: Provide students with a list of addition and multiplication problems and have them use distributivity to simplify the expressions.\n4. Identity Activity: Provide students with addition and multiplication problems and have them identify the identity element in each operation.\nMaterials/Resources Required (TML):\n1. Handouts with addition and multiplication problems\n2. Whiteboard and markers\nCCE Tools & Techniques:\n1. Formative Assessment: Observe students during the activities to gauge their understanding of the properties of whole numbers.\n2. Exit Ticket: Have students complete a short quiz on the properties of whole numbers before leaving the class to assess their understanding.\nTeacher Reflection: After the activities, reflect on the effectiveness of each activity and adjust them if necessary. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : "\nIn this topic, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties. They also learned how to apply these properties to solve mathematical problems involving whole numbers. Through interactive activities, students explored the properties and demonstrated their understanding.",
                        "original" : "MAIN_CONTENT:\nEXPLAIN Phase Outline:\nConcept Title: Properties of Whole Numbers\n- \"Definition\": The properties of whole numbers are the characteristics or rules that apply to the operations of addition and multiplication of whole numbers.\n- \"Characteristics\": The properties of whole numbers include commutativity, associativity, distributivity, and identity.\n- \"Key Features and Facts\":\n    - Commutativity: The order of numbers does not affect the outcome of addition or multiplication. For example, 2 + 3 = 3 + 2 and 2 x 3 = 3 x 2.\n    - Associativity: The grouping of numbers does not affect the outcome of addition or multiplication. For example, (2 + 3) + 4 = 2 + (3 + 4) and (2 x 3) x 4 = 2 x (3 x 4).\n    - Distributivity: Multiplication distributes over addition. For example, 2 x (3 + 4) = (2 x 3) + (2 x 4).\n    - Identity: The identity for addition is 0 and the identity for multiplication is 1.\nClassroom Process (Facilitating Activities):\n1. Commutativity Activity: Provide students with a list of addition and multiplication problems and have them rearrange the order of the numbers to demonstrate commutativity.\n2. Associativity Activity: Provide students with a list of addition and multiplication problems and have them group the numbers differently to demonstrate associativity.\n3. Distributivity Activity: Provide students with a list of addition and multiplication problems and have them use distributivity to simplify the expressions.\n4. Identity Activity: Provide students with addition and multiplication problems and have them identify the identity element in each operation.\nMaterials/Resources Required (TML):\n1. Handouts with addition and multiplication problems\n2. Whiteboard and markers\nCCE Tools & Techniques:\n1. Formative Assessment: Observe students during the activities to gauge their understanding of the properties of whole numbers.\n2. Exit Ticket: Have students complete a short quiz on the properties of whole numbers before leaving the class to assess their understanding.\nTeacher Reflection: After the activities, reflect on the effectiveness of each activity and adjust them if necessary. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT:\nIn this topic, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties. They also learned how to apply these properties to solve mathematical problems involving whole numbers. Through interactive activities, students explored the properties and demonstrated their understanding."
                    }
                }
            ],
            "ELABORATE" : [
                {
                    "methodOfTeaching": "Method A",
                    "content": {
                        "main" : "\nELABORATE Phase:\nIn this phase, students will apply the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. The following activities are designed to deepen students' comprehension and extend their learning beyond the classroom.\n\nReal-World Examples:\nBegin by discussing real-world examples of the properties of whole numbers. For example, commutative property can be applied to food recipes where the order of ingredients doesn't matter, and associative property can be applied to grouping items in a store to make it easier for customers to find them.\n\nIndividual Task:\nProvide each student with a sheet of paper and ask them to create a comic strip that illustrates the commutative, associative, or distributive property of whole numbers. This will encourage creative expression and application of knowledge.\n\nGroup Activity:\nDivide students into small groups and provide each group with a set of whole number cards. Ask them to use the cards to create equations that demonstrate the properties of whole numbers. This activity encourages collaboration and communication among students.\n\nCompetitive Element:\nOrganize a whole number relay race where students have to solve equations that demonstrate the properties of whole numbers. The first team to complete the race wins. This fun challenge reinforces the concepts and encourages healthy competition.\n\nCreative Writing Assignment:\nAsk students to write a short story that incorporates the properties of whole numbers in an imaginative context. This allows students to synthesize their understanding of 2.4 Properties of Whole Numbers and encourages creative thinking.\n\nMaterials/Resources Required:\n- Paper and art supplies for comic strip activity\n- Whole number cards for group activity \n- Stopwatch or timer for relay race\n- Writing materials for creative writing assignment\n\nCCE Tools & Techniques:\n- Assess the comic strip activity based on creativity and accuracy of demonstrating the properties of whole numbers.\n- Assess the group activity based on collaboration and communication among students.\n- Assess the relay race based on accuracy and speed of solving equations.\n- Assess the creative writing assignment based on incorporation of the properties of whole numbers in an imaginative context.\n\nTeacher Reflection:\nAfter the completion of the ELABORATE phase, reflect on the effectiveness of the activities, students' engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : "\nIn this 5E instructional model, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties and applied these properties to solve mathematical problems involving whole numbers. In the ELABORATE phase, students deepened their comprehension and extended their learning beyond the classroom by applying the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. These activities included creating a comic strip, a group activity using whole number cards, a relay race, and a creative writing assignment. By the end of this phase, students were able to synthesize their understanding of 2.4 Properties of Whole Numbers in an imaginative context.",
                        "original" : "MAIN_CONTENT:\nELABORATE Phase:\nIn this phase, students will apply the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. The following activities are designed to deepen students' comprehension and extend their learning beyond the classroom.\n\nReal-World Examples:\nBegin by discussing real-world examples of the properties of whole numbers. For example, commutative property can be applied to food recipes where the order of ingredients doesn't matter, and associative property can be applied to grouping items in a store to make it easier for customers to find them.\n\nIndividual Task:\nProvide each student with a sheet of paper and ask them to create a comic strip that illustrates the commutative, associative, or distributive property of whole numbers. This will encourage creative expression and application of knowledge.\n\nGroup Activity:\nDivide students into small groups and provide each group with a set of whole number cards. Ask them to use the cards to create equations that demonstrate the properties of whole numbers. This activity encourages collaboration and communication among students.\n\nCompetitive Element:\nOrganize a whole number relay race where students have to solve equations that demonstrate the properties of whole numbers. The first team to complete the race wins. This fun challenge reinforces the concepts and encourages healthy competition.\n\nCreative Writing Assignment:\nAsk students to write a short story that incorporates the properties of whole numbers in an imaginative context. This allows students to synthesize their understanding of 2.4 Properties of Whole Numbers and encourages creative thinking.\n\nMaterials/Resources Required:\n- Paper and art supplies for comic strip activity\n- Whole number cards for group activity \n- Stopwatch or timer for relay race\n- Writing materials for creative writing assignment\n\nCCE Tools & Techniques:\n- Assess the comic strip activity based on creativity and accuracy of demonstrating the properties of whole numbers.\n- Assess the group activity based on collaboration and communication among students.\n- Assess the relay race based on accuracy and speed of solving equations.\n- Assess the creative writing assignment based on incorporation of the properties of whole numbers in an imaginative context.\n\nTeacher Reflection:\nAfter the completion of the ELABORATE phase, reflect on the effectiveness of the activities, students' engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT:\nIn this 5E instructional model, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties and applied these properties to solve mathematical problems involving whole numbers. In the ELABORATE phase, students deepened their comprehension and extended their learning beyond the classroom by applying the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. These activities included creating a comic strip, a group activity using whole number cards, a relay race, and a creative writing assignment. By the end of this phase, students were able to synthesize their understanding of 2.4 Properties of Whole Numbers in an imaginative context."
                    }
                },
                {
                    "methodOfTeaching": "Method B",
                    "content": {
                        "main" : "\nELABORATE Phase:\nIn this phase, students will apply the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. The following activities are designed to deepen students' comprehension and extend their learning beyond the classroom.\n\nReal-World Examples:\nBegin by discussing real-world examples of the properties of whole numbers. For example, commutative property can be applied to food recipes where the order of ingredients doesn't matter, and associative property can be applied to grouping items in a store to make it easier for customers to find them.\n\nIndividual Task:\nProvide each student with a sheet of paper and ask them to create a comic strip that illustrates the commutative, associative, or distributive property of whole numbers. This will encourage creative expression and application of knowledge.\n\nGroup Activity:\nDivide students into small groups and provide each group with a set of whole number cards. Ask them to use the cards to create equations that demonstrate the properties of whole numbers. This activity encourages collaboration and communication among students.\n\nCompetitive Element:\nOrganize a whole number relay race where students have to solve equations that demonstrate the properties of whole numbers. The first team to complete the race wins. This fun challenge reinforces the concepts and encourages healthy competition.\n\nCreative Writing Assignment:\nAsk students to write a short story that incorporates the properties of whole numbers in an imaginative context. This allows students to synthesize their understanding of 2.4 Properties of Whole Numbers and encourages creative thinking.\n\nMaterials/Resources Required:\n- Paper and art supplies for comic strip activity\n- Whole number cards for group activity \n- Stopwatch or timer for relay race\n- Writing materials for creative writing assignment\n\nCCE Tools & Techniques:\n- Assess the comic strip activity based on creativity and accuracy of demonstrating the properties of whole numbers.\n- Assess the group activity based on collaboration and communication among students.\n- Assess the relay race based on accuracy and speed of solving equations.\n- Assess the creative writing assignment based on incorporation of the properties of whole numbers in an imaginative context.\n\nTeacher Reflection:\nAfter the completion of the ELABORATE phase, reflect on the effectiveness of the activities, students' engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : "\nIn this 5E instructional model, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties and applied these properties to solve mathematical problems involving whole numbers. In the ELABORATE phase, students deepened their comprehension and extended their learning beyond the classroom by applying the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. These activities included creating a comic strip, a group activity using whole number cards, a relay race, and a creative writing assignment. By the end of this phase, students were able to synthesize their understanding of 2.4 Properties of Whole Numbers in an imaginative context.",
                        "original" : "MAIN_CONTENT:\nELABORATE Phase:\nIn this phase, students will apply the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. The following activities are designed to deepen students' comprehension and extend their learning beyond the classroom.\n\nReal-World Examples:\nBegin by discussing real-world examples of the properties of whole numbers. For example, commutative property can be applied to food recipes where the order of ingredients doesn't matter, and associative property can be applied to grouping items in a store to make it easier for customers to find them.\n\nIndividual Task:\nProvide each student with a sheet of paper and ask them to create a comic strip that illustrates the commutative, associative, or distributive property of whole numbers. This will encourage creative expression and application of knowledge.\n\nGroup Activity:\nDivide students into small groups and provide each group with a set of whole number cards. Ask them to use the cards to create equations that demonstrate the properties of whole numbers. This activity encourages collaboration and communication among students.\n\nCompetitive Element:\nOrganize a whole number relay race where students have to solve equations that demonstrate the properties of whole numbers. The first team to complete the race wins. This fun challenge reinforces the concepts and encourages healthy competition.\n\nCreative Writing Assignment:\nAsk students to write a short story that incorporates the properties of whole numbers in an imaginative context. This allows students to synthesize their understanding of 2.4 Properties of Whole Numbers and encourages creative thinking.\n\nMaterials/Resources Required:\n- Paper and art supplies for comic strip activity\n- Whole number cards for group activity \n- Stopwatch or timer for relay race\n- Writing materials for creative writing assignment\n\nCCE Tools & Techniques:\n- Assess the comic strip activity based on creativity and accuracy of demonstrating the properties of whole numbers.\n- Assess the group activity based on collaboration and communication among students.\n- Assess the relay race based on accuracy and speed of solving equations.\n- Assess the creative writing assignment based on incorporation of the properties of whole numbers in an imaginative context.\n\nTeacher Reflection:\nAfter the completion of the ELABORATE phase, reflect on the effectiveness of the activities, students' engagement, and any unexpected challenges. Consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT:\nIn this 5E instructional model, students learned about the various properties of whole numbers, such as commutative, associative, and distributive properties and applied these properties to solve mathematical problems involving whole numbers. In the ELABORATE phase, students deepened their comprehension and extended their learning beyond the classroom by applying the concepts learned about 2.4 Properties of Whole Numbers to real-world contexts and hands-on experiences through engaging, interactive activities. These activities included creating a comic strip, a group activity using whole number cards, a relay race, and a creative writing assignment. By the end of this phase, students were able to synthesize their understanding of 2.4 Properties of Whole Numbers in an imaginative context."
                    }
                }
            ],
            "EXPLORE" : [
                {
                    "methodOfTeaching": "Method A",
                    "content": {
                        "main" : "\nEXPLORE:\n1. Take any two whole numbers and add them. Is the result always a whole number?\n2. Take any two whole numbers and multiply them. Is the result always a whole number?\n3. Find examples of commutative, associative and distributive properties in whole numbers.\n\nActivities:\n1. Students will work in pairs or groups to add and multiply whole numbers and determine if the result is a whole number or not.\n2. Students will use manipulatives or drawings to demonstrate the commutative, associative and distributive properties of whole numbers.\n3. Students will create their own problems that showcase the commutative, associative and distributive properties of whole numbers.\n\nMaterials/Resources:\n- Whiteboards and markers\n- Manipulatives such as blocks or counters\n- Worksheets with problems for addition and multiplication\n\nCCE Tools & Techniques:\n- Formative assessment through classroom observation and questioning during the activities.\n- Peer evaluation where students evaluate each other's work and provide feedback.\n\nTeacher Reflection:\nAfter the completion of the EXPLORE phase, the teacher will reflect on the effectiveness of the activities and student engagement. The teacher will also consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : "\nIn this lesson, students explored the properties of whole numbers through hands-on activities. They learned that whole numbers are closed under addition and multiplication, and demonstrated commutative, associative, and distributive properties of whole numbers. Students were able to apply these properties to solve mathematical problems involving whole numbers.",
                        "original" : "MAIN_CONTENT:\nEXPLORE:\n1. Take any two whole numbers and add them. Is the result always a whole number?\n2. Take any two whole numbers and multiply them. Is the result always a whole number?\n3. Find examples of commutative, associative and distributive properties in whole numbers.\n\nActivities:\n1. Students will work in pairs or groups to add and multiply whole numbers and determine if the result is a whole number or not.\n2. Students will use manipulatives or drawings to demonstrate the commutative, associative and distributive properties of whole numbers.\n3. Students will create their own problems that showcase the commutative, associative and distributive properties of whole numbers.\n\nMaterials/Resources:\n- Whiteboards and markers\n- Manipulatives such as blocks or counters\n- Worksheets with problems for addition and multiplication\n\nCCE Tools & Techniques:\n- Formative assessment through classroom observation and questioning during the activities.\n- Peer evaluation where students evaluate each other's work and provide feedback.\n\nTeacher Reflection:\nAfter the completion of the EXPLORE phase, the teacher will reflect on the effectiveness of the activities and student engagement. The teacher will also consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT:\nIn this lesson, students explored the properties of whole numbers through hands-on activities. They learned that whole numbers are closed under addition and multiplication, and demonstrated commutative, associative, and distributive properties of whole numbers. Students were able to apply these properties to solve mathematical problems involving whole numbers."
                    }
                },
                {
                    "methodOfTeaching": "Method B",
                    "content": {
                        "main" : "\nEXPLORE:\n1. Take any two whole numbers and add them. Is the result always a whole number?\n2. Take any two whole numbers and multiply them. Is the result always a whole number?\n3. Find examples of commutative, associative and distributive properties in whole numbers.\n\nActivities:\n1. Students will work in pairs or groups to add and multiply whole numbers and determine if the result is a whole number or not.\n2. Students will use manipulatives or drawings to demonstrate the commutative, associative and distributive properties of whole numbers.\n3. Students will create their own problems that showcase the commutative, associative and distributive properties of whole numbers.\n\nMaterials/Resources:\n- Whiteboards and markers\n- Manipulatives such as blocks or counters\n- Worksheets with problems for addition and multiplication\n\nCCE Tools & Techniques:\n- Formative assessment through classroom observation and questioning during the activities.\n- Peer evaluation where students evaluate each other's work and provide feedback.\n\nTeacher Reflection:\nAfter the completion of the EXPLORE phase, the teacher will reflect on the effectiveness of the activities and student engagement. The teacher will also consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\n",
                        "summary" : "\nIn this lesson, students explored the properties of whole numbers through hands-on activities. They learned that whole numbers are closed under addition and multiplication, and demonstrated commutative, associative, and distributive properties of whole numbers. Students were able to apply these properties to solve mathematical problems involving whole numbers.",
                        "original" : "MAIN_CONTENT:\nEXPLORE:\n1. Take any two whole numbers and add them. Is the result always a whole number?\n2. Take any two whole numbers and multiply them. Is the result always a whole number?\n3. Find examples of commutative, associative and distributive properties in whole numbers.\n\nActivities:\n1. Students will work in pairs or groups to add and multiply whole numbers and determine if the result is a whole number or not.\n2. Students will use manipulatives or drawings to demonstrate the commutative, associative and distributive properties of whole numbers.\n3. Students will create their own problems that showcase the commutative, associative and distributive properties of whole numbers.\n\nMaterials/Resources:\n- Whiteboards and markers\n- Manipulatives such as blocks or counters\n- Worksheets with problems for addition and multiplication\n\nCCE Tools & Techniques:\n- Formative assessment through classroom observation and questioning during the activities.\n- Peer evaluation where students evaluate each other's work and provide feedback.\n\nTeacher Reflection:\nAfter the completion of the EXPLORE phase, the teacher will reflect on the effectiveness of the activities and student engagement. The teacher will also consider how well the activities connected with the learning outcomes and if there are areas for improvement in future lessons.\n\nSUMMARY_CONTENT:\nIn this lesson, students explored the properties of whole numbers through hands-on activities. They learned that whole numbers are closed under addition and multiplication, and demonstrated commutative, associative, and distributive properties of whole numbers. Students were able to apply these properties to solve mathematical problems involving whole numbers."
                    }
                }
            ],
            "EVALUATE" : [
                {
                    "methodOfTeaching": "Method A",
                    "content": {
                        "main" : "\nEVALUATE Phase:\n1. Which property of whole numbers states that the order of multiplication does not affect the product?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n2. Which property of whole numbers states that the order of addition does not affect the sum?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n3. Which property of whole numbers states that the product of a number and the sum of two other numbers is equal to the sum of the products of the number and each of the two other numbers?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n4. Which of the following is not true for whole numbers?\nA. Whole numbers are closed under addition.\nB. Whole numbers are closed under multiplication.\nC. Whole numbers are closed under subtraction.\nD. Whole numbers are closed under division.\n\n5. If a and b are whole numbers, which of the following is not true?\nA. a + b is a whole number.\nB. a - b is a whole number.\nC. a x b is a whole number.\nD. a ÷ b is a whole number.\n\nAssessment Questions:\n1. Explain the commutative property of multiplication with an example.\n2. Explain the distributive property of multiplication over addition with an example.\n3. Give an example of two whole numbers whose sum is not a whole number. Explain why this is so.\n4. Is subtraction commutative for whole numbers? Justify your answer.\n5. Explain the associative property of addition with an example.\n\nMaterials/Resources Required:\n1. Question paper for the evaluation phase\n2. Answer key for the evaluation phase\n3. Pen/pencil\n\nCCE Tools & Techniques:\n1. Summative assessment\n2. Rubrics for grading\n3. Feedback mechanism for students\n\nTeacher Reflection:\n1. Were the evaluation questions effective in testing students' understanding of the properties of whole numbers?\n2. Were the instructions for the questions clear and easy to understand?\n3. Were there any unexpected challenges during the evaluation phase?\n4. Did the evaluation phase align with the learning outcomes?\n5. What improvements can be made for future assessments?\n\n",
                        "summary" : "\nIn this lesson, we learned about the various properties of whole numbers, such as the commutative, associative, and distributive properties. We also learned how to apply these properties to solve mathematical problems involving whole numbers. In the evaluate phase, we tested our understanding of these concepts through multiple-choice questions and assessment questions. Remember to practice these properties when solving math problems involving whole numbers.",
                        "original" : "MAIN_CONTENT:\nEVALUATE Phase:\n1. Which property of whole numbers states that the order of multiplication does not affect the product?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n2. Which property of whole numbers states that the order of addition does not affect the sum?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n3. Which property of whole numbers states that the product of a number and the sum of two other numbers is equal to the sum of the products of the number and each of the two other numbers?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n4. Which of the following is not true for whole numbers?\nA. Whole numbers are closed under addition.\nB. Whole numbers are closed under multiplication.\nC. Whole numbers are closed under subtraction.\nD. Whole numbers are closed under division.\n\n5. If a and b are whole numbers, which of the following is not true?\nA. a + b is a whole number.\nB. a - b is a whole number.\nC. a x b is a whole number.\nD. a ÷ b is a whole number.\n\nAssessment Questions:\n1. Explain the commutative property of multiplication with an example.\n2. Explain the distributive property of multiplication over addition with an example.\n3. Give an example of two whole numbers whose sum is not a whole number. Explain why this is so.\n4. Is subtraction commutative for whole numbers? Justify your answer.\n5. Explain the associative property of addition with an example.\n\nMaterials/Resources Required:\n1. Question paper for the evaluation phase\n2. Answer key for the evaluation phase\n3. Pen/pencil\n\nCCE Tools & Techniques:\n1. Summative assessment\n2. Rubrics for grading\n3. Feedback mechanism for students\n\nTeacher Reflection:\n1. Were the evaluation questions effective in testing students' understanding of the properties of whole numbers?\n2. Were the instructions for the questions clear and easy to understand?\n3. Were there any unexpected challenges during the evaluation phase?\n4. Did the evaluation phase align with the learning outcomes?\n5. What improvements can be made for future assessments?\n\nSUMMARY_CONTENT:\nIn this lesson, we learned about the various properties of whole numbers, such as the commutative, associative, and distributive properties. We also learned how to apply these properties to solve mathematical problems involving whole numbers. In the evaluate phase, we tested our understanding of these concepts through multiple-choice questions and assessment questions. Remember to practice these properties when solving math problems involving whole numbers."
                    }
                },
                {
                    "methodOfTeaching": "Method B",
                    "content": {
                        "main" : "\nEVALUATE Phase:\n1. Which property of whole numbers states that the order of multiplication does not affect the product?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n2. Which property of whole numbers states that the order of addition does not affect the sum?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n3. Which property of whole numbers states that the product of a number and the sum of two other numbers is equal to the sum of the products of the number and each of the two other numbers?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n4. Which of the following is not true for whole numbers?\nA. Whole numbers are closed under addition.\nB. Whole numbers are closed under multiplication.\nC. Whole numbers are closed under subtraction.\nD. Whole numbers are closed under division.\n\n5. If a and b are whole numbers, which of the following is not true?\nA. a + b is a whole number.\nB. a - b is a whole number.\nC. a x b is a whole number.\nD. a ÷ b is a whole number.\n\nAssessment Questions:\n1. Explain the commutative property of multiplication with an example.\n2. Explain the distributive property of multiplication over addition with an example.\n3. Give an example of two whole numbers whose sum is not a whole number. Explain why this is so.\n4. Is subtraction commutative for whole numbers? Justify your answer.\n5. Explain the associative property of addition with an example.\n\nMaterials/Resources Required:\n1. Question paper for the evaluation phase\n2. Answer key for the evaluation phase\n3. Pen/pencil\n\nCCE Tools & Techniques:\n1. Summative assessment\n2. Rubrics for grading\n3. Feedback mechanism for students\n\nTeacher Reflection:\n1. Were the evaluation questions effective in testing students' understanding of the properties of whole numbers?\n2. Were the instructions for the questions clear and easy to understand?\n3. Were there any unexpected challenges during the evaluation phase?\n4. Did the evaluation phase align with the learning outcomes?\n5. What improvements can be made for future assessments?\n\n",
                        "summary" : "\nIn this lesson, we learned about the various properties of whole numbers, such as the commutative, associative, and distributive properties. We also learned how to apply these properties to solve mathematical problems involving whole numbers. In the evaluate phase, we tested our understanding of these concepts through multiple-choice questions and assessment questions. Remember to practice these properties when solving math problems involving whole numbers.",
                        "original" : "MAIN_CONTENT:\nEVALUATE Phase:\n1. Which property of whole numbers states that the order of multiplication does not affect the product?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n2. Which property of whole numbers states that the order of addition does not affect the sum?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n3. Which property of whole numbers states that the product of a number and the sum of two other numbers is equal to the sum of the products of the number and each of the two other numbers?\nA. Associative property\nB. Commutative property\nC. Distributive property\nD. Closure property\n\n4. Which of the following is not true for whole numbers?\nA. Whole numbers are closed under addition.\nB. Whole numbers are closed under multiplication.\nC. Whole numbers are closed under subtraction.\nD. Whole numbers are closed under division.\n\n5. If a and b are whole numbers, which of the following is not true?\nA. a + b is a whole number.\nB. a - b is a whole number.\nC. a x b is a whole number.\nD. a ÷ b is a whole number.\n\nAssessment Questions:\n1. Explain the commutative property of multiplication with an example.\n2. Explain the distributive property of multiplication over addition with an example.\n3. Give an example of two whole numbers whose sum is not a whole number. Explain why this is so.\n4. Is subtraction commutative for whole numbers? Justify your answer.\n5. Explain the associative property of addition with an example.\n\nMaterials/Resources Required:\n1. Question paper for the evaluation phase\n2. Answer key for the evaluation phase\n3. Pen/pencil\n\nCCE Tools & Techniques:\n1. Summative assessment\n2. Rubrics for grading\n3. Feedback mechanism for students\n\nTeacher Reflection:\n1. Were the evaluation questions effective in testing students' understanding of the properties of whole numbers?\n2. Were the instructions for the questions clear and easy to understand?\n3. Were there any unexpected challenges during the evaluation phase?\n4. Did the evaluation phase align with the learning outcomes?\n5. What improvements can be made for future assessments?\n\nSUMMARY_CONTENT:\nIn this lesson, we learned about the various properties of whole numbers, such as the commutative, associative, and distributive properties. We also learned how to apply these properties to solve mathematical problems involving whole numbers. In the evaluate phase, we tested our understanding of these concepts through multiple-choice questions and assessment questions. Remember to practice these properties when solving math problems involving whole numbers."
                    }
                }
            ]
        },
        "createdAt" : 1704761617
    }
    return LessonPlan(**json_data)

def fetch_lp_v2_by_id(id: str):
    from state_manager import StateManager as SM
    
    lp_list = SM.lp_list_v2.get()
    for lp in lp_list:
        if lp._id == id:
            return lp
    raise ValueError("NO SUCH LP IN SESSION STATE", [lp._id for lp in lp_list], id)

def fetch_user_work(user_id: str) -> UserWork:
    work_doc = user_work_mongo.find_by_id(user_id)
    if work_doc is None:
        raise ValueError("No work assigned to the user with ID: ", user_id)
    return UserWork(**work_doc)

def fetch_user_gen_tasks(user_id: str) -> GenTaskStatusDoc:
    doc = gen_task_mongo.find_by_id(user_id)
    gen_task_doc = GenTaskStatusDoc(_id=user_id, tasks={})
    if doc is not None:
        gen_task_doc = GenTaskStatusDoc(**doc)
    
    # GET LATEST STATUS FOR RUNNING TASKS
    for tasks in gen_task_doc.tasks.values():
        for task in tasks:
            if task.status != DurableFunctionsStatus.COMPLETED_STATUS:
                task.status, task.doc = get_gen_task_status(task.statusURI)
            
    save_user_gen_task(gen_task_doc)

    return gen_task_doc

def save_user_gen_task(task_status: GenTaskStatusDoc):
    gen_task_mongo.insert_doc(asdict(task_status))

