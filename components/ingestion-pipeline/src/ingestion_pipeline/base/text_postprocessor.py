from abc import ABC, abstractmethod

class TextPostProcessor(ABC):
    """Interface for text post-processing components."""
    @abstractmethod
    def post_process(self, text: str, **kwargs) -> str:
        pass