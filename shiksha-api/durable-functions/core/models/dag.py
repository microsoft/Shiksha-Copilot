from copy import deepcopy
from typing import Dict, List, Optional, Set, Any, Union
from enum import Enum
from pydantic import BaseModel, Field

from core.models.workflow_models import WorkflowDefinition


class NodeStatus(str, Enum):
    """Status of a node in the DAG"""

    PENDING = "pending"  # Not yet ready to be executed (has unresolved dependencies)
    READY = "ready"  # Ready to be executed (all dependencies resolved)
    RUNNING = "running"  # Currently being executed
    COMPLETED = "completed"  # Successfully completed
    FAILED = "failed"  # Failed to execute


class DAGNode(BaseModel):
    """Represents a node in the DAG (one section of the lesson plan)"""

    id: str = Field(
        ..., description="Unique identifier for the node, matching the section ID"
    )
    title: str = Field(..., description="Title of the section")
    mode: str = Field(..., description="Mode of generation - rag or gpt")
    dependencies: List[str] = Field(
        default_factory=list, description="List of node IDs that this node depends on"
    )
    status: NodeStatus = Field(
        default=NodeStatus.PENDING, description="Current status of the node"
    )
    output: Optional[Union[Dict[str, Any], str]] = Field(
        None, description="Output of the node once executed"
    )


