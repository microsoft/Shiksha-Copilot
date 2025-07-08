import os
from typing import Dict, Any


class Config:
    """Configuration class for the lesson plan workflow system"""

    # OpenAI configuration
    AZURE_OPENAI_API_BASE = os.environ.get(
        "AZURE_OPENAI_API_BASE", "https://api.openai.com"
    )
    AZURE_OPENAI_API_KEY = os.environ.get("AZURE_OPENAI_API_KEY")
    AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2023-05-15")
    AZURE_OPENAI_MODEL = os.environ.get("AZURE_OPENAI_MODEL", "gpt-4o")
    AZURE_OPENAI_EMBED_MODEL = os.environ.get(
        "AZURE_OPENAI_EMBED_MODEL", "text-embedding-ada-002"
    )
    BLOB_STORE_CONNECTION_STRING = os.environ.get("BLOB_STORE_CONNECTION_STRING", None)
    BLOB_STORE_URL = os.environ.get("BLOB_STORE_URL", None)
