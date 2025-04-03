from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from ingestion_pipeline.base.text_extractor import TextExtractor

class AzureFormRecognizerTextExtractor(TextExtractor):
    def __init__(self, endpoint: str, key: str):
        """
        Initializes the Azure Form Recognizer client.
        
        :param endpoint: The endpoint URL for the Azure Form Recognizer resource.
        :param key: The API key for the Azure Form Recognizer resource.
        """
        self.endpoint = endpoint
        self.key = key
        self.client = DocumentAnalysisClient(
            endpoint=self.endpoint,
            credential=AzureKeyCredential(self.key)
        )

    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extracts text from a file using Azure Form Recognizer.

        :param file_path: Path to the PDF or image file.
        :param kwargs: Additional keyword arguments. You can override the model by providing 'model'
                       (default: 'prebuilt-document').
        :return: A string containing the extracted text.
        """
        # Use a custom model if provided, otherwise default to 'prebuilt-document'
        model = kwargs.get("model", "prebuilt-document")
        extracted_text = ""

        # Open the file in binary mode
        with open(file_path, "rb") as document:
            poller = self.client.begin_analyze_document(model, document=document)
            result = poller.result()

        # Process the result to accumulate text from all pages
        for page in result.pages:
            for line in page.lines:
                extracted_text += line.content + "\n"

        return extracted_text
