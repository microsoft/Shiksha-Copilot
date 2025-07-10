import base64
import io
import logging
from typing import List, Dict, Any, Optional
import os

from pdf2image import convert_from_path
from PIL import Image
from litellm import completion
from ingestion_pipeline.base.text_extractor import TextExtractor


class LLMTextExtractor(TextExtractor):
    """
    A text extractor that uses LLMs to extract text from PDF documents.
    This implementation uses Azure OpenAI via litellm to process PDF pages as images
    and convert them into markdown format.
    """

    # System prompt template for image analysis
    _SYSTEM_PROMPT = """You are an expert document transcriber.
Your task is to accurately convert the uploaded document image into markdown text.
The document may contain multiple columns, diagrams, tables, maps, math equations, and images.
For each component:
- Convert regular text into markdown paragraphs
- Format headings with appropriate markdown heading levels (# for main headings)
- Convert tables to markdown table format
- Describe images, diagrams, and maps within ![description](image) syntax
- Render mathematical equations using LaTeX notation within $$ for display equations or $ for inline equations
- Preserve lists (numbered and bulleted) in appropriate markdown format
- Maintain the document's original structure, including columns if present

Output ONLY the transcribed markdown content. Do NOT wrap the output in any code block or add any extra commentary. The output must be PURE markdown content."""

    # System prompt template for batch image analysis
    _BATCH_SYSTEM_PROMPT = """You are an expert document transcriber.
Your task is to accurately convert the current document image into markdown text.
The document may contain multiple columns, diagrams, tables, maps, math equations, and images.

The current image is part of a larger document. I'll provide you with the transcription of previous pages
to give you context. Focus on transcribing ONLY THE CURRENT IMAGE into markdown while maintaining
consistency with the previous transcriptions.

For each component:
- Convert regular text into markdown paragraphs
- Format headings with appropriate markdown heading levels (# for main headings)
- Convert tables to markdown table format
- Describe images, diagrams, and maps within ![description](image) syntax
- Render mathematical equations using LaTeX notation within $$ for display equations or $ for inline equations
- Preserve lists (numbered and bulleted) in appropriate markdown format
- Maintain the document's original structure, including columns if present

Output ONLY the transcribed markdown content for the current image. Do NOT wrap the output in any code block or add any extra commentary. The output must be PURE markdown content."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        api_version: Optional[str] = None,
        deployment_name: Optional[str] = None,
        azure_ad_token: Optional[str] = None,
    ):
        """
        Initialize the LLM-based text extractor with Azure OpenAI credentials.

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
        previous_pages_text: str = "",
        page_number: int = 1,
        total_pages: int = 1,
        document_structure_hint: str = "",
    ) -> str:
        """
        Process a single page image with the LLM to extract text in markdown format.

        Args:
            image: PIL Image object of the page
            previous_pages_text: Text from previous pages to provide context
            page_number: Current page number
            total_pages: Total number of pages in the document
            document_structure_hint: Additional context about the document structure

        Returns:
            Extracted markdown text from the page
        """
        encoded_image = self._encode_image(image)

        try:
            # Prepare the API call
            base_system_prompt = (
                self._SYSTEM_PROMPT
                if not previous_pages_text
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
                    "text": f"Extract the text from this document page (page {page_number} of {total_pages}) and convert it to markdown format.",
                }
            ]

            # Add previous pages content as context if available
            if previous_pages_text:
                user_content.append(
                    {
                        "type": "text",
                        "text": f"Previous pages transcription for context:\n\n{previous_pages_text}\n\nNow transcribe ONLY the current image:",
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
            extracted_text = response["choices"][0]["message"]["content"].strip()
            return extracted_text

        except Exception as e:
            self.logger.error(f"Error processing page {page_number} with LLM: {e}")
            return f"*Error processing page {page_number}: {str(e)}*"

    def _process_pages_in_batches(
        self,
        images: List[Image.Image],
        batch_size: int = 5,
        document_structure_hint: str = "",
    ) -> str:
        """
        Process pages in batches, providing context from previous pages.

        Args:
            images: List of PIL Image objects
            batch_size: Number of pages to process in each batch
            document_structure_hint: Additional context about the document structure

        Returns:
            Combined markdown text from all pages
        """
        total_pages = len(images)
        full_markdown = ""
        accumulated_context = ""

        self.logger.info(f"Processing {total_pages} pages in batches of {batch_size}")

        for i, image in enumerate(images):
            page_number = i + 1
            self.logger.info(f"Processing page {page_number}/{total_pages}")

            # Determine if we need to add accumulated context
            # For the first page in each batch, we use accumulated context from all previous batches
            # For subsequent pages in the batch, we use the full accumulated context
            if i % batch_size == 0:
                # Start of a new batch - use accumulated context from previous batches
                context_to_use = accumulated_context
            else:
                # Within a batch - use all accumulated context
                context_to_use = accumulated_context

            # Process the current page with context
            page_markdown = self._process_page_with_llm(
                image,
                previous_pages_text=context_to_use,
                page_number=page_number,
                total_pages=total_pages,
                document_structure_hint=document_structure_hint,
            )

            # Add page delimiter for each page
            page_delimiter = f"---\n\n## Page {page_number}\n"

            # Add page content with delimiter
            if i > 0:
                full_markdown += f"\n\n{page_delimiter}\n"
            else:
                # For the first page, add the delimiter at the beginning
                full_markdown += f"## Page {page_number}\n"

            full_markdown += page_markdown

            # Update accumulated context
            # To prevent context from growing too large, we limit it to the latest batch_size pages
            # This is a simple sliding window approach
            if i >= batch_size:
                # Extract the latest batch_size pages from full_markdown
                parts = full_markdown.split("\n\n---\n\n## Page ")
                if len(parts) > batch_size:
                    # Keep only the latest batch_size pages
                    accumulated_context = (
                        "---\n\n## Page "
                        + "\n\n---\n\n## Page ".join(parts[-batch_size:])
                    )
                else:
                    accumulated_context = full_markdown
            else:
                accumulated_context = full_markdown

        return full_markdown

    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extract text from a PDF file using an LLM to process page images.

        The function converts each PDF page to an image, sends it to the LLM,
        and combines the results as markdown text.

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
            Combined markdown text extracted from all pages
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
        return self._process_pages_in_batches(
            images,
            batch_size=batch_size,
            document_structure_hint=document_structure_hint,
        )
