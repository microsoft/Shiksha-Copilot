"""
MinerU Text Extractor module for extracting text from PDF documents.

This module provides a PDF text extraction implementation using the MinerU magic-pdf library.
It handles the conversion of PDF pages to images and applies document analysis with optional
OCR to extract text content in a structured Markdown format.
"""

import os
import tempfile
import shutil
import logging
from typing import List

# Configure logging
logger = logging.getLogger(__name__)
from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader
from magic_pdf.data.dataset import PymuDocDataset
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
from magic_pdf.data.read_api import read_local_images
from pdf2image import convert_from_path

from ingestion_pipeline.base.text_extractor import TextExtractor

class MinerUTextExtractor(TextExtractor):
    """
    A text extractor that uses MinerU's magic-pdf library to extract text from PDF documents.
    
    This extractor converts each PDF page to an image and then uses document analysis with 
    optional OCR to extract text content. The extracted content is returned as Markdown text
    with appropriate formatting and structure.
    """
    def _extract_text_full(self, file_path: str, **kwargs) -> str:
        """
        Extracts text from a PDF file by applying the magic-pdf inference pipeline.

        Keyword Args:
            ocr (bool): Whether to use OCR mode. Default is True.
            image_dir (str): Directory for storing images. Default is "mineru-output/images".

        Returns:
            str: The Markdown string extracted from the PDF.
        """
        # Get options from kwargs with defaults
        ocr = kwargs.get("ocr", True)
        local_image_dir = kwargs.get("image_dir", "mineru-output/images")

        # Ensure the output directories exist
        os.makedirs(local_image_dir, exist_ok=True)

        # Create file writers/readers
        image_writer = FileBasedDataWriter(local_image_dir)
        reader = FileBasedDataReader("")

        # Read PDF content as bytes
        pdf_bytes = reader.read(file_path)

        # Create the dataset instance from the PDF bytes
        ds = PymuDocDataset(pdf_bytes)

        # Run inference with the chosen mode (OCR or text-based)
        if ocr:
            infer_result = ds.apply(doc_analyze, ocr=True)
            # Use the OCR pipeline to process images, etc.
            pipe_result = infer_result.pipe_ocr_mode(image_writer)
        else:
            infer_result = ds.apply(doc_analyze, ocr=False)
            # Use the text pipeline instead of OCR
            pipe_result = infer_result.pipe_txt_mode(image_writer)

        # The get_markdown function expects a string (usually the basename of the image directory)
        image_dir_basename = os.path.basename(local_image_dir)
        md_content = pipe_result.get_markdown(image_dir_basename)

        # Optionally, if you want to dump files for debugging:
        # pipe_result.dump_md(md_writer, f"{os.path.splitext(os.path.basename(file_path))[0]}.md", image_dir_basename)
        # pipe_result.dump_content_list(md_writer, f"{os.path.splitext(os.path.basename(file_path))[0])}_content_list.json", image_dir_basename)
        # pipe_result.dump_middle_json(md_writer, f"{os.path.splitext(os.path.basename(file_path))[0])}_middle.json")

        return md_content
    
    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extracts text from a PDF file using MinerU's magic-pdf library.
        
        By default, uses the full document processing approach. If extract_per_page=True is
        provided, uses page-by-page extraction and combines results with page headers.

        Keyword Args:
            extract_per_page (bool): Whether to extract text page-by-page. Default is False.
            ocr (bool): Whether to use OCR mode. Default is True.
            image_dir (str): Directory for storing processed images. Default is "mineru-output/images".
            dpi (int): DPI for the output images when using page-by-page extraction. Default is 200.

        Returns:
            str: The Markdown string extracted from the PDF.
        """
        # Check if we should use page-by-page extraction or full document extraction
        extract_per_page = kwargs.get("extract_per_page", False)
        
        # If not extracting per page, use the full document extraction method
        if not extract_per_page:
            return self._extract_text_full(file_path, **kwargs)
        
        # Otherwise, use the page-by-page extraction approach
        # Get options from kwargs with defaults
        ocr = kwargs.get("ocr", True)
        local_image_dir = kwargs.get("image_dir", "mineru-output/images")
        dpi = kwargs.get("dpi", 200)
        
        # Ensure the output directory for processed images exists
        os.makedirs(local_image_dir, exist_ok=True)
        
        # Extract PDF pages as images using the helper method
        pdf_images_output_dir = self._extract_page_images(
            file_path,
            dpi=dpi
        )
        
        try:
            # Create a file writer for storing processed images from magic-pdf
            image_writer = FileBasedDataWriter(local_image_dir)
            
            # Read all extracted page images into dataset objects
            dss = read_local_images(pdf_images_output_dir, suffixes=['.jpg'])
            
            # Process each page image and extract text content
            md_content = []
            for ds in dss:
                if ocr:
                    # Apply document analysis with OCR mode for images with complex layouts or scanned content
                    infer_result = ds.apply(doc_analyze, ocr=True)
                    pipe_result = infer_result.pipe_ocr_mode(image_writer)
                else:
                    # Apply document analysis without OCR for digital PDFs with extractable text
                    infer_result = ds.apply(doc_analyze, ocr=False)
                    pipe_result = infer_result.pipe_txt_mode(image_writer)
                
                # Get the basename of the image directory for markdown generation
                image_dir_basename = os.path.basename(local_image_dir)
                md_content.append(pipe_result.get_markdown(image_dir_basename))
        
            # Combine all page markdown content with page headers for better organization
            result = '\n'.join([f"\n--- Page {idx + 1} ---\n" + page_md for idx, page_md in enumerate(md_content)])
            return result
            
        finally:
            # Clean up: Delete all temporary images created in the tmp dir
            # This will be executed even if an exception occurs during processing
            if os.path.exists(pdf_images_output_dir):
                try:
                    # Use shutil.rmtree which is safer for removing directory trees
                    shutil.rmtree(pdf_images_output_dir)
                    logger.debug(f"Cleaned up temporary directory: {pdf_images_output_dir}")
                except OSError as e:
                    # Log the error but don't fail the extraction process
                    logger.warning(f"Failed to clean up temporary directory {pdf_images_output_dir}: {e}")
    
    def _extract_page_images(self, file_path: str, **kwargs) -> str:
        """
        Extracts all pages from a PDF file and saves them as images.
        
        Args:
            file_path (str): Path to the PDF file.
            
        Keyword Args:
            output_dir (str): Directory to save the images. Default is a temporary directory.
            dpi (int): DPI for the output images. Default is 200.
            
        Returns:
            str: Path to the directory containing the extracted images.
        """
        # Get options from kwargs with defaults
        output_dir = kwargs.get("output_dir", tempfile.mkdtemp())
        dpi = kwargs.get("dpi", 200)
        
        # Ensure the output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert PDF pages to images using pdf2image library
        images = convert_from_path(file_path, dpi=dpi)
        
        # Save each page as an image with the format {page_index}.jpg
        for i, image in enumerate(images):
            image_path = os.path.join(output_dir, f"{i}.jpg")
            image.save(image_path, "JPEG")
            
        return output_dir