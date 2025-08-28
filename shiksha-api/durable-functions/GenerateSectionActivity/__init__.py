import json
from typing import Dict, Any

from core.agents import AgentPool
from core import (
    QueryGenerator,
    RegenQueryGenerator,
    QueryGeneratorTelanganaEnglishResourcePlan,
)
from core.logger import LoggerFactory

# Get logger for this module
logger = LoggerFactory.get_function_logger("GenerateSectionActivity")

from core.base_query_generator import BaseQueryGenerator
from core.gpt_context_summarizer import GPTContextSummarizer
from core.models.workflow_models import (
    Mode,
    RAGInput,
    GPTInput,
)
from core.models.requests import LessonPlanGenerationInput, LPLevel


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

    # Preprocess to compress additional context
    if lp_gen_input.additional_context:
        try:
            summarizer = GPTContextSummarizer()
            lp_gen_input.additional_context = (
                await summarizer.summarize_lesson_plan_context(
                    lp_gen_input.additional_context
                )
            )
        except Exception as e:
            logger.error(
                f"Error summarizing additional context: {str(e)}. Proceeding without summarization."
            )

    logger.info(f"Generating section '{section_id}' using {mode} mode")

    try:
        # Get the workflow from the database
        workflow = lp_gen_input.workflow

        # Find the section definition
        section = next((s for s in workflow.sections if s.id == section_id), None)
        if not section:
            raise ValueError(f"Section with ID {section_id} not found in workflow")

        # Initialize the query generator with section
        query_generator: BaseQueryGenerator = (
            RegenQueryGenerator(lp_gen_input, section)
            if lp_gen_input.lesson_plan and not lp_gen_input.start_from_section_id
            else (
                QueryGeneratorTelanganaEnglishResourcePlan(lp_gen_input, section)
                if lp_gen_input.lp_level == LPLevel.TELANGANA_ENGLISH_RESOURCE_PLAN
                else QueryGenerator(lp_gen_input, section)
            )
        )

        logger.info(f"Using query generator: {type(query_generator).__name__}")

        # Generate synthesis queries
        synthesis_query = query_generator.generate_synthesis_query(
            dependencies=dependencies
        )
        retrieval_query = query_generator.generate_retrieval_query()

        logger.info(
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
                    retrieval_query=retrieval_query,
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
        logger.exception(f"Error generating section '{section_id}': {str(e)}")
        raise e
