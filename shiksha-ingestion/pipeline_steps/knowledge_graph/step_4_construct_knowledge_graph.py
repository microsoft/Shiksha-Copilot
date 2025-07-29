"""
Knowledge Graph Construction Pipeline Step

This module implements a pipeline step that constructs a knowledge graph from extracted
chapter entities and their relationships. It creates graph representations suitable for
visualization, analysis, and educational insights.
"""

import json
import os
import logging
from typing import Dict, List, Set, Tuple, Optional
import networkx as nx
from dataclasses import dataclass

from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class GraphMetrics:
    """Metrics and insights about the knowledge graph."""

    total_nodes: int
    total_edges: int
    node_types: Dict[str, int]
    avg_connections_per_node: float
    most_connected_entities: List[Tuple[str, int]]
    isolated_entities: List[str]
    entity_clusters: List[List[str]]
    learning_pathways: List[List[str]]


class KnowledgeGraphConstructor:
    """Constructs and analyzes knowledge graphs from chapter entities."""

    def __init__(self):
        self.graph = nx.DiGraph()  # Directed graph for prerequisite relationships
        self.undirected_graph = nx.Graph()  # For general relationships

    def build_graph(self, entities_data: Dict, relationships_data: Dict = None) -> Dict:
        """
        Build knowledge graph from extracted entities and relationships.

        Args:
            entities_data: Dictionary containing entity nodes
            relationships_data: Dictionary containing entity relationships (optional)

        Returns:
            Dictionary with graph data and analysis
        """
        try:
            entity_nodes = entities_data.get("entity_graph", {}).get("nodes", [])

            if not entity_nodes:
                logger.warning("No entity nodes found in data")
                return self._create_empty_graph_response()

            # Add nodes to graph
            self._add_nodes_to_graph(entity_nodes)

            # Add edges based on relationships
            if relationships_data:
                self._add_relationships_from_data(relationships_data)
            else:
                # Fallback to embedded relationships in entity data
                self._add_relationships_to_graph(entity_nodes)

            # Analyze graph structure
            metrics = self._analyze_graph()

            # Generate graph representations
            graph_data = self._export_graph_data()

            return {
                "graph_data": graph_data,
                "metrics": metrics.__dict__,
                "visualizations": self._generate_visualization_configs(),
                "educational_insights": self._generate_educational_insights(metrics),
            }

        except Exception as e:
            logger.exception("Error building knowledge graph: %s", str(e))
            raise

    def _add_nodes_to_graph(self, entity_nodes: List[Dict]):
        """Add entity nodes to the graph with their attributes."""
        for entity in entity_nodes:
            node_id = entity.get("entity_id", entity.get("id"))

            # Add to both directed and undirected graphs
            self.graph.add_node(node_id, **entity)
            self.undirected_graph.add_node(node_id, **entity)

            logger.debug(
                "Added node: %s (%s)",
                entity.get("entity_name", "Unknown"),
                entity.get("entity_type", "Unknown"),
            )

    def _add_relationships_from_data(self, relationships_data: Dict):
        """Add edges from relationship extraction data."""
        relationships = relationships_data.get("relationships", [])

        for rel in relationships:
            source_id = rel.get("source_entity_id")
            target_id = rel.get("target_entity_id")
            rel_type = rel.get("relationship_type", "related")

            if self.graph.has_node(source_id) and self.graph.has_node(target_id):
                # Add directed edge for prerequisites and dependency relationships
                if rel_type in ["prerequisite", "builds_upon"]:
                    self.graph.add_edge(
                        source_id, target_id, relation_type=rel_type, **rel
                    )
                else:
                    self.graph.add_edge(
                        source_id, target_id, relation_type=rel_type, **rel
                    )

                # Add undirected edge for general connectivity
                self.undirected_graph.add_edge(
                    source_id, target_id, relation_type=rel_type, **rel
                )

    def _add_relationships_to_graph(self, entity_nodes: List[Dict]):
        """Add edges based on entity relationships (fallback method)."""
        for entity in entity_nodes:
            source_id = entity.get("entity_id", entity.get("id"))

            # Add prerequisite relationships (directed)
            for prereq_id in entity.get("prerequisite_entities", []):
                if self.graph.has_node(prereq_id):
                    self.graph.add_edge(
                        prereq_id, source_id, relation_type="prerequisite"
                    )
                    self.undirected_graph.add_edge(
                        prereq_id, source_id, relation_type="prerequisite"
                    )

            # Add related entity relationships (undirected)
            for related_id in entity.get("related_entities", []):
                if self.graph.has_node(related_id):
                    self.undirected_graph.add_edge(
                        source_id, related_id, relation_type="related"
                    )
                    # Also add to directed graph for completeness
                    self.graph.add_edge(source_id, related_id, relation_type="related")

    def _analyze_graph(self) -> GraphMetrics:
        """Analyze the knowledge graph and generate insights."""
        try:
            # Basic metrics
            total_nodes = self.undirected_graph.number_of_nodes()
            total_edges = self.undirected_graph.number_of_edges()

            # Node type distribution
            node_types = {}
            for _, data in self.undirected_graph.nodes(data=True):
                entity_type = data.get("entity_type", data.get("type", "unknown"))
                node_types[entity_type] = node_types.get(entity_type, 0) + 1

            # Connection analysis
            avg_connections = total_edges * 2 / total_nodes if total_nodes > 0 else 0

            # Most connected entities
            degree_centrality = nx.degree_centrality(self.undirected_graph)
            most_connected = sorted(
                [
                    (node, degree * (total_nodes - 1))
                    for node, degree in degree_centrality.items()
                ],
                key=lambda x: x[1],
                reverse=True,
            )[:5]

            # Isolated entities (no connections)
            isolated = [
                node for node, degree in self.undirected_graph.degree() if degree == 0
            ]

            # Entity clusters
            clusters = list(nx.connected_components(self.undirected_graph))
            cluster_lists = [list(cluster) for cluster in clusters if len(cluster) > 1]

            # Learning pathways (topological sort of prerequisite relationships)
            learning_pathways = self._find_learning_pathways()

            return GraphMetrics(
                total_nodes=total_nodes,
                total_edges=total_edges,
                node_types=node_types,
                avg_connections_per_node=avg_connections,
                most_connected_entities=most_connected,
                isolated_entities=isolated,
                entity_clusters=cluster_lists,
                learning_pathways=learning_pathways,
            )

        except Exception as e:
            logger.exception("Error analyzing graph: %s", str(e))
            raise

    def _find_learning_pathways(self) -> List[List[str]]:
        """Find optimal learning pathways based on prerequisite relationships."""
        try:
            pathways = []

            # Find all strongly connected components in the directed graph
            if self.graph.number_of_nodes() > 0:
                # Get weakly connected components
                components = list(nx.weakly_connected_components(self.graph))

                for component in components:
                    if len(component) > 1:
                        subgraph = self.graph.subgraph(component)
                        try:
                            # Try topological sort for prerequisite ordering
                            pathway = list(nx.topological_sort(subgraph))
                            pathways.append(pathway)
                        except nx.NetworkXError:
                            # If cycles exist, just add as unordered pathway
                            pathways.append(list(component))

            return pathways
        except Exception as e:
            logger.warning("Error finding learning pathways: %s", str(e))
            return []

    def _export_graph_data(self) -> Dict:
        """Export graph data in multiple formats for visualization."""
        return {
            "nodes": [
                {
                    "id": node,
                    "label": data.get("entity_name", data.get("name", node)),
                    "type": data.get("entity_type", data.get("type", "entity")),
                    "summary": data.get("content_summary", ""),
                    "location": data.get("location_context", ""),
                    "size": self.undirected_graph.degree(node)
                    + 1,  # For visualization sizing
                }
                for node, data in self.undirected_graph.nodes(data=True)
            ],
            "edges": [
                {
                    "source": source,
                    "target": target,
                    "type": data.get("relation_type", "related"),
                    "weight": 1,
                }
                for source, target, data in self.undirected_graph.edges(data=True)
            ],
            "networkx_data": {
                "directed": nx.node_link_data(self.graph),
                "undirected": nx.node_link_data(self.undirected_graph),
            },
        }

    def _generate_visualization_configs(self) -> Dict:
        """Generate configuration for different visualization tools."""
        return {
            "d3_force": {
                "description": "D3.js force-directed graph configuration",
                "node_color_mapping": {
                    "concept": "#4CAF50",
                    "activity": "#2196F3",
                    "assessment": "#FF9800",
                    "section": "#9C27B0",
                    "example": "#00BCD4",
                    "definition": "#795548",
                    "application": "#F44336",
                },
                "edge_color_mapping": {"prerequisite": "#FF5722", "related": "#607D8B"},
            },
            "cytoscape": {
                "description": "Cytoscape.js graph configuration",
                "layout": "cose",  # Physics-based layout
                "style_recommendations": "Use hierarchical layout for prerequisite chains",
            },
            "gephi": {
                "description": "Gephi import format",
                "recommended_algorithms": ["Force Atlas 2", "Modularity", "PageRank"],
            },
        }

    def _generate_educational_insights(self, metrics: GraphMetrics) -> Dict:
        """Generate educational insights from graph analysis."""
        insights = {
            "learning_structure": {
                "complexity": (
                    "high"
                    if metrics.avg_connections_per_node > 3
                    else "moderate" if metrics.avg_connections_per_node > 1.5 else "low"
                ),
                "total_entities": metrics.total_nodes,
                "interconnectedness": metrics.avg_connections_per_node,
            },
            "content_distribution": metrics.node_types,
            "key_entities": [
                entity for entity, _ in metrics.most_connected_entities[:3]
            ],
            "isolated_entities": metrics.isolated_entities,
            "learning_sequences": len(metrics.learning_pathways),
            "recommendations": self._generate_recommendations(metrics),
        }

        return insights

    def _generate_recommendations(self, metrics: GraphMetrics) -> List[str]:
        """Generate educational recommendations based on graph structure."""
        recommendations = []

        if metrics.isolated_entities:
            recommendations.append(
                f"Consider connecting {len(metrics.isolated_entities)} isolated entities to main content flow"
            )

        if metrics.avg_connections_per_node < 1.5:
            recommendations.append(
                "Low interconnectedness detected - consider adding more cross-references between entities"
            )

        if len(metrics.learning_pathways) > 1:
            recommendations.append(
                f"Multiple learning pathways identified ({len(metrics.learning_pathways)}) - good for differentiated learning"
            )

        if not metrics.learning_pathways:
            recommendations.append(
                "No clear learning sequences found - consider establishing prerequisite relationships"
            )

        return recommendations

    def _create_empty_graph_response(self) -> Dict:
        """Create empty response when no data is available."""
        return {
            "graph_data": {
                "nodes": [],
                "edges": [],
                "networkx_data": {"directed": {}, "undirected": {}},
            },
            "metrics": GraphMetrics(0, 0, {}, 0, [], [], [], []).__dict__,
            "visualizations": {},
            "educational_insights": {"error": "No concept data available"},
        }


