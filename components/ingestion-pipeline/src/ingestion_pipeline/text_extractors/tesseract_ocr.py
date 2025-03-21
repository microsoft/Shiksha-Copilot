import pytesseract
from pdf2image import convert_from_path
from ingestion_pipeline.base.text_extractor import TextExtractor

class TesseractTextExtractor(TextExtractor):
    def extract_text(self, file_path: str, **kwargs) -> str:
        """
        Extract text from a PDF file using Tesseract OCR.
        
        Keyword Args:
            two_columns (bool): Set to True if the PDF contains two columns.
                                In that case, the page will be split into left and right halves
                                and processed in order. Default is False.
        
        Parameters:
            file_path (str): The path to the PDF file.
        
        Returns:
            str: The combined extracted text from the PDF.
        """
        two_columns = kwargs.get("two_columns", False)
        # Convert PDF pages to a list of PIL images.
        images = convert_from_path(file_path)
        full_text = ""

        for image in images:
            if two_columns:
                width, height = image.size
                # Define the bounding boxes for left and right halves.
                left_box = (0, 0, width // 2, height)
                right_box = (width // 2, 0, width, height)
                # Crop the image for each column.
                left_image = image.crop(left_box)
                right_image = image.crop(right_box)
                # Extract text from each column.
                left_text = pytesseract.image_to_string(left_image)
                right_text = pytesseract.image_to_string(right_image)
                page_text = left_text + "\n" + right_text
            else:
                page_text = pytesseract.image_to_string(image)
            
            full_text += page_text + "\n"

        return full_text
