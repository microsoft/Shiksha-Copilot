import yaml
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class PromptTemplate:
    """
    A class to manage prompt templates from YAML files.

    Each prompt in the YAML file should have a unique identifier as the key.
    """

    def __init__(self, yaml_file_path: str):
        """
        Initialize the PromptTemplate with a YAML file path.

        Args:
            yaml_file_path (str): Path to the YAML file containing prompts
        """
        self.yaml_file_path = Path(yaml_file_path)
        self._prompts: Dict[str, Any] = {}
        self._load_prompts()

    def _load_prompts(self) -> None:
        """Load prompts from the YAML file."""
        try:
            if not self.yaml_file_path.exists():
                raise FileNotFoundError(f"YAML file not found: {self.yaml_file_path}")

            with open(self.yaml_file_path, "r", encoding="utf-8") as file:
                self._prompts = yaml.safe_load(file) or {}

            logger.info(
                f"Loaded {len(self._prompts)} prompts from {self.yaml_file_path}"
            )

        except yaml.YAMLError as e:
            logger.error(f"Error parsing YAML file {self.yaml_file_path}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading prompts from {self.yaml_file_path}: {e}")
            raise

    def get_prompt(self, prompt_id: str) -> Optional[str]:
        """
        Get a prompt by its unique identifier.

        Args:
            prompt_id (str): Unique identifier of the prompt

        Returns:
            Optional[str]: The prompt text if found, None otherwise
        """
        return self._prompts.get(prompt_id)

    def get_prompt_with_variables(self, prompt_id: str, **variables) -> Optional[str]:
        """
        Get a prompt by its unique identifier and format it with variables.

        Args:
            prompt_id (str): Unique identifier of the prompt
            **variables: Variables to substitute in the prompt template

        Returns:
            Optional[str]: The formatted prompt text if found, None otherwise
        """
        prompt = self.get_prompt(prompt_id)
        if prompt is None:
            return None

        try:
            return prompt.format(**variables)
        except KeyError as e:
            logger.error(f"Missing variable {e} for prompt {prompt_id}")
            raise
        except Exception as e:
            logger.error(f"Error formatting prompt {prompt_id}: {e}")
            raise

    def list_prompt_ids(self) -> list[str]:
        """
        Get a list of all available prompt IDs.

        Returns:
            list[str]: List of all prompt identifiers
        """
        return list(self._prompts.keys())

    def has_prompt(self, prompt_id: str) -> bool:
        """
        Check if a prompt with the given ID exists.

        Args:
            prompt_id (str): Unique identifier of the prompt

        Returns:
            bool: True if prompt exists, False otherwise
        """
        return prompt_id in self._prompts

    def reload_prompts(self) -> None:
        """Reload prompts from the YAML file."""
        self._load_prompts()

    def get_all_prompts(self) -> Dict[str, Any]:
        """
        Get all prompts as a dictionary.

        Returns:
            Dict[str, Any]: Dictionary of all prompts
        """
        return self._prompts.copy()
