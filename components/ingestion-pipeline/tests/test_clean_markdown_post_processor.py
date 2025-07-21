from dotenv import load_dotenv
import pytest
import json
import logging
import os
from ingestion_pipeline.text_postprocessors.clean_markdown_post_processor import (
    CleanMarkdownPostProcessor,
)

load_dotenv(".env")


@pytest.fixture
def azure_openai_credentials():
    return {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }


def test_simple_metadata_extractor_mineru(azure_openai_credentials):
    folder_path = "tests/files/mineru/"
    output_folder = os.path.join(folder_path, "cleaned_v3")
    _run_cleaning_test(folder_path, output_folder, azure_openai_credentials)


def test_simple_metadata_extractor_smoldocling(azure_openai_credentials):
    folder_path = "tests/files/smoldocling/"
    output_folder = os.path.join(folder_path, "cleaned_v3")
    _run_cleaning_test(folder_path, output_folder, azure_openai_credentials)


def test_simple_metadata_extractor_olmocr(azure_openai_credentials):
    folder_path = "tests/files/olmocr/"
    output_folder = os.path.join(folder_path, "cleaned_v3")
    _run_cleaning_test(folder_path, output_folder, azure_openai_credentials)


def _run_cleaning_test(folder_path, cleaned_output_folder, azure_openai_credentials):
    logger = logging.getLogger(__name__)

    # Get markdown files
    markdown_files = [
        os.path.join(folder_path, file)
        for file in os.listdir(folder_path)
        if file.endswith(".md")
    ]

    post_processor = CleanMarkdownPostProcessor()
    os.makedirs(cleaned_output_folder, exist_ok=True)

    for markdown_file_path in markdown_files:
        with open(markdown_file_path, "r", encoding="utf-8") as file:
            markdown_content = file.read()
        result = post_processor.post_process(
            markdown_content, **azure_openai_credentials
        )

        # Save the result as a JSON file
        output_file_path = os.path.join(
            cleaned_output_folder, os.path.basename(markdown_file_path)
        )
        with open(output_file_path, "w", encoding="utf-8") as md_file:
            md_file.write(result)

        logger.info(
            "Cleaned markdown for %s saved to %s", markdown_file_path, output_file_path
        )
