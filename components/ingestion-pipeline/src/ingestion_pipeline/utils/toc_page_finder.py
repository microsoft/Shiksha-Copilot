import base64
import io
import logging
from typing import List, Dict, Any, Optional, Tuple
import os

from pdf2image import convert_from_path
from PIL import Image
from litellm import completion


class TOCPageFinder:
    """
    A utility class that uses LLMs to identify the page number range of the table of contents
    in a PDF document. This implementation processes pages in configurable batches to minimize
    LLM calls while efficiently locating the TOC.
    """

    # System prompt for TOC identification
    _SYSTEM_PROMPT = """You are an expert document analyzer specializing in identifying table of contents (TOC) in documents.

Your task is to analyze document page images and determine if they contain a table of contents.

A table of contents typically has these characteristics:
- Contains a list of chapters, sections, or topics
- Shows page numbers or section numbers
- Has hierarchical structure (main topics and subtopics)
- Usually appears near the beginning of a document
- May be titled "Table of Contents", "Contents", "Index", or similar
- Contains dot leaders, tabs, or other formatting to align content with page numbers

For each page image provided, you must respond with a JSON array containing boolean values (true/false) for each page in order.

Example response for N pages: [false, true, true, ...]
- First page: false (not a TOC page)
- Second page: true (is a TOC page)
- Third page: true (is a TOC page)
- And so on...

Respond ONLY with the JSON array of boolean values, no additional text or explanation."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        api_version: Optional[str] = None,
        deployment_name: Optional[str] = None,
        azure_ad_token: Optional[str] = None,
    ):
        """
        Initialize the TOC page finder with Azure OpenAI credentials.

        Args:
            api_key: Azure OpenAI API key
            api_base: Azure OpenAI API base URL
            api_version: Azure OpenAI API version
            deployment_name: Azure OpenAI deployment name
            azure_ad_token: Azure AD token for authentication (alternative to API key)
        """
        self.api_key = api_key
        self.api_base = api_base
        self.api_version = api_version
        self.deployment_name = deployment_name
        self.azure_ad_token = azure_ad_token
        self.logger = logging.getLogger(__name__)

    def _encode_image(self, image: Image.Image) -> str:
        """
        Encode a PIL Image as base64 for API transmission.

        Args:
            image: PIL Image object

        Returns:
            Base64 encoded string of the image
        """
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return img_str

    def _analyze_batch_with_llm(
        self,
        images: List[Image.Image],
        start_page: int,
        batch_number: int,
        total_batches: int,
    ) -> List[bool]:
        """
        Analyze a batch of page images to identify TOC content.

        Args:
            images: List of PIL Image objects
            start_page: Starting page number for this batch (1-indexed)
            batch_number: Current batch number
            total_batches: Total number of batches

        Returns:
            List of boolean values indicating if each page is a TOC page
        """
        try:
            # Prepare the API call
            messages = [{"role": "system", "content": self._SYSTEM_PROMPT}]

            user_content = [
                {
                    "type": "text",
                    "text": f"Analyze these {len(images)} consecutive document pages (starting from page {start_page}) to identify if they contain a table of contents. Return a JSON array with {len(images)} boolean values.",
                }
            ]

            # Add all images in the batch
            for i, image in enumerate(images):
                page_num = start_page + i
                encoded_image = self._encode_image(image)
                user_content.append(
                    {
                        "type": "text",
                        "text": f"Page {page_num}:",
                    }
                )
                user_content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{encoded_image}"},
                    }
                )

            messages.append({"role": "user", "content": user_content})

            completion_args = {
                "model": f"azure/{self.deployment_name}",
                "api_base": self.api_base,
                "api_version": self.api_version,
                "messages": messages,
                "max_tokens": 1024,
                "temperature": 0.1,  # Low temperature for consistent analysis
            }

            # Use the appropriate authentication method
            if self.azure_ad_token:
                completion_args["azure_ad_token"] = self.azure_ad_token
            else:
                completion_args["api_key"] = self.api_key

            # Make the API call
            response = completion(**completion_args)
            
            # Extract and parse the response
            response_text = response["choices"][0]["message"]["content"].strip()
            self.logger.debug(f"LLM response for batch {batch_number}: {response_text}")
            
            # Try to parse JSON response
            import json
            try:
                result = json.loads(response_text)
                if isinstance(result, list) and len(result) == len(images):
                    return result
                else:
                    self.logger.warning(f"Unexpected response format: {response_text}")
                    return [False] * len(images)
            except json.JSONDecodeError as e:
                self.logger.warning(f"Failed to parse JSON response: {e}")
                return [False] * len(images)

        except Exception as e:
            self.logger.error(f"Error analyzing batch {batch_number}: {e}")
            return [False] * len(images)

    def _find_toc_pages(
        self,
        file_path: str,
        max_pages_to_check: int = 30,
        batch_size: int = 3,
        **kwargs
    ) -> Tuple[List[int], str]:
        """
        Find the page number range of the table of contents in a PDF file.

        Args:
            file_path: Path to the PDF file
            max_pages_to_check: Maximum number of pages to analyze from the beginning
            batch_size: Number of pages to process in each batch (default: 3)
            **kwargs: Additional parameters that can include:
                - api_key: Override the default Azure OpenAI API key
                - api_base: Override the default Azure OpenAI API base URL
                - api_version: Override the default Azure OpenAI API version
                - deployment_name: Override the default Azure OpenAI deployment name
                - azure_ad_token: Override the default Azure AD token
                - dpi: DPI for PDF to image conversion (default: 200)

        Returns:
            Tuple containing:
            - List of page numbers containing the TOC (1-indexed)
            - Analysis summary string
        """
        # Override instance attributes with kwargs if provided
        api_key = kwargs.get("api_key", self.api_key)
        api_base = kwargs.get("api_base", self.api_base)
        api_version = kwargs.get("api_version", self.api_version)
        deployment_name = kwargs.get("deployment_name", self.deployment_name)
        azure_ad_token = kwargs.get("azure_ad_token", self.azure_ad_token)

        # Validate required parameters
        if not deployment_name:
            raise ValueError("Azure OpenAI deployment_name is required")
        if not api_base:
            raise ValueError("Azure OpenAI api_base is required")
        if not (api_key or azure_ad_token):
            raise ValueError("Either api_key or azure_ad_token must be provided")

        # Set instance variables for this analysis
        self.api_key = api_key
        self.api_base = api_base
        self.api_version = api_version
        self.deployment_name = deployment_name
        self.azure_ad_token = azure_ad_token

        # Convert PDF to images (only the pages we need to check)
        dpi = kwargs.get("dpi", 200)  # Lower DPI for faster processing
        self.logger.info(f"Converting first {max_pages_to_check} pages to images with DPI {dpi}: {file_path}")
        
        try:
            # Convert only the pages we need to check
            images = convert_from_path(
                file_path, 
                dpi=dpi, 
                first_page=1, 
                last_page=max_pages_to_check
            )
        except Exception as e:
            self.logger.error(f"Error converting PDF to images: {e}")
            return [], f"Error converting PDF: {str(e)}"

        total_pages = len(images)
        total_batches = (total_pages + batch_size - 1) // batch_size
        
        self.logger.info(f"Analyzing {total_pages} pages in {total_batches} batches of {batch_size}")

        # Track results for each page
        page_results = []  # List of (page_number, is_toc) tuples
        analysis_summary = []
        
        # Track state for early stopping
        first_true_found = False
        toc_complete = False
        
        # Process pages in batches
        for batch_idx in range(total_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, total_pages)
            batch_images = images[start_idx:end_idx]
            start_page = start_idx + 1  # 1-indexed
            
            self.logger.info(f"Processing batch {batch_idx + 1}/{total_batches} (pages {start_page}-{start_page + len(batch_images) - 1})")
            
            # Analyze this batch
            batch_results = self._analyze_batch_with_llm(
                batch_images,
                start_page,
                batch_idx + 1,
                total_batches
            )
            
            # Store results for each page in this batch and check for early stopping
            for i, is_toc in enumerate(batch_results):
                page_num = start_page + i
                page_results.append((page_num, is_toc))
                
                # Check for early stopping condition
                if is_toc and not first_true_found:
                    # Found the first True
                    first_true_found = True
                elif not is_toc and first_true_found:
                    # Found the first False after True - we can stop
                    toc_complete = True
                    self.logger.info(f"Found first False after True at page {page_num}. Stopping analysis.")
                    break
            
            analysis_summary.append(
                f"Batch {batch_idx + 1} (pages {start_page}-{start_page + len(batch_images) - 1}): "
                f"{batch_results}"
            )
            
            # Exit the batch loop if we've completed TOC detection
            if toc_complete:
                break

        # Find consecutive TOC pages starting from the first True
        toc_pages = []
        first_true_found = False
        
        for page_num, is_toc in page_results:
            if is_toc and not first_true_found:
                # Found the first True - start collecting
                first_true_found = True
                toc_pages.append(page_num)
            elif is_toc and first_true_found:
                # Continue collecting consecutive True values
                toc_pages.append(page_num)
            elif not is_toc and first_true_found:
                # Found the first False after True values - stop collecting
                break
        
        # Create final summary
        final_summary = "\n".join(analysis_summary)
        if toc_pages:
            final_summary += f"\n\nTOC found on consecutive pages: {toc_pages}"
        else:
            final_summary += "\n\nNo table of contents found in the analyzed pages."

        self.logger.info(f"TOC analysis complete. Found TOC on pages: {toc_pages}")
        
        return toc_pages, final_summary

    def get_toc_page_range(self, file_path: str, **kwargs) -> Tuple[Optional[int], Optional[int], str]:
        """
        Get the start and end page numbers of the table of contents.

        Args:
            file_path: Path to the PDF file
            **kwargs: Additional parameters (same as _find_toc_pages)

        Returns:
            Tuple containing:
            - Start page number of TOC (1-indexed, None if not found)
            - End page number of TOC (1-indexed, EXCLUSIVE - None if not found)
            - Analysis summary string
            
        Note: The end page is exclusive, meaning if TOC spans pages 8-9, 
              the returned range will be (8, 10) where 8 is included and 10 is excluded.
        """
        toc_pages, summary = self._find_toc_pages(file_path, **kwargs)
        
        if not toc_pages:
            return None, None, summary
        
        # Since toc_pages are already consecutive from first True to first False,
        # start is the first element, end is the last element + 1 (exclusive)
        start_page = toc_pages[0]
        end_page = toc_pages[-1] + 1  # Make end page exclusive
        
        return start_page, end_page, summary
