"""Karnataka LBA Question Graph Entity Extraction Pipeline Step"""

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

from pipeline_steps.knowledge_graph.models import GraphEntity

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv(".env")

# Default summary for all LBA entities
DEFAULT_SUMMARY = (
    "Learning-Based Assessment question entity for knowledge graph construction"
)


class ChapterAssessmentQuestions(BaseModel):
    """Structured chapter assessment questions."""

    questions: List[str] = Field(
        ...,
        description=dedent(
            """
            Extract all questions from the provided markdown text.
            The questions are grouped under common instructions, followed by a numbered list of questions.

            For each question, output a string in the following format:
            "<Common instructions of a set of questions>\\n<Question>"

            For example, if the markdown contains:
            Common instructions of a set of questions:
            1. Question 1
            2. Question 2

            The extracted questions should be:
            "Common instructions of a set of questions:\\nQuestion 1"
            "Common instructions of a set of questions:\\nQuestion 2"

            For questions that ONLY make sense together (such as "Match the following" or similar group-based questions), extract all such questions together in one string, preserving their grouping and numbering, in the format:
            "<Common instructions of a set of questions>\\n1. Question 1\\n2. Question 2"

            Return the list of such formatted question strings.
            """
        ),
    )


def azure_openai_credentials():
    """Get Azure OpenAI credentials from environment variables."""
    credentials = {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }

    missing_vars = [key for key, value in credentials.items() if not value]
    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}. "
            "Please ensure all Azure OpenAI credentials are set in your .env file."
        )

    return credentials


class KarnatakaLBAQuestionGraphEntityExtractionStep(BasePipelineStep):
    """Pipeline step that extracts LBA questions and creates graph entities."""

    name = "karnataka_lba_question_graph_entity_extraction"
    description = (
        "Extracts LBA assessment questions and creates graph entities with content."
    )
    input_types = {"lba_markdown", "lba_page_ranges"}
    output_types = {"lba_entities"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Extract questions and create graph entities."""
        # Extract input file paths
        markdown_file_path = input_paths["lba_markdown"]
        lpa_page_ranges_path = input_paths["lba_page_ranges"]

        try:
            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)

            # Initialize the metadata extractor for Azure OpenAI processing
            extractor = SimpleMetadataExtractor()

            # Get Azure OpenAI credentials with validation
            try:
                credentials = azure_openai_credentials()
                logger.debug("Successfully retrieved Azure OpenAI credentials")
            except ValueError as cred_error:
                logger.error(f"Credential validation failed: {cred_error}")
                raise

            try:
                # Read markdown content and page ranges configuration
                logger.debug(f"Reading markdown content from: {markdown_file_path}")
                with open(markdown_file_path, "r", encoding="utf-8") as file:
                    markdown_content = file.read()
                with open(lpa_page_ranges_path, "r", encoding="utf-8") as file:
                    lpa_page_ranges = json.load(file)

                if not markdown_content.strip():
                    raise ValueError(f"Markdown file {markdown_file_path} is empty")

                # Initialize collections for all entities and content across chapters
                all_entities = []

                # Process each chapter based on page ranges
                for chapter_page_range in lpa_page_ranges["page_ranges"]:
                    # Extract chapter metadata from page range configuration
                    chapter_number = chapter_page_range.get("chapter_number")
                    chapter_title = chapter_page_range.get("chapter_title")
                    start_page = chapter_page_range.get("start_page")
                    end_page = chapter_page_range.get("end_page")

                    if not start_page or not end_page:
                        raise ValueError(
                            f"Invalid page range in {lpa_page_ranges_path}: "
                            f"start_page={start_page}, end_page={end_page}"
                        )

                    # Locate content between page markers in markdown
                    start_marker = f"## Page {start_page}"
                    end_marker = f"## Page {end_page}"

                    start_idx = markdown_content.find(start_marker)
                    if start_idx == -1:
                        raise ValueError(
                            f"Start page marker '{start_marker}' not found in markdown content."
                        )

                    # Find the end marker after the start position
                    end_idx = markdown_content.find(
                        end_marker, start_idx + len(start_marker)
                    )
                    if end_idx == -1:
                        raise ValueError(
                            f"End page marker '{end_marker}' not found in markdown content."
                        )

                    # Extract chapter content between markers
                    chapter_content = markdown_content[
                        start_idx + len(start_marker) : end_idx
                    ].strip()

                    # Use Azure OpenAI to extract structured questions from content
                    chapter_assessment_questions = extractor.extract(
                        chapter_content, ChapterAssessmentQuestions, **credentials
                    )

                    # Create graph entities and content for each question
                    for question_idx, question in enumerate(
                        chapter_assessment_questions.questions, 1
                    ):
                        # Create entity ID with global counter
                        entity_id = f"LBA_{total_questions_processed + question_idx}"

                        # Create GraphEntity
                        entity = GraphEntity(
                            id=entity_id,
                            name=entity_id,
                            type="assessment_lba",
                            content_summary=DEFAULT_SUMMARY,
                            content=question,
                        )

                        # Add entity to collection
                        all_entities.append(entity.model_dump())

                    total_questions_processed += len(
                        chapter_assessment_questions.questions
                    )

                    logger.info(
                        f"Processed Chapter {chapter_number}: {len(chapter_assessment_questions.questions)} questions"
                    )

                    self._save_entities(
                        all_entities, output_dir, f"{chapter_number}.json"
                    )

                logger.info(
                    f"Successfully processed {total_questions_processed} questions from {len(lpa_page_ranges['page_ranges'])} chapters"
                )

            except Exception as processing_error:
                logger.warning(
                    f"Error during processing of {markdown_file_path}: {processing_error}"
                )
                raise

            # Return successful result with both output paths
            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={
                    "lba_entities": output_dir,
                },
            )

        except Exception as e:
            # Log full exception details for debugging
            logger.exception(
                f"Failed to extract chapter questions from {markdown_file_path}: {e}"
            )
            return StepResult(status=StepStatus.FAILED, error=e)

    def _save_entities(
        self, entities: List[Dict], output_dir: str, filename: str
    ) -> str:
        """Save entities in step_1 format."""
        output_path = os.path.join(output_dir, filename)

        with open(output_path, "w", encoding="utf-8") as json_file:
            json.dump(entities, json_file, indent=2, ensure_ascii=False)

        logger.info(f"Saved {len(entities)} entities to {output_path}")
        return output_path
