import json
import logging
import os
import re
from textwrap import dedent
from typing import Dict, List, Any
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from rag_wrapper.rag_ops.qdrant_rag_ops import QdrantRagOps
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
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
    input_types = {"markdown"}
    output_types = {"index_filter"}
    
    def _split_by_pages(self, content):
        """
        Split the content into pages using delimiters of the form '## Page <number>'.
        Returns a list of strings, one per page.
        """
        # Split on lines starting with '## Page <number>'
        # Handles both start-of-file and anywhere in the file
        pages = re.split(r'^##\s*Page\s*\d+\s*$', content, flags=re.MULTILINE)
        # Remove empty or whitespace-only pages
        return [page.strip() for page in pages if page.strip()]

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
    
    def _get_rag_ops_instance(self, collection_name: str):
        """Get an instance of QdrantRagOps with the specified collection name."""
        return QdrantRagOps(
            url=os.getenv("QDRANT_URL", "http://localhost:6333"),
            collection_name=collection_name,
            emb_llm=self._embedding_llm(),
            completion_llm=self._completion_llm(),
        )

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - create indexes from chapter markdown content.

        Args:
            input_paths: Dictionary with keys:
                - "markdown": Path to the cleaned markdown file
            index_filter: index metadata filter

        Returns:
            StepResult with status and output paths containing the index_filter
        """
        try:
            markdown_file = input_paths["markdown"]
            with open(markdown_file, "r", encoding="utf-8") as file:
                markdown_content = file.read()
            pages = self._split_by_pages(markdown_content)
            
            board = self.config.get("board", "KSEEB")
            medium = self.config.get("medium", "english")
            grade = self.config.get("grade", 6)
            subject = self.config.get("subject", "science")
            chapter_number = self.config.get("chapter_number", 1)
            chapter_id = f"Medium={medium},Grade={grade},Subject={subject},Number={chapter_number}"
    
            rag_ops = self._get_rag_ops_instance(collection_name=board)
            
            async def run_create_index():
                transformations = [
                    MarkdownNodeParser(),
                    SentenceSplitter(chunk_size=1024, chunk_overlap=100)
                ]
                await rag_ops.create_index(
                    text_chunks=pages,
                    metadata={
                        "chapter_id": chapter_id
                    },
                    transformations=transformations
                )

            asyncio.run(run_create_index())
            
            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={
                    "index_filter": {
                        "chapter_id": chapter_id
                    }
                },
                metadata={
                    "grade": grade,
                    "subject": subject,
                    "chapter_number": chapter_number,
                    "chapter_id": chapter_id
                }
            )
        
        except Exception as e:
            logger.error(f"Error processing markdown file {markdown_file}: {e}")
            return StepResult(status=StepStatus.FAILED, error=str(e))
        
        
