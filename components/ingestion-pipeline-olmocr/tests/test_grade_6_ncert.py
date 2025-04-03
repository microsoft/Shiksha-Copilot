import os
import pytest
import logging

from olmocr_extractor import OlmocrTextExtractor

GRADE_6_FOLDER_PATH = "tests/files/grade_6"

OUTPUT_FILE_PATH = "tests/files/olmocr/ncert"

logger = logging.getLogger(__name__)

def test_grade_6_pdfs():
    # Instantiate the OlmocrTextExtractor.
    extractor = OlmocrTextExtractor()
    
    # Iterate through all files in the folder.
    for file_name in os.listdir(GRADE_6_FOLDER_PATH):
        if file_name.endswith(".pdf"):
            file_path = os.path.join(GRADE_6_FOLDER_PATH, file_name)
            
            # Extract text from the PDF.
            extracted_text = extractor.extract_text(file_path, all_pages=True)
            
            # Log the extracted text.
            logger.info("Extracted Text from %s:\n%s", file_name, extracted_text)
            
            # Save the extracted text to a file.
            os.makedirs(OUTPUT_FILE_PATH, exist_ok=True)
            output_file = os.path.join(OUTPUT_FILE_PATH, file_name.split('.')[0] + '.md')
            with open(output_file, 'w') as f:
                f.write(extracted_text)

