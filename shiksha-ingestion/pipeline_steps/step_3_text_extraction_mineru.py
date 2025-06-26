import os
import logging
from pathlib import Path
import time
from typing import Dict, List, Any, Optional

# Import required classes
from mineru_extractor import MinerUTextExtractor
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True,
)
logger = logging.getLogger(__name__)


class TextExtractionMineruStep(BasePipelineStep):
    """Extract text from a PDF file using MinerU extractor."""

    name = "text_extraction_mineru"
    description = "Extract text from PDF using MinerU extractor"
    input_types = {"pdf"}
    output_types = {"markdown", "images_dir"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - extract text from PDF using MinerU extractor.

        Args:
            input_paths: Dictionary with "pdf" key mapping to PDF file path
            output_dir: Directory where extracted text will be saved

        Returns:
            StepResult with status and output paths
        """
        pdf_path = input_paths["pdf"]
        output_filename = os.path.basename(pdf_path).replace(".pdf", ".md")
        output_path = os.path.join(output_dir, output_filename)
        images_output_dir = os.path.join(output_dir, Path(pdf_path).stem)

        try:
            logger.info(f"Processing {pdf_path}")
            start_time = time.time()

            # Initialize the MinerUTextExtractor
            extractor = MinerUTextExtractor()
            logger.info(f"Initialized MinerUTextExtractor")

            # Create output directories
            os.makedirs(output_dir, exist_ok=True)
            os.makedirs(images_output_dir, exist_ok=True)

            # Extract text and images from the PDF
            extracted_text = extractor.extract_text(
                pdf_path,
                image_dir=images_output_dir,
                ocr=self.config.get("use_ocr", True),
            )

            # Save the extracted text to a markdown file
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(extracted_text)

            elapsed_time = time.time() - start_time
            logger.info(
                f"Completed extracting {pdf_path} in {elapsed_time:.2f} seconds"
            )
            logger.info(f"Saved text to: {output_path}")
            logger.info(f"Saved images to: {images_output_dir}")

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"markdown": output_path, "images_dir": images_output_dir},
                metadata={
                    "extraction_time_seconds": elapsed_time,
                    "extractor": "mineru",
                },
            )

        except Exception as e:
            logger.exception(f"Error extracting text: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
