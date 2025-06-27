import json
import logging
import os
from textwrap import dedent
from typing import Dict, List, Any
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from rag_wrapper.rag_ops.in_mem_rag_ops import InMemRagOps
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus
import asyncio

load_dotenv(".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class CreateIndexStep(BasePipelineStep):
    """Extract subtopic-wise learning outcomes from a chapter markdown file."""

    name = "create_index"
    description = "Create Index for chapter markdown file"
    input_types = {"cleaned_markdown"}
    output_types = {"index_path"}
    
    def _get_page_wise_strings(self, markdown_path):
        page_strings = []
        current_lines = []

        with open(markdown_path, 'r', encoding='utf-8') as file:
            for line in file:
                if line.strip().startswith('--- Page'):
                    if current_lines:
                        page_strings.append(''.join(current_lines).strip())
                        current_lines = []
                else:
                    current_lines.append(line)
            # Append the last page content
            if current_lines:
                page_strings.append(''.join(current_lines).strip())

        return page_strings

    
    def _embedding_llm(self):
        """Initialize Azure OpenAI embedding model"""
        return AzureOpenAIEmbedding(
            model=os.getenv("AZURE_OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002"),
            deployment_name=os.getenv(
                "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002"
            ),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
        )


    def _completion_llm(self):
        """Initialize Azure OpenAI completion model"""
        return AzureOpenAI(
            model=os.getenv("AZURE_OPENAI_MODEL", "gpt-35-turbo"),
            deployment_name=os.getenv("AZURE_OPENAI_MODEL", "gpt-35-turbo"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
        )

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - create indexes from chapter markdown content.

        Args:
            input_paths: Dictionary with keys:
                - "cleaned_markdown": Path to the cleaned markdown file
            output_dir: Directory where the index will be saved

        Returns:
            StepResult with status and output paths containing the index_path
        """
        try:
            markdown_file = input_paths["cleaned_markdown"]
            pages = self._get_page_wise_strings(markdown_file)
            grade = self.config.get("grade")
            subject = self.config.get("subject")
            chapter_number = self.config.get("chapter_number")
            index_path = os.path.join(output_dir, grade, subject, chapter_number)
            rag_ops = InMemRagOps(
                index_path=index_path,
                emb_llm=self._embedding_llm(),
                completion_llm=self._completion_llm(),
            )
            
            async def run_create_index():
                await rag_ops.create_index(
                    text_chunks=pages,
                    metadata={
                        "grade": grade,
                        "subject": subject,
                        "chapter_number": chapter_number,
                    }
                )

            asyncio.run(run_create_index())
            
            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={
                    "index_path": index_path
                },
                metadata={
                    "grade": grade,
                    "subject": subject,
                    "chapter_number": chapter_number,
                }
            )
        
        except Exception as e:
            logger.error(f"Error processing markdown file {markdown_file}: {e}")
            return StepResult(status=StepStatus.FAILED, error=str(e))
            return StepResult(status=StepStatus.FAILED, error=str(e))
        
        
