"""Knowledge Graph Data Models"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from typing import Dict, List, Tuple
from pydantic import BaseModel
import networkx as nx
import logging


class GraphEntity(BaseModel):
    """Graph node entity for content and assessment items."""

    id: str = Field(description="Unique identifier for the entity")
    name: str = Field(
        description="The entity name or text (e.g., heading text, question text)"
    )
    type: str = Field(
        description=(
            "Type of entity. Common types include: "
            "'section', 'subsection', 'activity', 'assessment', 'introduction', "
            "'content_block', 'assessment_question', 'question_group', 'chapter_assessment'"
        )
    )
    content: str = Field(
        default="",
        description=(
            "Optional field for the full content of the entity, if applicable. "
        ),
    )
    content_summary: str = Field(
        ...,
        description=(
            "A summary describing the content, concepts, activities, "
            "or information associated with this entity"
        ),
    )
    location_context: str = Field(
        default="",
        description=(
            "Optional field for additional context about the entity's location "
            "in the document, such as page numbers or section references"
        ),
    )


class EntityRelationship(BaseModel):
    """Relationship between two entities."""

    source_entity_id: str = Field(description="ID of the source entity")
    target_entity_id: str = Field(description="ID of the target entity")
    relationship_type: str = Field(
        description="Type of relationship: 'prerequisite', 'builds_upon', 'demonstrates', 'tests', 'explains', 'applies', 'related'"
    )
    description: str = Field(
        description="Brief description of how the entities are related"
    )
    confidence: float = Field(
        description="Confidence score (0.0-1.0) for this relationship"
    )


class KnowledgeGraphStructure(BaseModel):
    """Complete knowledge graph structure."""

    entities: Dict[str, GraphEntity] = Field(
        description="Dictionary mapping entity IDs to GraphEntity instances"
    )
    relationships: list[EntityRelationship] = Field(
        default_factory=list, description="List of relationships between entities"
    )


class GraphMetrics(BaseModel):
    """Knowledge graph metrics and insights."""

    total_nodes: int
    total_edges: int
    node_types: Dict[str, int]
    avg_connections_per_node: float
    most_connected_entities: List[Tuple[str, int]]
    isolated_entities: List[str]
    entity_clusters: List[List[str]]
    learning_pathways: List[List[str]]


class KnowledgeGraphConstructor:
    """Constructs and analyzes knowledge graphs."""

    def __init__(self):
        self.graph = nx.DiGraph()
        self.logger = logging.getLogger(__name__)

    def build_graph(
        self,
        entities_data: List[GraphEntity],
        relationships_data: List[EntityRelationship] = None,
    ) -> Dict:
        """Build knowledge graph from entities and relationships."""
        try:
            entity_nodes = entities_data

            if not entity_nodes:
                self.logger.warning("No entity nodes found in data")
                return self._create_empty_graph_response()

            # Add nodes
            self._add_nodes_to_graph(entity_nodes)

            # Add edges
            if relationships_data:
                self._add_relationships_from_data(relationships_data)
            else:
                self._add_relationships_to_graph(entity_nodes)

            # Analyze and export
            metrics = self._analyze_graph()
            graph_data = self._export_graph_data()

            return {
                "graph_data": graph_data,
                "metrics": metrics.__dict__,
                "visualizations": self._generate_visualization_configs(),
                "educational_insights": self._generate_educational_insights(metrics),
            }

        except Exception as e:
            self.logger.exception("Error building knowledge graph: %s", str(e))
            raise

    def _add_nodes_to_graph(self, entity_nodes: List[GraphEntity]):
        """Add entity nodes to graph."""
        for entity in entity_nodes:
            node_id = entity.id
            entity_dict = entity.model_dump()
            self.graph.add_node(node_id, **entity_dict)

            self.logger.debug(
                "Added node: %s (%s)",
                entity.name,
                entity.type,
            )

    def _add_relationships_from_data(
        self, relationships_data: List[EntityRelationship]
    ):
        """Add edges from relationship data."""
        relationships = relationships_data

        for rel in relationships:
            source_id = rel.source_entity_id
            target_id = rel.target_entity_id
            rel_type = rel.relationship_type

            if self.graph.has_node(source_id) and self.graph.has_node(target_id):
                rel_dict = rel.model_dump()
                self.graph.add_edge(
                    source_id, target_id, relation_type=rel_type, **rel_dict
                )

    def _add_relationships_to_graph(self, entity_nodes: List[GraphEntity]):
        """Add edges based on entity relationships (fallback)."""
        for entity in entity_nodes:
            source_id = entity.id
            entity_dict = entity.model_dump()

            # Add prerequisite relationships
            for prereq_id in entity_dict.get("prerequisite_entities", []):
                if self.graph.has_node(prereq_id):
                    self.graph.add_edge(
                        prereq_id, source_id, relation_type="prerequisite"
                    )

            # Add related entity relationships
            for related_id in entity_dict.get("related_entities", []):
                if self.graph.has_node(related_id):
                    self.graph.add_edge(source_id, related_id, relation_type="related")

    def _analyze_graph(self) -> GraphMetrics:
        """Analyze graph and generate insights."""
        try:
            undirected_graph = self.graph.to_undirected()

            # Basic metrics
            total_nodes = undirected_graph.number_of_nodes()
            total_edges = undirected_graph.number_of_edges()

            # Node type distribution
            node_types = {}
            for _, data in undirected_graph.nodes(data=True):
                entity_type = data.get("type", "unknown")
                node_types[entity_type] = node_types.get(entity_type, 0) + 1

            # Connection analysis
            avg_connections = total_edges * 2 / total_nodes if total_nodes > 0 else 0

            # Most connected entities
            degree_centrality = nx.degree_centrality(undirected_graph)
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
                node for node, degree in undirected_graph.degree() if degree == 0
            ]

            # Entity clusters
            clusters = list(nx.connected_components(undirected_graph))
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
            self.logger.exception("Error analyzing graph: %s", str(e))
            raise

    def _find_learning_pathways(self) -> List[List[str]]:
        """Find learning pathways based on prerequisites."""
        try:
            pathways = []

            if self.graph.number_of_nodes() > 0:
                components = list(nx.weakly_connected_components(self.graph))

                for component in components:
                    if len(component) > 1:
                        subgraph = self.graph.subgraph(component)
                        try:
                            pathway = list(nx.topological_sort(subgraph))
                            pathways.append(pathway)
                        except nx.NetworkXError:
                            pathways.append(list(component))

            return pathways
        except Exception as e:
            self.logger.warning("Error finding learning pathways: %s", str(e))
            return []

    def _export_graph_data(self) -> Dict:
        """Export graph data for visualization."""
        undirected_graph = self.graph.to_undirected()

        return {
            "nodes": [
                {
                    "id": node,
                    "label": data.get("name", node),
                    "type": data.get("type", "entity"),
                    "summary": data.get("content_summary", ""),
                    "location": data.get("location_context", ""),
                    "size": undirected_graph.degree(node) + 1,
                }
                for node, data in undirected_graph.nodes(data=True)
            ],
            "edges": [
                {
                    "source": source,
                    "target": target,
                    "type": data.get("relation_type", "related"),
                    "weight": 1,
                }
                for source, target, data in undirected_graph.edges(data=True)
            ],
            "networkx_data": {
                "directed": nx.node_link_data(self.graph),
                "undirected": nx.node_link_data(undirected_graph),
            },
        }

    def _generate_visualization_configs(self) -> Dict:
        """Generate visualization tool configurations."""
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
                "layout": "cose",
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
        """Generate educational recommendations."""
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
        """Create empty response when no data available."""
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


class ChapterPageRange(BaseModel):
    """Page range of a single chapter in a textbook."""

    chapter_number: int = Field(
        ...,
        description="Chapter number as it appears in the textbook (e.g., 1, 2, 3)",
        ge=1,  # Must be greater than or equal to 1
    )
    chapter_title: str = Field(
        ...,
        description="Exact title/name of the chapter as it appears in the textbook",
        min_length=1,  # Title cannot be empty
    )
    start_page: int = Field(
        ...,
        description="Starting page number of the chapter (inclusive)",
        ge=1,  # Page numbers start from 1
    )
    end_page: int = Field(
        ...,
        description="One past the ending page number of the chapter (exclusive, i.e., last_page + 1)",
        ge=1,  # Must be at least 1
    )

    def model_post_init(self, __context) -> None:
        """Validate that end_page is greater than start_page."""
        if self.end_page <= self.start_page:
            raise ValueError(
                f"end_page ({self.end_page}) must be greater than start_page ({self.start_page})"
            )


class ExtractedEntityRelationships(BaseModel):
    """All relationships extracted between entities in a chapter."""

    relationships: List[EntityRelationship] = Field(description="Entity relationships")
