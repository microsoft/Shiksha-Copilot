import json
import torch
import base64
from io import BytesIO
from PIL import Image
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration

from olmocr.data.renderpdf import render_pdf_to_base64png
from olmocr.prompts import build_finetuning_prompt
from olmocr.prompts.anchor import get_anchor_text

from ingestion_pipeline.base.text_extractor import TextExtractor

# Import PdfReader to count pages in the PDF.
from PyPDF2 import PdfReader

class OlmocrTextExtractor(TextExtractor):
    def __init__(self):
        # Initialize the model in evaluation mode using bfloat16 precision.
        self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            "allenai/olmOCR-7B-0225-preview", torch_dtype=torch.bfloat16
        ).eval()

        # Initialize the processor used to format and tokenize the prompt.
        self.processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-7B-Instruct")

        # Set the device to GPU if available, otherwise use CPU.
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def _extract_page_text(self, file_path: str, page_number: int) -> str:
        """
        Extracts text from a single page of the PDF.
        """
        # Convert the specified PDF page into a base64-encoded image.
        image_base64 = render_pdf_to_base64png(file_path, page_number, target_longest_image_dim=1024)

        # Retrieve anchor text (metadata) from the PDF to help build the prompt.
        anchor_text = get_anchor_text(file_path, page_number, pdf_engine="pdfreport", target_length=4000)
        prompt = build_finetuning_prompt(anchor_text)

        # Build the message payload expected by the processor.
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}},
                ],
            }
        ]

        # Apply the chat template to create a formatted text prompt.
        text_input = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

        # Convert the base64 image into a PIL image.
        main_image = Image.open(BytesIO(base64.b64decode(image_base64)))
        # Optionally, save the image for debugging:
        # main_image.save("debug_page{}.png".format(page_number))

        # Prepare the inputs for the model.
        inputs = self.processor(
            text=[text_input],
            images=[main_image],
            padding=True,
            return_tensors="pt",
        )
        inputs = {key: value.to(self.device) for key, value in inputs.items()}

        # Generate output using the model.
        output = self.model.generate(
            **inputs,
            temperature=0.8,
            max_new_tokens=8192,
            num_return_sequences=1,
            do_sample=True,
        )

        # Determine the length of the prompt in tokens to extract new tokens.
        prompt_length = inputs["input_ids"].shape[1]
        new_tokens = output[:, prompt_length:]

        # Decode the generated tokens to text.
        text_output = self.processor.tokenizer.batch_decode(new_tokens, skip_special_tokens=True)

        # Parse the output (expecting a JSON string with a key 'natural_text').
        result = ""
        for op in text_output:
            try:
                js = json.loads(op)
                result += js.get('natural_text', '')
            except Exception:
                result += op

        return result

    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extracts text from the given PDF file.

        Keyword Args:
            page_number (int): The page to extract from (default is 1).
            all_pages (bool): If True, extract text from all pages and concatenate the results.

        Returns:
            str: The extracted natural language text.
        """
        if kwargs.get("all_pages", False):
            # Count the number of pages using PyPDF2.
            reader = PdfReader(file_path)
            num_pages = len(reader.pages)
            all_text = ""
            for page in range(1, num_pages + 1):
                page_text = self._extract_page_text(file_path, page)
                # Optionally separate page outputs.
                all_text += f"\n--- Page {page} ---\n" + page_text
            return all_text
        else:
            # Process a single page.
            page_number = kwargs.get("page_number", 1)
            return self._extract_page_text(file_path, page_number)