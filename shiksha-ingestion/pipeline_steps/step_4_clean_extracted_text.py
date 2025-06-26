import json
import os
import logging
from pathlib import Path
import re
import time
from typing import Dict, List, Any
from dotenv import load_dotenv
from ingestion_pipeline.text_postprocessors.clean_markdown_post_processor import (
    CleanMarkdownPostProcessor,
)
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv(".env")


def azure_openai_credentials():
    """
    Returns credentials for connecting to Azure OpenAI service.

    Returns:
        Dict[str, str]: A dictionary with Azure OpenAI credentials including API key, base URL,
                       API version, and deployment name.
    """
    return {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }


class TextCleaningStep(BasePipelineStep):
    """Clean a single markdown file."""

    name = "text_cleaning"
    description = (
        "Clean and format a single markdown file using CleanMarkdownPostProcessor"
    )
    input_types = {"markdown"}
    output_types = {"cleaned_markdown"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - clean a single markdown file.

        Args:
            input_paths: Dictionary with "markdown_file" key mapping to path of the markdown file
            output_dir: Directory where the cleaned markdown file will be saved

        Returns:
            StepResult with status and output paths
        """
        markdown_file_path = input_paths["markdown"]

        try:
            logger.info(f"Processing file: {markdown_file_path}")

            if not os.path.exists(
                markdown_file_path
            ) or not markdown_file_path.endswith(".md"):
                logger.warning(f"Invalid markdown file path: {markdown_file_path}")
                return StepResult(
                    status=StepStatus.FAILED,
                    error=ValueError(
                        f"Invalid markdown file path: {markdown_file_path}"
                    ),
                )

            # Initialize post processor
            post_processor = CleanMarkdownPostProcessor()

            # Create output directory
            os.makedirs(output_dir, exist_ok=True)

            # Get credentials
            credentials = azure_openai_credentials()
            logger.info(f"Using Azure OpenAI credentials")

            try:
                # Read the file
                with open(markdown_file_path, "r", encoding="utf-8") as file:
                    markdown_content = file.read()

                # Clean the content
                result = post_processor.post_process(markdown_content, **credentials)

                # Save the result
                output_file_path = os.path.join(
                    output_dir, os.path.basename(markdown_file_path)
                )
                with open(output_file_path, "w", encoding="utf-8") as md_file:
                    md_file.write(result)

                logger.info(f"Cleaned markdown file saved to {output_file_path}")

                return StepResult(
                    status=StepStatus.COMPLETED,
                    output_paths={"cleaned_markdown": output_file_path},
                    metadata={"original_file": markdown_file_path},
                )
            except Exception as e:
                logger.error(f"Error processing file {markdown_file_path}: {str(e)}")
                return StepResult(
                    status=StepStatus.FAILED,
                    error=e,
                    metadata={"original_file": markdown_file_path},
                )

        except Exception as e:
            logger.exception(f"Error cleaning markdown file: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
