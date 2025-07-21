import pytest
import logging
import os
import json
from ingestion_pipeline.text_extractors.llm_json_extractor import LLMJSONExtractor

@pytest.fixture
def azure_openai_credentials():
    return {
        "api_key": "**",
        "api_base": "**",
        "api_version": "2024-08-01-preview",
        "deployment_name": "gpt-4o"
    }

def test_llm_json_extractor_social(azure_openai_credentials):
    """
    Test LLM JSON extractor with english-one-column-social.pdf
    Expected result: JSON format with sections containing section_title and section_content
    """
    pdf_file_path = "tests/files/english-one-column-social.pdf"
    _run_llm_json_extractor_test(pdf_file_path, azure_openai_credentials)

def _run_llm_json_extractor_test(pdf_file_path, azure_openai_credentials):
    """
    Helper function to run LLM JSON extractor test
    
    Args:
        pdf_file_path: Path to the PDF file to analyze
        azure_openai_credentials: Azure OpenAI credentials
    """
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Check if the PDF file exists
    if not os.path.exists(pdf_file_path):
        pytest.skip(f"PDF file not found: {pdf_file_path}")

    # Initialize LLM JSON extractor
    json_extractor = LLMJSONExtractor()

    logger.info(f"Extracting text from PDF file: {pdf_file_path}")

    # Extract text in JSON format
    extracted_json_text = json_extractor.extract_text(pdf_file_path, **azure_openai_credentials)

    logger.info(f"Extraction completed. Result length: {len(extracted_json_text)} characters")

    # Validate that the result is valid JSON
    try:
        parsed_json = json.loads(extracted_json_text)
        assert isinstance(parsed_json, list), "Result should be a JSON array"
        
        # Validate structure of each section
        for i, section in enumerate(parsed_json):
            assert isinstance(section, dict), f"Section {i} should be a dictionary"
            assert "section_title" in section, f"Section {i} should have 'section_title'"
            assert "section_content" in section, f"Section {i} should have 'section_content'"
            assert "page_number" in section, f"Section {i} should have 'page_number'"
            
            # Validate data types
            assert isinstance(section["section_title"], str), f"Section {i} title should be string"
            assert isinstance(section["section_content"], str), f"Section {i} content should be string"
            assert isinstance(section["page_number"], int), f"Section {i} page_number should be integer"
        
        logger.info(f"Successfully extracted {len(parsed_json)} sections from PDF")
        
        # Log first few sections for verification
        for i, section in enumerate(parsed_json[:3]):
            logger.info(f"Section {i+1}: {section['section_title'][:50]}...")
            
    except json.JSONDecodeError as e:
        pytest.fail(f"Failed to parse extracted text as JSON: {e}")
    except Exception as e:
        pytest.fail(f"Validation failed: {e}")
