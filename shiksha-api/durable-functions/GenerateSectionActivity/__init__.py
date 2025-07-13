import logging
import json
from typing import Dict, Any

from core.agents import AgentPool
from core import QueryGenerator, RegenQueryGenerator

from core.models.workflow_models import (
    Mode,
    RAGInput,
    GPTInput,
)
from core.models.requests import LessonPlanGenerationInput


async def main(inputData: Dict[str, Any]) -> Dict[str, Any]:
    """
    Activity function to generate a section of the lesson plan

    Args:
        input_data: The input data for section generation, including:
                  - section_id: The ID of the section to generate
                  - mode: The mode of generation (rag or gpt)
                  - dependencies: The outputs of dependency sections
                  - lp_gen_input: The original LP gen input

    Returns:
        The generated section
    """
    section_id: str = inputData.get("section_id")
    mode: str = inputData.get("mode")
    dependencies: dict = inputData.get("dependencies", {})
    lp_gen_input = LessonPlanGenerationInput.model_validate(
        inputData.get("lp_gen_input", {})
    )

    logging.info(f"Generating section '{section_id}' using {mode} mode")

    try:
        # Get the workflow from the database
        workflow = lp_gen_input.workflow

        # Find the section definition
        section = next((s for s in workflow.sections if s.id == section_id), None)
        if not section:
            raise ValueError(f"Section with ID {section_id} not found in workflow")

        # Initialize the query generator with section
        query_generator = (
            RegenQueryGenerator(lp_gen_input, section)
            if lp_gen_input.lesson_plan and not lp_gen_input.start_from_section_id
            else QueryGenerator(lp_gen_input, section)
        )

        # Generate synthesis queries
        synthesis_query = query_generator.generate_synthesis_query(
            dependencies=dependencies
        )

        logging.info(
            "---------------- Query:\n%s\n---------------",
            synthesis_query,
        )

        # Generate the section based on the mode
        if mode.lower() == Mode.RAG.value:
            # Initialize the RAG agent
            rag_agent = AgentPool.get_rag_agent(lp_gen_input.chapter_info.index_path)

            # Generate the section
            result = await rag_agent.generate(
                RAGInput(
                    index_path=lp_gen_input.chapter_info.index_path,
                    response_synthesis_query=synthesis_query,
                )
            )

        else:
            # Initialize the GPT agent
            gpt_agent = AgentPool.get_gpt_agent()

            # Create GPT input
            gpt_input = GPTInput(
                prompt=synthesis_query,
            )

            # Generate the section
            result = await gpt_agent.generate_section(gpt_input)
        # Return the final result
        return {"content": result}

    except Exception as e:
        logging.exception(f"Error generating section '{section_id}': {str(e)}")
        return {"error": str(e)}
