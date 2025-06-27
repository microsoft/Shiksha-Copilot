from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForSeq2Seq
from peft import PeftModel, LoraConfig

import json, re
from glob import glob
import torch

from reformat_options import encode, decode
from tqdm.auto import tqdm

from helper_scripts.lp_json2docx import json_to_word
from post_processing import post_proc
import sys


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
seed = torch.randint(int(-1e6), int(1e6), size=(1,)).item()
print(seed)
generator = torch.manual_seed(seed)
torch.cuda.manual_seed_all(seed)

# example regex: "./evs-infs-v7.6-evaluate/*_.json"
# example lora path: "evs-7.6/checkpoint-8760"
# example source language: "English"
# example target language: "Kannada"
if len(sys.argv) < 5:
    print("Usage: python inference.py <files_regex> <LoRA_path> <Src_lang> <Target_lang>")
    sys.exit(1)

files_regex = sys.argv[1]
adapter_model = sys.argv[2]
SRC_LANG = sys.argv[3]
TGT_LANG = sys.argv[4]

base_model = "sarvamai/sarvam-1"

tokenizer = AutoTokenizer.from_pretrained(base_model)
data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer)
model = AutoModelForCausalLM.from_pretrained(base_model).to(device)

tokenizer.chat_template = "{% if messages[0]['role'] == 'system' %}{% set loop_messages = messages[1:] %}{% set system_message = messages[0]['content'] %}{% else %}{% set loop_messages = messages %}{% set system_message = false %}{% endif %}{% for message in loop_messages %}{% if (message['role'] == 'user') != (loop.index0 % 2 == 0) %}{{ raise_exception('Conversation roles must alternate user/assistant/user/assistant/...') }}{% endif %}{% if loop.index0 == 0 and system_message != false %}{% set content = '<<SYS>>\\n' + system_message + '\\n<</SYS>>\\n\\n' + message['content'] %}{% else %}{% set content = message['content'] %}{% endif %}{% if message['role'] == 'user' %}{{ bos_token + '[INST] ' + content.strip() + ' [/INST]' }}{% elif message['role'] == 'assistant' %}{{ ' '  + content.strip() + ' ' + eos_token }}{% endif %}{% endfor %}"

tokenizer.add_tokens("[PAD]", special_tokens=True)
tokenizer.pad_token = "[PAD]"
model.resize_token_embeddings(len(tokenizer))

lora_config = LoraConfig(
    r=256, lora_alpha=512, lora_dropout=0.1, target_modules=["lm_head", "k_proj", "q_proj", "v_proj" "o_proj", "gate_proj", "down_proj", "up_proj"]
)

model = PeftModel.from_pretrained(model, adapter_model, generator=generator)

def title_case(s):
    # Split the string into words
    words = s.split()
    # Capitalize the first letter of each word if it's not a number
    title_cased = []
    for word in words:
        if word[0] == "\"" and word[1:].isalpha():
            # print(word)
            title_cased.append(word[0] + word[1:].capitalize())
        elif word[0].isalpha():
            title_cased.append(word.capitalize())
        else:
            title_cased.append(word)
    # Join the words back into a single string
    return ' '.join(title_cased)

def translate_text(text: str, source_lang="Engligh", target_lang="Kannada") -> str:
    message = [{'role': 'user', 'content': f'Translate from {source_lang} to {target_lang}: {text}'}]
    model_input = tokenizer.apply_chat_template(message, tokenize=False)
    tokenized_input = tokenizer(model_input, return_tensors='pt')
    tokenized_input = tokenized_input.to(device)

    model.eval()
    output_tokens = model.generate(
        **tokenized_input,
        max_new_tokens=1024,
        do_sample=True,
        temperature=0.001,
        top_p=0.95,
        top_k=50,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.pad_token_id,
        stop_strings=["</s>"],
        tokenizer=tokenizer,
    )
    output = tokenizer.decode(output_tokens[0], skip_special_tokens=True)
    # print("input length:", len(tokenized_input["input_ids"][0]), "output length", len(output_tokens[0])-len(tokenized_input["input_ids"][0]), "Total length:", len(output_tokens[0]))

    return output, len(tokenized_input["input_ids"][0]), len(output_tokens[0])-len(tokenized_input["input_ids"][0])

