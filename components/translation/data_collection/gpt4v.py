import base64
from mimetypes import guess_type
from openai import AzureOpenAI
from azure.identity import AzureCliCredential, get_bearer_token_provider
import json
import ast

token_provider = get_bearer_token_provider(AzureCliCredential(), "https://cognitiveservices.azure.com/.default")



# Function to encode a local image into data URL 
def local_image_to_data_url(image_path):
    # Guess the MIME type of the image based on the file extension
    mime_type, _ = guess_type(image_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'  # Default MIME type if none is found

    # Read and encode the image file
    with open(image_path, "rb") as image_file:
        base64_encoded_data = base64.b64encode(image_file.read()).decode('utf-8')

    # Construct the data URL
    return f"data:{mime_type};base64,{base64_encoded_data}"


def get_toc(image_path):
    # Example usage
    # image_path = '/home/t-narora/translation/scraped_books/KSEEB_kan/english/8/science_2/images/3.jpg'
    data_url = local_image_to_data_url(image_path)

    client = AzureOpenAI(
        azure_ad_token_provider=token_provider,
        api_version="2024-02-15-preview",
        azure_endpoint="https://vellm-openai3.openai.azure.com/",
    )

    flag = True
    tries = 0
    while flag:
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                { "role": "system", "content": "You are a helpful assistant. You give output in correct json format." },
                { "role": "user", "content": [  
                    { 
                        "type": "text", 
                        "text": "Give me the chapter number(like 5, 9, 2; exactly as mentioned in the picture) and chapter titles in kannada language(exactly as mentioned in the picture) and the starting page number. Give output in this format:\n[{'chapter_number': <chapter number>, 'title': '<kannada title>', 'page_number': <starting page number>}, {'chapter_number': <chapter number>, 'title': '<kannada title>', 'page_number': <starting page number>}, ... ]"
                    },
                    { 
                        "type": "image_url",
                        "image_url": {
                            "url": data_url
                        }
                    }
                ] } 
            ],
            max_tokens=2000 
        )
        # print(response.choices[0].message.content)
        # Parse the response as JSON

        tries += 1
        try:
            parsed_response = json.loads(response.choices[0].message.content)
            flag = False
        except json.JSONDecodeError:
            try:
                parsed_response = ast.literal_eval(response.choices[0].message.content)
                flag = False
            except: pass
        # print(response.choices[0].message.content)
        print("Tries: ", tries)
    print(f"Number of tries: {tries}")
    print(parsed_response)
    return parsed_response

if __name__ == "__main__":
    base_path = "/home/t-narora/translation/scraped_books/KSEEB_kan/english/10/social_2/"
    image_path = base_path + 'images/1.jpg'

    d = get_toc(image_path)
    with open(base_path+'toc.json', 'w') as f:
        json.dump(d, f, indent=4, ensure_ascii=False)