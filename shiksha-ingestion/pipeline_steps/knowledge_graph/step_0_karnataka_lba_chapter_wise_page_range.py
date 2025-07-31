"""Karnataka LBA Chapter Page Range Extraction Pipeline Step"""

import json
import os
import logging
from textwrap import dedent
from typing import Dict, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from ingestion_pipeline.metadata_extractors.simple_metadata_extractor import (
    SimpleMetadataExtractor,
)
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

from pipeline_steps.knowledge_graph.models import ChapterPageRange

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv(".env")


class AllChapterPageRanges(BaseModel):
    """Container for all chapter page ranges extracted from a textbook."""

    page_ranges: List[ChapterPageRange] = Field(
        ...,
        description=dedent(
            """
            Extract a comprehensive list of all chapter page ranges from the provided textbook markdown.

            Requirements for each chapter entry:
            - chapter_number: The chapter's sequential number as it appears in the textbook
            - chapter_title: The exact title of the chapter (preserve original formatting)
            - start_page: The first page number (marked as '## Page INT') that contains ASSESSMENT QUESTIONS for the chapter (ignore earlier pages with only learning outcomes, question paper distribution, or other non-question content)
            - end_page: One past the last page number of the chapter that contains questions (i.e., last page number with questions + 1)

            Extraction Rules:
            - Only use page numbers that appear in the markdown in the format '## Page INT', where INT is the integer page number
            - For each chapter, the start_page must be the first page that actually contains assessment QUESTIONS for that chapter (do NOT use pages that only have learning outcomes, distribution, or other non-question content)
            - Ensure that the page range for each chapter includes all **questions** related to that chapter
            - Do not guess or invent chapters or page numbers; only use information explicitly present in the markdown
            - CRITICAL: **Do NOT refer to or use the table of contents; instead, actually find the pages with questions associated to each chapter**
            - Return the result as a list of objects, one for each chapter, in the order they appear in the markdown
            - If a chapter spans multiple non-contiguous page sections, use the overall start and end range
            """
        ),
    )


def azure_openai_credentials():
    """Retrieve Azure OpenAI credentials from environment variables."""
    credentials = {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }

    # Validate that all required credentials are present
    missing_vars = [key for key, value in credentials.items() if not value]
    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}. "
            "Please ensure all Azure OpenAI credentials are set in your .env file."
        )

    return credentials


class KarnatakaLBAPageRangeExtractionStep(BasePipelineStep):
    """Pipeline step for extracting chapter page ranges from Karnataka LBA textbook markdown files."""

    name = "karnataka_lba_chapter_page_range_extraction"
    description = (
        "Extracts chapter page ranges from markdown files containing questions "
        "related to textbook chapters for Karnataka Learning based Assessment (LBA)."
    )
    input_types = {"lba_markdown"}
    output_types = {"lba_page_ranges"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Process a markdown file to extract chapter page range metadata."""
        markdown_file_path = input_paths["lba_markdown"]

        try:
            logger.info(f"Starting processing of markdown file: {markdown_file_path}")

            if not os.path.exists(markdown_file_path):
                raise FileNotFoundError(
                    f"Input file {markdown_file_path} does not exist."
                )

            if not markdown_file_path.endswith(".md"):
                raise ValueError(
                    f"Input file {markdown_file_path} is not a markdown file (.md extension required)."
                )

            os.makedirs(output_dir, exist_ok=True)
            logger.debug(f"Created/verified output directory: {output_dir}")

            extractor = SimpleMetadataExtractor()

            try:
                credentials = azure_openai_credentials()
                logger.debug("Successfully retrieved Azure OpenAI credentials")
            except ValueError as cred_error:
                logger.error(f"Credential validation failed: {cred_error}")
                raise

            try:
                # Read the markdown content from file
                logger.debug(f"Reading markdown content from: {markdown_file_path}")
                with open(markdown_file_path, "r", encoding="utf-8") as file:
                    markdown_content = file.read()

                if not markdown_content.strip():
                    raise ValueError(f"Markdown file {markdown_file_path} is empty")

                # Extract chapter page range metadata using Azure OpenAI
                logger.info("Extracting chapter page ranges using Azure OpenAI...")
                chapter_metadata = extractor.extract(
                    markdown_content, AllChapterPageRanges, **credentials
                )

                # Generate output filename by replacing .md with .json
                output_filename = os.path.basename(markdown_file_path).replace(
                    ".md", ".json"
                )
                output_path = os.path.join(output_dir, output_filename)

                # Save the extracted metadata as formatted JSON
                logger.debug(f"Saving extracted metadata to: {output_path}")
                with open(output_path, "w", encoding="utf-8") as json_file:
                    json.dump(
                        chapter_metadata.model_dump(),  # Convert Pydantic model to dict
                        json_file,
                        indent=2,  # Pretty formatting
                        ensure_ascii=False,  # Preserve unicode characters
                    )

                logger.info(
                    "Successfully extracted chapter metadata for %s and saved to %s",
                    markdown_file_path,
                    output_path,
                )

            except Exception as processing_error:
                logger.warning(
                    f"Error during processing of {markdown_file_path}: {processing_error}"
                )
                raise

            # Return successful result with output file path
            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"lba_page_ranges": output_path},
            )

        except Exception as e:
            # Log the full exception with stack trace for debugging
            logger.exception(
                f"Failed to extract chapter metadata from {markdown_file_path}: {e}"
            )
            return StepResult(status=StepStatus.FAILED, error=e)
