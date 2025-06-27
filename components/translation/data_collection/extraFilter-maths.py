import os
import re
import json
import ast
from glob import glob
from tqdm.auto import tqdm
from dotenv import load_dotenv

from openai import AzureOpenAI
from azure.identity import AzureCliCredential, get_bearer_token_provider

from transformers import AutoTokenizer

from cleanup_sentence_pairs import post_proc
load_dotenv()

AZURE_ENDPOINT = os.getenv('AZURE_ENDPOINT')
GPT4_MODEL_NAME = os.getenv('GPT4_MODEL_NAME')
GPT4_MODEL_ENGINE = os.getenv('GPT4_MODEL_ENGINE')
CONTEXT_LENGTH = 128000
MAX_NEW_TOKENS = 4096

TOKENIZER = AutoTokenizer.from_pretrained("sarvamai/sarvam-2b-v0.5")
TOKENIZER.chat_template = "{% if messages[0]['role'] == 'system' %}{% set loop_messages = messages[1:] %}{% set system_message = messages[0]['content'] %}{% else %}{% set loop_messages = messages %}{% set system_message = false %}{% endif %}{% for message in loop_messages %}{% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}{{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}{% endif %}{% if loop.index0 == 0 and system_message != false %}{% set content = '<<SYS>>\\n' + system_message + '\\n<</SYS>>\\n\\n' + message['content'] %}{% else %}{% set content = message['content'] %}{% endif %}{% if message['role'] == 'user' %}{{ bos_token + '[INST] ' + content.strip() + ' [/INST]' }}{% elif message['role'] == 'assistant' %}{{ ' '  + content.strip() + ' ' + eos_token }}{% endif %}{% endfor %}"

token_provider = get_bearer_token_provider(AzureCliCredential(), "https://cognitiveservices.azure.com/.default")

kannada_to_roman = {
    '೦': '0',
    '೧': '1',
    '೨': '2',
    '೩': '3',
    '೪': '4',
    '೫': '5',
    '೬': '6',
    '೭': '7',
    '೮': '8',
    '೯': '9'
}

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

def filter1(sentence_pair):
    """
    Filter the sentences based on the emperical rule of (eng-tokens)*0.9 <= (kan-tokens) <= (eng-tokens)*1.4
    => True => Keep the sentence
    => False => Discard the sentence
    """
    eng_sen, kan_sen = sentence_pair
    en_tokens = len(TOKENIZER.tokenize(eng_sen))
    kn_tokens = len(TOKENIZER.tokenize(kan_sen))
    if en_tokens*0.9<=kn_tokens and en_tokens*1.4 >= kn_tokens:
        return True
    return False

def filter2(sentence_pair):
    """
    Filter the sentences based on presence of < 10 english characters
    => True => Keep the sentence
    => False => Discard the sentence
    """
    eng_sen, kan_sen = sentence_pair
    num_eng_chars = len(re.findall(r'[a-zA-Z]', eng_sen))
    if num_eng_chars >= 5:
        return True
    return False

def filter3(sentence_pair):
    """
    Filter the sentences based on number of kannada-numeric characters vs english characters
    => True => Keep the sentence
    => False => Discard the sentence
    """
    eng_sen, kan_sen = sentence_pair
    num_eng_chars_in_kan_sen = len(re.findall(r'[a-zA-Z]', kan_sen))
    num_kan_chars_and_num_in_kan_sen = len(re.findall(r'[\u0C80-\u0CFF0-9]', kan_sen))
    if num_eng_chars_in_kan_sen < num_kan_chars_and_num_in_kan_sen:
        return True
    return False

def filter(sentence_pair):
    """
    eng_sen, kan_sen = sentence_pair
    """
    return filter1(sentence_pair) and filter2(sentence_pair) and filter3(sentence_pair)

if __name__ == "__main__":
    files = sorted(glob(f"/home/t-narora/translation/scraped_books/outputs/english/5/math_2/extracted/*.json"))
    files += sorted(glob(f"/home/t-narora/translation/scraped_books/outputs/english/10/math_2/extracted/*.json"))
    all_total = 0
    all_selected = 0
    for file in files:
        with open(file, 'r') as f:
            content_english = json.load(f)
        total=0
        selected=0
        new_output = {}
        for page_no, page_content in content_english.items():
            new_output[page_no] = {}
            for eng_sen, kan_sen in page_content.items():
                total+=1
                if filter((eng_sen, kan_sen)):
                    for kn, en in kannada_to_roman.items():
                        kan_sen = kan_sen.replace(kn, en)
                    new_output[page_no][eng_sen] = kan_sen
                    selected+=1
        print(f"Total: {total}, Selected: {selected}, discarded: {total-selected}")
        all_total+=total
        all_selected+=selected
        os.makedirs(os.path.dirname(file.replace("outputs", "outputs-math-extraFiltered")), exist_ok=True)
        with open(file.replace("outputs", "outputs-math-extraFiltered"), 'w') as f:
            json.dump(new_output, f, indent=2, ensure_ascii=False)
    print(f"All Total: {all_total}, All Selected: {all_selected}, All discarded: {all_total-all_selected}")
