import base64
import io
import json
import logging
from typing import List, Dict, Any, Optional
import os

from pdf2image import convert_from_path
from PIL import Image
from litellm import completion
from ingestion_pipeline.base.text_extractor import TextExtractor


class LLMJSONExtractor(TextExtractor):
    """
    A text extractor that uses LLMs to extract text from PDF documents in JSON format.
    This implementation uses Azure OpenAI via litellm to process PDF pages as images
    and convert them into structured JSON format with sections.
    """

    # System prompt template for image analysis
    _SYSTEM_PROMPT = """You are an expert document transcriber.
Your task is to accurately convert the uploaded document image into structured JSON format.
The document may contain multiple columns, diagrams, tables, maps, math equations, and images.

You must analyze the document and extract it into a JSON array where each object represents a section with:
- "section_title": The title or heading of the section (if no clear heading exists, create a descriptive title)
- "section_content": The content of that section in markdown format

For the section content:
- Convert regular text into markdown paragraphs
- Format tables in markdown table format
- Describe images, diagrams, and maps within ![description](image) syntax
- Render mathematical equations using LaTeX notation within $$ for display equations or $ for inline equations
- Preserve lists (numbered and bulleted) in appropriate markdown format
- Maintain the document's original structure

Output ONLY valid JSON in the following format:
[{
    "section_title": "Introduction",
    "section_content": "This is the introduction content in markdown..."
}, {
    "section_title": "Method",
    "section_content": "This is the method section content..."
}]

Do NOT wrap the output in any code block or add any extra commentary. The output must be PURE JSON content."""

    # System prompt template for batch image analysis
    _BATCH_SYSTEM_PROMPT = """You are an expert document transcriber.
Your task is to accurately convert the current document image into structured JSON format.
The document may contain multiple columns, diagrams, tables, maps, math equations, and images.

The current image is part of a larger document. I'll provide you with the JSON transcription of previous pages
to give you context. Focus on transcribing ONLY THE CURRENT IMAGE into JSON while maintaining
consistency with the previous transcriptions.

You must analyze the current image and extract it into a JSON array where each object represents a section with:
- "section_title": The title or heading of the section (if no clear heading exists, create a descriptive title)
- "section_content": The content of that section in markdown format

For the section content:
- Convert regular text into markdown paragraphs
- Format tables in markdown table format
- Describe images, diagrams, and maps within ![description](image) syntax
- Render mathematical equations using LaTeX notation within $$ for display equations or $ for inline equations
- Preserve lists (numbered and bulleted) in appropriate markdown format
- Maintain the document's original structure

Output ONLY valid JSON in the following format for the current image:
[{
    "section_title": "Section Title",
    "section_content": "Section content in markdown..."
}]

Do NOT wrap the output in any code block or add any extra commentary. The output must be PURE JSON content."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        api_version: Optional[str] = None,
        deployment_name: Optional[str] = None,
        azure_ad_token: Optional[str] = None,
    ):
        """
        Initialize the LLM-based JSON text extractor with Azure OpenAI credentials.

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

    def _process_page_with_llm(
        self,
        image: Image.Image,
        previous_pages_json: str = "",
        page_number: int = 1,
        total_pages: int = 1,
        document_structure_hint: str = "",
    ) -> List[Dict[str, str]]:
        """
        Process a single page image with the LLM to extract text in JSON format.

        Args:
            image: PIL Image object of the page
            previous_pages_json: JSON from previous pages to provide context
            page_number: Current page number
            total_pages: Total number of pages in the document
            document_structure_hint: Additional context about the document structure

        Returns:
            List of dictionaries containing section titles and content
        """
        encoded_image = self._encode_image(image)

        try:
            # Prepare the API call
            base_system_prompt = (
                self._SYSTEM_PROMPT
                if not previous_pages_json
                else self._BATCH_SYSTEM_PROMPT
            )

            # Enhance system prompt with document structure hints if provided
            system_prompt = base_system_prompt
            if document_structure_hint:
                system_prompt = f"{base_system_prompt}\n\nAdditional document structure information:\n{document_structure_hint}"

            messages = [{"role": "system", "content": system_prompt}]

            user_content = [
                {
                    "type": "text",
                    "text": f"Extract the text from this document page (page {page_number} of {total_pages}) and convert it to JSON format.",
                }
            ]

            # Add previous pages content as context if available
            if previous_pages_json:
                user_content.append(
                    {
                        "type": "text",
                        "text": f"Previous pages transcription for context:\n\n{previous_pages_json}\n\nNow transcribe ONLY the current image to JSON:",
                    }
                )

            # Add the current image
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
                "max_tokens": 4096,
            }

            # Use the appropriate authentication method
            if self.azure_ad_token:
                completion_args["azure_ad_token"] = self.azure_ad_token
            else:
                completion_args["api_key"] = self.api_key

            # Make the API call
            response = completion(**completion_args)

            # Extract the response content
            extracted_json_text = response["choices"][0]["message"]["content"].strip()

            # Parse the JSON response
            try:
                page_sections = json.loads(extracted_json_text)
                if not isinstance(page_sections, list):
                    raise ValueError("Response is not a JSON array")

                # Validate the structure
                for section in page_sections:
                    if (
                        not isinstance(section, dict)
                        or "section_title" not in section
                        or "section_content" not in section
                    ):
                        raise ValueError("Invalid section structure")

                return page_sections
            except (json.JSONDecodeError, ValueError) as e:
                self.logger.error(
                    f"Error parsing JSON response for page {page_number}: {e}"
                )
                # Return a fallback structure
                return [
                    {
                        "section_title": f"Page {page_number} (Parse Error)",
                        "section_content": f"*Error parsing JSON response: {str(e)}*\n\nRaw response:\n{extracted_json_text}",
                    }
                ]

        except Exception as e:
            self.logger.error(f"Error processing page {page_number} with LLM: {e}")
            return [
                {
                    "section_title": f"Page {page_number} (Processing Error)",
                    "section_content": f"*Error processing page {page_number}: {str(e)}*",
                }
            ]

    def _process_pages_in_batches(
        self,
        images: List[Image.Image],
        batch_size: int = 5,
        document_structure_hint: str = "",
    ) -> List[Dict[str, str]]:
        """
        Process pages in batches, providing context from previous pages.

        Args:
            images: List of PIL Image objects
            batch_size: Number of pages to process in each batch
            document_structure_hint: Additional context about the document structure

        Returns:
            Combined list of sections from all pages
        """
        total_pages = len(images)
        all_sections = []
        accumulated_context_sections = []

        self.logger.info(f"Processing {total_pages} pages in batches of {batch_size}")

        for i, image in enumerate(images):
            page_number = i + 1
            self.logger.info(f"Processing page {page_number}/{total_pages}")

            # Determine context to use - limit to recent pages to prevent context overflow
            if i >= batch_size:
                # Keep only the latest batch_size pages worth of sections
                context_sections = accumulated_context_sections[
                    -batch_size * 10 :
                ]  # Approximate limit
            else:
                context_sections = accumulated_context_sections

            # Convert context sections to JSON string
            context_json = (
                json.dumps(context_sections, indent=2) if context_sections else ""
            )

            # Process the current page with context
            page_sections = self._process_page_with_llm(
                image,
                previous_pages_json=context_json,
                page_number=page_number,
                total_pages=total_pages,
                document_structure_hint=document_structure_hint,
            )

            # Add page information to each section
            for section in page_sections:
                section["page_number"] = page_number

            # Add to results
            all_sections.extend(page_sections)
            accumulated_context_sections.extend(page_sections)

        return all_sections

    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extract text from a PDF file using an LLM to process page images and return JSON format.

        The function converts each PDF page to an image, sends it to the LLM,
        and combines the results as a JSON string containing structured sections.

        Args:
            file_path: Path to the PDF file
            **kwargs: Additional parameters that can include:
                - api_key: Override the default Azure OpenAI API key
                - api_base: Override the default Azure OpenAI API base URL
                - api_version: Override the default Azure OpenAI API version
                - deployment_name: Override the default Azure OpenAI deployment name
                - azure_ad_token: Override the default Azure AD token
                - dpi: DPI for PDF to image conversion (default: 300)
                - batch_size: Number of pages to process in each batch (default: 5)
                - document_structure_hint: Additional context about the document structure
                  to help the LLM better understand the document format (e.g., "This is a
                  two-column scientific paper with mathematical equations and tables.")

        Returns:
            JSON string containing extracted sections from all pages
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

        # Get batch size for processing
        batch_size = kwargs.get("batch_size", 5)

        # Get document structure hint if provided
        document_structure_hint = kwargs.get("document_structure_hint", "")

        # Convert PDF to images
        dpi = kwargs.get("dpi", 300)  # Higher DPI for better quality
        self.logger.info(f"Converting PDF to images with DPI {dpi}: {file_path}")
        images = convert_from_path(file_path, dpi=dpi)

        # Process pages in batches with context from previous pages
        all_sections = self._process_pages_in_batches(
            images,
            batch_size=batch_size,
            document_structure_hint=document_structure_hint,
        )

        # Return as JSON string
        return json.dumps(all_sections, indent=2, ensure_ascii=False)
