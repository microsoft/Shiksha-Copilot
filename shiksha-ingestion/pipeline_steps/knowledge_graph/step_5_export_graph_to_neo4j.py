"""Neo4j Graph Export Pipeline Step"""

import json
import os
import logging
from typing import Dict, List, Any, Optional
import networkx as nx
from dotenv import load_dotenv
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus
from py2neo import Graph, Node, Relationship

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class ExportGraphToNeo4jStep(BasePipelineStep):
    """Pipeline step for exporting NetworkX knowledge graphs to Neo4j database."""

    name = "export_graph_to_neo4j"
    description = "Export knowledge graph to Neo4j database"
    input_types = {"knowledge_graph"}
    output_types = {"neo4j_export_status"}

    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the Neo4j export step with configuration."""
        super().__init__(config)

        # Get Neo4j configuration from environment variables
        neo4j_config = self._get_neo4j_config()

        # Neo4j connection configuration
        self.neo4j_uri = neo4j_config["neo4j_uri"]
        self.neo4j_user = neo4j_config["neo4j_user"]
        self.neo4j_password = neo4j_config["neo4j_password"]
        self.relationship_type = neo4j_config["relationship_type"]
        self.node_label = neo4j_config["node_label"]

        # Export configuration
        self.clear_database = neo4j_config["clear_database"]
        self.batch_size = neo4j_config["batch_size"]

    def _get_neo4j_config(self) -> Dict[str, Any]:
        """Get Neo4j configuration from environment variables and config."""
        return {
            "neo4j_uri": self._get_config_value(
                "NEO4J_URI", "neo4j_uri", "bolt://localhost:7687"
            ),
            "neo4j_user": self._get_config_value("NEO4J_USER", "neo4j_user", "neo4j"),
            "neo4j_password": self._get_config_value(
                "NEO4J_PASSWORD", "neo4j_password", "password"
            ),
            "relationship_type": self._get_config_value(
                "NEO4J_RELATIONSHIP_TYPE", "relationship_type", "RELATED"
            ),
            "node_label": self._get_config_value(
                "NEO4J_NODE_LABEL", "node_label", "KnowledgeEntity"
            ),
            "clear_database": self._get_config_bool_value(
                "NEO4J_CLEAR_DATABASE", "clear_database", False
            ),
            "batch_size": self._get_config_int_value(
                "NEO4J_BATCH_SIZE", "batch_size", 100
            ),
        }

    def _get_config_value(self, env_var: str, config_key: str, default: str) -> str:
        """Get configuration value from environment variable, config, or default."""
        # Priority: environment variable > config > default
        env_value = os.getenv(env_var)
        if env_value:
            return env_value

        if self.config and config_key in self.config:
            return self.config[config_key]

        return default

    def _get_config_bool_value(
        self, env_var: str, config_key: str, default: bool
    ) -> bool:
        """Get boolean configuration value from environment variable, config, or default."""
        # Priority: environment variable > config > default
        env_value = os.getenv(env_var)
        if env_value:
            return env_value.lower() in ("true", "1", "yes", "on")

        if self.config and config_key in self.config:
            return bool(self.config[config_key])

        return default

    def _get_config_int_value(self, env_var: str, config_key: str, default: int) -> int:
        """Get integer configuration value from environment variable, config, or default."""
        # Priority: environment variable > config > default
        env_value = os.getenv(env_var)
        if env_value:
            try:
                return int(env_value)
            except ValueError:
                logger.warning(
                    "Invalid integer value for %s: %s, using default: %d",
                    env_var,
                    env_value,
                    default,
                )
                return default

        if self.config and config_key in self.config:
            try:
                return int(self.config[config_key])
            except (ValueError, TypeError):
                logger.warning(
                    "Invalid integer value for %s in config, using default: %d",
                    config_key,
                    default,
                )
                return default

        return default

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Process the Neo4j export step."""
        try:
            knowledge_graph_path = input_paths.get("knowledge_graph")
            if not knowledge_graph_path:
                raise ValueError("No knowledge graph input provided")

            # Load the knowledge graph data
            graph_data = self._load_graph_data(knowledge_graph_path)

            # Convert to NetworkX graph
            nx_graph = self._convert_to_networkx(graph_data)

            # Connect to Neo4j
            neo4j_graph = self._connect_to_neo4j()

            # Export to Neo4j
            export_stats = self._export_to_neo4j(nx_graph, neo4j_graph)

            # Create output directory and save export status
            os.makedirs(output_dir, exist_ok=True)
            status_path = self._save_export_status(export_stats, output_dir)

            logger.info(
                "Successfully exported knowledge graph to Neo4j. "
                "Nodes: %d, Relationships: %d",
                export_stats["nodes_created"],
                export_stats["relationships_created"],
            )

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"neo4j_export_status": status_path},
                metadata=export_stats,
            )

        except Exception as e:
            logger.exception("Error exporting graph to Neo4j: %s", str(e))
            return StepResult(status=StepStatus.FAILED, error=e)

    def _load_graph_data(self, graph_path: str) -> Dict[str, Any]:
        """Load knowledge graph data from JSON file."""
        try:
            with open(graph_path, "r", encoding="utf-8") as file:
                data = json.load(file)

            logger.info("Loaded knowledge graph data from: %s", graph_path)
            return data

        except Exception as e:
            logger.error("Failed to load graph data from %s: %s", graph_path, str(e))
            raise

    def _convert_to_networkx(self, graph_data: Dict[str, Any]) -> nx.DiGraph:
        """Convert the loaded graph data to NetworkX format."""
        try:
            # Check if it's already in NetworkX node-link format
            if "graph_data" in graph_data and "nodes" in graph_data["graph_data"]:
                # Use the nested graph_data structure
                nx_data = graph_data["graph_data"]
                return nx.node_link_graph(nx_data, directed=True)
            elif "nodes" in graph_data and "links" in graph_data:
                # Direct node-link format
                return nx.node_link_graph(graph_data, directed=True)
            else:
                # Try to construct from entities and relationships
                nx_graph = nx.DiGraph()

                # Add nodes from entities
                if "entities" in graph_data:
                    entities = graph_data["entities"]
                    if isinstance(entities, dict):
                        # Entities as dictionary
                        for entity_id, entity_data in entities.items():
                            if isinstance(entity_data, dict):
                                nx_graph.add_node(entity_id, **entity_data)
                            else:
                                nx_graph.add_node(entity_id, data=str(entity_data))
                    elif isinstance(entities, list):
                        # Entities as list
                        for entity in entities:
                            if isinstance(entity, dict) and "id" in entity:
                                entity_id = entity["id"]
                                entity_attrs = {
                                    k: v for k, v in entity.items() if k != "id"
                                }
                                nx_graph.add_node(entity_id, **entity_attrs)

                # Add edges from relationships
                if "relationships" in graph_data:
                    relationships = graph_data["relationships"]
                    for rel in relationships:
                        if isinstance(rel, dict):
                            source = rel.get("source_entity_id", rel.get("source"))
                            target = rel.get("target_entity_id", rel.get("target"))
                            if source and target:
                                rel_attrs = {
                                    k: v
                                    for k, v in rel.items()
                                    if k
                                    not in [
                                        "source_entity_id",
                                        "target_entity_id",
                                        "source",
                                        "target",
                                    ]
                                }
                                nx_graph.add_edge(source, target, **rel_attrs)

                return nx_graph

        except Exception as e:
            logger.error("Failed to convert graph data to NetworkX: %s", str(e))
            raise

    def _connect_to_neo4j(self) -> Graph:
        """Establish connection to Neo4j database."""
        try:
            graph = Graph(self.neo4j_uri, auth=(self.neo4j_user, self.neo4j_password))

            # Test connection
            graph.run("RETURN 1")

            logger.info("Successfully connected to Neo4j at: %s", self.neo4j_uri)

            # Clear database if requested
            if self.clear_database:
                logger.warning("Clearing Neo4j database...")
                graph.run("MATCH (n) DETACH DELETE n")
                logger.info("Database cleared")

            return graph

        except Exception as e:
            logger.error("Failed to connect to Neo4j: %s", str(e))
            raise

    def _export_to_neo4j(
        self, nx_graph: nx.DiGraph, neo4j_graph: Graph
    ) -> Dict[str, int]:
        """Export NetworkX graph to Neo4j database."""
        export_stats = {
            "nodes_created": 0,
            "relationships_created": 0,
            "nodes_updated": 0,
            "errors": 0,
        }

        try:
            # Create nodes in batches
            nodes_batch = []
            for node_id, attrs in nx_graph.nodes(data=True):
                try:
                    # Prepare node properties - start with basic required fields
                    props = {"id": str(node_id), "name": str(node_id)}

                    # Add all node attributes as properties
                    for key, value in attrs.items():
                        if value is not None:
                            # Convert complex types to strings
                            if isinstance(value, (dict, list)):
                                props[key] = json.dumps(value)
                            else:
                                props[key] = str(value)

                    # Add chapter_id if available from config (will override node's chapter_id if set)
                    chapter_id = self.config.get("chapter_id")
                    if chapter_id:
                        props["chapter_id"] = chapter_id

                    nodes_batch.append(props)

                    # Process batch when it reaches batch_size
                    if len(nodes_batch) >= self.batch_size:
                        self._process_nodes_batch(neo4j_graph, nodes_batch)
                        export_stats["nodes_created"] += len(nodes_batch)
                        nodes_batch = []

                except Exception as e:
                    logger.error("Error processing node %s: %s", node_id, str(e))
                    export_stats["errors"] += 1

            # Process remaining nodes
            if nodes_batch:
                self._process_nodes_batch(neo4j_graph, nodes_batch)
                export_stats["nodes_created"] += len(nodes_batch)

            # Create relationships in batches
            relationships_batch = []
            for source, target, attrs in nx_graph.edges(data=True):
                try:
                    rel_props = {}

                    # Add edge attributes as relationship properties
                    for key, value in attrs.items():
                        if value is not None:
                            if isinstance(value, (dict, list)):
                                rel_props[key] = json.dumps(value)
                            else:
                                rel_props[key] = str(value)

                    # Add relationship type
                    rel_type = attrs.get("relationship_type", self.relationship_type)

                    relationships_batch.append(
                        {
                            "source_id": str(source),
                            "target_id": str(target),
                            "type": rel_type,
                            "properties": rel_props,
                        }
                    )

                    # Process batch when it reaches batch_size
                    if len(relationships_batch) >= self.batch_size:
                        self._process_relationships_batch(
                            neo4j_graph, relationships_batch
                        )
                        export_stats["relationships_created"] += len(
                            relationships_batch
                        )
                        relationships_batch = []

                except Exception as e:
                    logger.error(
                        "Error processing relationship %s->%s: %s",
                        source,
                        target,
                        str(e),
                    )
                    export_stats["errors"] += 1

            # Process remaining relationships
            if relationships_batch:
                self._process_relationships_batch(neo4j_graph, relationships_batch)
                export_stats["relationships_created"] += len(relationships_batch)

            logger.info("Export completed. Stats: %s", export_stats)
            return export_stats

        except Exception as e:
            logger.error("Failed to export graph to Neo4j: %s", str(e))
            raise

    def _process_nodes_batch(self, neo4j_graph: Graph, nodes_batch: List[Dict]) -> None:
        """Process a batch of nodes using MERGE operation."""
        try:
            # Build Cypher query for batch node creation/merge
            cypher_query = f"""
            UNWIND $nodes AS node
            MERGE (n:{self.node_label} {{id: node.id}})
            SET n += node
            """

            neo4j_graph.run(cypher_query, nodes=nodes_batch)
            logger.debug("Processed batch of %d nodes", len(nodes_batch))

        except Exception as e:
            logger.error("Error processing nodes batch: %s", str(e))
            raise

    def _process_relationships_batch(
        self, neo4j_graph: Graph, relationships_batch: List[Dict]
    ) -> None:
        """Process a batch of relationships."""
        try:
            # Build Cypher query for batch relationship creation
            cypher_query = f"""
            UNWIND $relationships AS rel
            MATCH (source:{self.node_label} {{id: rel.source_id}})
            MATCH (target:{self.node_label} {{id: rel.target_id}})
            CALL apoc.create.relationship(source, rel.type, rel.properties, target) YIELD rel as created_rel
            RETURN count(created_rel)
            """

            # Fallback query if APOC is not available
            fallback_query = f"""
            UNWIND $relationships AS rel
            MATCH (source:{self.node_label} {{id: rel.source_id}})
            MATCH (target:{self.node_label} {{id: rel.target_id}})
            CREATE (source)-[r:{self.relationship_type}]->(target)
            SET r += rel.properties
            """

            try:
                # Try with dynamic relationship type first (requires APOC)
                neo4j_graph.run(cypher_query, relationships=relationships_batch)
            except Exception:
                # Fall back to static relationship type
                logger.warning(
                    "APOC not available, using static relationship type: %s",
                    self.relationship_type,
                )
                neo4j_graph.run(fallback_query, relationships=relationships_batch)

            logger.debug(
                "Processed batch of %d relationships", len(relationships_batch)
            )

        except Exception as e:
            logger.error("Error processing relationships batch: %s", str(e))
            raise

    def _save_export_status(self, export_stats: Dict[str, int], output_dir: str) -> str:
        """Save export status and statistics to file."""
        try:
            status_data = {
                "export_timestamp": str(__import__("datetime").datetime.now()),
                "neo4j_uri": self.neo4j_uri,
                "neo4j_user": self.neo4j_user,
                "node_label": self.node_label,
                "relationship_type": self.relationship_type,
                "chapter_id": self.config.get("chapter_id"),
                "export_statistics": export_stats,
                "configuration": {
                    "clear_database": self.clear_database,
                    "batch_size": self.batch_size,
                },
            }

            status_path = os.path.join(output_dir, "neo4j_export_status.json")

            with open(status_path, "w", encoding="utf-8") as file:
                json.dump(status_data, file, indent=2, ensure_ascii=False)

            logger.info("Export status saved to: %s", status_path)
            return status_path

        except Exception as e:
            logger.error("Failed to save export status: %s", str(e))
            raise


