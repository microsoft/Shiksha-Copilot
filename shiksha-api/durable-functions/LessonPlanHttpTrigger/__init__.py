import json
import logging
import azure.functions as func
import azure.durable_functions as df

from core.models.requests import LessonPlanGenerationInput


async def main(req: func.HttpRequest, starter: str) -> func.HttpResponse:
    """
    HTTP endpoint for generating a lesson plan

    Args:
        req: The HTTP request
        starter: The durable orchestration client

    Returns:
        An HTTP response with the orchestration instance ID
    """
    logging.info(
        "Python HTTP trigger function processed a request to generate a lesson plan."
    )

    try:
        # Validate the input
        input_data = LessonPlanGenerationInput.model_validate(req.get_json())

        # Validate start_from_section_id if provided
        if input_data.start_from_section_id:
            section_exists = any(
                section.id == input_data.start_from_section_id
                for section in input_data.workflow.sections
            )
            if not section_exists:
                return func.HttpResponse(
                    body=json.dumps(
                        {
                            "error": f"Section ID '{input_data.start_from_section_id}' not found in workflow"
                        }
                    ),
                    mimetype="application/json",
                    status_code=400,
                )

            logging.info(
                f"Starting workflow from section: {input_data.start_from_section_id}"
            )

        # Start the orchestration
        client = df.DurableOrchestrationClient(starter)
        instance_id = await client.start_new(
            "LessonPlanOrchestrator", None, input_data.model_dump(by_alias=True)
        )

        # Return a response with the instance ID
        return client.create_check_status_response(req, instance_id)

    except Exception as e:
        logging.error(f"Error starting lesson plan generation: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=400,
        )
