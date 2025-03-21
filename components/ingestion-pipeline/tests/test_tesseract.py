import pytest
import logging

from ingestion_pipeline.text_extractors.tesseract_ocr import TesseractTextExtractor

logger = logging.getLogger(__name__)

TWO_COL_FILE_PATH = "tests/files/english-two-column-science.pdf"
ONE_COL_FILE_PATH = "tests/files/english-one-column-social.pdf"

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
