"""
PDF Splitting module to split PDFs based on table of contents.

This module provides functionality to split PDF documents into separate files
based on a provided table of contents structure.
"""

import os
import json
import logging
from typing import Dict, List, Optional, Union, Any
from ingestion_pipeline.base.pipeline import BasePipelineStep, StepResult, StepStatus

# Import the required components
from ingestion_pipeline.base.data_model import TableOfContent, Section, PageRange
from ingestion_pipeline.utils.pdf_splitter import PDFSplitter

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class PDFSplittingStep(BasePipelineStep):
    """Split PDF documents based on table of contents."""

    name = "pdf_splitting"
    description = "Split PDF documents into chapters based on table of contents"
    input_types = {"pdf", "toc"}
    output_types = {"split_pdfs"}

    def process(self, input_paths: Dict[str, str], output_dir: str) -> StepResult:
        """
        Process the step - split PDF based on TOC.

        Args:
            input_paths: Dictionary with "pdf" and "toc" keys mapping to file paths
            output_dir: Directory where split PDF files will be saved

        Returns:
            StepResult with status and output paths
        """
        pdf_path = input_paths["pdf"]
        toc_path = input_paths["toc"]

        try:
            logger.info(f"Processing PDF splitting for {pdf_path}")

            # Get page offset from config or default to 0
            page_offset = self.config.get("page_offset", 0)

            # Read the TOC from the JSON file
            toc = self._read_toc_from_json(toc_path)

            # Create output directory if it doesn't exist
            os.makedirs(output_dir, exist_ok=True)

            # Split the PDF using the TOC
            split_results = self._split_pdf_by_toc(
                pdf_path, toc, output_dir, page_offset
            )

            # Return the result with paths to all the split PDFs
            return StepResult(
                status=StepStatus.COMPLETED,
                output_paths={"split_pdfs": split_results},
                metadata={"num_chapters": len(split_results)},
            )

        except Exception as e:
            logger.exception(f"Error splitting PDF: {e}")
            return StepResult(status=StepStatus.FAILED, error=e)

    def _split_pdf_by_toc(
        self,
        pdf_path: str,
        toc: TableOfContent,
        output_dir: Optional[str] = None,
        page_offset: int = 0,
    ) -> Dict[str, str]:
        """
        Split a PDF file into multiple PDFs based on a table of contents structure.

        Args:
            pdf_path (str): Path to the PDF file to be split.
            toc (TableOfContent): Table of contents containing sections with page ranges.
            output_dir (str, optional): Directory where the split PDFs will be saved.
                                        If None, uses the same directory as the source PDF.
            page_offset (int): Number of pages to offset when applying the TOC page numbers.

        Returns:
            Dict[str, str]: Dictionary mapping section names to their respective output file paths.

        Raises:
            FileNotFoundError: If the PDF file doesn't exist.
            ValueError: If the file is not a valid PDF or if the table of contents is invalid.
        """
        try:
            # Initialize the PDFSplitter
            splitter = PDFSplitter(pdf_path)

            # Split the PDF using the table of contents
            result = splitter.split_by_toc(toc, output_dir, page_offset)

            logger.info(
                f"Successfully split PDF '{pdf_path}' into {len(result)} sections"
            )
            return result

        except Exception as e:
            logger.error(f"Error splitting PDF '{pdf_path}': {str(e)}")
            raise

    def _read_toc_from_json(self, json_path: str) -> TableOfContent:
        """
        Read a TableOfContent object from a JSON file.

        Args:
            json_path (str): Path to the JSON file containing the table of contents data.
                            The JSON should have a structure compatible with the TableOfContent model.

        Returns:
            TableOfContent: A TableOfContent object populated with the data from the JSON file.
        """
        if not os.path.exists(json_path):
            raise FileNotFoundError(f"JSON file not found: {json_path}")

        with open(json_path, "r") as file:
            toc_data = json.load(file)

        return TableOfContent(**toc_data)
