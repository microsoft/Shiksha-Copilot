from abc import ABC, abstractmethod
from typing import Type, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)

class MetadataExtractor(ABC):
    @abstractmethod
    def extract(self, text_str: str, model_class: Type[T], **kwargs) -> T:
        """
        Abstract method to extract metadata from the provided text string and return a Pydantic model instance.

        :param text_str: The input text string from which metadata will be extracted.
        :param model_class: A Pydantic model class defining the structure and field descriptions for the output.
        :param kwargs: Additional keyword arguments to customize the extraction process.
        :return: An instance of the provided Pydantic model class populated with extracted data.
        """
        pass