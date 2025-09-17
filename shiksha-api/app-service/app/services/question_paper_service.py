import os
import json
import yaml
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.core.llms import ChatMessage
from app.models.question_paper import (
    QuestionBankPartsGenerationRequest,
    QuestionBankResponse,
    QuestionBankMetadata,
    QuestionTypeResponse,
    QuestionType,
)
from app.config import settings

logger = logging.getLogger(__name__)


class QuestionPaperService:
    """Service for handling question paper generation using Azure OpenAI."""

    def __init__(self):
        # Initialize Azure OpenAI completion model
        self.completion_llm = AzureOpenAI(
            model=settings.azure_openai_deployment_name,
            deployment_name=settings.azure_openai_deployment_name,
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )

        # Load YAML prompts
        self.prompt_dir = Path(__file__).parent.parent.parent / "prompts"
        self.prompts = self._load_prompts()

        # Set deployment names (these should be in config/env)
        self.gpt_deployment = getattr(
            settings, "azure_gpt4o_deployment", settings.azure_openai_deployment_name
        )
        self.embed_deployment = getattr(
            settings, "azure_embedding_deployment", settings.azure_openai_embed_model
        )
        self.max_questions_per_slot = 20

    def _load_prompts(self) -> Dict[str, Any]:
        """Load prompts from YAML files."""
        # Load question paper prompts
        qp_prompts_path = self.prompt_dir / "question_paper_prompts.yaml"
        blooms_path = self.prompt_dir / "blooms_taxonomy.yaml"
        english_grammar_path = self.prompt_dir / "english_grammar_topics.yaml"

        prompts = {}

        try:
            with open(qp_prompts_path, "r", encoding="utf-8") as f:
                qp_data = yaml.safe_load(f)
                prompts.update(qp_data)

            with open(blooms_path, "r", encoding="utf-8") as f:
                blooms_data = yaml.safe_load(f)
                prompts.update(blooms_data)

            with open(english_grammar_path, "r", encoding="utf-8") as f:
                grammar_data = yaml.safe_load(f)
                prompts.update(grammar_data)

            logger.info("Successfully loaded prompt templates")
            return prompts

        except Exception as e:
            logger.error(f"Error loading prompt templates: {e}")
            raise ValueError(f"Failed to load prompt templates: {e}")

    def _flatten_existing_questions(
        self, existing: List[QuestionTypeResponse]
    ) -> List[str]:
        """Extract question text from existing questions for uniqueness checking."""
        questions = []
        for qtr in existing:
            for q in qtr.questions:
                if hasattr(q, "question") and q.question:
                    questions.append(q.question)
                elif hasattr(q, "value1") and hasattr(q, "value2"):
                    # For matching questions
                    questions.append(f"{q.value1} :: {q.value2}")
        return [q for q in questions if q]

    def _get_grammar_topics(self, request: QuestionBankPartsGenerationRequest) -> str:
        """
        Reads the NCERT grammar topics YAML and returns a dict
        mapping grade (int) to list of topics (list of str).
        """
        if "english" in request.subject.lower():
            # The YAML top‐level key is 'ncert_grammar_topics'
            topics = self.prompts.get("grammar_topics", {})

            # Ensure all grade keys are ints (PyYAML may load them as ints already)
            topic_map = {int(grade): topic_list for grade, topic_list in topics.items()}

            return (
                "⚠ **GRAMMAR FOCUS REQUIREMENT**: For English subject only, include grammar-related questions drawn from each unit’s content."
                + "\nCover following topics: "
                + "; ".join(topic_map[request.grade])
                if request.grade in topic_map
                else ""
            )

        return ""

    def _build_generation_slots(
        self, request: QuestionBankPartsGenerationRequest
    ) -> List[Dict[str, Any]]:
        """Build generation slots from template distributions, grouped by unit with max 20 questions per slot."""
        units_dict = self._get_unit_los_dict(request)

        # Group questions by unit_name first
        unit_questions = {}

        for template in request.template:
            if (
                template.question_distribution
                and len(template.question_distribution) > 0
            ):
                # Use specified distribution
                for dist in template.question_distribution:
                    unit_los = units_dict.get(dist.unit_name)
                    if unit_los is None:
                        raise ValueError(
                            f"Unit Name `{dist.unit_name}` is not present in the `chapters` attribute in request"
                        )

                    question_info = {
                        "type": template.type,
                        "objective": dist.objective,
                        "marks_per_question": template.marks_per_question,
                        "schema_hint": template.type.schema_dict(),
                    }

                    if dist.unit_name not in unit_questions:
                        unit_questions[dist.unit_name] = []
                    unit_questions[dist.unit_name].append(question_info)
            else:
                raise ValueError("Question Distribution should be defined")

        # Create slots with max 20 questions per slot
        slots = []

        for unit_name, questions in unit_questions.items():
            # Split questions into batches of max 20
            unit_los = units_dict.get(unit_name)
            for i in range(0, len(questions), self.max_questions_per_slot):
                batch = questions[i : i + self.max_questions_per_slot]
                slots.append(
                    {
                        "unit_name": unit_name,
                        "learning_outcomes": unit_los,  # Same for all questions in unit
                        "questions": batch,
                    }
                )

        return slots

    def _get_unit_los_dict(
        self,
        request: QuestionBankPartsGenerationRequest,
    ) -> str:
        is_subtopic_level = len(request.chapters) == 1

        # Subtopic level Question papers will have only ONE chapter
        units_dict = (
            {
                subtopic.title: subtopic.learning_outcomes
                for subtopic in request.chapters[0].subtopics
            }
            if is_subtopic_level
            else {
                chapter.title: chapter.learning_outcomes for chapter in request.chapters
            }
        )
        return units_dict

    def _format_system_prompt(
        self,
        request: QuestionBankPartsGenerationRequest,
        existing_questions: List[str],
        slot: Dict[str, Any],
    ) -> str:
        """Format the system prompt using YAML templates for a specific unit slot."""
        try:
            # Get the main template
            template = self.prompts.get("question_bank_parts_gen", "")

            # Get unit-specific information from the slot
            unit_name = slot["unit_name"]
            learning_outcomes = slot["learning_outcomes"]

            # Get Bloom's taxonomy guide
            blooms_guide = self.prompts.get("blooms-taxonomy", {}).get("general", "")
            if "english" in request.subject.lower():
                blooms_guide = self.prompts.get("blooms-taxonomy", {}).get(
                    "english", ""
                )

            # Format learning outcomes for this specific unit
            unit_los_text = f"{unit_name}:\n" + "\n".join(
                [f"- {lo}" for lo in learning_outcomes]
            )

            # Format the prompt for this specific unit
            formatted_prompt = template.format(
                BOARD=request.board,
                MEDIUM=request.medium,
                GRADE=request.grade,
                SUBJECT=request.subject,
                TOTAL_MARKS=request.total_marks,
                CHAPTERS=unit_name,  # Single unit for this batch
                UNIT_WISE_LEARNING_OUTCOMES=unit_los_text,
                EXISTING_QUESTIONS_JSON=json.dumps(
                    existing_questions, ensure_ascii=False
                ),
                QUESTION_BANK_BLOOM_TAXONOMY_GUIDE=blooms_guide,
                GRAMMAR_TOPICS=self._get_grammar_topics(request),
            )

            return formatted_prompt

        except Exception as e:
            logger.error(f"Error formatting system prompt: {e}")
            raise ValueError(f"Failed to format system prompt: {e}")

    def _get_format_instruction_for_type(self, qtype: QuestionType) -> str:
        """Generate format instruction for a specific question type."""
        return f"- For {qtype}: {qtype.description}. Use format: {qtype.schema_dict()}"

    def _generate_questions_batch(
        self, system_prompt: str, slot: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate questions for a batch of slots."""
        try:
            # Build slot directives from the new slot structure
            slot_questions = slot["questions"]

            # Generate dynamic format rules from QuestionType enum
            unique_types = set(q["type"] for q in slot_questions)
            format_rules = [
                self._get_format_instruction_for_type(qtype) for qtype in unique_types
            ]
            format_rules_text = "\n".join(format_rules)

            user_message = (
                "Generate questions for the following slots in a SINGLE JSON object with an `items` array. "
                "For each slot, return exactly ONE object with the following fields:\n "
                "`unit_name`, `type`, `objective`, `marks_per_question` and `item`\n"
                "`item` field should adhere to the question's `schema_hint`.\n\n"
                "Format rules by question type:\n"
                f"{format_rules_text}\n"
                f"Question slots:\n{json.dumps(slot_questions, ensure_ascii=False)}"
            )

            # Convert to ChatMessage format for llama_index
            messages = [
                ChatMessage(role="system", content=system_prompt),
                ChatMessage(role="user", content=user_message),
            ]

            # Use llama_index completion model
            response = self.completion_llm.chat(
                messages=messages,
                temperature=0.6,
            )

            content = response.message.content
            content = content.strip("```json").strip("```")

            # Parse response
            response_data = json.loads(content)

            items = response_data.get("items")

            if not items:
                logger.warning("No items found in completion response")
                return []

            return items

        except Exception as e:
            logger.exception(f"Error in batch generation: {e}")
            return []

    async def _generate_questions_batch_async(
        self, system_prompt: str, slot: Dict[str, Any], delay_seconds: int = 0
    ) -> List[Dict[str, Any]]:
        """Async version of _generate_questions_batch with optional delay."""
        # Apply delay if specified
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

        # Run the synchronous method in a thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._generate_questions_batch, system_prompt, slot
        )

    def _organize_questions_into_response(
        self,
        request: QuestionBankPartsGenerationRequest,
        all_generated: List[Dict[str, Any]],
    ) -> List[QuestionTypeResponse]:
        """Organize all generated questions into the final response structure."""
        try:
            # Create a question directory to organize questions by their specification
            question_directory = {}

            # Organize generated questions by (type, marks, unit_name, objective)
            for i, generated in enumerate(all_generated):
                qtype = QuestionType(generated.get("type"))
                unit_name = generated.get("unit_name")
                objective = generated.get("objective")
                marks_per_question = generated.get("marks_per_question")
                item = generated.get("item")

                key = (qtype, marks_per_question, unit_name, objective)
                if key not in question_directory:
                    question_directory[key] = []

                question_directory[key].append(qtype.cast(item))

            # Build the final response structure following the original template order
            response_questions = []
            for template in request.template:
                question_type_resp = QuestionTypeResponse(
                    type=template.type,
                    number_of_questions=(
                        len(template.question_distribution)
                        if template.question_distribution
                        else template.number_of_questions
                    ),
                    marks_per_question=template.marks_per_question,
                    questions=[],
                )

                # Add questions in the order specified by question_distribution
                for q_dist in template.question_distribution or []:
                    key = (
                        template.type,
                        template.marks_per_question,
                        q_dist.unit_name,
                        q_dist.objective,
                    )

                    if key in question_directory and len(question_directory[key]) > 0:
                        question = question_directory[key].pop(0)
                        question_type_resp.questions.append(question)

                        # Clean up empty entries
                        if len(question_directory[key]) == 0:
                            del question_directory[key]
                    else:
                        logger.warning(f"No question found for key: {key}")

                response_questions.append(question_type_resp)

            return response_questions

        except Exception as e:
            logger.exception(f"Error organizing questions into response: {e}")
            raise

    async def generate_question_bank_by_parts(
        self, request: QuestionBankPartsGenerationRequest
    ) -> QuestionBankResponse:
        """Generate question bank by parts using parallel processing with delays."""
        try:
            # Build generation slots
            slots = self._build_generation_slots(request)
            if not slots:
                raise ValueError(
                    "No generation slots could be built from template/distribution."
                )

            # Prepare existing questions for reference (but no uniqueness checking)
            existing_flat = self._flatten_existing_questions(request.existing_questions)

            # Process in parallel batches of 3 with 2-second delays
            all_generated = []
            batch_size = 3

            # Process slots in batches of 3
            for i in range(0, len(slots), batch_size):
                batch_slots = slots[i : i + batch_size]

                # Create tasks for parallel execution with delays
                tasks = []
                for j, slot in enumerate(batch_slots):
                    # Generate unit-specific system prompt for this slot
                    system_prompt = self._format_system_prompt(
                        request, existing_flat, slot
                    )

                    # Create task with delay
                    task = self._generate_questions_batch_async(
                        system_prompt, slot, j * 2
                    )  # 2-second delay between each
                    tasks.append(task)

                # Wait for all tasks in the current batch to complete
                batch_results = await asyncio.gather(*tasks)

                # Add all generated questions from this batch
                for raw_items in batch_results:
                    if raw_items:
                        all_generated.extend(raw_items)

            # Organize all generated questions into the final response structure
            response_questions = self._organize_questions_into_response(
                request, all_generated
            )

            return QuestionBankResponse(
                metadata=QuestionBankMetadata(
                    user_id=request.user_id,
                    subject=request.subject,
                    grade=str(request.grade),
                    unit_names=[c.title for c in request.chapters],
                    school_name="",
                    examination_name="",
                ),
                questions=response_questions,
            )

        except Exception as e:
            logger.error(f"Error in generate_question_bank_by_parts: {e}")
            raise
