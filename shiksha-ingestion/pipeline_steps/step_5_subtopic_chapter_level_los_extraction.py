import json
import os
import logging
from pathlib import Path
import re
from textwrap import dedent
import time
from typing import Dict, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from ingestion_pipeline.metadata_extractors.simple_metadata_extractor import (
    SimpleMetadataExtractor,
)
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv(".env")


class ChapterMetadata(BaseModel):
    """Structured metadata extracted from a textbook chapter."""

    topics: List[str] = Field(
        default_factory=list,
        description=(
            "List of core topic headings explicitly discussed in the chapter body. "
            "Each topic should be a standalone concept or section typically marked with a numbered title like '1.2 Structure of Atom'. "
            "Include such numbering if present. "
            "IMPORTANT: STRICTLY include ONLY those topics with maximum TWO levels of numbering (e.g., 'X.Y'), "
            "and ALWAYS EXCLUDE topics with deeper levels like 'X.Y.Z', 'X.Y.Z.K' or any other format with more than two numbers. "
            "ALWAYS exclude ALL non-topical content including but not limited to 'Activities', 'Exercises', 'Summary', 'Questions', 'Figure it out', "
            "'Problems', 'Discussion', 'Experiments', 'Projects', 'Did You Know', or any side notes. "
            "Include ONLY primary content sections that contribute directly to the core conceptual learning of the chapter. "
        ),
    )

    learning_outcomes: List[str] = Field(
        default_factory=list,
        description=dedent(
            """
            A list of specific, measurable learning outcomes for the chapter based on Bloom's Taxonomy.

            Each learning outcome MUST begin with ONLY one of the following precise Bloom's action verbs:
            {action_verbs}
            and describe a distinct skill or knowledge that students should demonstrate after studying the topic.
            Outcomes should span multiple cognitive levels from remembering to creating, with each outcome standing on its own.

            STRICT REQUIREMENT: Every learning outcome must start with one (and only one) of the above action verbs.
            Do NOT use any other verbs or introductory phrases.

            IMPORTANT: NO learning outcome should begin with any of these prohibited action verbs:
            {prohibited_action_verbs}

            Focus on measurable outcomes that reflect deep comprehension, practical application, critical analysis, evaluation, or creation relevant to the topic.
            """
        ),
    )


def get_action_verbs(grade, subject) -> List[str]:
    with open("scert_action_verbs.json", "r", encoding="utf-8") as f:
        action_verbs = json.load(f)

    return action_verbs[grade][subject]


def get_action_verbs_prohibited(grade, subject) -> List[str]:
    with open("scert_action_verbs_prohibited.json", "r", encoding="utf-8") as f:
        action_verbs = json.load(f)

    return action_verbs[grade][subject]


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


class SubtopicChapterLOsExtractionStep(BasePipelineStep):
    """Extract subtopic and chapter level learning outcomes from textbook chapters."""

    name = "subtopic_chapter_los_extraction"
    description = (
        "Extract subtopics and chapter-level learning outcomes from textbook chapters"
    )
    input_types = {"cleaned_markdown"}
    output_types = {"chapter_lo_subtopic_names"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - extract metadata from a single markdown file.

        Args:
            input_paths: Dictionary with "markdown_file" key mapping to a markdown file path
            output_dir: Directory where metadata JSON file will be saved

            Returns:
            StepResult with status and output paths
        """
        markdown_file_path = input_paths["cleaned_markdown"]

        try:
            logger.info(f"Processing markdown file: {markdown_file_path}")

            if not os.path.exists(markdown_file_path):
                raise FileNotFoundError(
                    f"Input file {markdown_file_path} does not exist."
                )

            if not markdown_file_path.endswith(".md"):
                raise ValueError(
                    f"Input file {markdown_file_path} is not a markdown file."
                )

            # Create output directory
            os.makedirs(output_dir, exist_ok=True)

            # Get grade and subject from config
            grade = self.config.get("grade")
            subject = self.config.get("subject")

            if not grade or not subject:
                raise ValueError(
                    "Grade and subject must be specified in the configuration."
                )

            # Initialize extractor
            extractor = SimpleMetadataExtractor()

            # Get credentials for metadata extraction
            credentials = azure_openai_credentials()
            logger.info("CREDENTIALS BEING USED: %s", json.dumps(credentials, indent=2))

            # Prepare learning outcomes description with action verbs
            original_lo_description = ChapterMetadata.model_fields[
                "learning_outcomes"
            ].description

            action_verbs = "; ".join(get_action_verbs(grade, subject))
            action_verbs_prohibited = "; ".join(
                get_action_verbs_prohibited(grade, subject)
            )

            ChapterMetadata.model_fields["learning_outcomes"].description = (
                original_lo_description.replace("{action_verbs}", action_verbs).replace(
                    "{prohibited_action_verbs}", action_verbs_prohibited
                )
            )
            ChapterMetadata.model_rebuild(force=True)

            try:
                # Read the markdown content
                with open(markdown_file_path, "r", encoding="utf-8") as file:
                    markdown_content = file.read()

                # Extract metadata
                chapter_metadata = extractor.extract(
                    markdown_content, ChapterMetadata, **credentials
                )

                # Save the result as a JSON file
                output_filename = os.path.basename(markdown_file_path).replace(
                    ".md", ".json"
                )
                output_path = os.path.join(output_dir, output_filename)

                with open(output_path, "w", encoding="utf-8") as json_file:
                    json.dump(
                        chapter_metadata.model_dump(),
                        json_file,
                        indent=2,
                        ensure_ascii=False,
                    )

                logger.info(
                    "Extracted Chapter Metadata for %s saved to %s",
                    markdown_file_path,
                    output_path,
                )

            except Exception as e:
                logger.warning(f"Error processing {markdown_file_path}: {e}")
                raise

            # Reset the model field to its original state
            ChapterMetadata.model_fields["learning_outcomes"].description = (
                original_lo_description
            )
            ChapterMetadata.model_rebuild(force=True)

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"chapter_lo_subtopic_names": output_path},
                metadata={
                    "grade": grade,
                    "subject": subject,
                    "chapter": os.path.basename(markdown_file_path),
                },
            )

        except Exception as e:
            logger.exception(f"Error extracting chapter metadata: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
