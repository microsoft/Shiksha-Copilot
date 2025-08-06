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
        self.default_relationship_type = "RELATED"
        self.default_node_label = "KnowledgeEntity"

        # Export configuration
        clear_db = neo4j_config["clear_database"]
        self.clear_database = clear_db and clear_db.lower() == "true" if isinstance(clear_db, str) else bool(clear_db)
        self.batch_size = 100  # Fixed batch size since we process all nodes at once anyway

    def _get_neo4j_config(self) -> Dict[str, Any]:
        """Get Neo4j configuration from environment variables, defaulting to None."""
        return {
            "neo4j_uri": os.getenv("NEO4J_URI"),
            "neo4j_user": os.getenv("NEO4J_USER"),
            "neo4j_password": os.getenv("NEO4J_PASSWORD"),
            "clear_database": os.getenv("NEO4J_CLEAR_DATABASE"),
        }

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
            # Extract the networkx_data.directed from the graph structure
            networkx_directed_data = graph_data["graph_data"]["networkx_data"]["directed"]
            return nx.node_link_graph(networkx_directed_data, directed=True)
        
        except KeyError as e:
            logger.error("Required graph data structure not found: %s", str(e))
            raise ValueError(f"Invalid graph data format. Missing required key: {e}")
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
            # Create all nodes in a single batch
            all_nodes = []
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

                    # Get node label from entity type, fallback to default
                    entity_type = attrs.get("type", self.default_node_label)
                    node_label = str(entity_type).title() if entity_type else self.default_node_label
                    
                    # Add node label to properties for processing
                    props["_node_label"] = node_label
                    all_nodes.append(props)

                except Exception as e:
                    logger.error("Error processing node %s: %s", node_id, str(e))
                    export_stats["errors"] += 1

            # Process all nodes in a single batch
            if all_nodes:
                self._process_all_nodes_batch(neo4j_graph, all_nodes)
                export_stats["nodes_created"] = len(all_nodes)

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

                    # Add relationship type - use the actual relationship_type from the edge
                    rel_type = attrs.get("relationship_type", attrs.get("relation_type", self.default_relationship_type))

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

    def _process_all_nodes_batch(self, neo4j_graph: Graph, all_nodes: List[Dict]) -> None:
        """
        Process all nodes in a single batch without APOC by dynamically
        injecting labels and properties via Python.
        """
        tx = neo4j_graph.begin()
        try:
            for node in all_nodes:
                # Extract and remove the dynamic label
                label = node.pop("_node_label", self.default_node_label)
                node_id = node["id"]
                # Remove id from props so we don't set it twice
                props = {k: v for k, v in node.items() if k != "id"}

                # MERGE on id, then SET all other properties
                cypher = f"""
                    MERGE (n:`{label}` {{id: $id}})
                    SET n += $props
                """
                tx.run(cypher, id=node_id, props=props)
            tx.commit()
            logger.debug("Processed batch of %d nodes without APOC", len(all_nodes))
        except Exception as e:
            tx.rollback()
            logger.error("Error processing nodes batch without APOC: %s", e)
            raise

    def _process_relationships_batch(
        self, neo4j_graph: Graph, relationships_batch: List[Dict]
    ) -> None:
        """
        Process a batch of relationships without APOC by matching on node IDs
        and merging relationships with dynamic types.
        """
        tx = neo4j_graph.begin()
        try:
            for rel in relationships_batch:
                rel_type = rel.get("type", self.default_relationship_type)
                src_id = rel["source_id"]
                tgt_id = rel["target_id"]
                props = rel.get("properties", {})

                # MATCH source/target by id, MERGE relationship, then SET props
                cypher = f"""
                    MATCH (a {{id: $src_id}}), (b {{id: $tgt_id}})
                    MERGE (a)-[r:`{rel_type}`]->(b)
                    SET r += $props
                """
                tx.run(cypher, src_id=src_id, tgt_id=tgt_id, props=props)
            tx.commit()
            logger.debug("Processed batch of %d relationships without APOC", len(relationships_batch))
        except Exception as e:
            tx.rollback()
            logger.error("Error processing relationships batch without APOC: %s", e)
            raise


    def _save_export_status(self, export_stats: Dict[str, int], output_dir: str) -> str:
        """Save export status and statistics to file."""
        try:
            status_data = {
                "export_timestamp": str(__import__("datetime").datetime.now()),
                "neo4j_uri": self.neo4j_uri,
                "neo4j_user": self.neo4j_user,
                "default_node_label": self.default_node_label,
                "default_relationship_type": self.default_relationship_type,
                "chapter_id": self.config.get("chapter_id"),
                "export_statistics": export_stats,
                "configuration": {
                    "clear_database": self.clear_database,
                    "batch_size": self.batch_size,
                    "note": "Node labels are determined dynamically from entity types, fallback to default_node_label",
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