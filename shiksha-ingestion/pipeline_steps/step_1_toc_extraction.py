import logging
import os
import json
from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, Any, Optional, Set, Type
from dotenv import load_dotenv
from ingestion_pipeline.utils.toc_extractor import TableOfContentsExtractor
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv(".env")


def azure_openai_credentials():
    """
    Returns credentials for connecting to Azure OpenAI service.

    Returns:
        Dict[str, str]: A dictionary with Azure OpenAI credentials including API key, base URL,
                       API version, and deployment name.
    """
    return {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }


class TOCExtractionStep(BasePipelineStep):
    """Extract table of contents from a PDF file."""

    name = "toc_extraction"
    description = "Extract table of contents from PDF"
    input_types = {"pdf"}
    output_types = {"toc"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - extract TOC from PDF.

        Args:
            input_paths: Dictionary with "pdf" key mapping to PDF file path
            output_dir: Directory where TOC JSON will be saved

        Returns:
            StepResult with status and output paths
        """
        pdf_path = input_paths["pdf"]
        output_filename = os.path.basename(pdf_path).replace(".pdf", ".json")
        output_path = os.path.join(output_dir, output_filename)

        try:
            logger.info(f"Processing {pdf_path}")

            # Get configuration
            page_number = self.config.get("page_number", 0)

            # Get credentials for TOC extraction
            credentials = azure_openai_credentials()

            # Get document hints
            general_document_hint = self.config.get(
                "general_document_hint",
                "The table of contents must NOT include non-chapter sections like `Appendix` or `Revision`. Give chapter-wise table of contents ONLY. Section name should NOT include chapter number.",
            )

            social_document_hint = self.config.get(
                "social_document_hint",
                "\nThe table of contents might contain Groups of chapters(like themes). Give chapter-wise table of contents ONLY.",
            )

            # Extract TOC
            extractor = TableOfContentsExtractor()
            document_hint = general_document_hint + (
                social_document_hint if "social" in pdf_path else ""
            )

            toc = extractor.extract_table_of_contents(
                pdf_path,
                page_range=(page_number, page_number + 1),
                document_specific_hint=document_hint,
                **credentials,
            )

            logger.info(f"Extracted TOC: {toc.model_dump_json(indent=2)}")

            # Save TOC
            os.makedirs(output_dir, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(toc.model_dump_json(indent=2))

            logger.info(f"Saved TOC to {output_path}")

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"toc": output_path},
                metadata={"num_chapters": len(toc.sections)},
            )

        except Exception as e:
            logger.exception(f"Error extracting TOC: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
