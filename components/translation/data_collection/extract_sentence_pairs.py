import os
import json
import ast
from glob import glob
from tqdm.auto import tqdm
from dotenv import load_dotenv

from openai import AzureOpenAI
from azure.identity import AzureCliCredential, get_bearer_token_provider

from cleanup_sentence_pairs import post_proc
load_dotenv()

AZURE_ENDPOINT = os.getenv('AZURE_ENDPOINT')
GPT4_MODEL_NAME = os.getenv('GPT4_MODEL_NAME')
GPT4_MODEL_ENGINE = os.getenv('GPT4_MODEL_ENGINE')
CONTEXT_LENGTH = 128000
MAX_NEW_TOKENS = 4096


token_provider = get_bearer_token_provider(AzureCliCredential(), "https://cognitiveservices.azure.com/.default")

def load_model():
    llm_ = AzureOpenAI(
        azure_ad_token_provider=token_provider,
        api_version="2023-03-15-preview",
        azure_endpoint=AZURE_ENDPOINT,
    )
    return llm_

def ask_model(model: AzureOpenAI, query: dict):
    response = model.chat.completions.create(
        model=GPT4_MODEL_ENGINE,
        messages=query,
        max_tokens=MAX_NEW_TOKENS
    )
    return response.choices[0].message.content

