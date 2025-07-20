import pytest
import logging
import os
from ingestion_pipeline.utils import TOCPageFinder

@pytest.fixture
def azure_openai_credentials():
    return {
        "api_key": "**",
        "api_base": "**",
        "api_version": "2024-08-01-preview",
        "deployment_name": "gpt-4o"
    }

def test_toc_page_finder_english_1(azure_openai_credentials):
    """
    Test TOC page finder with english_1.pdf
    Expected result: consecutive pages starting from the first TOC page should be returned
    Note: The new implementation returns consecutive pages from first True to first False
    """
    pdf_file_path = "tests/files/english_1.pdf"
    _run_toc_finder_test(pdf_file_path, azure_openai_credentials, expected_start_page=8)

def _run_toc_finder_test(pdf_file_path, azure_openai_credentials, expected_start_page=None, expected_pages=None):
    """
    Helper function to run TOC finder test
    
    Args:
        pdf_file_path: Path to the PDF file to analyze
        azure_openai_credentials: Azure OpenAI credentials
        expected_start_page: Expected starting page number of TOC (for validation)
        expected_pages: Expected page numbers containing TOC (for backward compatibility)
    """
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Check if the PDF file exists
    if not os.path.exists(pdf_file_path):
        pytest.skip(f"PDF file not found: {pdf_file_path}")

    # Initialize TOC page finder
    toc_finder = TOCPageFinder()

    logger.info(f"Analyzing PDF file: {pdf_file_path}")

    # Test the get_toc_page_range method as well
    start_page, end_page, range_summary = toc_finder.get_toc_page_range(
        pdf_file_path,
        max_pages_to_check=15,
        batch_size=3,
        **azure_openai_credentials
    )

    logger.info(f"TOC page range: {start_page} to {end_page}, Summary: {range_summary}")