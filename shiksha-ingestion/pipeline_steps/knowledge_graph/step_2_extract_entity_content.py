"""Entity Content Extraction Pipeline Step"""

import json
import os
import logging
from textwrap import dedent
from typing import Dict, List, Optional
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


class ExtractedEntityContent(BaseModel):
    """Extracted entity content from a textbook chapter."""

    content: str = Field(
        description=dedent(
            """
        Extract ALL content under the heading `{entity_name}` in the chapter.
        
        ENTITY CONTEXT:
        - Entity Type: {entity_type} (section, subsection, activity, or assessment)
        - Position in Chapter: {location_context}
        - Expected Content: {content_summary}
        
        EXTRACTION INSTRUCTIONS:
        
        1. Try to find the exact heading "{entity_name}" in the chapter text
           - If the exact heading is found, extract content from that heading
           - If the exact heading is NOT found, use location_context and content_summary to identify the relevant content
        
        2. Extract ALL content that appears under this heading/section until the next heading begins
        
        3. Include EVERYTHING under this heading/section:
           - Main text and paragraphs
           - Tables with all rows and columns
           - Lists and bullet points
           - Figures and their captions
           - Questions and exercises
           - Examples and solutions
           - Information boxes and callouts
           - Any special notes or supplementary content
        
        4. Preserve ALL formatting exactly as it appears:
           - Keep original markdown formatting intact
           - Maintain table structures with all cells
           - Preserve indentation and line breaks
           - Keep mathematical notations and special characters
           - Retain all numbering and bullet points
        
        BOUNDARY RULES:
        - If a heading is found, start extraction from that heading
        - If no exact heading is found, use location_context to identify the section based on hierarchy and position
        - Continue until you reach the next heading of equal or higher level
        - If this is a subsection, stop when you reach another subsection or section
        - Use both location_context and content_summary to determine appropriate extraction boundaries
        
        COMPLETENESS IS CRITICAL:
        - Extract ALL content under the heading - nothing should be left out
        - Do NOT summarize or paraphrase anything
        - Extract EXACTLY as written in the source material
        - Include transitional text between sections
        
        COMMON MISTAKES TO AVOID:
        - Do not cut off content in the middle of sections
        - Do not skip tables, figures, or supplementary content
        - Do not merge content from multiple headings unless they belong to the same concept
        - Do not modify formatting or structure
        - Do not return empty content if a direct heading match is not found - use location_context and content_summary to identify relevant content
        """
        )
    )


def azure_openai_credentials() -> Dict[str, Optional[str]]:
    """Get Azure OpenAI credentials from environment variables."""
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
            f"Missing required environment variables: {', '.join(missing_vars)}"
        )

    return credentials


