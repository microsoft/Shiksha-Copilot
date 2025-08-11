"""Knowledge Graph Construction Pipeline Step"""

import json
import os
import logging
from typing import Dict, List
import uuid
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

from pipeline_steps.knowledge_graph.models import (
    KnowledgeGraphConstructor,
    GraphEntity,
    EntityRelationship,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ConstructKnowledgeGraphStep(BasePipelineStep):
    """Pipeline step for constructing knowledge graphs from extracted concepts."""

    name = "construct_knowledge_graph"
    description = "Construct knowledge graph from extracted chapter concepts"
    input_types = {"entity_with_content", "entity_relationships"}
    optional_input_types = {"lba_entities"}
    output_types = {"knowledge_graph"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Process the knowledge graph construction step."""
        try:
            chapter_entities_path = input_paths.get("entity_with_content")
            relationships_file_path = input_paths.get("entity_relationships")
            lba_entities_path = input_paths.get("lba_entities")

            # Load entities and relationships data
            entities_list = self._load_and_parse_entities(chapter_entities_path)
            if lba_entities_path:
                entities_list.extend(self._load_and_parse_entities(lba_entities_path))

            # Add chapter ID to each entity
            for entity in entities_list:
                entity.chapter_id = self.config.get("chapter_id", "<NONE>")

            relationships_list = self._load_and_parse_relationships(
                relationships_file_path
            )

            # Replace entity IDs with UUIDs and update relationships
            entities_list, relationships_list = self._replace_entity_ids_with_uuids(
                entities_list, relationships_list
            )

            # Create output directory
            os.makedirs(output_dir, exist_ok=True)

            # Build knowledge graph - pass the parsed entities and relationships directly as Pydantic objects
            constructor = KnowledgeGraphConstructor()
            graph_result = constructor.build_graph(entities_list, relationships_list)

            # Save graph data
            output_path = self._save_graph_data(graph_result, output_dir)

            # Log insights
            self._log_graph_insights(graph_result)

            logger.info(
                "Successfully constructed knowledge graph, saved to: %s", output_path
            )

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"knowledge_graph": output_path},
            )

        except Exception as e:
            logger.exception("Error constructing knowledge graph: %s", str(e))
            return StepResult(status=StepStatus.FAILED, error=e)

    def _load_and_parse_entities(self, file_path: str) -> List[GraphEntity]:
        """
        Load and parse entities from JSON file into GraphEntity objects.

        Args:
            file_path (str): Path to the JSON file containing entities

        Returns:
            List[GraphEntity]: List of parsed GraphEntity objects

        Raises:
            json.JSONDecodeError: If the file contains invalid JSON
            ValidationError: If entities don't match GraphEntity schema
        """
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                entities_data = json.load(file)

            # Parse each entity dictionary into GraphEntity objects
            entities = [GraphEntity(**entity_dict) for entity_dict in entities_data]

            logger.info(
                "Successfully loaded and parsed %d entities from %s",
                len(entities),
                file_path,
            )
            return entities
        except Exception as e:
            logger.error(
                "Error loading and parsing entities from %s: %s", file_path, str(e)
            )
            raise

    def _load_and_parse_relationships(self, file_path: str) -> List[EntityRelationship]:
        """
        Load and parse relationships from JSON file into EntityRelationship objects.

        Args:
            file_path (str): Path to the JSON file containing relationships array

        Returns:
            List[EntityRelationship]: List of parsed EntityRelationship objects

        Raises:
            json.JSONDecodeError: If the file contains invalid JSON
            ValidationError: If relationships don't match EntityRelationship schema
        """
        try:
            with open(file_path, "r", encoding="utf-8") as file:
                relationships_data = json.load(file)

            logger.info(
                "Loaded relationships: %s", json.dumps(relationships_data, indent=2)
            )

            # Parse each relationship dictionary into EntityRelationship objects
            relationships = [
                EntityRelationship(**rel_dict) for rel_dict in relationships_data
            ]

            logger.info(
                "Successfully loaded and parsed %d relationships from %s",
                len(relationships),
                file_path,
            )
            return relationships
        except Exception as e:
            logger.error(
                "Error loading and parsing relationships from %s: %s", file_path, str(e)
            )
            raise

    def _save_graph_data(self, graph_result: Dict, output_dir: str) -> str:
        """Save graph data to JSON file."""
        output_filename = f"knowledge_graph.json"
        output_path = os.path.join(output_dir, output_filename)

        with open(output_path, "w", encoding="utf-8") as file:
            json.dump(graph_result, file, indent=2, ensure_ascii=False)

        return output_path

    def _log_graph_insights(self, graph_result: Dict):
        """Log key insights about the constructed graph."""
        metrics = graph_result.get("metrics", {})
        insights = graph_result.get("educational_insights", {})

        logger.info("=== Knowledge Graph Analysis ===")
        logger.info("Total entities: %d", metrics.get("total_nodes", 0))
        logger.info("Total connections: %d", metrics.get("total_edges", 0))
        logger.info(
            "Average connections per entity: %.2f",
            metrics.get("avg_connections_per_node", 0),
        )

        if metrics.get("most_connected_entities"):
            logger.info("Most connected entities:")
            for entity, connections in metrics["most_connected_entities"]:
                logger.info("  - %s: %d connections", entity, connections)

        if insights.get("recommendations"):
            logger.info("Recommendations:")
            for rec in insights["recommendations"]:
                logger.info("  - %s", rec)

    def _replace_entity_ids_with_uuids(
        self, entities_list: List[GraphEntity], relationships_list: List[EntityRelationship]
    ) -> tuple[List[GraphEntity], List[EntityRelationship]]:
        """
        Replace entity IDs with UUIDs and update corresponding references in relationships.
        
        Args:
            entities_list: List of GraphEntity objects with original IDs
            relationships_list: List of EntityRelationship objects referencing entity IDs
            
        Returns:
            Tuple of (updated_entities_list, updated_relationships_list) with UUID-based IDs
        """
        # Create mapping from old IDs to new UUIDs
        id_mapping = {}
        for entity in entities_list:
            old_id = entity.id
            new_id = str(uuid.uuid4())
            id_mapping[old_id] = new_id
            entity.id = new_id
        
        logger.info("Created UUID mapping for %d entities", len(id_mapping))
        
        # Update relationship references
        updated_relationships = []
        for relationship in relationships_list:
            # Create a new relationship with updated IDs
            old_source = relationship.source_entity_id
            old_target = relationship.target_entity_id
            
            # Only update relationship if both entities exist in our mapping
            if old_source in id_mapping and old_target in id_mapping:
                new_relationship = EntityRelationship(
                    source_entity_id=id_mapping[old_source],
                    target_entity_id=id_mapping[old_target],
                    relationship_type=relationship.relationship_type,
                    description=relationship.description,
                    confidence=relationship.confidence
                )
                updated_relationships.append(new_relationship)
            else:
                logger.warning(
                    "Skipping relationship %s -> %s: entities not found in mapping",
                    old_source, old_target
                )
        
        return entities_list, updated_relationships
