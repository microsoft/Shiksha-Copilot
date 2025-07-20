import logging
import os
import json
from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, Any, Optional, Set, Type
from dotenv import load_dotenv
from ingestion_pipeline.utils.toc_page_finder import TOCPageFinder
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


class TOCPageFindingStep(BasePipelineStep):
    """Find table of contents page range in a PDF file.

    This step identifies the table of contents section in a PDF and outputs:
    - toc_page_range: JSON file containing start/end pages and summary
    - page_offset: The offset for subsequent processing (end_page - 1)
    """

    name = "toc_page_finding"
    description = "Find table of contents page range in PDF"
    input_types = {"pdf"}
    output_types = {"toc_page_range", "page_offset"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - find TOC page range in PDF.

        Args:
            input_paths: Dictionary with "pdf" key mapping to PDF file path
            output_dir: Directory where TOC page range JSON will be saved

        Returns:
            StepResult with status and output paths including:
            - toc_page_range: Path to JSON file with TOC page range information
            - page_offset: Calculated offset (end_page - 1) for subsequent pipeline steps
        """
        pdf_path = input_paths["pdf"]
        output_filename = os.path.basename(pdf_path).replace(
            ".pdf", "_toc_page_range.json"
        )
        output_path = os.path.join(output_dir, output_filename)

        try:
            logger.info(f"Finding TOC page range in {pdf_path}")

            # Get configuration with defaults
            max_pages_to_check = self.config.get("max_pages_to_check", 30)
            batch_size = self.config.get("batch_size", 3)

            # Get credentials for TOC page finding
            credentials = azure_openai_credentials()

            # Find TOC page range
            toc_finder = TOCPageFinder()
            start_page, end_page, range_summary = toc_finder.get_toc_page_range(
                pdf_path,
                max_pages_to_check=max_pages_to_check,
                batch_size=batch_size,
                **credentials,
            )

            # Create page range dictionary
            page_range_dict = {
                "start": start_page,
                "end": end_page,
                "summary": range_summary,
            }

            logger.info(f"Found TOC page range: {page_range_dict}")

            # Save page range
            os.makedirs(output_dir, exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(page_range_dict, f, indent=2)

            logger.info(f"Saved TOC page range to {output_path}")

            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={
                    "toc_page_range": output_path,
                    "page_offset": end_page - 1,
                },
                metadata={
                    "start_page": start_page,
                    "end_page": end_page,
                    "page_count": (
                        end_page - start_page + 1 if end_page >= start_page else 0
                    ),
                    "summary": range_summary,
                },
            )

        except Exception as e:
            logger.exception(f"Error finding TOC page range: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)