class DAG(BaseModel):
    """
    Directed Acyclic Graph representation of a workflow
    Each node represents a section in the lesson plan.
    """

    nodes: Dict[str, DAGNode] = Field(..., description="Map of node ID to node details")

    def get_ready_nodes(self) -> List[DAGNode]:
        """
        Get all nodes that are ready to be executed

        Returns:
            List of nodes that are ready for execution
        """
        ready_nodes = []

        for node_id, node in self.nodes.items():
            # Check if the node is already in ready state
            if node.status == NodeStatus.READY:
                ready_nodes.append(node)
                continue

            # Check if all dependencies are completed for pending nodes
            if node.status == NodeStatus.PENDING:
                all_deps_completed = True
                for dep_id in node.dependencies:
                    dep_node = self.nodes.get(dep_id)
                    if not dep_node or dep_node.status != NodeStatus.COMPLETED:
                        all_deps_completed = False
                        break

                # If all dependencies are completed, mark as ready
                if all_deps_completed:
                    node.status = NodeStatus.READY
                    ready_nodes.append(node)

        return ready_nodes

    def get_node_dependency_outputs(self, node_id: str) -> Dict[str, Any]:
        """
        Get the outputs of all dependencies of a node

        Args:
            node_id: The ID of the node

        Returns:
            Map of dependency node ID to its output
        """
        node = self.nodes.get(node_id)
        if not node:
            return {}

        outputs = {}
        for dep_id in node.dependencies:
            dep_node = self.nodes.get(dep_id)
            if dep_node and dep_node.output is not None:
                outputs[dep_node.title] = dep_node.output

        return outputs

    def update_node_status(
        self,
        node_id: str,
        status: NodeStatus,
        output: Optional[Union[Dict[str, Any], str]] = None,
    ) -> bool:
        """
        Update the status of a node and optionally set its output

        Args:
            node_id: The ID of the node to update
            status: The new status
            output: The output of the node (if available)

        Returns:
            True if successful, False otherwise
        """
        node = self.nodes.get(node_id)
        if not node:
            return False

        node.status = status
        if output is not None:
            node.output = output

        return True

    def all_nodes_completed(self) -> bool:
        """
        Check if all nodes have been completed

        Returns:
            True if all nodes are in COMPLETED state, False otherwise
        """
        for node in self.nodes.values():
            if node.status != NodeStatus.COMPLETED:
                return False

        return True

    def get_independent_subgraphs(self) -> List["DAG"]:
        """
        Get independent subgraphs (connected components) of the DAG

        Returns:
            List of independent DAGs
        """
        # Map each node to its subgraph ID
        subgraph_map: Dict[str, int] = {}
        visited: Set[str] = set()

        def dfs(node_id: str, subgraph_id: int):
            """Depth-first search to identify connected components"""
            if node_id in visited:
                return

            visited.add(node_id)
            subgraph_map[node_id] = subgraph_id

            # Visit all dependencies
            node = self.nodes.get(node_id)
            if node:
                for dep_id in node.dependencies:
                    dfs(dep_id, subgraph_id)

                # Also check which nodes depend on this node (reverse edges)
                for other_id, other_node in self.nodes.items():
                    if node_id in other_node.dependencies:
                        dfs(other_id, subgraph_id)

        # Perform DFS to find connected components
        subgraph_id = 0
        for node_id in self.nodes.keys():
            if node_id not in visited:
                dfs(node_id, subgraph_id)
                subgraph_id += 1

        # Create subgraphs
        subgraphs: List[DAG] = []
        for i in range(subgraph_id):
            # Get all nodes in this subgraph
            subgraph_nodes = {
                node_id: node
                for node_id, node in self.nodes.items()
                if subgraph_map.get(node_id) == i
            }

            # Create a new DAG for this subgraph
            subgraphs.append(DAG(nodes=subgraph_nodes))

        return subgraphs

    @classmethod
    def from_workflow_definition(cls, workflow_def: WorkflowDefinition) -> "DAG":
        """
        Create a DAG from a workflow definition

        Args:
            workflow_def: The workflow definition dictionary

        Returns:
            A DAG representation of the workflow
        """
        nodes = {}

        # Create nodes for each section
        for section in workflow_def.sections:
            dependencies = [dep.section_id for dep in section.dependencies]

            nodes[section.id] = DAGNode(
                id=section.id,
                title=section.title,
                mode=section.mode,
                dependencies=dependencies,
                status=NodeStatus.PENDING if dependencies else NodeStatus.READY,
            )

        return cls(nodes=nodes)

    @classmethod
    def from_nodes(cls, nodes: List[DAGNode]) -> "DAG":
        """
        Create a DAG from a list of nodes

        Args:
            nodes: List of DAGNode objects

        Returns:
            A DAG representation containing the provided nodes
        """
        node_map = {node.id: node for node in nodes}
        return cls(nodes=node_map)

    def __str__(self) -> str:
        """
        Create a visual representation of the DAG

        Returns:
            A string representation of the DAG showing nodes and their dependencies
        """
        if not self.nodes:
            return "Empty DAG"

        # Build the adjacency list from dependencies
        adjacency_list = {node_id: set() for node_id in self.nodes.keys()}
        for node_id, node in self.nodes.items():
            for dep_id in node.dependencies:
                if dep_id in adjacency_list:
                    adjacency_list[dep_id].add(node_id)

        # Find nodes with no outgoing edges (leaf nodes)
        leaf_nodes = {
            node_id for node_id in self.nodes.keys() if not adjacency_list[node_id]
        }

        # Find nodes with no incoming edges (root nodes)
        root_nodes = {
            node_id for node_id, node in self.nodes.items() if not node.dependencies
        }

        # Build a topological order of nodes
        visited = set()
        topo_order = []

        def visit(node_id):
            if node_id in visited:
                return
            visited.add(node_id)
            node = self.nodes[node_id]
            for dep_id in node.dependencies:
                if dep_id in self.nodes:
                    visit(dep_id)
            topo_order.append(node_id)

        for node_id in root_nodes:
            visit(node_id)

        for node_id in self.nodes:
            if node_id not in visited:
                visit(node_id)

        # Build the visual representation
        result = ["Directed Acyclic Graph Visualization:"]
        result.append(f"Total nodes: {len(self.nodes)}")
        result.append(
            f"Root nodes: {', '.join(sorted(root_nodes)) if root_nodes else 'None'}"
        )
        result.append(
            f"Leaf nodes: {', '.join(sorted(leaf_nodes)) if leaf_nodes else 'None'}"
        )
        result.append("")

        # Node details with indentation to show hierarchy
        result.append("Node details (ID | Title | Mode | Status | Dependencies):")

        # Format for better visualization
        for node_id in topo_order:
            node = self.nodes[node_id]
            prefix = "└─ " if not adjacency_list[node_id] else "├─ "
            deps = ", ".join(node.dependencies) if node.dependencies else "None"
            result.append(
                f"{prefix}{node.id} | {node.title} | {node.mode} | {node.status} | [{deps}]"
            )

            # Add connections visualization
            children = adjacency_list[node_id]
            if children:
                for child_id in sorted(children):
                    result.append(f"   ↳ {child_id}")

        return "\n".join(result)

    def add_nodes_from_other_dag(self, other_dag: "DAG") -> None:
        """
        Adds nodes from another DAG to the current DAG for regeneration scenarios where previously generated section content should also be sent as
        context while regenerating the same section.

        For each node in the provided `other_dag`, if a node with the same ID exists in the current DAG,
        a deep copy of the node from `other_dag` is created, its ID is prefixed with 'other_', its status
        is set to COMPLETED, and it is added to the current DAG's nodes. The original node's dependencies
        are then extended to include the new node.

        Args:
            other_dag (DAG): The DAG from which nodes will be added.

        Returns:
            None
        """
        for other_node_id, other_node in other_dag.nodes.items():
            if other_node_id in self.nodes:
                new_node = deepcopy(other_node)
                new_node.id = f"other_{new_node.id}"
                new_node.status = NodeStatus.COMPLETED
                self.nodes[new_node.id] = new_node
                self.nodes[other_node_id].dependencies.extend([new_node.id])

    def fill_nodes_partially(
        self,
        start_section_id: str,
        dependency_content: Optional[Dict[str, Union[Dict[str, Any], str]]] = None,
    ) -> None:
        """
        Mark dependency content nodes as completed in the current DAG.

        Args:
            start_section_id: The section ID to start from
            dependency_content: Pre-computed content for dependency sections

        Raises:
            ValueError: If the start_section_id is not found in the DAG or if required dependencies are missing
        """
        if start_section_id not in self.nodes:
            raise ValueError(f"Section ID '{start_section_id}' not found in workflow")

        start_node = self.nodes[start_section_id]

        # Check if ALL dependencies of the start section have been provided in dependency_content
        if start_node.dependencies:
            dependency_content = dependency_content or {}
            missing_dependencies = [
                dep_id
                for dep_id in start_node.dependencies
                if dep_id not in dependency_content
            ]
            if missing_dependencies:
                raise ValueError(
                    f"Missing dependency content for section '{start_section_id}'. "
                    f"Required dependencies not provided: {missing_dependencies}"
                )

        # For ALL nodes whose dependency_content is sent, mark as completed with the content
        if dependency_content:
            for section_id, content in dependency_content.items():
                if section_id in self.nodes:
                    self.update_node_status(section_id, NodeStatus.COMPLETED, content)
                # else: ignore silently