def ask_query_on_text(query, content):
    """
    This will concatenate the query and content and ask the model the combined prompt.
    """
    user_prompt = query + content

    sample_msg = {
        "messages": [ 
            {
                "role": "system", 
                "content": "You are a helpful assistant. You have to reply according to the given content only. Do not use any prior knowledge." 
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
    }

    model = load_model()
    return ask_model(model, sample_msg["messages"])

def club_sentences(words_to_sent):
    inverse_dict = {}
    for word, sentence in words_to_sent.items():
        if sentence not in inverse_dict:
            inverse_dict[sentence] = []
        inverse_dict[sentence].append(word)
    return inverse_dict

def check_hallucination(gen_text, content):
    """
    Check if the generated text is hallucinated or not
    """
    gen_text = gen_text.replace("\n", "")
    content = content.replace("\n", "")
    if gen_text in content:
        return True
    return False

def format(input_data):
    output_data = []
    for key, value in input_data.items():
        if value == "": continue
        output_data.append({"messages": [{"content": "Translate from English to Kannada: "+key, "role": "user"}, {"content": value, "role": "assistant"}]})
    return output_data

if __name__ == "__main__":
    subject_chosen = "science_2"
    subject_chosen = "math_2"
    subject_chosen = "social_2"

    all_subs = ["science_2", "math_2", "social_2"]
    classes = ["5", "10"]
    correct_extractions = 0
    incorrect_extractions = 0
    for class_chosen in classes:
        for subject_chosen in all_subs:
            if (subject_chosen=="social_2" or subject_chosen=="science") and class_chosen=="5": continue
            print("Subject Chosen:", subject_chosen)
            kan_files = sorted(glob(f"/home/t-narora/translation/scraped_books/KSEEB_kan/english/{class_chosen}/{subject_chosen}/extracted/*.json"), reverse=True)
            eng_files = [i.replace("KSEEB_kan", "KSEEB_eng") for i in kan_files]

            for eng_file, kan_file in zip(eng_files, kan_files):
                
                out_file_path = eng_file.replace("KSEEB_eng", "outputs")
                os.makedirs(os.path.dirname(out_file_path), exist_ok=True)

                # Read content from content.json
                if os.path.exists(eng_file):
                    try:
                        with open(eng_file, 'r') as file:
                            content_english = json.load(file)
                    except Exception as e:
                        print("Error in reading file:", eng_file)
                        continue
                else:
                    print("File not found:", eng_file)
                    continue
                with open(kan_file, 'r') as file:
                    content_kannada = json.load(file)
                    if(len(content_kannada.keys())==0): continue
                """
                1. Extract words
                2. extract the specific eng sentences for each words
                3. find the correspondiong kannada sentence to the eng sentence
                4. find the translation of word in the extracted kannada sentence

                -- inc window size to +-2
                -- or just +5(the diff b/w no of pages in eng and kan)(not minus)
                """

                # Extract Important Words
                query_sentences = "For the given text corpus, extract the sentences and give list of sentences as a python parsable list of strings in this format ['sentence1', 'sentence2', ...]\n\n Here is the corpus:\n\n"
                query_kan_sen_for_en_sen = "For the given english sentences, extract the corresponding sentences from the following kannada content. You have to give a python dict with keys as english sentences and values as the respective kannada sentences from the content only. Give output in this format {'english sentence 1': 'kannada sentence 1', 'english sentence 2': 'kannada sentence 2', ...}.\n\n"

                # Iterate over all keys in the JSON and extract important words
                # possible_nums = sorted(list(set(content_english.keys()).intersection(set(content_kannada.keys()))))
                eng_page_nums =  sorted([int(j) for j in list(set(content_english.keys()))], key=lambda x: int(x))
                kan_page_nums =  sorted([int(j) for j in list(set(content_kannada.keys()))], key=lambda x: int(x))
                min_kan_page_no = min([int(i) for i in content_kannada.keys()])
                max_kan_page_no = max([int(i) for i in content_kannada.keys()])

                outputs = {}
                offset = len(content_kannada.keys()) - len(content_english.keys())
                # print("File:", eng_file)
                # print("Offset is:", offset)
                outputs = {}
                
                for e_num, k_num in tqdm(zip(eng_page_nums, kan_page_nums)):
                    
                    if os.path.exists(out_file_path):
                        # Load existing outputs if the file exists
                        with open(out_file_path, 'r', encoding='utf-8') as file:
                            outputs = json.load(file)
                        # print(outputs.keys())
                        if str(e_num) in outputs.keys():
                            print("Already exists:", e_num)
                            continue

                    text_eng = content_english[str(e_num)]
                    text_kan = "\n".join([content_kannada[str(i)] for i in range(k_num, k_num+offset)])
                    # print("English Page:", e_num)
                    # print("Kannada Page:", k_num, k_num+offset)

                    for _ in range(2):
                        try:
                            important_words = ask_query_on_text(query_sentences, text_eng)
                            important_words = important_words.replace("```json", "").replace("```python", "").replace("```", "")
                            sentences = ast.literal_eval(important_words)
                            break
                        except Exception as e:
                            print(e)
                            continue
                    if(not isinstance(sentences, list)):
                        print("sentences variable is not list, skipping this iteration: ", eng_file, e_num)
                        outputs[e_num] = {}
                        with open(out_file_path, 'w', encoding='utf-8') as file:
                            json.dump(outputs, file, indent=4, ensure_ascii=False)
                        incorrect_extractions += 1
                        continue

                    # outputs[num] = sentences

                    # # Basic hallucination check
                    # count = 0
                    # for k in sentences:
                    #     if check_hallucination(k, text_eng): count += 1
                    # print("Hallucination count:", count, len(sentences))

                    # text_en_ka = "\n".join([content_kannada[str(i)] for i in range(int(num), max(int(num)+offset, len(content_kannada))) if str(i) in content_kannada.keys()])
                    text_en_ka = "\n\nThe kannada content is as follow:\n\n" + text_kan + "\n\nThe english sentences are as follow:\n\n" + "\n\n".join(sentences)
                    for _ in range(2):
                        try:
                            translations = ask_query_on_text(query_kan_sen_for_en_sen, text_en_ka)
                            translations = translations.replace("```json", "").replace("```python", "").replace("```", "")
                            translations = ast.literal_eval(translations)
                            break
                        except Exception as e:
                            print(e)
                            continue
                    if(not isinstance(translations, dict)):
                        print("translations variable is not dict, skipping this iteration: ", eng_file, e_num)
                        outputs[e_num] = {}
                        with open(out_file_path, 'w', encoding='utf-8') as file:
                            json.dump(outputs, file, indent=4, ensure_ascii=False)
                        incorrect_extractions += 1
                        continue
                    
                    translations = post_proc(translations)
                    
                    outputs[e_num] = translations
                    with open(out_file_path, 'w', encoding='utf-8') as file:
                        json.dump(outputs, file, indent=4, ensure_ascii=False)
                    
                    correct_extractions += 1
                
                print("Correct Extractions:", correct_extractions)
                print("Incorrect Extractions:", incorrect_extractions)
                with open(out_file_path, 'w', encoding='utf-8') as file:
                    json.dump(outputs, file, indent=4, ensure_ascii=False)
                
                # break