def infer_on_data(data: dict | list | str, source_lang="Engligh", target_lang="Kannada"):
    if isinstance(data, str):
        out_var, _, _ = translate_text(data, source_lang=source_lang, target_lang=target_lang)
        return out_var
    elif isinstance(data, list):
        return [infer_on_data(text, source_lang=source_lang, target_lang=target_lang) for text in data]
    elif isinstance(data, dict):
        out_dict = {}
        for key, value in data.items():

            # if-else ladder for pre-proc and post-proc for specific kind of texts
            
            if key=="options":
                out_dict[key] = decode(infer_on_data(encode(value), source_lang=source_lang, target_lang=target_lang))

            elif key=="engage":
                output_temp, input_tokens, output_tokens = translate_text(value['content'], source_lang=source_lang, target_lang=target_lang)
                if(
                    input_tokens-output_tokens>100
                    ):
                    list_vals = value['content'].split("Classroom Process (Facilitating Activity)")
                    for i in range(len(list_vals)-1):
                        list_vals[i+1] = "Classroom Process (Facilitating Activity)"+list_vals[i+1]
                    print(key, len(list_vals))
                    out_dict[key] = {"content": "".join([translate_text(" "+v, source_lang=source_lang, target_lang=target_lang)[0] for v in list_vals])}
                else: out_dict[key]={"content": output_temp}
            
            elif key=="explain":
                output_temp, input_tokens, output_tokens = translate_text(value['content'], source_lang=source_lang, target_lang=target_lang)
                if(
                    output_tokens==1024 or
                    output_tokens<input_tokens
                    ):
                    list_vals = value['content'].split("Classroom Process (Facilitating Activity)")
                    for i in range(len(list_vals)-1):
                        list_vals[i+1] = "Classroom Process (Facilitating Activity)"+list_vals[i+1]
                    print(key, len(list_vals))
                    out_dict[key] = {"content": "".join([translate_text(" "+v, source_lang=source_lang, target_lang=target_lang)[0] for v in list_vals])}
                else: out_dict[key]={"content": output_temp}
            
            elif key=="elaborate":
                output_temp, input_tokens, output_tokens = translate_text(value['content'], source_lang=source_lang, target_lang=target_lang)
                if(
                    output_tokens==1024 or
                    output_tokens<input_tokens
                    ):
                    list_vals = value['content'].split("Interactive Activities")
                    for i in range(len(list_vals)-1):
                        list_vals[i+1] = "Interactive Activities"+list_vals[i+1]
                    print(key, len(list_vals))
                    out_dict[key] = {"content": "".join([translate_text(" "+v, source_lang=source_lang, target_lang=target_lang)[0] for v in list_vals])}
                else: out_dict[key]={"content": output_temp}
            
            elif key=="evaluate":
                output_temp, input_tokens, output_tokens = translate_text(value['content'], source_lang=source_lang, target_lang=target_lang)
                if(
                    input_tokens-output_tokens>100
                    ):
                    list_vals = value['content'].split("Assessment Questions")
                    if len(list_vals)>2:
                        list_vals = [list_vals[0], "".join(list_vals[1:])]
                    for i in range(len(list_vals)-1):
                        list_vals[i+1] = "Assessment Questions:"+list_vals[i+1]
                    print(key, len(list_vals))
                    out_dict[key] = {"content": "".join([translate_text(" "+v, source_lang=source_lang, target_lang=target_lang)[0] for v in list_vals])}
                else: out_dict[key]={"content": output_temp}

            else:
                out_dict[key] = infer_on_data(value, source_lang=source_lang, target_lang=target_lang)

        return out_dict

def tranaslate_file(filename: str, resources: list[str], source_lang="Engligh", target_lang="Kannada"):
    """
    Returns the LP(in json) with translated text of the resources specified.
    """
    with open(filename, 'r') as file:
        data = json.load(file)

    output = data.copy()
    for resource in resources:
        if resource=="subtopics":
            output[resource] = [infer_on_data(title_case(topic), source_lang=source_lang, target_lang=target_lang) for topic in data.get(resource, [])]
            # print([title_case(topic) for topic in data.get(resource, [])], "=>", output[resource])
        else:
            output[resource] = infer_on_data(data.get(resource, {}), source_lang=source_lang, target_lang=target_lang)
    
    return output

def post_proc_on_data(data: dict | list | str):
    if isinstance(data, str):
        return post_proc(data)
    elif isinstance(data, list):
        return [post_proc_on_data(text) for text in data]
    elif isinstance(data, dict):
        return {key: post_proc_on_data(value) for key, value in data.items()}

def post_proc_file(filename: str, resources: list[str]):
    """
    Returns the LP(in json) with post processed text of the resources specified.
    """
    with open(filename, 'r') as file:
        data = json.load(file)

    output = data.copy()
    for resource in resources:
        output[resource] = post_proc_on_data(data.get(resource, {}))
    
    return output

def infer_and_save(list_of_files: list[str], resources: list[str], make_docs: bool = False, post_proc_flag=True, source_lang="Engligh", target_lang="Kannada"):

    for filename in tqdm(list_of_files):
        output_path = filename.replace(".json", "_translated_Kan.json")

        output = tranaslate_file(filename, resources, source_lang=source_lang, target_lang=target_lang)
        with open(output_path, 'w', encoding='utf-8') as file:
            json.dump(output, file, indent=4, ensure_ascii=False)
            
        if(post_proc_flag):
            output = post_proc_file(output_path, resources)
            with open(output_path, 'w', encoding='utf-8') as file:
                json.dump(output, file, indent=4, ensure_ascii=False)

        if make_docs:
            json_to_word(filename, filename.replace(".json", ".docx"), ["_id"]+resources)
            json_to_word(output_path, output_path.replace(".json", ".docx"), ["_id"]+resources)

if __name__=="__main__":
    files = glob(files_regex)
    
    # Don't keep `_id` in the resources list, the code will automatically add it in the docs without translation.
    resources = [
        # "extracted_resources",
        # "additional_resources",
        # "checklist"
        # "subtopics",
        # "learning_outcomes",
        "instruction_set",
        # "crisp_instruction_set",
    ]

    infer_and_save(files, resources, source_lang=SRC_LANG, target_lang=TGT_LANG, make_docs=True, post_proc_flag=True)
