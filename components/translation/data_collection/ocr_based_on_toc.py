import os
import pytesseract
import fitz  # PyMuPDF
import json

from tqdm import tqdm

def convert_pdf_to_images(pdf_path, output_folder, dpi=(600, 600)):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    pdf_document = fitz.open(pdf_path)
    for page_number in range(len(pdf_document)):
        page = pdf_document.load_page(page_number)
        matrix = fitz.Matrix(dpi[0]/72, dpi[1]/72)  # Adjust DPI
        pix = page.get_pixmap(matrix=matrix)
        image_path = os.path.join(output_folder, f"{page_number + 1}.png")
        pix.save(image_path)
    pdf_document.close()

def ocr_image(image_path, medium):
    # Perform OCR on the image
    ocr_text = pytesseract.image_to_string(image_path, lang=medium)
    return ocr_text

def save_ocr_output_as_json(ocr_text, output_path):
    with open(output_path, 'w', encoding='utf-8') as json_file:
        json.dump({'text': ocr_text}, json_file, ensure_ascii=False, indent=4)

def process_chapter_images_for_ocr(images_folder, output_folder, start_page, end_page, chapter_number, medium):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    chapter_ocr_output = {}

    for page_number in tqdm(range(start_page, end_page)):
        image_filename = f"{page_number}.jpg"
        image_path = os.path.join(images_folder, image_filename)
        
        if os.path.exists(image_path):
            ocr_text = ocr_image(image_path, medium)
            chapter_ocr_output[page_number] = ocr_text

    # Save chapter OCR output as a single JSON file
    chapter_json_path = os.path.join(output_folder, f"{chapter_number}.json")
    with open(chapter_json_path, 'w', encoding='utf-8') as chapter_json_file:
        json.dump(chapter_ocr_output, chapter_json_file, ensure_ascii=False, indent=4)

def process_pdf_based_on_json(json_path, images_folder, output_folder, medium):
    # Load the chapter information from the provided JSON file
    with open(json_path, 'r', encoding='utf-8') as json_file:
        chapter_data = json.load(json_file)

    # Iterate over each chapter in the JSON
    for i in range(len(chapter_data) - 1):
        chapter_number = chapter_data[i]['chapter_number']
        start_page = chapter_data[i]['page_number'] + 1
        end_page = chapter_data[i + 1]['page_number'] + 1 # End page is the start page of the next chapter

        print(f"Processing Chapter {chapter_number}, Pages {start_page} to {end_page - 1}")
        process_chapter_images_for_ocr(images_folder, output_folder, start_page, end_page, chapter_number, medium)

if __name__ == "__main__":
    
    for class_no in [5, 10]:
        for subs in ["science", "math", "social"]:
            medium = "kan" #use "eng" for English; "kan" for Kannada
            mainFolder = f"/home/t-narora/translation/scraped_books/KSEEB_{medium}/english/{class_no}/{subs}_2"
            input_folder = os.path.join(mainFolder, "images")
            json_path = os.path.join(mainFolder, "toc.json")  # Path to your JSON file with chapter and page information
            output_folder = os.path.join(mainFolder, "extracted")

            # Process the images for each chapter based on the JSON file
            process_pdf_based_on_json(json_path, input_folder, output_folder, medium)
