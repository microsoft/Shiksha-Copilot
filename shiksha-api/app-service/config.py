"""
Configuration management for the FastAPI application.
Uses Pydantic Settings for type-safe environment variable handling.
"""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AzureOpenAISettings(BaseSettings):
    """Azure OpenAI specific configuration."""

    model_config = SettingsConfigDict(env_prefix="AZURE_OPENAI_")

    endpoint: str = Field(..., description="Azure OpenAI endpoint URL")
    api_version: str = Field(
        default="2024-02-01", description="Azure OpenAI API version"
    )
    deployment_name: str = Field(..., description="Azure OpenAI deployment name")


class AzureAuthSettings(BaseSettings):
    """Azure authentication configuration."""

    model_config = SettingsConfigDict(env_prefix="AZURE_")

    client_id: Optional[str] = Field(
        default=None, description="Azure client ID for service principal auth"
    )
    client_secret: Optional[str] = Field(
        default=None, description="Azure client secret"
    )
    tenant_id: Optional[str] = Field(default=None, description="Azure tenant ID")


class RAGSettings(BaseSettings):
    """RAG (Retrieval Augmented Generation) configuration."""

    model_config = SettingsConfigDict(env_prefix="RAG_")

    index_name: str = Field(default="shiksha-index", description="Search index name")
    search_top_k: int = Field(
        default=5, description="Number of top results to retrieve"
    )
    chunk_size: int = Field(default=1000, description="Text chunk size for processing")
    chunk_overlap: int = Field(default=200, description="Overlap between text chunks")


class LiteLLMSettings(BaseSettings):
    """LiteLLM configuration."""

    model_config = SettingsConfigDict(env_prefix="LITELLM_")

    model_name: str = Field(default="azure/gpt-4", description="LiteLLM model name")
    max_tokens: int = Field(default=4000, description="Maximum tokens per request")
    temperature: float = Field(
        default=0.7, description="Temperature for text generation"
    )


class AutogenSettings(BaseSettings):
    """Autogen agent configuration."""

    model_config = SettingsConfigDict(env_prefix="AUTOGEN_")

    max_round: int = Field(default=10, description="Maximum conversation rounds")
    cache_seed: int = Field(
        default=42, description="Cache seed for reproducible results"
    )


class AppSettings(BaseSettings):
    """Main application configuration."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = Field(default="shiksha-api", description="Application name")
    log_level: str = Field(default="INFO", description="Logging level")
    debug: bool = Field(default=False, description="Debug mode")
    max_concurrent_requests: int = Field(
        default=100, description="Maximum concurrent requests"
    )

    # Database and cache settings
    database_url: Optional[str] = Field(
        default=None, description="Database connection URL"
    )
    redis_url: Optional[str] = Field(default=None, description="Redis connection URL")

    # Nested settings
    azure_openai: AzureOpenAISettings = Field(default_factory=AzureOpenAISettings)
    azure_auth: AzureAuthSettings = Field(default_factory=AzureAuthSettings)
    rag: RAGSettings = Field(default_factory=RAGSettings)
    litellm: LiteLLMSettings = Field(default_factory=LiteLLMSettings)
    autogen: AutogenSettings = Field(default_factory=AutogenSettings)


# Global settings instance
settings = AppSettings()
