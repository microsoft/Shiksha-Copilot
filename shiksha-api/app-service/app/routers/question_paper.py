from fastapi import APIRouter, Depends, HTTPException, status
from app.models.question_paper import (
    QuestionBankPartsGenerationRequest,
    QuestionBankResponse,
)
from app.models.chat import ErrorResponse
from app.services.question_paper_service import QuestionPaperService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/question-paper",
    tags=["question-paper"],
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)

question_paper_service = QuestionPaperService()


@router.post(
    "/by-parts",
    response_model=QuestionBankResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate question paper by parts",
    description="Generate questions for a question paper with specified template distributions and learning outcomes",
)
async def generate_question_paper_by_parts(
    request: QuestionBankPartsGenerationRequest,
):
    """
    Generate question paper by parts endpoint.

    Processes question generation requests using AI with specified templates,
    learning outcomes, and question distributions across different parts/sections.
    """
    try:
        logger.info(
            f"Processing question paper generation request for user: {request.user_id}"
        )

        response = await question_paper_service.generate_question_bank_by_parts(request)

        logger.info(
            f"Successfully generated question paper for user: {request.user_id}\nResponse: {response.model_dump_json(indent=2)}"
        )

        return response

    except ValueError as e:
        logger.error(f"Configuration error in question paper generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error processing question paper generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate question paper",
        )