class ConstructKnowledgeGraphStep(BasePipelineStep):
    """
    Pipeline step for constructing knowledge graphs from extracted chapter concepts.

    This step takes the output from concept extraction and builds an interconnected
    graph representation suitable for visualization and educational analysis.
    """

    name = "construct_knowledge_graph"
    description = "Construct knowledge graph from extracted chapter concepts"
    input_types = {"chapter_concepts", "entity_relationships"}
    output_types = {"knowledge_graph"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the knowledge graph construction step.

        Args:
            input_paths: Dictionary containing input file paths
            output_dir: Directory where graph data will be saved

        Returns:
            StepResult with graph construction results
        """
        try:
            # Validate input
            concepts_file_path = input_paths.get("chapter_concepts")
            relationships_file_path = input_paths.get("entity_relationships")
            if not concepts_file_path or not relationships_file_path:
                raise ValueError(
                    "Both 'chapter_concepts' and 'entity_relationships' input paths must be provided"
                )

            logger.info(
                "Constructing knowledge graph from: %s and %s",
                concepts_file_path,
                relationships_file_path,
            )

            # Load entities and relationships data
            with open(concepts_file_path, "r", encoding="utf-8") as file:
                entities_data = json.load(file)
            with open(relationships_file_path, "r", encoding="utf-8") as file:
                relationships_data = json.load(file)

            # Create output directory
            os.makedirs(output_dir, exist_ok=True)

            # Build knowledge graph
            constructor = KnowledgeGraphConstructor()
            graph_result = constructor.build_graph(entities_data, relationships_data)

            # Save graph data
            output_path = self._save_graph_data(
                graph_result, concepts_file_path, output_dir
            )

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

    def _save_graph_data(
        self, graph_result: Dict, concepts_file_path: str, output_dir: str
    ) -> str:
        """Save graph data to JSON file."""
        base_filename = os.path.basename(concepts_file_path).replace(
            "_concepts.json", ""
        )
        output_filename = f"{base_filename}_knowledge_graph.json"
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
