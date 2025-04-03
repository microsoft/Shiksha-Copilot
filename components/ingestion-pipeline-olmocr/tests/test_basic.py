import os
import pytest
import logging

logger = logging.getLogger(__name__)

from olmocr_extractor import OlmocrTextExtractor

TWO_COL_FILE_PATH = "tests/files/english-two-column-science.pdf"
ONE_COL_FILE_PATH = "tests/files/english-one-column-social.pdf"
MATH_FILE_PATH = "tests/files/math-equations.pdf"

OUTPUT_FILE_PATH = "tests/files/olmocr/"

def test_math_english():
    # Instantiate the OlmocrTextExtractor.
    extractor = OlmocrTextExtractor()
    
    # Extract text from the PDF.
    extracted_text = extractor.extract_text(MATH_FILE_PATH, all_pages=True)
    
    # Log the extracted text.
    logger.info("Extracted Text:\n%s", extracted_text)
    
    os.makedirs(OUTPUT_FILE_PATH, exist_ok=True)
    with open(OUTPUT_FILE_PATH + MATH_FILE_PATH.split('/')[-1].split('.')[0] + '.md', 'w') as f:
        f.write(extracted_text)

def test_two_column_english():
    # Instantiate the OlmocrTextExtractor.
    extractor = OlmocrTextExtractor()
    
    # Extract text from the PDF.
    extracted_text = extractor.extract_text(TWO_COL_FILE_PATH, all_pages=True)
    
    # Log the extracted text.
    logger.info("Extracted Text:\n%s", extracted_text)
    
    os.makedirs(OUTPUT_FILE_PATH, exist_ok=True)
    with open(OUTPUT_FILE_PATH + TWO_COL_FILE_PATH.split('/')[-1].split('.')[0] + '.md', 'w') as f:
        f.write(extracted_text)

def test_one_column_english():
    # Instantiate the OlmocrTextExtractor.
    extractor = OlmocrTextExtractor()
    
    # Extract text from the PDF.
    extracted_text = extractor.extract_text(ONE_COL_FILE_PATH, all_pages=True)
    
    # Log the extracted text.
    logger.info("Extracted Text:\n%s", extracted_text)
    
    os.makedirs(OUTPUT_FILE_PATH, exist_ok=True)
    with open(OUTPUT_FILE_PATH + ONE_COL_FILE_PATH.split('/')[-1].split('.')[0] + '.md', 'w') as f:
        f.write(extracted_text)
