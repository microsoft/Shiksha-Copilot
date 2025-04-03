from abc import ABC, abstractmethod

class MetadataExtractor(ABC):
    @abstractmethod
    def extract(self, text_str: str, output_json_structure: dict, **kwargs):
        """
        Abstract method to extract metadata from the provided text string and populate the output JSON structure.

        :param text_str: The input text string from which metadata will be extracted.
        :param output_json_structure: A dictionary representing the structure of the extracted metadata.
        :param kwargs: Additional keyword arguments to customize the extraction process.
        """
        pass