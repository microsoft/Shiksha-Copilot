from abc import ABC, abstractmethod


class TextExtractor(ABC):
    """Interface for Text extraction components."""
    @abstractmethod
    def extract_text(self, file_path: str, **kwargs) -> str:
        pass