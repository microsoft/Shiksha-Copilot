import os

def get_azure_openai_credentials():
    """Retrieve Azure OpenAI credentials from environment variables."""
    credentials = {
        "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
        "api_base": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_version": os.getenv("AZURE_OPENAI_API_VERSION"),
        "deployment_name": os.getenv("AZURE_OPENAI_MODEL"),
    }

    # Validate that all required credentials are present
    missing_vars = [key for key, value in credentials.items() if not value]
    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}. "
            "Please ensure all Azure OpenAI credentials are set in your .env file."
        )

    return credentials
