import os
import json
import pandas as pd
from collections import defaultdict
from pprint import pprint

from langchain_core.messages import HumanMessage
from langchain_openai import AzureChatOpenAI

from azure.identity import DefaultAzureCredential, get_bearer_token_provider

def get_tokens():
    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return token_provider


llm = AzureChatOpenAI(
    deployment_name="gpt-4o",
    azure_ad_token_provider=get_tokens(),
    api_version="2023-03-15-preview",
    azure_endpoint="https://vellm-openai3.openai.azure.com/",
    model_kwargs={
        "response_format": {"type": "json_object"}
    },
    max_tokens=4096,
    temperature=0
)

def generate_sentences(data_chunk):
    
    n_questions = 3
    prompt = f"**Task**: Using the provided list of English-Kannada word pairs (EN_KN_WORD_PAIRS), generate meaningful and grammatically correct text. \n **Instructions**:\n 1. Generate {n_questions} multiple-choice questions (MCQs) for EN_KN_WORD_PAIRS, including translations in both English and Kannada.\n 2. For each MCQ, include four options. Indicate the correct answer.\n 3. Translate each MCQ and its options into Kannada.\n 4. Ensure the context of the questions are suitable for middle- and high-school mathematics and science.\n 5. When a word can contain multiple meanings based on subject (math or science), generate questions with both contexts.\n 6. Where equations are applicable, include them in the questions. Ensure the equations are in a simple, human-readable format.\n 7. Please ensure the Kannada word is used as is. The Kannada questions must be proper translations and are not merely transliterations.\n\n8. Return the questions in the following JSON format: \nThe response must be in the JSON format:\n    {{\n\"word_pairs\": [\n{{\n\"word_pair\": [\"English word\", \"Kannada word\"],\n\"questions\": [[ \n\"MCQ 1 in English. - A) Option A, - B) Option B, - C) Option C, - D) Option D. - Correct Option: X) Answer\",\n\"MCQ 1 in Kannada. - A) Kannada Option A, - B) Kannada Option B, - C) Kannada Option C, - D) Kannada Option D. - Correct Kannada Option: X) Kannada Answer\" \n  ], [ \n\"MCQ 2 in English. - A) Option A, - B) Option B, - C) Option C, - D) Option D. - Correct Option: X) Answer\",\n\"MCQ 2 in Kannada. - A) Kannada Option A, - B) Kannada Option B, - C) Kannada Option C, - D) Kannada Option D. - Correct Kannada Option: X) Kannada Answer\" \n  ], ...]\n}}\n]\n}}\n\nEN_KN_WORD_PAIRS: {data_chunk}\n\nPlease generate  {n_questions} questions for all the words in the provided pairs. Do not leave out any pairs. Return only a proper JSON in response."

    message = HumanMessage(content=prompt)
    response = llm.invoke([message])
    
    # Parse the JSON response from the LLM
    try:
        return json.loads(response.content)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON response: {e}")
        return None

def process_files(input_path, output_folder, file_type):
    output_folder = os.path.join(input_path, output_folder)
    os.makedirs(output_folder, exist_ok=True)
    
    if file_type == 'xlsx':
        for file_name in sorted(os.listdir(input_path)):
            if file_name.endswith('.xlsx'):
                # Determine the corresponding JSON file path
                json_filename = os.path.splitext(file_name)[0] + '.json'
                json_path = os.path.join(output_folder, json_filename)
                
                # Skip processing if the JSON file already exists
                if os.path.exists(json_path):
                    print(f"Skipping {file_name} as the corresponding JSON file already exists.")
                    continue
                
                print(f"Processing {file_name}...")
                file_path = os.path.join(input_path, file_name)
                df = pd.read_excel(file_path)

                if 'English' in df.columns and 'Kannada' in df.columns:
                    df_filtered = df.dropna(subset=['English', 'Kannada'])
                    data = df_filtered[['English', 'Kannada']].values.tolist()

                    combined_response = {"word_pairs": []}
                    
                    # Process data in groups of X
                    batchSize = 5
                    for i in range(0, len(data), batchSize):
                        chunk = data[i:i+batchSize]
                        print(f"Processing chunk starting at index {i}, ending at index {i+len(chunk)-1}")
                        response = generate_sentences(chunk)
                        
                        # Combine responses
                        if 'word_pairs' in response:
                            combined_response["word_pairs"].extend(response["word_pairs"])

                    # Create JSON file in output folder
                    with open(json_path, 'w', encoding='utf-8') as json_file:
                        json.dump(combined_response, json_file, ensure_ascii=False, indent=2)

                    print(f'Processed and saved JSON for {file_name} at {json_path}')
    
    elif file_type == 'json':
        for file_name in os.listdir(input_path):
            if file_name.endswith('.json') and file_name == "mathKeywordsGrades5-10.json":
                file_path = os.path.join(input_path, file_name)
                with open(file_path, 'r', encoding='utf-8') as json_file:
                    words = json.load(json_file)
                
                # Determine the output JSON file path
                output_json_path = os.path.join(output_folder, f"processed_{file_name}")
                
                # Load existing progress if the file exists
                if os.path.exists(output_json_path):
                    with open(output_json_path, 'r', encoding='utf-8') as json_file:
                        existing_data = json.load(json_file)
                        processed_indices = set(tuple(pair['word_pair']) for pair in existing_data.get('word_pairs', []))
                        last_processed_index = existing_data.get('last_processed_index', -1)
                else:
                    existing_data = {"word_pairs": [], "last_processed_index": -1}
                    processed_indices = set()
                    last_processed_index = -1
                
                combined_response = {"word_pairs": existing_data["word_pairs"], "last_processed_index": last_processed_index}
                
                # Process data in groups of 15
                for i in range(last_processed_index + 1, len(words), 15):
                    chunk = words[i:i+15]
                    print(chunk)
                    # Ensure that `chunk` contains the expected structure
                    if not chunk:
                        print(f"No more data to process.")
                        break

                    # Process chunk based on the expected structure
                    remaining_chunk = [word for word in chunk if tuple(word) not in processed_indices]
                    
                    if not remaining_chunk:
                        print(f"No remaining words to process in this chunk starting at index {i}.")
                        continue
                    
                    print(f"Processing chunk starting at index {i}, ending at index {i+len(remaining_chunk)-1}")
                    response = generate_sentences(remaining_chunk)
                    
                    # Combine responses
                    if 'word_pairs' in response:
                        combined_response["word_pairs"].extend(response["word_pairs"])
                        processed_indices.update(tuple(pair['word_pair']) for pair in response["word_pairs"])
                        combined_response["last_processed_index"] = i + len(remaining_chunk) - 1
                        
                        # Save the progress incrementally
                        with open(output_json_path, 'w', encoding='utf-8') as json_file:
                            json.dump(combined_response, json_file, ensure_ascii=False, indent=2)

                print(f'Processed and saved JSON for {file_name} at {output_json_path}')

# Example usage
input_path = '/home/krishna/scientific-glossary'
process_files(input_path, "MCQLabelsForFinetuning", "xlsx")  # For CSV files