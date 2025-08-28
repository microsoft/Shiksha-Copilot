from textwrap import dedent
from typing import Dict, Any, List
import json
from openai import AzureOpenAI

from core.config import Config
from core.models.workflow_models import SectionOutput
from core.logger import LoggerFactory


class ValidatorAgent:
    """
    Enhanced Validator agent that validates the final lesson plan.
    This implementation is designed to work with Azure Durable Functions.
    """

    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_key=Config.AZURE_OPENAI_API_KEY,
            api_version=Config.AZURE_OPENAI_API_VERSION,
        )
        self.logger = LoggerFactory.get_agent_logger("ValidatorAgent")

    def validate_lesson_plan(
        self,
        workflow_definition: Dict[str, Any],
        sections_output: List[SectionOutput],
    ) -> Dict[str, Any]:
        """
        Validate the generated lesson plan

        Args:
            workflow_definition: The workflow definition
            sections_output: The generated sections

        Returns:
            The validation result
        """
        try:
            self.logger.info("Validating lesson plan")

            sections_str = "\n----------------\n".join(
                [
                    f"Section ID: {section.section_id}\nSection Title: {section.section_title}\nContent: {json.dumps(section.content)}"
                    for section in sections_output
                ]
            )

            # Prepare the validation prompt
            validation_prompt = f"""
                I need you to validate this lesson plan against its workflow definition.
                
                Workflow Definition:
                ```json
                {dedent(json.dumps(workflow_definition))}
                ```
                
                Generated Sections:
                ```
                {dedent(sections_str)}
                ```
                
                Validate the following:
                1. All required sections are present
                2. Each section matches its description and requirements
                3. The format of each section is correct (plain text or JSON as required)
                4. The content is coherent and follows educational standards
                
                Return a JSON object with the validation result:
                {{
                    "is_valid": true/false,
                    "errors": ["error1", "error2", ...],
                    "warnings": ["warning1", "warning2", ...],
                    "suggestions": ["suggestion1", "suggestion2", ...]
                }}
            """

            self.logger.info(
                "Prompt for validation agent: \n%s", dedent(validation_prompt)
            )
            # Make the completion call to OpenAI
            response = self.client.chat.completions.create(
                model=Config.AZURE_OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert validator for educational content and lesson plans.",
                    },
                    {"role": "user", "content": dedent(validation_prompt)},
                ],
                temperature=0,
            )

            # Extract content from response
            content_text = response.choices[0].message.content.strip()

            # Parse the JSON validation result
            try:
                # Find JSON object in the response
                json_start = content_text.find("{")
                json_end = content_text.rfind("}") + 1
                if json_start == -1 or json_end == -1:
                    raise ValueError("JSON object not found in response")

                validation_result = json.loads(content_text[json_start:json_end])
                return validation_result

            except Exception as e:
                self.logger.error(f"Error parsing validation result: {str(e)}")
                return {
                    "is_valid": False,
                    "errors": [f"Error parsing validation result: {str(e)}"],
                    "warnings": [],
                    "suggestions": ["Review the lesson plan manually"],
                }

        except Exception as e:
            self.logger.error(f"Error in validator agent: {str(e)}")
            return {
                "is_valid": False,
                "errors": [f"Error in validator agent: {str(e)}"],
                "warnings": [],
                "suggestions": ["Review the lesson plan manually"],
            }
