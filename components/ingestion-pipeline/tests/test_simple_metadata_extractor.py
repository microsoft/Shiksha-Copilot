import pytest
import json
import logging
import os
from ingestion_pipeline.metadata_extractors.simple_metadata_extractor import SimpleMetadataExtractor

@pytest.fixture
def azure_openai_credentials():
    return {
        "api_key": "**",
        "api_base": "**",
        "api_version": "2023-03-15-preview",
        "deployment_name": "gpt-4o"
    }

def test_simple_metadata_extractor_mineru(azure_openai_credentials):
    folder_path = "tests/files/mineru/cleaned_v3"
    metadata_output_folder = os.path.join(folder_path, "metadata")
    _run_extraction_test(folder_path, metadata_output_folder, azure_openai_credentials)

def test_simple_metadata_extractor_smoldocling():
    folder_path = "tests/files/smoldocling/cleaned"
    metadata_output_folder = os.path.join(folder_path, "metadata")
    _run_extraction_test(folder_path, metadata_output_folder)

def test_simple_metadata_extractor_olmocr(azure_openai_credentials):
    folder_path = "tests/files/olmocr/cleaned_v3"
    metadata_output_folder = os.path.join(folder_path, "metadata")
    _run_extraction_test(folder_path, metadata_output_folder, azure_openai_credentials)

def _run_extraction_test(folder_path, metadata_output_folder, azure_openai_credentials):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    # Get markdown files
    markdown_files = [
        os.path.join(folder_path, file)
        for file in os.listdir(folder_path)
        if file.endswith(".md")
    ]

    extractor = SimpleMetadataExtractor()
    os.makedirs(metadata_output_folder, exist_ok=True)

    for markdown_file_path in markdown_files:
        with open(markdown_file_path, "r", encoding="utf-8") as file:
            markdown_content = file.read()

        output_json_structure = {
            "activity_names":{
                "values": [ "" ],
                "description": "List of activity names in the chapter. Activities in the text can be defined as guided, hands-on tasks or thought experiments designed to help students actively engage with and understand key concepts through observation, analysis, or exploration."
            },
            "subtopic_names": {
                "values": [ "" ],
                "description": "List of subtopic names in the chapter. Subtopic names in the text can be defined as concise headings that organize and highlight specific themes or concepts within a broader chapter, guiding the flow of content and learning."
            },
        }
        
        result = extractor.extract(markdown_content, output_json_structure, **azure_openai_credentials)

        # Save the result as a JSON file
        output_file_path = os.path.join(
            metadata_output_folder,
            os.path.basename(markdown_file_path).replace(".md", ".json")
        )
        with open(output_file_path, "w", encoding="utf-8") as json_file:
            json.dump(result, json_file, indent=2, ensure_ascii=False)

        logger.info("Extracted Metadata for %s saved to %s", markdown_file_path, output_file_path)
