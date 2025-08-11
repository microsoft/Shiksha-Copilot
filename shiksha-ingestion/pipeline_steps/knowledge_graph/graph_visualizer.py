"""
Knowledge Graph Visualization Utilities

This module provides utilities for visualizing knowledge graphs in various formats
including interactive web visualizations, static exports, and educational dashboards.
"""

import json
import os
import logging
import sys
import math
from typing import Dict, List, Optional
import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.lines as mlines
from matplotlib.colors import ListedColormap
import pandas as pd

from .models import EntityType, RELATIONSHIP_TYPES

logger = logging.getLogger(__name__)


class GraphVisualizer:
    """Creates various visualizations of knowledge graphs."""

    def __init__(self, graph_data: Dict):
        """
        Initialize visualizer with graph data.

        Args:
            graph_data: Dictionary containing graph nodes, edges, and metadata
        """
        self.graph_data = graph_data
        # Color mapping based on EntityType enum from models.py
        self.color_map = {
            EntityType.SECTION: "#9C27B0",  # Purple
            EntityType.SUBSECTION: "#673AB7",  # Deep Purple
            EntityType.ACTIVITY: "#2196F3",  # Blue
            EntityType.ASSESSMENT: "#FF9800",  # Orange
            EntityType.ASSESSMENT_LBA: "#F44336",  # Red
            EntityType.INTRODUCTION: "#4CAF50",  # Green
            EntityType.CONTENT_BLOCK: "#795548",  # Brown
        }

        # Relationship color mapping based on RELATIONSHIP_TYPES from models.py
        self.relationship_colors = {}
        for i, (rel_type, description) in enumerate(RELATIONSHIP_TYPES):
            colors = [
                "#FF5722",
                "#009688",
                "#E91E63",
                "#673AB7",
                "#3F51B5",
                "#FFC107",
                "#607D8B",
                "#FF6F00",
            ]
            self.relationship_colors[rel_type] = colors[i % len(colors)]

    def create_interactive_html(
        self, output_path: str, title: str = "Chapter Knowledge Graph"
    ):
        """Create an interactive HTML visualization using D3.js."""

        # Generate node type legend items
        node_legend_items = ""
        for entity_type in EntityType:
            color = self.color_map.get(entity_type, "#999")
            display_name = entity_type.value.replace("_", " ").title()
            node_legend_items += f"""
        <div class="legend-item">
            <span class="legend-color" style="background: {color};"></span>
            <span>{display_name}</span>
        </div>"""

        # Generate relationship type legend items
        relationship_legend_items = ""
        for rel_type, description in RELATIONSHIP_TYPES:
            color = self.relationship_colors.get(rel_type, "#999")
            display_name = rel_type.replace("_", " ").title()
            relationship_legend_items += f"""
        <div class="legend-item">
            <svg height="2" width="20">
                <line x1="0" y1="1" x2="20" y2="1" stroke="{color}" stroke-width="2"></line>
            </svg>
            <span>{display_name}</span>
            <span class="legend-description" style="font-size: 10px; color: #666; margin-left: 5px;">({description})</span>
        </div>"""

        html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
        }}
        
        .graph-container {{
            border: 1px solid #ccc;
            border-radius: 5px;
        }}
        
        .node {{
            cursor: pointer;
            stroke: #fff;
            stroke-width: 2px;
            opacity: 0.9;
        }}
        
        .link {{
            stroke: #999;
            stroke-opacity: 0.6;
        }}
        
        .link.directed-link {{
            /* Directed links - can be hidden/shown via toggle */
        }}
        
        .link.undirected-link {{
            /* Undirected links - can be hidden/shown via toggle */
        }}
        
        .link.prerequisite {{
            stroke: #FF5722;
            stroke-width: 2px;
        }}
        
        .link.prerequisite.directed {{
            marker-end: url(#arrowhead);
        }}
        
        .link.related {{
            stroke: #607D8B;
            stroke-width: 1px;
        }}
        
        .link.builds_upon {{
            stroke: #009688;
            stroke-width: 1.5px;
        }}
        
        .link.builds_upon.directed {{
            marker-end: url(#arrowhead-builds);
        }}
        
        .link.demonstrates {{
            stroke: #E91E63;
            stroke-width: 1.5px;
        }}
        
        .link.demonstrates.directed {{
            marker-end: url(#arrowhead-demonstrates);
        }}
        
        .link.explains {{
            stroke: #673AB7;
            stroke-width: 1.2px;
        }}
        
        .link.explains.directed {{
            marker-end: url(#arrowhead-explains);
        }}
        
        .link.applies {{
            stroke: #3F51B5;
            stroke-width: 1.2px;
        }}
        
        .link.applies.directed {{
            marker-end: url(#arrowhead-applies);
        }}
        
        .link.tests {{
            stroke: #FFC107;
            stroke-width: 1.2px;
        }}
        
        .link.tests.directed {{
            marker-end: url(#arrowhead-tests);
        }}
        
        .link.related.directed {{
            marker-end: url(#arrowhead-related);
        }}
        
        .node-label {{
            font-size: 12px;
            text-anchor: middle;
            pointer-events: none;
        }}
        
        .tooltip {{
            position: absolute;
            padding: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 5px;
            pointer-events: none;
            font-size: 12px;
            max-width: 200px;
        }}
        
        .legend {{
            margin-top: 20px;
        }}
        
        .legend-item {{
            display: inline-block;
            margin-right: 15px;
            margin-bottom: 5px;
            max-width: 300px;
        }}
        
        .legend-description {{
            font-size: 10px;
            color: #666;
            margin-left: 5px;
            font-style: italic;
            display: block;
            margin-top: 2px;
        }}
        
        .legend-color {{
            display: inline-block;
            width: 15px;
            height: 15px;
            margin-right: 5px;
            vertical-align: middle;
        }}
        
        .controls {{
            margin-bottom: 10px;
        }}
        
        .control-button {{
            padding: 5px 10px;
            margin-right: 10px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }}
        
        .control-button:hover {{
            background: #1976D2;
        }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    
    <div class="controls">
        <button class="control-button" onclick="restartSimulation()">Restart Layout</button>
        <button class="control-button" onclick="centerGraph()">Center Graph</button>
        <button class="control-button" onclick="compactLayout()">Compact Layout</button>
        <button class="control-button" onclick="expandLayout()">Expand Layout</button>
        <button class="control-button" onclick="fitToScreen()">Fit to Screen</button>
        <button class="control-button" onclick="toggleNodeLabels()">Toggle Labels</button>
        <button class="control-button" onclick="toggleArrows()">Toggle Arrows</button>
        <button class="control-button" onclick="reduceNodeSize()">Smaller Nodes</button>
        <button class="control-button" onclick="increaseNodeSize()">Larger Nodes</button>
    </div>
    
    <div class="graph-container">
        <svg id="graph" width="1000" height="600" viewBox="0 0 1000 600"></svg>
    </div>
    
    <div class="legend">
        <h3>Node Types:</h3>{node_legend_items}
        
        <h3>Relationship Types:</h3>{relationship_legend_items}
    </div>
    
    <div class="tooltip" style="opacity: 0;"></div>

    <script>
        const graphData = {graph_data};
        
        const svg = d3.select("#graph");
        const width = +svg.attr("width");
        const height = +svg.attr("height");
        
        // Add zoom and pan functionality
        const g = svg.append("g");
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {{
                g.attr("transform", event.transform);
            }});
        svg.call(zoom);
        
        // Create arrowhead markers for different relationship types
        const defs = svg.append("defs");
        
        // Prerequisite relationship marker
        defs.append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#FF5722");
            
        // Builds upon relationship marker
        defs.append("marker")
            .attr("id", "arrowhead-builds")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#009688");
            
        // Demonstrates relationship marker
        defs.append("marker")
            .attr("id", "arrowhead-demonstrates")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#E91E63");
            
        // Explains relationship marker
        defs.append("marker")
            .attr("id", "arrowhead-explains")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#673AB7");
            
        // Applies relationship marker
        defs.append("marker")
            .attr("id", "arrowhead-applies")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#3F51B5");
            
        // Tests relationship marker
        defs.append("marker")
            .attr("id", "arrowhead-tests")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#FFC107");
            
        // Related relationship marker
        defs.append("marker")
            .attr("id", "arrowhead-related")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#607D8B");
        
        const colorMap = {color_map};
        
        // Global variables for visualization settings
        let nodeScaleFactor = 2.5;  // Default node size scaling factor
        let showArrows = true;      // Default to show arrows
        
        // All relationship types are now directed
        const directedRelationships = ["prerequisite", "builds_upon", "demonstrates", "explains", "applies", "tests", "related"];
        
        // Create simulation with more appropriate spacing
        const simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(80))  // Increased distance
            .force("charge", d3.forceManyBody().strength(-200))  // Stronger repulsion
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => Math.max(10, d.size * nodeScaleFactor + 10)));  // Prevent overlap
        
        // Create links with appropriate styling
        const link = g.append("g")
            .attr("stroke-opacity", 0.8)
            .selectAll("line")
            .data(graphData.edges)
            .join("line")
            .attr("class", d => {{
                const arrowClass = showArrows ? "directed" : "";
                return `link ${{d.type}} directed-link ${{arrowClass}}`;
            }})
            .attr("stroke-width", function(d) {{
                if (d.type === "prerequisite") return 2;
                if (d.type === "builds_upon") return 1.5;
                if (d.type === "demonstrates") return 1.5;
                return 1;
            }});
        
        // Create nodes with improved sizing
        const node = g.append("g")
            .selectAll("circle")
            .data(graphData.nodes)
            .join("circle")
            .attr("class", "node")
            .attr("r", d => Math.max(5, d.size * nodeScaleFactor))  // More proportional size scaling
            .attr("fill", d => colorMap[d.type] || "#999")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        
        const label = g.append("g")
            .selectAll("text")
            .data(graphData.nodes)
            .join("text")
            .attr("class", "node-label")
            .text(d => d.label.length > 20 ? d.label.substring(0, 20) + "..." : d.label);
        
        const tooltip = d3.select(".tooltip");
        
        node.on("mouseover", function(event, d) {{
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`
                <strong>${{d.label}}</strong><br/>
                Type: ${{d.type}}<br/>
                ${{d.summary ? `Summary: ${{d.summary}}<br/>` : ""}}
                ${{d.page ? `Page: ${{d.page}}` : ""}}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        }})
        .on("mouseout", function(d) {{
            tooltip.transition().duration(500).style("opacity", 0);
        }});
        
        simulation.on("tick", () => {{
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            
            label
                .attr("x", d => d.x)
                .attr("y", d => d.y + 5);
        }});
        
        function dragstarted(event, d) {{
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }}
        
        function dragged(event, d) {{
            d.fx = event.x;
            d.fy = event.y;
        }}
        
        function dragended(event, d) {{
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }}
        
        function restartSimulation() {{
            simulation.alpha(1).restart();
        }}
        
        function centerGraph() {{
            simulation.force("center", d3.forceCenter(width / 2, height / 2));
            simulation.alpha(0.3).restart();
        }}
        
        function compactLayout() {{
            // Create a more compact layout by reducing forces
            simulation
                .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(30))
                .force("charge", d3.forceManyBody().strength(-100))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(15));
            simulation.alpha(0.5).restart();
        }}
        
        function fitToScreen() {{
            // Calculate the bounding box of all nodes
            const nodes = simulation.nodes();
            if (nodes.length === 0) return;
            
            const minX = d3.min(nodes, d => d.x);
            const maxX = d3.max(nodes, d => d.x);
            const minY = d3.min(nodes, d => d.y);
            const maxY = d3.max(nodes, d => d.y);
            
            const nodeWidth = maxX - minX;
            const nodeHeight = maxY - minY;
            
            if (nodeWidth === 0 || nodeHeight === 0) return;
            
            // Add padding
            const padding = 50;
            const scale = Math.min(
                (width - padding) / nodeWidth,
                (height - padding) / nodeHeight
            );
            
            // Calculate center
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            // Apply zoom transform
            const transform = d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(scale)
                .translate(-centerX, -centerY);
            
            svg.transition().duration(750).call(zoom.transform, transform);
        }}
        
        let labelsVisible = true;
        function toggleNodeLabels() {{
            labelsVisible = !labelsVisible;
            label.style("opacity", labelsVisible ? 1 : 0);
        }}
        
        function toggleArrows() {{
            showArrows = !showArrows;
            if (showArrows) {{
                link.classed("directed", true);
            }} else {{
                link.classed("directed", false);
            }}
        }}
        
        function reduceNodeSize() {{
            nodeScaleFactor = Math.max(1, nodeScaleFactor - 0.5);
            node.attr("r", d => Math.max(5, d.size * nodeScaleFactor));
            simulation.force("collision", d3.forceCollide().radius(d => Math.max(10, d.size * nodeScaleFactor + 5)));
            simulation.alpha(0.3).restart();
        }}
        
        function increaseNodeSize() {{
            nodeScaleFactor = Math.min(5, nodeScaleFactor + 0.5);
            node.attr("r", d => Math.max(5, d.size * nodeScaleFactor));
            simulation.force("collision", d3.forceCollide().radius(d => Math.max(10, d.size * nodeScaleFactor + 5)));
            simulation.alpha(0.3).restart();
        }}
        
        function expandLayout() {{
            simulation
                .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(120))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide().radius(d => Math.max(10, d.size * nodeScaleFactor + 10)));
            simulation.alpha(0.5).restart();
        }}
    </script>
</body>
</html>
        """

        with open(output_path, "w", encoding="utf-8") as file:
            file.write(
                html_template.format(
                    title=title,
                    node_legend_items=node_legend_items,
                    relationship_legend_items=relationship_legend_items,
                    graph_data=json.dumps(self.graph_data["graph_data"]),
                    color_map=json.dumps(self.color_map),
                )
            )

        logger.info("Created interactive HTML visualization: %s", output_path)

    def create_static_plot(
        self, output_path: str, title: str = "Chapter Knowledge Graph"
    ):
        """Create a static matplotlib plot of the graph."""

        # Create NetworkX graph from data
        G = nx.Graph()

        # Add nodes
        for node in self.graph_data["graph_data"]["nodes"]:
            G.add_node(node["id"], **node)

        # Add edges
        for edge in self.graph_data["graph_data"]["edges"]:
            G.add_edge(edge["source"], edge["target"], **edge)

        # Set up the plot with adjusted size for better component visibility
        plt.figure(figsize=(12, 8))
        plt.title(title, fontsize=16, fontweight="bold")

        # Calculate layout - use kamada_kawai for better component positioning
        # If graph has disconnected components, use a custom layout approach
        if not nx.is_connected(G):
            # For disconnected graphs, position components more compactly but with better spacing
            pos = {}
            components = list(nx.connected_components(G))
            component_graphs = [G.subgraph(comp).copy() for comp in components]

            # Calculate positions for each component
            component_positions = []
            for comp_graph in component_graphs:
                if len(comp_graph) == 1:
                    # Single node component
                    node = list(comp_graph.nodes())[0]
                    comp_pos = {node: (0, 0)}
                else:
                    # Multi-node component - use spring layout with better spacing
                    # Increase k for more spread, increase iterations for better layout
                    comp_pos = nx.spring_layout(
                        comp_graph, k=0.5, iterations=100, seed=42
                    )
                component_positions.append(comp_pos)

            # Arrange components in a grid with more spacing
            import math

            n_components = len(components)
            grid_size = math.ceil(math.sqrt(n_components))

            for i, comp_pos in enumerate(component_positions):
                # Calculate grid position for this component
                row = i // grid_size
                col = i % grid_size

                # Offset for this component (improved spacing)
                offset_x = col * 2.5  # Increased spacing
                offset_y = row * 2.5  # Increased spacing

                # Apply offset to all nodes in this component
                for node, (x, y) in comp_pos.items():
                    pos[node] = (x + offset_x, y + offset_y)
        else:
            # Connected graph - use spring layout with better spacing and more iterations
            pos = nx.spring_layout(G, k=0.7, iterations=100, seed=42)

        # Group nodes by type for coloring
        node_types = set(data.get("type", "concept") for _, data in G.nodes(data=True))

        # Draw nodes by type
        for node_type in node_types:
            nodelist = [
                node
                for node, data in G.nodes(data=True)
                if data.get("type") == node_type
            ]
            if nodelist:
                nx.draw_networkx_nodes(
                    G,
                    pos,
                    nodelist=nodelist,
                    node_color=self.color_map.get(node_type, "#999"),
                    node_size=[G.nodes[node].get("size", 1) * 200 for node in nodelist],
                    alpha=0.8,
                )

        # Draw edges with different styles based on relationship type
        prerequisite_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "prerequisite"
        ]
        builds_upon_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "builds_upon"
        ]
        demonstrates_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "demonstrates"
        ]
        explains_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "explains"
        ]
        applies_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "applies"
        ]
        tests_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "tests"
        ]
        related_edges = [
            (u, v) for u, v, d in G.edges(data=True) if d.get("type") == "related"
        ]

        # Define edge styles for different relationship types
        edge_styles = [
            (
                prerequisite_edges,
                "#FF5722",
                1.5,
                0.7,
                True,
                10,
                "arc3,rad=0.1",
            ),  # prerequisite
            (
                builds_upon_edges,
                "#009688",
                1.4,
                0.7,
                True,
                10,
                "arc3,rad=0.1",
            ),  # builds_upon
            (
                demonstrates_edges,
                "#E91E63",
                1.3,
                0.7,
                True,
                10,
                "arc3,rad=0.05",
            ),  # demonstrates
            (explains_edges, "#673AB7", 1.2, 0.6, True, 8, "arc3,rad=0.05"),  # explains
            (applies_edges, "#3F51B5", 1.2, 0.6, True, 8, "arc3,rad=0"),  # applies
            (tests_edges, "#FFC107", 1.2, 0.6, True, 8, "arc3,rad=0"),  # tests
            (
                related_edges,
                "#607D8B",
                1.0,
                0.4,
                True,
                8,
                "arc3,rad=0",
            ),  # related - now directed
        ]

        # Draw all edge types with their specific styles
        for edges, color, width, alpha, arrows, arrowsize, style in edge_styles:
            if edges:
                # Prepare parameters for nx.draw_networkx_edges
                edge_params = {
                    "G": G,
                    "pos": pos,
                    "edgelist": edges,
                    "edge_color": color,
                    "width": width,
                    "alpha": alpha,
                    "arrows": arrows,
                    "arrowsize": arrowsize,
                }

                # Only add connectionstyle if it's not None
                if style is not None:
                    edge_params["connectionstyle"] = style

                nx.draw_networkx_edges(**edge_params)

        # Add labels
        labels = {
            node: data.get("label", node)[:15]
            + ("..." if len(data.get("label", node)) > 15 else "")
            for node, data in G.nodes(data=True)
        }
        nx.draw_networkx_labels(G, pos, labels, font_size=8)

        # Create legend for node types - use proper display names
        node_legend_elements = []
        for node_type, color in self.color_map.items():
            if node_type in node_types:
                # Create proper display name
                if isinstance(node_type, EntityType):
                    display_name = node_type.value.replace("_", " ").title()
                else:
                    display_name = str(node_type).replace("_", " ").title()
                node_legend_elements.append(
                    mpatches.Patch(color=color, label=display_name)
                )

        # Create legend for relationship types - use dynamic colors from models.py
        relationship_colors_for_legend = {}
        for rel_type, description in RELATIONSHIP_TYPES:
            color = self.relationship_colors.get(rel_type, "#999")
            display_name = rel_type.replace("_", " ").title()
            relationship_colors_for_legend[display_name] = color

        edge_legend_elements = [
            mlines.Line2D([0], [0], color=color, lw=2, label=rel_type)
            for rel_type, color in relationship_colors_for_legend.items()
        ]

        # Add both node and edge legends
        plt.legend(
            handles=node_legend_elements + edge_legend_elements,
            loc="upper left",
            bbox_to_anchor=(1, 1),
            fontsize=9,  # Smaller font for more compact legend
            title="Node Types & Relationships",
        )

        plt.axis("off")
        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches="tight")
        plt.close()

        logger.info("Created static plot: %s", output_path)

    def create_analysis_report(self, output_path: str, chapter_title: str = "Chapter"):
        """Create a detailed analysis report of the graph structure."""

        metrics = self.graph_data.get("metrics", {})
        insights = self.graph_data.get("educational_insights", {})

        report = f"""
# Knowledge Graph Analysis Report: {chapter_title}

## Graph Overview
- **Total Concepts**: {metrics.get('total_nodes', 0)}
- **Total Connections**: {metrics.get('total_edges', 0)}
- **Average Connections per Concept**: {metrics.get('avg_connections_per_node', 0):.2f}

## Content Distribution
"""

        # Content distribution
        content_dist = metrics.get("node_types", {})
        for content_type, count in content_dist.items():
            percentage = (count / metrics.get("total_nodes", 1)) * 100
            report += (
                f"- **{content_type.capitalize()}**: {count} ({percentage:.1f}%)\n"
            )

        # Most connected concepts
        most_connected = metrics.get("most_connected_concepts", [])
        if most_connected:
            report += "\n## Most Connected Concepts\n"
            for concept, connections in most_connected:
                report += f"- **{concept}**: {connections} connections\n"

        # Learning pathways
        pathways = metrics.get("learning_pathways", [])
        if pathways:
            report += "\n## Learning Pathways\n"
            for i, pathway in enumerate(pathways, 1):
                report += f"### Pathway {i}\n"
                report += " → ".join(pathway) + "\n\n"

        # Isolated concepts
        isolated = metrics.get("isolated_concepts", [])
        if isolated:
            report += "\n## Isolated Concepts (No Connections)\n"
            for concept in isolated:
                report += f"- {concept}\n"

        # Recommendations
        recommendations = insights.get("recommendations", [])
        if recommendations:
            report += "\n## Recommendations\n"
            for rec in recommendations:
                report += f"- {rec}\n"

        # Educational insights
        learning_structure = insights.get("learning_structure", {})
        if learning_structure:
            report += f"\n## Learning Structure Analysis\n"
            report += f"- **Complexity**: {learning_structure.get('complexity', 'unknown').capitalize()}\n"
            report += f"- **Interconnectedness**: {learning_structure.get('interconnectedness', 0):.2f}\n"

        with open(output_path, "w", encoding="utf-8") as file:
            file.write(report)

        logger.info("Created analysis report: %s", output_path)

    def export_for_external_tools(self, output_dir: str, base_filename: str):
        """Export graph data in formats suitable for external visualization tools."""

        # Gephi format (GEXF)
        gephi_path = os.path.join(output_dir, f"{base_filename}_gephi.json")
        gephi_data = {
            "nodes": [
                {
                    "id": node["id"],
                    "label": node["label"],
                    "attributes": {
                        "type": node["type"],
                        "summary": node.get("summary", ""),
                        "page": node.get("page", ""),
                    },
                }
                for node in self.graph_data["graph_data"]["nodes"]
            ],
            "edges": [
                {
                    "id": f"{edge['source']}-{edge['target']}",
                    "source": edge["source"],
                    "target": edge["target"],
                    "type": edge.get("type", "related"),
                    "weight": edge.get("weight", 1),
                }
                for edge in self.graph_data["graph_data"]["edges"]
            ],
        }

        with open(gephi_path, "w", encoding="utf-8") as file:
            json.dump(gephi_data, file, indent=2)

        # Cytoscape format
        cytoscape_path = os.path.join(output_dir, f"{base_filename}_cytoscape.json")
        cytoscape_data = {
            "elements": {
                "nodes": [
                    {
                        "data": {
                            "id": node["id"],
                            "label": node["label"],
                            "type": node["type"],
                            "summary": node.get("summary", ""),
                            "size": node.get("size", 1),
                        }
                    }
                    for node in self.graph_data["graph_data"]["nodes"]
                ],
                "edges": [
                    {
                        "data": {
                            "id": f"{edge['source']}-{edge['target']}",
                            "source": edge["source"],
                            "target": edge["target"],
                            "type": edge.get("type", "related"),
                        }
                    }
                    for edge in self.graph_data["graph_data"]["edges"]
                ],
            }
        }

        with open(cytoscape_path, "w", encoding="utf-8") as file:
            json.dump(cytoscape_data, file, indent=2)

        logger.info(
            "Exported graph data for external tools: %s, %s", gephi_path, cytoscape_path
        )


def create_all_visualizations(
    graph_file_path: str, output_dir: str, chapter_title: str = "Chapter"
):
    """
    Create all types of visualizations for a knowledge graph.

    Args:
        graph_file_path: Path to the knowledge graph JSON file
        output_dir: Directory to save visualizations
        chapter_title: Title for the visualizations
    """
    try:
        # Load graph data
        with open(graph_file_path, "r", encoding="utf-8") as file:
            graph_data = json.load(file)

        # Create visualizer
        visualizer = GraphVisualizer(graph_data)

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Generate base filename
        base_filename = os.path.basename(graph_file_path).replace(
            "_knowledge_graph.json", ""
        )

        # Create all visualizations
        visualizer.create_interactive_html(
            os.path.join(output_dir, f"{base_filename}_interactive.html"),
            f"Interactive {chapter_title} Knowledge Graph",
        )

        visualizer.create_static_plot(
            os.path.join(output_dir, f"{base_filename}_static.png"),
            f"{chapter_title} Knowledge Graph",
        )

        visualizer.create_analysis_report(
            os.path.join(output_dir, f"{base_filename}_analysis.md"), chapter_title
        )

        visualizer.export_for_external_tools(output_dir, base_filename)

        logger.info(
            "Created all visualizations for %s in %s", chapter_title, output_dir
        )

    except Exception as e:
        logger.exception("Error creating visualizations: %s", str(e))
        raise


if __name__ == "__main__":
    # Example usage
    import sys

    if len(sys.argv) != 4:
        print(
            "Usage: python graph_visualizer.py <graph_file_path> <output_dir> <chapter_title>"
        )
        sys.exit(1)

    graph_file = sys.argv[1]
    output_directory = sys.argv[2]
    title = sys.argv[3]

    create_all_visualizations(graph_file, output_directory, title)