def main():
    """Example usage of the Neo4j export step."""
    # Configuration can now come from environment variables:
    # NEO4J_URI=bolt://localhost:7687
    # NEO4J_USER=neo4j
    # NEO4J_PASSWORD=your_password
    # NEO4J_NODE_LABEL=KnowledgeEntity
    # NEO4J_RELATIONSHIP_TYPE=RELATED
    # NEO4J_CLEAR_DATABASE=false
    # NEO4J_BATCH_SIZE=100

    # Optional config override (environment variables take precedence)
    config = {
        "chapter_id": "test_chapter",
        # These will be overridden by environment variables if set
        "neo4j_uri": "bolt://localhost:7687",
        "neo4j_user": "neo4j",
        "neo4j_password": "password",
        "clear_database": False,
        "batch_size": 50,
    }

    # Create the step
    export_step = ExportGraphToNeo4jStep(config)

    # Sample input paths
    input_paths = {"knowledge_graph": "path/to/knowledge_graph.json"}

    output_dir = "output/neo4j_export"

    # Process the export
    result = export_step.process(input_paths, output_dir)

    if result.status == StepStatus.COMPLETED:
        print("Neo4j export completed successfully!")
        print(f"Export status: {result.output_paths}")
        print(f"Statistics: {result.metadata}")
    else:
        print(f"Neo4j export failed: {result.error}")


if __name__ == "__main__":
    main()
