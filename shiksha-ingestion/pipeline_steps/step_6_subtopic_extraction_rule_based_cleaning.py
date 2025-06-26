import json
import os
import logging
from pathlib import Path
import re
import time
from typing import Dict, List
from pydantic import BaseModel, Field
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ChapterMetadata(BaseModel):
    """Structured metadata extracted from a textbook chapter."""

    topics: List[str] = Field(
        default_factory=list,
    )

    learning_outcomes: List[str] = Field(
        default_factory=list,
    )


class SubtopicCleaningStep(BasePipelineStep):
    """Clean subtopics in chapter metadata by filtering out deeply nested topics."""

    name = "subtopic_cleaning"
    description = "Clean subtopics in chapter metadata using rule-based filtering"
    input_types = {"chapter_lo_subtopic_names"}
    output_types = {"cleaned_chapter_lo_subtopic_names"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - clean subtopics in chapter metadata.

        Args:
            input_paths: Dictionary with "subtopic_info_file" key mapping to a single JSON file with subtopic information
            output_dir: Directory where cleaned metadata will be saved

        Returns:
            StepResult with status and output paths
        """
        input_file_path = input_paths.get("chapter_lo_subtopic_names")
        if not input_file_path:
            return StepResult(
                status=StepStatus.FAILED,
                error="Input path 'subtopic_info_file' not provided",
            )

        try:
            if not os.path.exists(input_file_path):
                return StepResult(
                    status=StepStatus.FAILED,
                    error=f"Input file {input_file_path} does not exist.",
                )

            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)

            # Process the single JSON file
            file_name = os.path.basename(input_file_path)
            output_file_path = os.path.join(output_dir, file_name)

            try:
                with open(input_file_path, "r", encoding="utf-8") as file:
                    json_content = json.load(file)
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing JSON file {input_file_path}: {e}")
                return StepResult(
                    status=StepStatus.FAILED,
                    error=f"Error parsing JSON file: {e}",
                )

            try:
                chapter_metadata = ChapterMetadata(**json_content)
            except Exception as e:
                logger.error(f"Error validating metadata in {input_file_path}: {e}")
                return StepResult(
                    status=StepStatus.FAILED,
                    error=f"Error validating metadata: {e}",
                )

            # Clean topic names
            cleaned_topics = []
            for topic in chapter_metadata.topics:
                # Check if topic has a numbering pattern
                match = re.match(r"^(\d+\.(?:\d+)?\.(?:\d+\.?)+)", topic)
                if match:
                    # This matches X.Y.Z or deeper, so skip it
                    logger.info(f"Removing deeply nested topic: {topic}")
                    continue

                # Keep all other topics (X.Y, X., or unnumbered)
                cleaned_topics.append(topic)

            # Update the metadata with cleaned topics
            chapter_metadata.topics = cleaned_topics

            # Save the cleaned metadata
            with open(output_file_path, "w", encoding="utf-8") as json_file:
                json.dump(
                    chapter_metadata.model_dump(),
                    json_file,
                    indent=2,
                    ensure_ascii=False,
                )

            logger.info(f"Cleaned chapter metadata and saved to {output_file_path}")

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"cleaned_chapter_lo_subtopic_names": output_file_path},
                metadata={
                    "original_topic_count": len(chapter_metadata.topics)
                    + len(cleaned_topics)
                    - len(chapter_metadata.topics),
                    "cleaned_topic_count": len(cleaned_topics),
                },
            )

        except Exception as e:
            logger.exception(f"Error cleaning chapter metadata: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
