import re
import os
import ast
import json
from tqdm.auto import tqdm
from dotenv import load_dotenv

from openai import AzureOpenAI
from azure.identity import AzureCliCredential, get_bearer_token_provider

load_dotenv()

AZURE_ENDPOINT = os.getenv('AZURE_ENDPOINT')
GPT4_MODEL_NAME = os.getenv('GPT4_MODEL_NAME')
GPT4_MODEL_ENGINE = os.getenv('GPT4_MODEL_ENGINE')
CONTEXT_LENGTH = 128000
MAX_NEW_TOKENS = 4096

kannad_numerals = set(["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"])
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
                "content": "You are a helpful assistant. Do not use any prior knowledge. You give a python dict in this format: {<english sentence>: <kannada sentence>}."
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
    }

    model = load_model()

    return ask_model(model, sample_msg["messages"])

def number_present(sentence):
    return any((char.isdigit() or (char in kannad_numerals)) for char in sentence)

def paran_present(sentence):
    return any((char == "(" or char == ")") for char in sentence)

def remove_english_text(text):
    # Remove English text and punctuation from the Kannada text
    text = re.sub(r'(?<=[a-zA-Z])[\s\n.,!?;:()\'"-]+(?=[a-zA-Z])', '', text)
    return re.sub(r'[a-zA-Z]{1,}', '', text)

def remove_non_kannada_characters(text):
    # Remove non-Kannada characters from the text, but retain punctuation
    return re.sub(r'[^\u0C80-\u0CFF0-9a-zA-z\s\n.,+=÷!?;:₹()\'"*&%@#\^\{\}/\|-]', '', text)

def gpt_cleanup_numbers(eng_sen, kan_sen):
    # query = "Identify numbers present in the english sentence and use them in the kannada sentence. Return a python dict in this format: {<english sentence>: <kannada sentence with new numbers>}.\n\n" #" You have to translate the given english sentence to Kannada."
    query = "Correctly replace the numbers present in the kannda sentence with the numbers present in english sentence, do not change anything else in the sentence. Return a python dict in this format: {\"<english sentence>\": \"<kannada sentence with correct numbers>\"}.\n\n" #" You have to translate the given english sentence to Kannada."
    text = eng_sen + ": " + kan_sen # "english sentence: " + eng_sen + "\nKannada sentence: " + kan_sen
    out = ask_query_on_text(query, text)
    out = out.replace("```json", "").replace("```python", "").replace("```", "")
    out = ast.literal_eval(out)
    out_eng, out_kan = list(out.keys())[0], list(out.values())[0]
    return out_eng, out_kan

def gpt_cleanup_parantheses(eng_sen, kan_sen):
    query = "REMOVE the parantheses from the kannada sentence and english sentence if and only if the parantheses and the content in it are unnecessary, do not change anything else in the sentences. Return a python dict in this format: {\"<new english sentence>\": \"<new kannada sentence>\"}.\n\n" #" You have to translate the given english sentence to Kannada."
    text = eng_sen + ": " + kan_sen # "english sentence: " + eng_sen + "\nKannada sentence: " + kan_sen
    out = ask_query_on_text(query, text)
    out = out.replace("```json", "").replace("```python", "").replace("```", "")
    out = ast.literal_eval(out)
    out_eng, out_kan = list(out.keys())[0], list(out.values())[0]
    return out_eng, out_kan

def post_proc(pairs):
    output = {}
    for key, value in pairs.items():
        if isinstance(value, dict):
            output[key] = post_proc(value)
        elif isinstance(value, str):

            # V1 cleanup
            value = remove_english_text(value)
            value = remove_non_kannada_characters(value)

            # V2 cleanup
            cleaned = False
            try:
                if number_present(key) and number_present(value):
                    out_en, out_kn = gpt_cleanup_numbers(key, value)
                else:
                    out_en, out_kn = key, value
            except Exception as e:
                print(key, '\n', value, '\n', e, '\n\n')
                out_en, out_kn = key, value
            
            # V3 cleanup
            # print(out_en, '\n', out_kn, '\n\n')
            try:
                if paran_present(out_en) or paran_present(out_kn):
                    out_en, out_kn = gpt_cleanup_parantheses(out_en, out_kn)
                else:
                    out_en, out_kn = out_en, out_kn
            except Exception as e:
                print(out_en, '\n', out_kn, '\n', e, '\n\n')
                out_en, out_kn = out_en, out_kn
            # print(out_en, '\n', out_kn, '\n\n')

            output[out_en] = out_kn
    return output

if __name__=="__main__":
    with open("temp-sentences-english-v1.json", "r") as file:
        data = json.load(file)
    output = {}
    for k, v in tqdm(data.items()):
        output[k] = post_proc(v)
        with open("v5-basicCleanup.json", "w") as file:
            json.dump(output, file, indent=2, ensure_ascii=False)