"""
Entity Content Extraction Pipeline Step

This module implements a pipeline step that extracts detailed content for specific entities
from textbook chapters using Azure OpenAI. It processes markdown content and extracts
comprehensive entity-specific information while preserving the original structure.
"""

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

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(".env")


class ExtractedEntityContent(BaseModel):
    """
    Pydantic model representing the extracted entity content from a textbook chapter.

    This model ensures that extracted content is comprehensive, unmodified, and strictly
    relevant to the specified entity.
    """

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
    """
    Retrieve Azure OpenAI service credentials from environment variables.

    Returns:
        Dict[str, Optional[str]]: A dictionary containing Azure OpenAI credentials:
            - api_key: Azure OpenAI API key
            - api_base: Azure OpenAI endpoint URL
            - api_version: API version to use
            - deployment_name: Model deployment name

    Raises:
        ValueError: If any required environment variables are missing
    """
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
    input_types = {"chapter_concepts", "markdown"}
    output_types = {"entity_content"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the entity content extraction step.

        This method extracts detailed content for each entity from a textbook chapter
        by dynamically updating the content extraction model and using Azure OpenAI
        for intelligent content extraction.

        Args:
            input_paths (Dict[str, str]): Dictionary containing input file paths:
                - "chapter_concepts": Path to JSON file with chapter entity metadata
                - "markdown": Path to markdown file containing the chapter content
            output_dir (str): Directory where the extracted entity content JSON will be saved

        Returns:
            StepResult: Result object containing:
                - status: COMPLETED if successful, FAILED if error occurred
                - output_paths: Dictionary with "entity_content" key mapping to output file path
                - error: Exception object if processing failed

        Raises:
            ValueError: If required input paths are not provided
            FileNotFoundError: If input files do not exist
            Exception: For any other processing errors
        """
        try:
            # Validate input parameters
            input_file_path = input_paths.get("chapter_concepts")
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
            chapter_metadata = self._load_chapter_metadata(input_file_path)
            markdown_content = self._load_markdown_content(markdown_file_path)

            # Extract content for each entity
            extracted_contents = self._extract_entity_contents(
                chapter_metadata, markdown_content, extractor, credentials
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
                output_paths={"entity_content": output_path},
            )

        except Exception as e:
            logger.exception("Error during entity content extraction: %s", str(e))
            return StepResult(status=StepStatus.FAILED, error=e)

    def _load_chapter_metadata(self, file_path: str) -> Dict:
        """
        Load chapter metadata from JSON file.

        Args:
            file_path (str): Path to the JSON file containing chapter metadata

        Returns:
            Dict: Parsed chapter metadata

        Raises:
            json.JSONDecodeError: If the file contains invalid JSON
            IOError: If the file cannot be read
        """
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                metadata = json.load(file)
            logger.debug("Successfully loaded chapter metadata from %s", file_path)
            return metadata
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

    def _load_markdown_content(self, file_path: str) -> str:
        """
        Load markdown content from file.

        Args:
            file_path (str): Path to the markdown file

        Returns:
            str: Content of the markdown file

        Raises:
            IOError: If the file cannot be read
        """
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
        chapter_metadata: Dict,
        markdown_content: str,
        extractor: SimpleMetadataExtractor,
        credentials: Dict[str, str],
    ) -> List[Dict[str, str]]:
        """
        Extract content for each entity using Azure OpenAI.

        Args:
            chapter_metadata (Dict): Chapter metadata containing entity information
            markdown_content (str): Full markdown content of the chapter
            extractor (SimpleMetadataExtractor): Metadata extraction instance
            credentials (Dict[str, str]): Azure OpenAI credentials

        Returns:
            List[Dict[str, str]]: List of dictionaries containing entity and content pairs

        Raises:
            Exception: If content extraction fails for any entity
        """
        # Store original field description for restoration
        original_content_description = ExtractedEntityContent.model_fields[
            "content"
        ].description
        extracted_contents = []

        try:

            # Get entities from the new output structure: entity_graph -> nodes
            entity_nodes = chapter_metadata.get("entity_graph", {}).get("nodes", [])
            logger.info("Extracting content for %d entities", len(entity_nodes))

            for idx, entity in enumerate(entity_nodes, 1):
                entity_name = entity.get("name", "")
                entity_id = entity.get("id", f"entity_{idx}")
                entity_type = entity.get("type", "concept")
                location_context = entity.get("location_context", "")
                content_summary = entity.get("content_summary", "")

                logger.info(
                    "Processing entity %d/%d: %s (%s)",
                    idx,
                    len(entity_nodes),
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

                extracted_contents.append(
                    {
                        "entity_id": entity_id,
                        "entity_name": entity_name,
                        "entity_type": entity_type,
                        "location_context": location_context,
                        "content_summary": content_summary,
                        "content": entity_content.content if entity_content else "",
                    }
                )

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
        extracted_contents: List[Dict[str, str]],
        markdown_file_path: str,
        output_dir: str,
    ) -> str:
        """
        Save extracted subtopic contents to JSON file.

        Args:
            extracted_contents (List[Dict[str, str]]): List of extracted subtopic contents
            markdown_file_path (str): Original markdown file path (used for naming output file)
            output_dir (str): Directory to save the output file

        Returns:
            str: Path to the saved output file

        Raises:
            IOError: If the file cannot be written
        """
        try:
            # Generate output filename based on input markdown filename
            output_filename = os.path.basename(markdown_file_path).replace(
                ".md", ".json"
            )
            output_path = os.path.join(output_dir, output_filename)

            # Write extracted contents to JSON file
            with open(output_path, "w", encoding="utf-8") as json_file:
                json.dump(
                    extracted_contents,
                    json_file,
                    indent=2,
                    ensure_ascii=False,
                )

            # Log comprehensive statistics
            total_entities = len(extracted_contents)
            total_content_length = sum(
                len(content["content"]) for content in extracted_contents
            )
            entity_types = {}

            for content in extracted_contents:
                entity_type = content.get("entity_type", "unknown")
                entity_types[entity_type] = entity_types.get(entity_type, 0) + 1

            logger.info("Content extraction summary:")
            logger.info("  Total entities: %d", total_entities)
            logger.info("  Total content length: %d characters", total_content_length)
            logger.info("  Entity type distribution: %s", entity_types)
            logger.info(
                "  Average content per entity: %.1f characters",
                total_content_length / total_entities if total_entities > 0 else 0,
            )

            logger.debug("Saved extracted contents to %s", output_path)
            return output_path

        except IOError as e:
            logger.error("Error writing output file %s: %s", output_path, str(e))
            raise
