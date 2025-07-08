import json
import logging
from typing import Dict, Union
from openai import AsyncAzureOpenAI
from core.config import Config

from core.models.workflow_models import GPTInput


class GPTAgent:
    """
    Enhanced GPT agent that makes a direct completion call to Azure OpenAI API.
    This implementation is designed to work with Azure Durable Functions.
    """

    SYSTEM_PROMPT = """
    You are LessonPlanGPT, an AI tutor specialized in generating lesson-plan segments for real classroom use. When processing any segment-specific prompt, follow these guidelines:

    1. **Purpose & Audience**  
    • Create student-appropriate content that teachers can deliver directly in K–12 classrooms.  
    • Focus on enhancing students’ understanding and comprehension of the topics specified in the segment prompt.

    2. **Tone & Style**  
    • Use simple, clear language that engages school-age learners.  
    • Maintain an encouraging, respectful, and motivating voice—avoid jargon and overly technical phrasing.

    3. **Accuracy & Placeholders**  
    • Do not invent or hallucinate details—if the prompt refers to figures, diagrams, vocabulary, or data, use placeholders exactly as provided.  
    • Ensure all content is factually consistent and directly relevant to the topic in the prompt.

    4. **Clarity & Conciseness**  
    • Keep each sentence focused and actionable.  
    • Respect any sentence or paragraph length requirements specified in the prompt.
    • Ensure coherence, avoid repetition, and prioritize clear comprehension for students.    
    """

    def __init__(self):
        self.client = AsyncAzureOpenAI(
            azure_endpoint=Config.AZURE_OPENAI_API_BASE,
            api_key=Config.AZURE_OPENAI_API_KEY,
            api_version=Config.AZURE_OPENAI_API_VERSION,
        )

    async def generate_section(self, gpt_input: GPTInput) -> Union[str, Dict]:
        """
        Generate a section using direct calls to Azure OpenAI API

        Args:
            gpt_input: The input for GPT-based generation

        Returns:
            The generated section output
        """
        prompt = gpt_input.prompt

        # Make the completion call to OpenAI
        response = await self.client.chat.completions.create(
            model=Config.AZURE_OPENAI_MODEL,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
        )

        # Extract content from response
        content_text = response.choices[0].message.content.strip()

        # Parse content if JSON format is required
        try:
            content = json.loads(content_text.strip("```json").strip("```"))
        except Exception as e:
            logging.warning(f"Failed to parse RAG agent response as JSON: {str(e)}")
            content = content_text

        return content
