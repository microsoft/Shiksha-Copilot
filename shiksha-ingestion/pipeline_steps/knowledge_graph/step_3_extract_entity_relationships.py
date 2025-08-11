"""Entity Relationship Extraction Pipeline Step"""

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

from pipeline_steps.knowledge_graph.models import (
    EntityRelationship,
    ExtractedEntityRelationships,
    GraphEntity,
    RELATIONSHIP_TYPES
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv(".env")


def azure_openai_credentials() -> Dict[str, Optional[str]]:
    """
    Retrieve Azure OpenAI service credentials from environment variables.

    Returns:
        Dict[str, Optional[str]]: A dictionary containing Azure OpenAI credentials

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


class ExtractEntityRelationshipsStep(BasePipelineStep):
    """
    Pipeline step for extracting relationships between chapter entities.

    This step analyzes the content and structure of entities to identify connections,
    prerequisites, and semantic relationships between educational components.
    """

    name = "extract_entity_relationships"
    description = "Extract relationships between entities using Azure OpenAI"
    input_types = {"entity_with_content"}
    optional_input_types = {"lba_entities"}
    output_types = {"entity_relationships"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Run the entity relationship extraction step."""
        try:
            # Validate input parameters
            entity_content_path = input_paths.get("entity_with_content")
            lba_entity_content_path = input_paths.get(
                "lba_entities"
            )  # Optional LBA entity inputs

            logger.info(
                "Processing entity relationship extraction for: %s", entity_content_path
            )

            # Validate file existence
            if not os.path.exists(entity_content_path):
                raise FileNotFoundError(
                    f"Entity content file not found: {entity_content_path}"
                )

            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)

            # Initialize the metadata extractor
            extractor = SimpleMetadataExtractor()

            # Get and validate Azure OpenAI credentials
            credentials = azure_openai_credentials()
            logger.info("Azure OpenAI credentials validated successfully")

            # Load entity data
            entity_content_data = self._load_json_file(entity_content_path)
            if lba_entity_content_path and os.path.exists(lba_entity_content_path):
                lba_entities = self._load_json_file(lba_entity_content_path)
                logger.info(
                    "Loaded Additional %d LBA entities",
                    len(lba_entities),
                )
                entity_content_data.extend(lba_entities)

            logger.info(
                "Total entities for relationship extraction: %d",
                len(entity_content_data),
            )

            # Extract relationships
            extracted_relationships = self._extract_relationships(
                entity_content_data, extractor, credentials
            )

            # Save results to output file
            output_path = self._save_extracted_relationships(
                extracted_relationships, entity_content_path, output_dir
            )

            logger.info(
                "Successfully extracted %d relationships, saved to %s",
                len(extracted_relationships.relationships),
                output_path,
            )

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"entity_relationships": output_path},
            )

        except Exception as e:
            logger.exception("Error during entity relationship extraction: %s", str(e))
            return StepResult(status=StepStatus.FAILED, error=e)

    def _load_json_file(self, file_path: str) -> List[GraphEntity]:
        """Load JSON data from file."""
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                data = json.load(file)
            logger.debug("Successfully loaded JSON data from %s", file_path)
            return [GraphEntity(**entity) for entity in data]
        except (json.JSONDecodeError, IOError) as e:
            logger.error("Error reading JSON file %s: %s", file_path, str(e))
            raise

    def _extract_relationships(
        self,
        entity_content_data: List[GraphEntity],
        extractor: SimpleMetadataExtractor,
        credentials: Dict[str, str],
    ) -> ExtractedEntityRelationships:
        """Extract relationships between entities using Azure OpenAI."""
        try:
            logger.info("Analyzing entity content to extract relationships...")

            all_relationships = []
            processed_entity_ids = set()

            # Process each entity one at a time
            for idx, current_entity in enumerate(entity_content_data):
                current_entity_id = current_entity.id
                logger.info(
                    "Processing entity %d/%d: %s",
                    idx + 1,
                    len(entity_content_data),
                    current_entity.name,
                )

                # Skip if already processed
                if current_entity_id in processed_entity_ids:
                    continue

                # Mark as processed
                processed_entity_ids.add(current_entity_id)

                # Prepare context for current entity
                relationship_context = self._prepare_entity_focused_context(
                    current_entity, entity_content_data
                )

                # Create a custom description for the relationships model
                model_with_custom_desc = self._create_entity_focused_model(
                    current_entity
                )

                # Extract relationships using the metadata extractor
                entity_relationships = extractor.extract(
                    relationship_context, model_with_custom_desc, **credentials
                )

                # Add to all relationships
                if entity_relationships.relationships:
                    all_relationships.extend(entity_relationships.relationships)
                    logger.info(
                        "Extracted %d relationships for entity %s",
                        len(entity_relationships.relationships),
                        current_entity_id,
                    )

            # Remove duplicate relationships
            unique_relationships = self._remove_duplicate_relationships(
                all_relationships
            )

            # Create final result
            final_relationships = ExtractedEntityRelationships(
                relationships=unique_relationships
            )

            logger.info(
                "Successfully extracted %d unique relationships from %d total",
                len(final_relationships.relationships),
                len(all_relationships),
            )

            # Log the extracted relationships for verification
            for idx, rel in enumerate(final_relationships.relationships, 1):
                logger.debug(
                    "Relationship %d: %s -> %s (%s)",
                    idx,
                    rel.source_entity_id,
                    rel.target_entity_id,
                    rel.relationship_type,
                )

            return final_relationships

        except Exception as e:
            logger.exception("Error extracting relationships: %s", str(e))
            raise

    def _prepare_entity_focused_context(
        self,
        current_entity: GraphEntity,
        entity_content_data: List[GraphEntity],
    ) -> str:
        """
        Prepare context text focused on a single entity for relationship extraction.

        Args:
            current_entity: The entity to focus on
            entity_content_data: List of all entity content data

        Returns:
            str: Formatted context for relationship analysis
        """
        current_entity_id = current_entity.id
        context_parts = []

        # Add focused entity metadata first
        context_parts.append("=== FOCUS ENTITY ===")
        context_parts.append(
            f"Entity ID: {current_entity_id}\n"
            f"Name: {current_entity.name}\n"
            f"Type: {current_entity.type}\n"
            f"Content: {current_entity.content}\n"
        )

        # Add all other entity metadata
        context_parts.append("\n=== OTHER ENTITIES ===")
        for entity in entity_content_data:
            entity_id = entity.id
            if entity_id != current_entity_id:
                context_parts.append(
                    f"Entity ID: {entity_id}\n"
                    f"Name: {entity.name}\n"
                    f"Type: {entity.type}\n"
                    f"Content: {entity.content}\n"
                )

        return "\n".join(context_parts)

    def _create_entity_focused_model(self, entity: GraphEntity) -> type:
        """
        Create a custom model with entity-focused description for the relationships attribute.

        Args:
            entity: The entity to focus on

        Returns:
            type: A custom model with entity-specific description
        """
        entity_id = entity.id
        entity_name = entity.name
        entity_type = entity.type
        entity_content = entity.content[:200]  # First 200 chars for context

        # Create list of relationship types from the constant
        relationship_types_text = "\n".join(
            [
                f'            - "{rel_type}": {description}'
                for rel_type, description in RELATIONSHIP_TYPES
            ]
        )

        # Create custom description focused on this entity
        custom_description = dedent(
            f"""
            List of relationships for entity "{entity_name}" (ID: {entity_id}, Type: {entity_type}).
            
            Entity Content Preview:
            {entity_content}...
            
            Each item is an EntityRelationship object with the following attributes:
            - source_entity_id: ID of the source entity
            - target_entity_id: ID of the target entity 
            - relationship_type: Type of relationship ({', '.join([f"'{rt}'" for rt, _ in RELATIONSHIP_TYPES])})
            - description: Brief description of how the entities are related
            - confidence: Confidence score (0.0-1.0) for this relationship

            Extract relationships between this entity and other entities. Focus on this entity as either source or target.
            For each related entity pair, identify:

            RELATIONSHIP TYPES:
{relationship_types_text}

            RELATIONSHIP IDENTIFICATION GUIDELINES:
            1. Look for explicit connections in the text
            2. Identify logical prerequisite sequences
            3. Connect activities to the concepts they demonstrate
            4. Link assessments to the concepts they test
            5. Connect examples to the principles they illustrate
            6. Identify cross-references and dependencies

            CONFIDENCE SCORING:
            - 1.0: Explicitly stated relationship in text
            - 0.8: Strong logical connection evident from content
            - 0.6: Moderate connection based on educational flow
            - 0.4: Weak but plausible relationship
            - 0.2: Uncertain relationship
            
            Important: Every relationship must include entity "{entity_id}" as either the source or target.
        """
        )

        # Create a new model dynamically with the custom description
        class EntityFocusedRelationships(BaseModel):
            relationships: List[EntityRelationship] = Field(
                description=custom_description
            )

        return EntityFocusedRelationships

    def _remove_duplicate_relationships(
        self, relationships: List[EntityRelationship]
    ) -> List[EntityRelationship]:
        """
        Remove duplicate relationships from the list.

        Args:
            relationships: List of all extracted relationships

        Returns:
            List[EntityRelationship]: Deduplicated list of relationships
        """
        # Create a set of unique relationship signatures
        unique_signatures = set()
        unique_relationships = []

        for rel in relationships:
            # Create a signature that identifies this relationship
            # We consider source, target, and type for uniqueness
            signature = (
                rel.source_entity_id,
                rel.target_entity_id,
                rel.relationship_type,
            )

            if signature not in unique_signatures:
                unique_signatures.add(signature)
                unique_relationships.append(rel)
            else:
                # If duplicate, keep the one with higher confidence
                for existing_rel in unique_relationships:
                    existing_signature = (
                        existing_rel.source_entity_id,
                        existing_rel.target_entity_id,
                        existing_rel.relationship_type,
                    )
                    if (
                        existing_signature == signature
                        and existing_rel.confidence < rel.confidence
                    ):
                        # Replace with higher confidence relationship
                        unique_relationships.remove(existing_rel)
                        unique_relationships.append(rel)
                        break

        logger.info(
            "Removed %d duplicate relationships",
            len(relationships) - len(unique_relationships),
        )
        return unique_relationships

    def _save_extracted_relationships(
        self,
        extracted_relationships: ExtractedEntityRelationships,
        entity_content_path: str,
        output_dir: str,
    ) -> str:
        """
        Save extracted relationships to JSON file.

        Args:
            extracted_relationships: Extracted relationships object
            entity_content_path: Original entity content file path (for naming)
            output_dir: Directory to save the output file

        Returns:
            str: Path to the saved output file
        """
        try:
            # Generate output filename based on input filename
            base_filename = os.path.basename(entity_content_path).replace(".json", "")
            output_filename = f"{base_filename}_relationships.json"
            output_path = os.path.join(output_dir, output_filename)

            # Convert to dict format
            output_data = [
                rel.model_dump() for rel in extracted_relationships.relationships
            ]

            # Write extracted relationships to JSON file
            with open(output_path, "w", encoding="utf-8") as json_file:
                json.dump(
                    output_data,
                    json_file,
                    indent=2,
                    ensure_ascii=False,
                )

            logger.info(
                "Saved %d relationships to %s",
                len(extracted_relationships.relationships),
                output_path,
            )

            # Log relationship summary
            self._log_relationship_summary(extracted_relationships.relationships)

            return output_path

        except IOError as e:
            logger.error("Error writing output file %s: %s", output_path, str(e))
            raise

    def _analyze_relationship_types(
        self, relationships: List[EntityRelationship]
    ) -> Dict[str, int]:
        """Analyze the distribution of relationship types."""
        type_counts = {}
        for rel in relationships:
            rel_type = rel.relationship_type
            type_counts[rel_type] = type_counts.get(rel_type, 0) + 1
        return type_counts

    def _log_relationship_summary(self, relationships: List[EntityRelationship]):
        """Log a summary of extracted relationships."""
        if not relationships:
            logger.info("No relationships extracted")
            return

        logger.info("=== Relationship Summary ===")

        # Type distribution
        type_counts = self._analyze_relationship_types(relationships)
        for rel_type, count in type_counts.items():
            logger.info("  %s: %d relationships", rel_type, count)

        # High confidence relationships
        high_conf_rels = [rel for rel in relationships if rel.confidence >= 0.8]
        logger.info("High confidence relationships (%d):", len(high_conf_rels))
        for rel in high_conf_rels[:5]:  # Show first 5
            logger.info(
                "  %s -> %s (%s, confidence: %.2f)",
                rel.source_entity_id,
                rel.target_entity_id,
                rel.relationship_type,
                rel.confidence,
            )
