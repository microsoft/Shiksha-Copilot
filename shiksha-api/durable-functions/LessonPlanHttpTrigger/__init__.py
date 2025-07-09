from datetime import datetime
import json
import logging
import azure.functions as func
import azure.durable_functions as df

from core.models.requests import LessonPlanGenerationInput
from core.models.status_webhook import GenStatus, StatusEnum, WebhookPoster


async def main(
    req: func.HttpRequest,
    starter: str,
) -> func.HttpResponse:
    """
    HTTP endpoint for generating a lesson plan.

    This function handles both asynchronous lesson plan generation (default mode)
    and synchronous checklist generation (when 'checklist' route parameter is provided).
    For asynchronous requests, it starts a durable orchestration and returns status tracking info.

    Args:
        req: The HTTP request containing the lesson plan generation parameters in JSON format
        starter: The durable orchestration client binding used to start new orchestrations
        checklist: Optional path parameter to indicate if this is a synchronous checklist request
                  When set to "checklist", the function will wait for completion and return results directly

    Returns:
        An HTTP response with:
        - For regular mode: orchestration instance ID and status query URI (202 Accepted)
        - For checklist mode: the complete generated result (200 OK) or timeout response
        - For errors: appropriate error message (400 Bad Request)
    """
    logging.info(
        "Python HTTP trigger function processed a request to generate a lesson plan."
    )

    try:
        subpath = req.route_params.get("subpath")
        if subpath == "checklist":
            return await generate_checklist(req, starter)
        else:
            input_data = LessonPlanGenerationInput.model_validate(req.get_json())
            # Start the orchestration asynchronously for regular mode
            client = df.DurableOrchestrationClient(starter)
            instance_id = await client.start_new(
                "LessonPlanOrchestrator", None, input_data.model_dump(by_alias=True)
            )

            # Post initial status to webhook
            webhook_poster = WebhookPoster()
            gen_status = GenStatus(
                instance_id=instance_id,
                status=StatusEnum.PENDING.value,
                timestamp=datetime.now().isoformat(),
                input=input_data.model_dump(by_alias=True),
            )
            await webhook_poster.post_status(gen_status)

            # Create a check status response
            status_response = client.create_check_status_response(req, instance_id)
            status_response_body = json.loads(status_response.get_body().decode())
            status_query_get_uri = status_response_body.get("statusQueryGetUri")

            response_body = json.dumps(
                {
                    "instance_id": instance_id,
                    "status_query_get_uri": status_query_get_uri,
                }
            )

            return func.HttpResponse(
                response_body,
                status_code=status_response.status_code,
                mimetype="application/json",
            )

    except Exception as e:
        logging.error(f"Error starting lesson plan generation: {str(e)}")
        return func.HttpResponse(
            body=json.dumps({"error": str(e)}),
            mimetype="application/json",
            status_code=400,
        )


async def generate_checklist(req: func.HttpRequest, starter: str) -> func.HttpResponse:
    """
    Handles synchronous checklist generation requests by waiting for completion.

    This function validates the required start_from_section_id parameter, starts
    the orchestration, and waits for the result with a timeout before returning.

    Args:
        req: The HTTP request containing the lesson plan generation parameters in JSON format
        starter: The durable orchestration client binding used to start new orchestrations

    Returns:
        An HTTP response with:
        - The complete generated result if completed within timeout (200 OK)
        - A check status response if operation times out
        - An error message if validation fails (400 Bad Request)
    """
    input_data = LessonPlanGenerationInput.model_validate(req.get_json())
    if not input_data.start_from_section_id:
        return func.HttpResponse(
            body=json.dumps(
                {"error": "start_from_section_id is required for checklist mode"}
            ),
            mimetype="application/json",
            status_code=400,
        )

    # Validate start_from_section_id
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
        f"Starting workflow from section (sync mode): {input_data.start_from_section_id}"
    )

    # Use synchronous execution for checklist route
    client = df.DurableOrchestrationClient(starter)
    instance_id = await client.start_new(
        "LessonPlanOrchestrator", None, input_data.model_dump(by_alias=True)
    )

    # Wait for the orchestration to complete
    result = await client.wait_for_completion_or_create_check_status_response(
        req, instance_id, timeout_in_milliseconds=300000  # 5 minute timeout
    )
    return result