class ExtractEntityContentStep(BasePipelineStep):
    """
    Pipeline step for extracting detailed content for specific entities from textbook chapters.

    This step processes extracted entities and retrieves the complete content under each
    entity while preserving the original structure and formatting.
    """

    name = "extract_entity_content"
    description = (
        "Extract comprehensive entity content from textbook chapters using Azure OpenAI"
    )
    input_types = {"chapter_entities", "markdown"}
    output_types = {"entity_with_content"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Extract entity content from chapter using Azure OpenAI."""
        try:
            # Validate input parameters
            input_file_path = input_paths.get("chapter_entities")
            markdown_file_path = input_paths.get("markdown")

            if not input_file_path or not markdown_file_path:
                raise ValueError(
                    "Both 'chapter_concepts' and 'markdown' input paths must be provided"
                )

            logger.info("Processing entity content extraction for: %s", input_file_path)

            # Validate file existence
            if not os.path.exists(input_file_path):
                raise FileNotFoundError(
                    f"Chapter metadata file not found: {input_file_path}"
                )

            if not os.path.exists(markdown_file_path):
                raise FileNotFoundError(
                    f"Markdown file not found: {markdown_file_path}"
                )

            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)

            # Initialize the metadata extractor
            extractor = SimpleMetadataExtractor()

            # Get and validate Azure OpenAI credentials
            credentials = azure_openai_credentials()
            logger.info("Azure OpenAI credentials validated successfully")

            # Load chapter metadata and markdown content
            chapter_entities = self._load_chapter_metadata(input_file_path)
            markdown_content = self._load_markdown_content(markdown_file_path)

            # Extract content for each entity
            extracted_contents = self._extract_entity_contents(
                chapter_entities, markdown_content, extractor, credentials
            )

            # Save results to output file
            output_path = self._save_extracted_contents(
                extracted_contents, markdown_file_path, output_dir
            )

            logger.info(
                "Successfully extracted entity content from %s, saved to %s",
                markdown_file_path,
                output_path,
            )

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"entity_with_content": output_path},
            )

        except Exception as e:
            logger.exception("Error during entity content extraction: %s", str(e))
            return StepResult(status=StepStatus.FAILED, error=e)

    def _load_chapter_metadata(self, file_path: str) -> List[GraphEntity]:
        """Load chapter metadata from JSON and parse into GraphEntity objects."""
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                metadata_list = json.load(file)

            # Parse each entity dictionary into GraphEntity objects
            entities = [GraphEntity(**entity_dict) for entity_dict in metadata_list]

            logger.debug(
                "Successfully loaded and parsed %d entities from %s",
                len(entities),
                file_path,
            )
            return entities
        except json.JSONDecodeError as e:
            logger.error(
                "Invalid JSON in chapter metadata file %s: %s", file_path, str(e)
            )
            raise
        except IOError as e:
            logger.error(
                "Error reading chapter metadata file %s: %s", file_path, str(e)
            )
            raise
        except Exception as e:
            logger.error("Error parsing entities from %s: %s", file_path, str(e))
            raise

    def _load_markdown_content(self, file_path: str) -> str:
        """Load markdown content from file."""
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()
            logger.debug("Successfully loaded markdown content from %s", file_path)
            return content
        except IOError as e:
            logger.error("Error reading markdown file %s: %s", file_path, str(e))
            raise

    def _extract_entity_contents(
        self,
        chapter_entities: List[GraphEntity],
        markdown_content: str,
        extractor: SimpleMetadataExtractor,
        credentials: Dict[str, str],
    ) -> List[GraphEntity]:
        """Extract content for each entity using Azure OpenAI."""
        # Store original field description for restoration
        original_content_description = ExtractedEntityContent.model_fields[
            "content"
        ].description
        extracted_contents = []

        try:

            logger.info("Extracting content for %d entities", len(chapter_entities))

            for idx, entity in enumerate(chapter_entities, 1):
                entity_name = entity.name
                entity_id = entity.id
                entity_type = entity.type
                location_context = entity.location_context
                content_summary = entity.content_summary

                logger.info(
                    "Processing entity %d/%d: %s (%s)",
                    idx,
                    len(chapter_entities),
                    entity_name,
                    entity_type,
                )

                # Dynamically update the field description with current entity attributes
                updated_description = original_content_description.replace(
                    "{entity_name}", entity_name
                )
                updated_description = updated_description.replace(
                    "{entity_type}", entity_type
                )
                updated_description = updated_description.replace(
                    "{location_context}", location_context
                )
                updated_description = updated_description.replace(
                    "{content_summary}", content_summary
                )

                ExtractedEntityContent.model_fields["content"].description = (
                    updated_description
                )
                # Rebuild the model to apply the new description
                ExtractedEntityContent.model_rebuild(force=True)

                # Extract content for this entity with retry mechanism for empty content
                max_retries = 3
                retry_count = 0
                entity_content = None

                while retry_count < max_retries:
                    entity_content = extractor.extract(
                        markdown_content, ExtractedEntityContent, **credentials
                    )

                    # Check if content is empty or too short (likely unsuccessful extraction)
                    if (
                        entity_content.content
                        and len(entity_content.content.strip()) > 10
                    ):
                        break

                    retry_count += 1
                    logger.warning(
                        "Empty or very short content detected for entity '%s' (attempt %d/%d). Retrying...",
                        entity_name,
                        retry_count,
                        max_retries,
                    )

                if retry_count == max_retries and (
                    not entity_content.content
                    or len(entity_content.content.strip()) <= 10
                ):
                    logger.error(
                        "Failed to extract content for entity '%s' after %d attempts. Using best available result.",
                        entity_name,
                        max_retries,
                    )

                entity.content = entity_content.content if entity_content else ""
                extracted_contents.append(entity)

                logger.debug(
                    "Successfully extracted content for entity: %s (length: %d chars)",
                    entity_name,
                    len(entity_content.content),
                )

        finally:
            # Restore original field description
            ExtractedEntityContent.model_fields["content"].description = (
                original_content_description
            )
            ExtractedEntityContent.model_rebuild(force=True)

        return extracted_contents

    def _save_extracted_contents(
        self,
        extracted_contents: List[GraphEntity],
        markdown_file_path: str,
        output_dir: str,
    ) -> str:
        """Save extracted entity contents to a JSON file and return the output path."""
        try:
            # Generate output filename based on input markdown filename
            output_filename = os.path.basename(markdown_file_path).replace(
                ".md", ".json"
            )
            output_path = os.path.join(output_dir, output_filename)

            # Write extracted contents to JSON file
            with open(output_path, "w", encoding="utf-8") as json_file:
                json.dump(
                    [graph_entity.model_dump() for graph_entity in extracted_contents],
                    json_file,
                    indent=2,
                    ensure_ascii=False,
                )
            logger.debug("Saved extracted contents to %s", output_path)
            return output_path

        except IOError as e:
            logger.error("Error writing output file %s: %s", output_path, str(e))
            raise
