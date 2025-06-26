import json
import logging
import os
from textwrap import dedent
from typing import Dict, List, Any
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from ingestion_pipeline.metadata_extractors.simple_metadata_extractor import (
    SimpleMetadataExtractor,
)
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

load_dotenv(".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class Subtopic(BaseModel):
    topic: str
    learning_outcomes: List[str]


class ChapterMetadata(BaseModel):
    """Structured metadata extracted from a textbook chapter"""

    chapter_number: int
    chapter_title: str
    learning_outcomes: List[str] = Field(default_factory=list)
    subtopics: List[Subtopic]


class SubtopicLearningOutcomes(BaseModel):
    """Structured metadata extracted from a textbook chapter."""

    learning_outcomes: List[str] = Field(
        default_factory=list,
        description=dedent(
            """
            A list of specific, measurable learning outcomes for the {topic} based on Bloom's Taxonomy.

            Each learning outcome MUST begin with ONLY one of the following precise Bloom's action verbs:
            {action_verbs}
            and describe a distinct skill or knowledge that students should demonstrate after studying the {topic}.
            Outcomes should span multiple cognitive levels from remembering to creating, with each outcome standing on its own.

            STRICT REQUIREMENT: Every learning outcome must start with one (and only one) of the above action verbs.
            Do NOT use any other verbs or introductory phrases.

            IMPORTANT: NO learning outcome should begin with any of these prohibited action verbs:
            {prohibited_action_verbs}

            Focus on measurable outcomes that reflect deep comprehension, practical application, critical analysis, evaluation, or creation relevant to the {topic}.
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


class SubtopicWiseLOExtractionStep(BasePipelineStep):
    """Extract subtopic-wise learning outcomes from a chapter markdown file."""

    name = "subtopic_wise_lo_extraction"
    description = "Extract subtopic-wise learning outcomes from cleaned text with chapter metadata"
    input_types = {"cleaned_markdown", "cleaned_chapter_lo_subtopic_names"}
    output_types = {"subtopic_los"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - extract subtopic-wise learning outcomes from chapter markdown.

        Args:
            input_paths: Dictionary with keys:
                - "cleaned_markdown": Path to the cleaned markdown file
                - "cleaned_chapter_lo_subtopic_names": Path to the chapter metadata file
            output_dir: Directory where output JSON will be saved

        Returns:
            StepResult with status and output paths
        """
        markdown_file = input_paths["cleaned_markdown"]
        metadata_file = input_paths["cleaned_chapter_lo_subtopic_names"]

        # Create base filename for output from the input markdown filename
        base_filename = os.path.splitext(os.path.basename(markdown_file))[0]
        output_path = os.path.join(output_dir, f"{base_filename}.json")

        try:
            logger.info(f"Processing {markdown_file} with metadata {metadata_file}")

            # Get configuration
            grade = self.config.get("grade")
            subject = self.config.get("subject")
            chapter_number = self.config.get("chapter_number")
            chapter_title = self.config.get("chapter_title")

            if not grade or not subject:
                return StepResult(
                    status=StepStatus.FAILED,
                    error=ValueError(
                        "Grade and subject must be provided in configuration"
                    ),
                )

            if not chapter_number or not chapter_title:
                return StepResult(
                    status=StepStatus.FAILED,
                    error=ValueError(
                        "Chapter number and chapter title must be provided in configuration"
                    ),
                )

            # Check if input files exist
            if not os.path.exists(markdown_file):
                return StepResult(
                    status=StepStatus.FAILED,
                    error=FileNotFoundError(
                        f"Input markdown file {markdown_file} does not exist."
                    ),
                )

            if not os.path.exists(metadata_file):
                return StepResult(
                    status=StepStatus.FAILED,
                    error=FileNotFoundError(
                        f"Input metadata file {metadata_file} does not exist."
                    ),
                )

            # Initialize extractor
            extractor = SimpleMetadataExtractor()
            os.makedirs(output_dir, exist_ok=True)
            credentials = azure_openai_credentials()

            logger.info("CREDENTIALS BEING USED: %s", json.dumps(credentials, indent=2))

            # Get action verbs
            action_verbs = "; ".join(get_action_verbs(grade, subject))
            action_verbs_prohibited = "; ".join(
                get_action_verbs_prohibited(grade, subject)
            )
            original_description = SubtopicLearningOutcomes.model_fields[
                "learning_outcomes"
            ].description

            # Read input files
            with open(markdown_file, "r", encoding="utf-8") as file:
                markdown_content = file.read()

            with open(metadata_file, "r", encoding="utf-8") as file:
                metadata_content = json.load(file)

            # Extract learning outcomes for each subtopic
            subtopic_los = []
            for subtopic in metadata_content.get("topics", []):
                # Update the field description with the current subtopic
                SubtopicLearningOutcomes.model_fields[
                    "learning_outcomes"
                ].description = (
                    original_description.replace("{topic}", subtopic)
                    .replace("{action_verbs}", action_verbs)
                    .replace("{prohibited_action_verbs}", action_verbs_prohibited)
                )
                SubtopicLearningOutcomes.model_rebuild(force=True)

                # Extract learning outcomes
                subtopic_lo_obj = extractor.extract(
                    markdown_content, SubtopicLearningOutcomes, **credentials
                )
                subtopic_los.append((subtopic, subtopic_lo_obj))

                # Reset description to original
                SubtopicLearningOutcomes.model_fields[
                    "learning_outcomes"
                ].description = original_description

            # Create output object with complete chapter metadata
            output_obj = ChapterMetadata(
                chapter_number=int(chapter_number),
                chapter_title=chapter_title,
                learning_outcomes=metadata_content.get("learning_outcomes", []),
                subtopics=[
                    Subtopic(topic=topic, learning_outcomes=lo.learning_outcomes)
                    for topic, lo in subtopic_los
                ],
            )

            # Save output
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(output_obj.model_dump(), f, indent=2)

            logger.info(
                f"Extracted learning outcomes for chapter {chapter_number}: {chapter_title} saved to {output_path}"
            )

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"subtopic_los": output_path},
                metadata={
                    "num_subtopics": len(output_obj.subtopics),
                    "chapter_number": chapter_number,
                    "chapter_title": chapter_title,
                },
            )

        except Exception as e:
            logger.exception(f"Error extracting learning outcomes: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
