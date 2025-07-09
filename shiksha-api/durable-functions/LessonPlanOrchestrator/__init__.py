import json
import logging
import uuid
import azure.functions as func
import azure.durable_functions as df
from typing import Dict, Generator, List, Any

from core.agents.agent_pool import AgentPool
from core.blob_store import BlobStore
from core.models.responses import LessonPlan
from core.models.workflow_models import (
    SectionOutput,
)
from core.models.requests import LessonPlanGenerationInput
from core.models.dag import DAG, NodeStatus


def main(
    context: df.DurableOrchestrationContext,
) -> Generator[Any, Any, Dict[str, Any]]:
    """
    Main orchestrator function for generating a lesson plan

    Args:
        context: The durable orchestration context

    Returns:
        The generated lesson plan
    """
    try:
        # Get the input data
        input_payload: dict = context.get_input()
        lp_gen_input = LessonPlanGenerationInput.model_validate(input_payload)

        # Create a DAG from the workflow definition
        dag = DAG.from_workflow_definition(lp_gen_input.workflow)

        # Check if we need to start from a specific section
        if lp_gen_input.start_from_section_id:
            logging.info(
                f"Creating DAG with filled nodes starting from section: {lp_gen_input.start_from_section_id}"
            )

            # Mark dependency content nodes as completed in the current DAG.
            dag.fill_nodes_partially(
                lp_gen_input.start_from_section_id,
                {
                    section.section_id: section.content
                    for section in lp_gen_input.lesson_plan.sections
                },
            )

        # Split the DAG into independent subgraphs
        subgraphs = dag.get_independent_subgraphs()

        # Execute each subgraph in parallel
        tasks = []
        for i, subgraph in enumerate(subgraphs):
            tasks.append(
                context.call_sub_orchestrator(
                    "SectionsGraphOrchestrator",
                    {
                        "dag": subgraph.model_dump(by_alias=True),
                        "input_data": lp_gen_input.model_dump(by_alias=True),
                    },
                )
            )

        # Wait for all subgraphs to complete in parallel
        subgraph_results = yield context.task_all(tasks)

        # Create a map of all completed sections from subgraphs
        sections_map = {}
        for result in subgraph_results:
            # Extract sections from each subgraph
            dag_result = DAG.model_validate(result)
            for node_id, node in dag_result.nodes.items():
                if node.status == NodeStatus.COMPLETED and node.output is not None:
                    sections_map[node_id] = SectionOutput(
                        section_id=node_id,
                        section_title=node.title,
                        content=node.output,
                    ).model_dump(by_alias=True)

        # Create the all_sections list
        all_sections = []

        for section in lp_gen_input.workflow.sections:
            if section.id in sections_map:
                all_sections.append(sections_map[section.id])

        # Store the lesson plan in the database
        lesson_plan_json = LessonPlan(
            _id=lp_gen_input.lp_id,
            created_at=int(context.current_utc_datetime.timestamp()),
            workflow_id=lp_gen_input.workflow.id,
            chapter_id=lp_gen_input.chapter_info.id,
            subtopics=[subtopic.name for subtopic in lp_gen_input.subtopics],
            learning_outcomes=lp_gen_input.learning_outcomes,
            lp_level=lp_gen_input.lp_level,
            lp_type_english=lp_gen_input.lp_type_english,
            sections=all_sections,
        ).model_dump(by_alias=True, exclude_none=True)

        logging.info(
            "FINAL RESPONSE: %s",
            json.dumps(lesson_plan_json, indent=2),
        )

        # Return the final result
        return lesson_plan_json
    except Exception as e:
        logging.exception("Error in main orchestrator", exc_info=True)
        raise df.OrchestrationError(f"Error in main orchestrator: {str(e)}")
    finally:
        # CLEAR RAG RESOURCES
        AgentPool.clear_rag_agent_resources(lp_gen_input.chapter_info.index_path)


main = df.Orchestrator.create(main)
