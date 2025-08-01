import os
import logging
from pathlib import Path
import time
from typing import Dict, List

from dotenv import load_dotenv
from ingestion_pipeline.text_extractors.llm_extractor import LLMTextExtractor
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True,
)
logger = logging.getLogger(__name__)

load_dotenv(".env")


def azure_openai_credentials():
    """Returns credentials for connecting to Azure OpenAI service."""
    return {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }


class KarnatakaLBATextExtractionLLMStep(BasePipelineStep):
    """Extract text from a PDF file using LLM-based extractor."""

    name = "karnataka_lba_text_extraction_llm"
    description = "Extract text from PDF using LLM-based extractor"
    input_types = {"pdf"}
    output_types = {"lba_markdown"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """Process the step - extract text from PDF using LLM-based extractor."""
        pdf_path = input_paths["pdf"]
        output_filename = os.path.basename(pdf_path).replace(".pdf", ".md")
        output_path = os.path.join(output_dir, output_filename)

        try:
            logger.info(f"Processing {pdf_path}")
            start_time = time.time()

            # Get credentials
            credentials = azure_openai_credentials()

            # Initialize the LLMTextExtractor
            extractor = LLMTextExtractor(**credentials)
            logger.info(f"Initialized LLMTextExtractor")

            # Extract text from the PDF
            extracted_text = extractor.extract_text(pdf_path)

            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)

            # Save the extracted text to a markdown file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(extracted_text)

            elapsed_time = time.time() - start_time
            logger.info(
                f"Completed extracting {pdf_path} in {elapsed_time:.2f} seconds"
            )
            logger.info(f"Saved output to: {output_path}")

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"lba_markdown": output_path},
                metadata={"extraction_time_seconds": elapsed_time},
            )

        except Exception as e:
            logger.exception(f"Error extracting text: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
