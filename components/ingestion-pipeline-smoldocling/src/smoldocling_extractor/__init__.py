import logging
from pdf2image import convert_from_path
import torch
from docling_core.types.doc import DoclingDocument
from docling_core.types.doc.document import DocTagsDocument
from transformers import AutoProcessor, AutoModelForVision2Seq

from ingestion_pipeline.base.text_extractor import TextExtractor

class SmolDoclingTextExtractor(TextExtractor):
    logger = logging.getLogger(__name__)
    
    def __init__(self, model_name: str = "ds4sd/SmolDocling-256M-preview", device: str = None):
        # Determine the device
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = device
        
        # Initialize processor and model
        self.processor = AutoProcessor.from_pretrained(model_name)
        self.model = AutoModelForVision2Seq.from_pretrained(
            model_name,
            torch_dtype=torch.bfloat16,
            _attn_implementation="flash_attention_2" if self.device == "cuda" else "eager",
        ).to(self.device)

    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extracts text from each page of the provided PDF file by:
         1. Converting each page to an image.
         2. Running the Docling model to extract DocTags.
         3. Converting the DocTags to Markdown.
         4. Combining all page outputs into one markdown string.
        """
        # Convert PDF pages to images; adjust dpi as needed
        pages = convert_from_path(file_path, dpi=200)
        markdown_outputs = []
        
        for idx, page in enumerate(pages):
            self.logger.debug(f"PAGE EXTRACTION TAKING PLACE {idx + 1}")
            # Create the chat message prompt for the page
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": "Convert this page to docling."}
                    ]
                }
            ]
            prompt = self.processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = self.processor(text=prompt, images=[page], return_tensors="pt")
            inputs = inputs.to(self.device)
            
            # Generate the output from the model
            generated_ids = self.model.generate(**inputs, max_new_tokens=8192)
            prompt_length = inputs.input_ids.shape[1]
            trimmed_generated_ids = generated_ids[:, prompt_length:]
            
            # Decode the model output
            doctags = self.processor.batch_decode(trimmed_generated_ids, skip_special_tokens=False)[0].lstrip()
            
            # Convert the output to a DocTagsDocument and then to a DoclingDocument
            doctags_doc = DocTagsDocument.from_doctags_and_image_pairs([doctags], [page])
            doc = DoclingDocument(name="Document")
            doc.load_from_doctags(doctags_doc)
            markdown = doc.export_to_markdown()
            markdown_outputs.append(markdown)
        
        # Combine the markdown output of all pages into one string
        return "\n\n".join(markdown_outputs)