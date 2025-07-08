import azure.durable_functions as df
from typing import Any

from core.models.dag import DAG, NodeStatus
from core.models.requests import LessonPlanGenerationInput


def main(context: df.DurableOrchestrationContext) -> Any:
    """
    Sub-orchestrator function for generating sections of a lesson plan

    Args:
        context: The durable orchestration context

    Returns:
        The updated DAG with completed sections
    """
    # Get the input data
    input_data = context.get_input()
    dag_model = DAG.model_validate(input_data.get("dag"))
    lp_gen_input = LessonPlanGenerationInput.model_validate(
        input_data.get("input_data")
    )

    # Process nodes until all are completed
    while not dag_model.all_nodes_completed():
        # Get nodes that are ready to be executed
        ready_nodes = dag_model.get_ready_nodes()

        # If no nodes are ready but not all are completed, there may be a cycle
        if not ready_nodes and not dag_model.all_nodes_completed():
            raise ValueError("Detected a cycle in the workflow dependencies")

        # Execute ready nodes in parallel
        tasks = []
        for node in ready_nodes:
            # Get outputs of dependency nodes
            dependency_outputs = dag_model.get_node_dependency_outputs(node.id)

            # Prepare activity input
            activity_input = {
                "section_id": node.id,
                "mode": node.mode,
                "dependencies": dependency_outputs,
                "lp_gen_input": lp_gen_input.model_dump(by_alias=True),
            }

            # Call the section generation activity
            tasks.append(
                context.call_activity("GenerateSectionActivity", activity_input)
            )

        # Wait for all tasks to complete simultaneously
        results = yield context.task_all(tasks)

        # Update status for all completed nodes
        for i, result in enumerate(results):
            dag_model.update_node_status(
                ready_nodes[i].id, NodeStatus.COMPLETED, result["content"]
            )

    # Return the completed DAG
    return dag_model.model_dump()


main = df.Orchestrator.create(main)
