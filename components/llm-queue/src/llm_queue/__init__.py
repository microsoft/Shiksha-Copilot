import logging

# Create a null handler to avoid "No handler found" warnings
logging.getLogger(__name__).addHandler(logging.NullHandler())

from llm_queue.main import LLMQueue
