import os
import logging
from pathlib import Path
import time
from typing import Dict, List
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Import the OlmocrTextExtractor from the olmocr_extractor package
from olmocr_extractor import OlmocrTextExtractor

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True,
)
logger = logging.getLogger(__name__)


class TextExtractionOLMOcrStep(BasePipelineStep):
    """Extract text from a single PDF file using OlmocrTextExtractor."""

    name = "text_extraction"
    description = "Extract text from a PDF file"
    input_types = {"pdf"}
    output_types = {"markdown"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - extract text from a single PDF file.

        Args:
            input_paths: Dictionary with "pdf" key mapping to PDF file path
            output_dir: Directory where extracted text will be saved

        Returns:
            StepResult with status and output paths
        """
        pdf_path = input_paths["pdf"]

        try:
            logger.info(f"Processing {pdf_path}")
            output_filename = os.path.basename(pdf_path).replace(".pdf", ".md")
            output_path = os.path.join(output_dir, output_filename)
            start_time = time.time()

            # Initialize the OlmocrTextExtractor
            extractor = OlmocrTextExtractor()
            logger.info(f"Initialized OlmocrTextExtractor")

            # Get all_pages configuration
            all_pages = self.config.get("all_pages", True)

            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)
            logger.info(f"Output directory: {output_dir}")

            try:
                # Extract text from the PDF
                extracted_text = extractor.extract_text(pdf_path, all_pages=all_pages)

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
                    output_paths={"markdown": output_path},
                    metadata={"extraction_time_seconds": elapsed_time},
                )

            except Exception as e:
                logger.error(f"Error processing {pdf_path}: {str(e)}")
                return StepResult(
                    status=StepStatus.FAILED,
                    error=e,
                    metadata={"extraction_time_seconds": time.time() - start_time},
                )

        except Exception as e:
            logger.exception(f"Error in text extraction step: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
