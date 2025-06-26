import base64
import io
import json
import logging
from typing import List, Optional, Dict, Any, Union
import os

from pdf2image import convert_from_path
from PIL import Image
from litellm import completion
from ingestion_pipeline.base.data_model import TableOfContent, Section, PageRange


class TableOfContentsExtractor:
    """
    A utility class that uses LLMs to extract a table of contents from PDF documents.
    This implementation uses Azure OpenAI via litellm to process PDF pages as images
    and generate a structured table of contents.
    """

    # System prompt for TOC extraction
    _SYSTEM_PROMPT = f"""You are an expert document analyzer specializing in extracting table of contents information.
Your task is to analyze the provided document pages and extract the table of contents structure.
Focus only on identifying chapter/section titles and their corresponding page numbers.

For each section found in the table of contents:
1. Identify the section name/title
2. Identify the starting page number
3. If possible and not explicity mentioned, determine the ending page number by looking at the next section's starting page

Example output JSON schema:
```
{json.dumps(TableOfContent.model_json_schema(), indent=2)}
```

Notes:
- If you cannot determine an end_page for the last section, use the total page count
- Skip any non-section elements (like "About the Author" or "References") unless they appear to be significant content sections
- Make your best estimate of section boundaries when exact page ranges are not clearly indicated
- Section names should be complete and preserve the original formatting/numbering"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        api_version: Optional[str] = None,
        deployment_name: Optional[str] = None,
        azure_ad_token: Optional[str] = None,
    ):
        """
        Initialize the LLM-based table of contents extractor with Azure OpenAI credentials.

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
        # Save as PNG for better quality
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return img_str

    def _process_toc_pages_with_llm(
        self, 
        images: List[Image.Image], 
        page_range: Optional[List[int]] = None,
        total_document_pages: int = 0,
        document_specific_hint: Optional[str] = None
    ) -> TableOfContent:
        """
        Process pages containing table of contents with the LLM.
        
        Args:
            images: List of PIL Image objects for all pages
            page_range: Optional list of page numbers to process (1-indexed)
            total_document_pages: Total number of pages in the document
            document_specific_hint: Optional hint about document structure to improve extraction
            
        Returns:
            TableOfContent object containing the extracted table of contents
        """
        # If page_range is specified, extract only those pages
        if page_range:
            # Convert to 0-indexed for list access
            page_indices = [p-1 for p in page_range if 0 < p <= len(images)]
            toc_images = [images[i] for i in page_indices]
        else:
            # Default: use first few pages where TOC is typically found
            # Generally, table of contents is within the first 10% of the document
            toc_end_index = min(5, len(images))  # Default: first 5 pages or all if fewer
            toc_images = images[:toc_end_index]
        
        if not toc_images:
            self.logger.warning("No valid pages provided for TOC extraction")
            return "[]"
            
        # Encode all TOC images
        encoded_images = [self._encode_image(img) for img in toc_images]
        
        try:
            # Prepare API call with all TOC images
            system_prompt = self._SYSTEM_PROMPT
            
            # If we know the total pages, include it in the prompt
            if total_document_pages:
                system_prompt += f"\n\nThe document has {total_document_pages} total pages."
                
            # Add document-specific hint if provided
            if document_specific_hint:
                system_prompt += f"\n\nDocument-specific hint: {document_specific_hint}"
                
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Build user content with all TOC images
            user_content = [
                {"type": "text", "text": "Extract the table of contents from these document pages:"}
            ]
            
            for i, encoded_image in enumerate(encoded_images):
                user_content.append({
                    "type": "image_url", 
                    "image_url": {"url": f"data:image/png;base64,{encoded_image}"}
                })
                
            messages.append({"role": "user", "content": user_content})
            
            completion_args = {
                "model": f"azure/{self.deployment_name}",
                "api_base": self.api_base,
                "api_version": self.api_version,
                "messages": messages,
                "max_tokens": 4096
            }

            # Use the appropriate authentication method
            if self.azure_ad_token:
                completion_args["azure_ad_token"] = self.azure_ad_token
            else:
                completion_args["api_key"] = self.api_key

            # Make the API call
            response = completion(**completion_args)
            
            # Extract the response content
            extracted_json = response["choices"][0]["message"]["content"].strip()
            
            # Clean up any markdown code block syntax if present
            extracted_json = json.loads(extracted_json.strip("```json").strip("```"))
            
            toc_obj = TableOfContent(**extracted_json)
            
            return toc_obj
            
        except Exception as e:
            self.logger.error(f"Error processing TOC with LLM: {e}")
            return "[]"

    def extract_table_of_contents(
        self, 
        file_path: str, 
        page_range: Optional[tuple[int, int]] = None,
        document_specific_hint: Optional[str] = None,
        **kwargs
    ) -> TableOfContent:
        """
        Extract table of contents from a PDF file using an LLM.
        
        Args:
            file_path: Path to the PDF file
            page_range: Optional tuple of (start_page, end_page) where both are 1-indexed
            document_specific_hint: Optional hint about document structure to improve extraction
            **kwargs: Additional parameters that can include:
                - api_key: Override the default Azure OpenAI API key
                - api_base: Override the default Azure OpenAI API base URL
                - api_version: Override the default Azure OpenAI API version
                - deployment_name: Override the default Azure OpenAI deployment name
                - azure_ad_token: Override the default Azure AD token
                - dpi: DPI for PDF to image conversion (default: 200)
                
        Returns:
            TableOfContent object containing the extracted sections
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
            
        # Set instance variables for this extraction
        self.api_key = api_key
        self.api_base = api_base
        self.api_version = api_version
        self.deployment_name = deployment_name
        self.azure_ad_token = azure_ad_token
        
        # Convert PDF to images
        dpi = kwargs.get("dpi", 200)  # Lower DPI is sufficient for TOC extraction
        self.logger.info(f"Converting PDF to images with DPI {dpi}: {file_path}")
        images = convert_from_path(file_path, dpi=dpi)
        
        # Process page range
        processed_page_range = None
        if page_range:
            start_page, end_page = page_range
            if start_page > 0 and end_page >= start_page and end_page <= len(images):
                processed_page_range = list(range(start_page, end_page + 1))
            else:
                raise ValueError(f"Invalid page_range: {page_range}. start_page must be > 0, end_page must be >= start_page and <= {len(images)}")
        
        # Process TOC pages with LLM
        return self._process_toc_pages_with_llm(
            images, 
            page_range=processed_page_range,
            total_document_pages=len(images),
            document_specific_hint=document_specific_hint
        )