"""
Concept Extraction Pipeline Step

This module implements a pipeline step that automatically extracts headings and
subheadings from textbook chapters using Azure OpenAI. It analyzes the chapter
structure to identify all major headings, sections, and subsections to create
a hierarchical map for subsequent content extraction.
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


class GraphEntity(BaseModel):
    """Represents a heading or subheading that will become a graph node."""

    id: str = Field(description="Unique identifier for the heading")
    name: str = Field(
        description="The exact heading/subheading text as it appears in the chapter"
    )
    type: str = Field(
        description="Type of heading: 'section', 'subsection', 'activity', 'assessment', 'introduction', 'content_block'"
    )
    content_summary: str = Field(
        description="A detailed 2-3 line summary describing the specific content, concepts, activities, and information that appears under this heading"
    )


class ExtractedChapterEntities(BaseModel):
    """
    Pydantic model representing all headings and subheadings extracted from a textbook chapter.

    Each entity represents a heading or subheading that will become a node
    in the knowledge graph, with names exactly as they appear in the chapter text.
    Location contexts are provided separately to be combined with entities later.
    """

    entities: List[GraphEntity] = Field(
        description=dedent(
            """
            Extract ALL headings, subheadings, and unmarked content blocks (like introductions) from the chapter that will become graph nodes, EXCEPT for the main chapter title.
            Include both explicit structural elements (headings) and implicit content blocks that may not have formal headings.

            IMPORTANT: DO NOT include the main chapter title (e.g., "Chapter 4: Exploring Magnets" or just "Chapter 4") as an entity.
            After skipping the chapter title, extract the chapter introduction as an entity (even if it lacks a formal heading), then continue with the first section heading (like "4.1 Magnetic Materials") onwards.
            
            The content of ALL entities together should cover everything in the chapter—nothing should be left out. Every part of the chapter must be included under some entity.

            Each heading entity should be identified with the following attributes:

            1. id: Short, descriptive identifier based on the heading (e.g., "section_4_1_magnetic_materials", "activity_4_1")
            2. name: EXACT heading text as it appears in the chapter
            3. type: Type of heading:
               - "section": Major numbered sections (e.g., "4.1 Magnetic and Non-magnetic Materials")
               - "subsection": Subsections within major sections
               - "activity": Activity headings (e.g., "Activity 4.1: Let us explore")
               - "assessment": Assessment section headings (e.g., "Let us enhance our learning")
               - "introduction": Chapter introductions or content blocks that don't have formal headings
               - "content_block": Other significant content without formal headings
            4. content_summary: Detailed 2-3 line summary describing the specific content, concepts, activities, and information under this heading

            HEADING EXTRACTION GUIDELINES:
            - Extract all actual headings and subheadings from the markdown, EXCLUDING the main chapter title/heading
            - ALSO extract significant content blocks without formal headings (like introductions)
            - For headings, use the EXACT heading text as it appears (including any numbering)
            - For content blocks without headings, create a descriptive name (e.g., "Chapter Introduction")
            - DO NOT extract the main chapter title (typically formatted as "Chapter X: Title" or just "Chapter X")
            - Identify the correct heading level from the markdown (# = level 1, ## = level 2, etc.)
            - For activities: Extract "Activity X.Y: Title" headings
            - For sections: Extract numbered sections like "4.1 Title", "4.2 Title"
            - For assessments: Extract section headings like "Let us enhance our learning"
            - Do NOT extract individual questions, tables, or figures as separate entities

            FOCUS ON STRUCTURE:
            Extract content that represents:
            - Chapter introduction (even if not formally headed)
            - Main numbered sections (4.1, 4.2, etc.)
            - Activity headings
            - Assessment section headings
            - Any unmarked significant content blocks between formal sections
            - Any other major structural elements EXCEPT the main chapter title
            
            CRITICAL RULE: Do NOT extract the chapter title/name itself as an entity. 
            The first level-1 heading (# Chapter X: Title) or any heading that starts with "Chapter" 
            followed by a number should be completely ignored and NOT included in the output.

            The content under each heading will be extracted separately in the next step.
            """
        )
    )

    location_contexts: List[str] = Field(
        description=dedent(
            """
            For each entity in the 'entities' list, provide a corresponding location context string.
            
            Each location context should include:
            1. Details of the position of the entity relative to surrounding ones (e.g., parent section, previous/next headings)
            2. The span of text that belongs to this entity (with reference to preceding and following entities or page markers)
            3. Clear boundaries showing where this entity's content begins and ends
            
            IMPORTANT: The order must match exactly with the entities list, so the first location context corresponds to the first entity, and so on.
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


class ExtractChapterEntitiesStep(BasePipelineStep):
    """
    Pipeline step for extracting chapter entities and structure from textbook content.

    This step analyzes markdown-formatted textbook chapters and extracts all headings,
    subheadings, and content blocks to create a structured map for subsequent analysis.
    """

    name = "extract_chapter_entities"
    description = (
        "Extract headings and subheadings from textbook chapters for structural mapping"
    )
    input_types = {"markdown"}
    output_types = {"chapter_concepts"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the concept extraction step.

        This method analyzes the complete chapter content to identify all structural
        headings and subheadings using Azure OpenAI.

        Args:
            input_paths (Dict[str, str]): Dictionary containing input file paths:
                - "markdown": Path to markdown file containing the chapter content
            output_dir (str): Directory where the extracted headings JSON will be saved

        Returns:
            StepResult: Result object containing:
                - status: COMPLETED if successful, FAILED if error occurred
                - output_paths: Dictionary with "chapter_concepts" key mapping to output file path
                - error: Exception object if processing failed

        Raises:
            ValueError: If required input paths are not provided
            FileNotFoundError: If input files do not exist
            Exception: For any other processing errors
        """
        try:
            # Validate input parameters
            markdown_file_path = input_paths.get("markdown")

            if not markdown_file_path:
                raise ValueError("The 'markdown' input path must be provided")

            logger.info("Processing heading extraction for: %s", markdown_file_path)

            # Validate file existence
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

            # Load markdown content
            markdown_content = self._load_markdown_content(markdown_file_path)

            # Extract all headings from the chapter
            extracted_concepts = self._extract_chapter_entities(
                markdown_content, extractor, credentials
            )

            # Save results to output file
            output_path = self._save_extracted_entities(
                extracted_concepts, markdown_file_path, output_dir
            )

            logger.info(
                "Successfully extracted %d headings from %s, saved to %s",
                len(extracted_concepts.entities),
                markdown_file_path,
                output_path,
            )

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"chapter_concepts": output_path},
            )

        except Exception as e:
            logger.exception("Error during heading extraction: %s", str(e))
            return StepResult(status=StepStatus.FAILED, error=e)

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

    def _extract_chapter_entities(
        self,
        markdown_content: str,
        extractor: SimpleMetadataExtractor,
        credentials: Dict[str, str],
    ) -> ExtractedChapterEntities:
        """
        Extract all headings from the chapter using Azure OpenAI.

        Args:
            markdown_content (str): Full markdown content of the chapter
            extractor (SimpleMetadataExtractor): Metadata extraction instance
            credentials (Dict[str, str]): Azure OpenAI credentials

        Returns:
            ExtractedChapterEntities: Object containing all extracted heading entities

        Raises:
            Exception: If heading extraction fails
        """
        try:
            logger.info(
                "Analyzing chapter content to extract headings and subheadings..."
            )

            # Extract entities using the metadata extractor with enhanced prompt
            entities = extractor.extract(
                markdown_content, ExtractedChapterEntities, **credentials
            )

            logger.info("Successfully extracted %d headings", len(entities.entities))

            # Log the extracted entities for verification
            for idx, entity in enumerate(entities.entities, 1):
                logger.debug(
                    "Heading %d: %s (%s)",
                    idx,
                    entity.name,
                    entity.type,
                )

            return entities

        except Exception as e:
            logger.exception("Error extracting headings from chapter: %s", str(e))
            raise

    def _save_extracted_entities(
        self,
        extracted_concepts: ExtractedChapterEntities,
        markdown_file_path: str,
        output_dir: str,
    ) -> str:
        """
        Save extracted headings to JSON file.

        Args:
            extracted_concepts (ExtractedChapterEntities): Extracted heading entities object
            markdown_file_path (str): Original markdown file path (used for naming output file)
            output_dir (str): Directory to save the output file

        Returns:
            str: Path to the saved output file

        Raises:
            IOError: If the file cannot be written
        """

        try:
            # Generate output filename based on input markdown filename
            base_filename = os.path.basename(markdown_file_path).replace(".md", "")
            output_filename = f"{base_filename}_concepts.json"
            output_path = os.path.join(output_dir, output_filename)

            # Combine entities with their location contexts
            combined_entities = []
            if len(extracted_concepts.entities) == len(
                extracted_concepts.location_contexts
            ):
                for entity, location_context in zip(
                    extracted_concepts.entities, extracted_concepts.location_contexts
                ):
                    # Convert to dict and add location_context
                    entity_dict = entity.dict()
                    entity_dict["location_context"] = location_context
                    combined_entities.append(entity_dict)
            else:
                logger.warning(
                    "Mismatch between number of entities (%d) and location contexts (%d). Using entities without location contexts.",
                    len(extracted_concepts.entities),
                    (
                        len(extracted_concepts.location_contexts)
                        if hasattr(extracted_concepts, "location_contexts")
                        else 0
                    ),
                )
                # Fallback if lengths don't match - use empty location contexts
                combined_entities = [
                    {**entity.dict(), "location_context": ""}
                    for entity in extracted_concepts.entities
                ]

            # Convert to dict format compatible with existing pipeline and graph construction
            output_data = {
                "entity_graph": {
                    "nodes": combined_entities,
                    "metadata": {
                        "total_entities": len(extracted_concepts.entities),
                        "types": {
                            type: len(
                                [
                                    e
                                    for e in extracted_concepts.entities
                                    if e.type == type
                                ]
                            )
                            for type in set(e.type for e in extracted_concepts.entities)
                        },
                    },
                },
            }

            # Write extracted concepts to JSON file
            with open(output_path, "w", encoding="utf-8") as json_file:
                json.dump(
                    output_data,
                    json_file,
                    indent=2,
                    ensure_ascii=False,
                )

            logger.info(
                "Saved %d headings to %s", len(extracted_concepts.entities), output_path
            )

            # Also log the entities for immediate review
            logger.info("Extracted headings and content blocks:")
            for idx, node in enumerate(combined_entities, 1):
                location_context = node.get("location_context", "")
                logger.info(
                    "  %d. %s (%s) - Location: %s",
                    idx,
                    node.get("name", ""),
                    node.get("type", ""),
                    (
                        location_context[:50] + "..."
                        if len(location_context) > 50
                        else location_context
                    ),
                )

            return output_path

        except IOError as e:
            logger.error("Error writing output file %s: %s", output_path, str(e))
            raise
