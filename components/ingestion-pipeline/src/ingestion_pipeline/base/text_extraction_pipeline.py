from ingestion_pipeline.base.text_extractor import TextExtractor
from ingestion_pipeline.base.text_postprocessor import TextPostProcessor


class TextExtractionPipeline:
    """
    Orchestrates the extraction of text from a PDF by combining a TextExtractor and an optional TextPostProcessor.
    """
    def __init__(self, text_extractor: TextExtractor, text_processor: TextPostProcessor = None):
        self.ocr_extractor = text_extractor
        self.text_processor = text_processor
    
    def process(self, pdf_path: str) -> str:
        text = self.ocr_extractor.extract_text(pdf_path)
        if self.text_processor is not None:
            text = self.text_processor.post_process(text)
        return text