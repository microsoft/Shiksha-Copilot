import os
import pytest
import logging

from ingestion_pipeline.text_extractors.tesseract_ocr import TesseractTextExtractor

logger = logging.getLogger(__name__)

TWO_COL_FILE_PATH = "tests/files/english-two-column-science.pdf"
ONE_COL_FILE_PATH = "tests/files/english-one-column-social.pdf"
MATH_FILE_PATH = "tests/files/math-equations.pdf"

OUTPUT_FILE_PATH = "tests/files/tesseract/output/"

def test_math_english():
    # Instantiate the Tesseract OCR text extractor.
    extractor = TesseractTextExtractor()
    
    # Extract text from the PDF.
    extracted_text = extractor.extract_text(MATH_FILE_PATH, two_columns=False)
    
    # Log the extracted text.
    logger.info("Extracted Text:\n%s", extracted_text)
    
    os.makedirs(OUTPUT_FILE_PATH, exist_ok=True)
    with open(OUTPUT_FILE_PATH + TWO_COL_FILE_PATH.split('/')[-1].split('.')[0] + '.txt', 'w') as f:
        f.write(extracted_text)

def test_two_column_english():
    # Instantiate the Tesseract OCR text extractor.
    extractor = TesseractTextExtractor()
    
    # Extract text from the PDF.
    extracted_text = extractor.extract_text(TWO_COL_FILE_PATH, two_columns=True)
    
    # Log the extracted text.
    logger.info("Extracted Text:\n%s", extracted_text)

def test_one_column_english():
    # Instantiate the Tesseract OCR text extractor.
    extractor = TesseractTextExtractor()
    
    # Extract text from the PDF.
    extracted_text = extractor.extract_text(ONE_COL_FILE_PATH, two_columns=False)
    
    # Log the extracted text.
    logger.info("Extracted Text:\n%s", extracted_text)
