import re
import json
from tqdm.auto import tqdm

# Define a mapping from Kannada numerals to Roman numerals
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

def replace_kannada_numerals(text):
    # Replace each Kannada numeral with the corresponding Roman numeral
    for kannada_numeral, roman_numeral in kannada_to_roman.items():
        text = text.replace(kannada_numeral, roman_numeral)
    return text


def cleanup_english_text(text):

    def remove_input_prompt(text):
        # Remove the input prompt from the text
        output = re.sub(r'\[INST\].*?\[/INST\]\s*', '', text, flags=re.DOTALL)
        return output

    def remove_punctuation_between_english(text):
        # Remove punctuation marks only between English characters
        return re.sub(r'(?<=[a-zA-Z])[\s\n.,!?;:()\'"-]+(?=[a-zA-Z])', '', text)

    def remove_special_tokens(text):
        # Remove special tokens from the text
        return re.sub(r'\[INST\]|\[/INST\]', '', text)

    def remove_english_text(text):
        # Remove English text and punctuation from the Kannada text
        return re.sub(r'[a-zA-Z]{2,}', '', text)

    output = remove_input_prompt(text)
    output = remove_punctuation_between_english(output)
    output = remove_special_tokens(output)
    output = remove_english_text(output)

    return output


def remove_non_kannada_characters(text):
    # Remove non-Kannada characters from the text, but retain punctuation
    return re.sub(r'[^\u0C80-\u0CFF0-9a-zA-z\s\n.,+=÷!?;:₹()\'"*&%@#\^\{\}/\|-]', '', text)


def post_proc(text):
    text = replace_kannada_numerals(text)
    text = cleanup_english_text(text)
    text = remove_non_kannada_characters(text)
    return text

def post_proc_json(json_data):
    if json_data is None:
        return None
    elif isinstance(json_data, str):
        return post_proc(json_data)
    elif isinstance(json_data, list):
        return [post_proc_json(item) for item in json_data]
    elif isinstance(json_data, dict):
        return {key: post_proc_json(value) for key, value in json_data.items()}
    else:
        raise ValueError(f"Unsupported data type: {type(json_data)}")

def post_proc_json_file(input_file, output_file, resources):
    with open(input_file, "r") as f:
        data = json.load(f)
    
    out = []
    for lp in tqdm(data):
        new_lp = lp.copy()
        for resource in resources:
            if resource in lp:
                new_lp[resource] = post_proc_json(lp[resource])
        out.append(new_lp)

    with open(output_file, "w", encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    resources = [
        "subtopics",
        "learning_outcomes",
        "instruction_set",
        "crisp_instruction_set",
        "additional_resources",
        "checklist",
        "extracted_resources"
    ]
    inp_file = "/home/t-narora/translation/subword_selection/all_kannada_lps 1.json"
    out_file = "all_kannada_lps_post_processed.json"
    post_proc_json_file(inp_file, out_file, resources)

    # # numbers
    # sample_text = "ಒಂದು ವಿದ್ಯಾರ್ಥಿ ೧, ೯, ೭, ೫ ಅಂಕಿಗಳನ್ನು ಬಳಸಿಕೊಂಡು ಪುನರಾವರ್ತಿಸದೆ ಅತಿದೊಡ್ಡ ನಾಲ್ಕು ಅಂಕಿಯ ಸಂಖ್ಯೆಯನ್ನು ರೂಪಿಸಬೇಕಾಗುತ್ತದೆ. ಈ ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಯಾವುದು ಸರಿಯಾಗಿದೆ ? "
    # # English text in b/w
    # sample_text = " ಆಹಾರ ಪದಾರ್ಥಗಳು ಮತ್ತು ಅವುಗಳ ಸಂಬಂಧಿತ ಪೋಷಕಾಂಶಗಳು ಮತ್ತು ಲಾಭಗಳು ಹೊಂದಿರುವ ಕಾರ್ಡ್‌ಗಳು, ಕಾರ್ಡ್‌ಗಳನ್ನು ಇಡುವ ಸ್ಥಳ.\nTranslate from English to Kannada: Prepare cards with images of different fruits and vegetables, labels with key terms related to nutrition. "
    # # junk characters
    # sample_text = "ತಂಡಗಳು ಹೆಚ್ಚಾಗಿ ಸೇವಿಸಲ್ಪಡುವ ಆಹಾರ ಪದಾರ್ಥಗಳನ್ನು ಯಾವ ಪ್ರದೇಶದಲ್ಲಿ ಸ್ಥಾನೀಕರಿಸಬೇಕು ಮತ್ತು ಈ ಆಹಾರಗಳು ಒದಗಿಸುವ ಮುಖ್ಯ ಪೋಷಕಾಂಶಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡಬೇಕು. ಕರ್ನಾಟಕದ ವೈವಿಧ್ಯಮಯ קולינארಿಕ ಭೂದೃಶ್ಯಕ್ಕೆ ಅನ್ವಯಿಸುತ್ತವೆ "
    # # single eng char options
    # sample_text = " A) ಪ್ರಾಣಿಗಳು ಫೋಟೋಸಿಂಥೆಸೈಸ್ ಮಾಡಲು ಆರಂಭಿಸುತ್ತವೆ "
    # # numbers in b/w english text
    # sample_text = " A) 80 mm "
    # print(sample_text, "\n")
    # print(post_proc(sample_text))
