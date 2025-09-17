from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.question_paper import (
    QBQuestionDistributionGenerationRequest,
    QBTemplateGenerationRequest,
    QuestionBankPartsGenerationRequest,
    QuestionBankResponse,
    Template,
)
from app.models.chat import ErrorResponse
from app.services.question_paper_service import QUESTION_PAPER_SERVICE_INSTANCE
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/question-paper",
    tags=["Question Paper Generation"],
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Bad Request - Invalid input parameters or configuration",
        },
        404: {"model": ErrorResponse, "description": "Not Found - Resource not found"},
        500: {
            "model": ErrorResponse,
            "description": "Internal Server Error - Generation process failed",
        },
    },
)


@router.post(
    "/by-parts",
    response_model=QuestionBankResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Complete Question Paper by Parts",
    description="""
    **Generate a comprehensive question paper with multiple question types and parts**
    
    This endpoint creates a structured question paper using AI generation based on:
    - Specified question templates and distributions
    - Chapter content and learning outcomes
    - Educational objectives and mark distributions
    - Different question types (MCQ, short answer, long answer, etc.)
    
    **Key Features:**
    - Multi-part question paper generation
    - Template-based question distribution
    - Learning outcome alignment
    - Various question types support (MCQ, Fill blanks, Short/Long answers, Matching)
    - Curriculum-specific content generation
    
    **Question Types Supported:**
    - Multiple Choice Questions (MCQ)
    - Fill in the blanks
    - Short answer questions
    - Long answer questions
    - Matching type questions
    """,
    responses={
        200: {
            "description": "Successfully generated question paper",
            "model": QuestionBankResponse,
            "content": {
                "application/json": {
                    "example": {
                        "metadata": {
                            "user_id": "teacher123",
                            "subject": "Science",
                            "grade": "10",
                            "unit_names": ["Light", "Electricity"],
                            "school_name": "ABC School",
                            "examination_name": "Mid-term Exam",
                        },
                        "questions": [
                            {
                                "type": "MCQ",
                                "number_of_questions": 5,
                                "marks_per_question": 1,
                                "questions": [
                                    {
                                        "question": "What is the speed of light in vacuum?",
                                        "options": [
                                            "3x10^8 m/s",
                                            "3x10^6 m/s",
                                            "3x10^10 m/s",
                                            "3x10^5 m/s",
                                        ],
                                        "answer": "3x10^8 m/s",
                                    }
                                ],
                            }
                        ],
                    }
                }
            },
        },
        400: {
            "description": "Invalid template configuration or missing required fields"
        },
        500: {"description": "Question generation process failed"},
    },
)
async def generate_question_paper_by_parts(
    request: QuestionBankPartsGenerationRequest,
):
    """
    **Generate Complete Question Paper by Parts**

    Creates a comprehensive question paper using AI generation with specified templates,
    learning outcomes, and question distributions across different sections.

    **Request Body:**
    - `user_id`: Unique identifier for the requesting user
    - `board`: Educational board (e.g., NCERT, CBSE, State Board)
    - `medium`: Language medium (English, Hindi, etc.)
    - `grade`: Student grade/class level
    - `subject`: Subject for question generation
    - `chapters`: List of chapters with learning outcomes and subtopics
    - `total_marks`: Total marks for the question paper
    - `template`: Question distribution template specifying types and marks
    - `existing_questions`: Optional list of pre-existing questions to avoid duplication

    **Chapter Structure:**
    Each chapter includes:
    - Title and index path for content retrieval
    - Learning outcomes for curriculum alignment
    - Optional subtopics with specific learning objectives

    **Template Configuration:**
    Defines question types, quantities, and mark distributions:
    - Question type (MCQ, Short Answer, Long Answer, etc.)
    - Number of questions required
    - Marks per question
    - Optional unit-wise distribution

    **AI Generation Process:**
    1. Analyzes chapter content and learning outcomes
    2. Generates questions aligned with educational objectives
    3. Ensures proper difficulty distribution
    4. Validates question quality and uniqueness
    5. Structures output according to template specifications

    **Response Structure:**
    - Metadata with exam and user information
    - Structured questions organized by type and marks
    - Each question formatted according to its type requirements

    **Error Handling:**
    - Validates all required fields and configurations
    - Ensures template consistency with total marks
    - Handles AI generation failures gracefully
    - Provides detailed error information for debugging
    """
    try:
        logger.info(
            f"Processing question paper generation request for user: {request.user_id}"
        )

        response = (
            await QUESTION_PAPER_SERVICE_INSTANCE.generate_question_bank_by_parts(
                request
            )
        )

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


