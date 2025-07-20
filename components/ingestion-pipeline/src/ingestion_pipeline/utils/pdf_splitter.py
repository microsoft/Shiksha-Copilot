"""
PDF Splitter utility to split PDF files into multiple PDFs by page ranges.
"""

import os
from typing import List, Tuple, Dict, Optional, Union
from PyPDF2 import PdfReader, PdfWriter

# Import the TableOfContent model
from ingestion_pipeline.base.data_model import TableOfContent


class PDFSplitter:
    """
    A utility class for splitting PDF files into multiple files based on page ranges.

    Attributes:
        pdf_path (str): Path to the source PDF file.
        total_pages (int): Total number of pages in the source PDF.
    """

    def __init__(self, pdf_path: str):
        """
        Initialize a PDFSplitter instance with a PDF file path.

        Args:
            pdf_path (str): Path to the source PDF file.

        Raises:
            FileNotFoundError: If the specified PDF file doesn't exist.
            ValueError: If the file is not a valid PDF.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        try:
            self.pdf_path = pdf_path
            self.reader = PdfReader(pdf_path)
            self.total_pages = len(self.reader.pages)

            if self.total_pages == 0:
                raise ValueError(f"The PDF file {pdf_path} has no pages")

        except Exception as e:
            if "not a PDF file" in str(e):
                raise ValueError(f"The file {pdf_path} is not a valid PDF")
            raise

    def _validate_page_range(self, page_range: Tuple[int, int]) -> None:
        """
        Validate that a page range is within the bounds of the PDF document.

        Args:
            page_range (Tuple[int, int]): The start and end page (1-indexed) as a tuple.

        Raises:
            ValueError: If the page range is invalid or out of bounds.
        """
        if not isinstance(page_range, tuple) or len(page_range) != 2:
            raise ValueError("Page range must be a tuple of (start_page, end_page)")

        start, end = page_range

        if not isinstance(start, int) or not isinstance(end, int):
            raise ValueError("Page numbers must be integers")

        if start < 1 or end < 1:
            raise ValueError("Page numbers must be 1-indexed positive integers")

        if start > end:
            raise ValueError(
                f"Start page {start} cannot be greater than end page {end}"
            )

        if start > self.total_pages or end > self.total_pages:
            raise ValueError(
                f"Page range ({start}, {end}) is out of bounds for PDF with {self.total_pages} pages"
            )

    def split(
        self,
        page_ranges: List[Tuple[int, int]],
        output_dir: str = None,
        page_offset: int = 0,
    ) -> List[str]:
        """
        Split the PDF into multiple files according to the specified page ranges.

        Args:
            page_ranges (List[Tuple[int, int]]): List of page ranges as tuples of (start_page, end_page).
                                               Page numbers are 1-indexed.
            output_dir (str, optional): Directory where the split PDFs will be saved.
                                      Defaults to the same directory as the source PDF.
            page_offset (int, optional): Offset to add to all page numbers. Can be negative or positive.
                                       Defaults to 0 (no offset).

        Returns:
            List[str]: Paths to the created PDF files.

        Raises:
            ValueError: If any page range is invalid or out of bounds.
        """
        if not page_ranges:
            raise ValueError("At least one page range must be provided")

        # Apply page offset and validate all page ranges
        adjusted_page_ranges = []
        for page_range in page_ranges:
            start_page, end_page = page_range
            # Apply offset
            adjusted_start = start_page + page_offset
            adjusted_end = end_page + page_offset

            # Ensure pages are within valid range
            if adjusted_start < 1:
                raise ValueError(
                    f"With offset {page_offset}, start page {start_page} would be less than 1"
                )

            adjusted_range = (adjusted_start, adjusted_end)
            self._validate_page_range(adjusted_range)
            adjusted_page_ranges.append(adjusted_range)

        # Determine output directory
        if output_dir is None:
            output_dir = os.path.dirname(self.pdf_path)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        output_paths = []
        base_filename = os.path.basename(self.pdf_path)
        filename_without_ext, ext = os.path.splitext(base_filename)

        # Process each page range
        for i, page_range in enumerate(adjusted_page_ranges):
            start_page, end_page = page_range

            writer = PdfWriter()

            # Add pages to the writer (convert from 1-indexed to 0-indexed)
            for page_num in range(start_page - 1, end_page):
                writer.add_page(self.reader.pages[page_num])

            # Create output filename - use original page numbers (without offset) for the filename
            original_start = page_ranges[i][0]
            original_end = page_ranges[i][1]
            output_filename = (
                f"{filename_without_ext}_pages_{original_start}-{original_end}{ext}"
            )
            output_path = os.path.join(output_dir, output_filename)

            # Write the output file
            with open(output_path, "wb") as output_file:
                writer.write(output_file)

            output_paths.append(output_path)

        return output_paths

    def split_by_toc(
        self, toc: TableOfContent, output_dir: str = None, page_offset: int = 0
    ) -> Dict[str, str]:
        """
        Split the PDF into multiple files according to the sections defined in a TableOfContent.

        Args:
            toc (TableOfContent): Table of contents containing sections with page ranges.
            output_dir (str, optional): Directory where the split PDFs will be saved.
                                      Defaults to the same directory as the source PDF.
            page_offset (int, optional): Offset to add to all page numbers. Can be negative or positive.
                                       Defaults to 0 (no offset).

        Returns:
            Dict[str, str]: Dictionary mapping section names to their respective output file paths.

        Raises:
            ValueError: If the TableOfContent is empty or contains invalid page ranges.
        """
        if not toc.sections:
            raise ValueError("The table of contents must contain at least one section")

        # Determine output directory
        if output_dir is None:
            output_dir = os.path.dirname(self.pdf_path)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        output_paths = {}
        base_filename = os.path.basename(self.pdf_path)
        filename_without_ext, ext = os.path.splitext(base_filename)

        # Process each section
        for idx, section in enumerate(toc.sections):
            # Apply offset to page numbers
            start_page = section.page_range.start_page + page_offset
            end_page = min(section.page_range.end_page + page_offset, self.total_pages)

            # Ensure pages are within valid range
            if start_page < 1:
                raise ValueError(
                    f"With offset {page_offset}, start page {section.page_range.start_page} would be less than 1"
                )

            # Validate the page range
            self._validate_page_range((start_page, end_page))

            writer = PdfWriter()

            # Add pages to the writer (convert from 1-indexed to 0-indexed)
            for page_num in range(start_page - 1, end_page):
                writer.add_page(self.reader.pages[page_num])

            # Create output filename
            output_filename = f"{idx + 1}{ext}"
            output_path = os.path.join(output_dir, output_filename)

            # Write the output file
            with open(output_path, "wb") as output_file:
                writer.write(output_file)

            output_paths[idx + 1] = output_path

        return output_paths