@router.post(
    "/questiondistribution",
    response_model=List[Template],
    status_code=status.HTTP_200_OK,
    summary="Generate Question Distribution Templates",
    description="""
    **Generate optimized question paper templates based on marks and objective distributions**
    
    This endpoint creates intelligent question distribution templates that balance:
    - Unit-wise marks distribution according to curriculum weightage
    - Learning objective distribution (Knowledge, Understanding, Application, Analysis)
    - Question type variety and educational best practices
    - Total marks and examination time constraints
    
    **Key Features:**
    - Automatic template generation based on educational parameters
    - Balanced distribution across units and objectives
    - Multiple question type recommendations
    - Curriculum alignment and educational standards compliance
    """,
    responses={
        200: {
            "description": "Successfully generated question distribution templates",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "type": "MCQ",
                            "number_of_questions": 10,
                            "marks_per_question": 1,
                            "description": "These questions provide exactly four options...",
                            "question_distribution": [
                                {"unit_name": "Light", "objective": "Knowledge"},
                                {
                                    "unit_name": "Electricity",
                                    "objective": "Understanding",
                                },
                            ],
                        }
                    ]
                }
            },
        },
        400: {"description": "Invalid distribution parameters or configuration"},
        500: {"description": "Template generation process failed"},
    },
)
async def get_question_distribution(
    request: QBQuestionDistributionGenerationRequest,
) -> List[Template]:
    """
    **Generate Question Distribution Templates**

    Creates optimized question paper templates based on specified marks distribution,
    objective distribution, and educational parameters.

    **Request Body:**
    - `user_id`: Unique identifier for the requesting user
    - `board`: Educational board (NCERT, CBSE, etc.)
    - `medium`: Language medium
    - `grade`: Student grade level
    - `subject`: Subject for template generation
    - `chapters`: List of chapters with learning outcomes
    - `total_marks`: Total marks for the question paper
    - `marks_distribution`: Unit-wise marks allocation with percentages
    - `objective_distribution`: Learning objective distribution (Knowledge, Understanding, etc.)
    - `template`: Base template for question types and structure

    **Distribution Logic:**
    1. **Marks Distribution**: Allocates questions across units based on specified percentages
    2. **Objective Distribution**: Balances cognitive levels (Bloom's taxonomy)
    3. **Question Type Optimization**: Recommends appropriate question types for objectives
    4. **Curriculum Alignment**: Ensures compliance with educational standards

    **Response:**
    Returns a list of optimized templates with:
    - Question type and format specifications
    - Number of questions and marks per question
    - Unit-wise and objective-wise distribution mapping
    - Educational descriptions for each question type

    **Educational Objectives Supported:**
    - **Knowledge**: Recall of facts, terms, concepts
    - **Understanding**: Comprehension and interpretation
    - **Application**: Using knowledge in new situations
    - **Analysis**: Breaking down complex information
    - **Synthesis**: Combining elements to form new patterns
    - **Evaluation**: Making judgments based on criteria

    **Error Handling:**
    - Validates distribution percentages sum to 100%
    - Ensures marks distribution aligns with total marks
    - Verifies chapter information completeness
    - Handles generation process failures gracefully
    """
    try:
        response = await QUESTION_PAPER_SERVICE_INSTANCE.get_question_distribution(
            request
        )
        return response
    except Exception as ex:
        logger.exception(f"Unexpected error occurred: {str(ex)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@router.post(
    "/template",
    response_model=List[Template],
    status_code=status.HTTP_200_OK,
    summary="Generate Question Paper Templates (Static)",
    description="""
    **Generate static question paper templates based on predefined configurations**
    
    This endpoint provides pre-configured question paper templates without AI generation.
    It's designed for quick template retrieval based on standard educational formats
    and curriculum requirements.
    
    **Key Features:**
    - Fast template generation from predefined configurations
    - Standard educational format compliance
    - Unit-wise marks distribution support
    - Multiple question type templates
    - Curriculum-aligned template structures
    
    **Use Cases:**
    - Quick template prototyping
    - Standard examination formats
    - Template validation and testing
    - Educational format reference
    """,
    responses={
        200: {
            "description": "Successfully generated static templates",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "type": "MCQ",
                            "number_of_questions": 5,
                            "marks_per_question": 1,
                            "description": "These questions provide exactly four options...",
                            "question_distribution": None,
                        },
                        {
                            "type": "ANSWER_SHORT",
                            "number_of_questions": 3,
                            "marks_per_question": 3,
                            "description": "Short answer questions require a concise yet complete response...",
                            "question_distribution": None,
                        },
                    ]
                }
            },
        },
        400: {"description": "Invalid template configuration"},
        500: {"description": "Template generation failed"},
    },
)
async def get_question_paper_template_v2(
    request: QBTemplateGenerationRequest,
) -> List[Template]:
    """
    **Generate Static Question Paper Templates**

    Provides predefined question paper templates based on standard educational
    configurations and curriculum requirements.

    **Request Body:**
    - Standard template generation request parameters
    - Configuration for question types and distributions
    - Educational format specifications

    **Template Generation:**
    - Uses predefined template configurations
    - Applies standard educational formats
    - Ensures curriculum compliance
    - Provides immediate template response

    **Template Features:**
    - **Quick Generation**: No AI processing required
    - **Standard Formats**: Based on common educational patterns
    - **Flexible Configuration**: Customizable question types and marks
    - **Validation Ready**: Pre-validated template structures

    **Question Type Templates:**
    - Multiple Choice Questions (MCQ)
    - Fill in the blanks
    - Short answer questions (2-3 sentences)
    - Long answer questions (4-5 sentences)
    - General answer questions
    - Matching type questions

    **Response:**
    Returns a list of template objects with:
    - Question type specifications
    - Number of questions and marks allocation
    - Educational descriptions for each type
    - Ready-to-use template structures

    **Error Handling:**
    - Validates template configuration parameters
    - Ensures proper question type specifications
    - Handles configuration errors gracefully
    - Provides detailed error information for debugging

    **Performance:**
    - Fast response time (no AI generation)
    - Minimal processing overhead
    - Suitable for high-frequency template requests
    - Reliable template structure consistency
    """
    try:
        return request.get_template()
    except ValueError as e:
        logger.exception(
            f"Configuration error in question paper template generation: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuration error: {str(e)}",
        )
    except Exception as e:
        logger.exception(f"Error processing question paper template generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate question paper template",
        )
