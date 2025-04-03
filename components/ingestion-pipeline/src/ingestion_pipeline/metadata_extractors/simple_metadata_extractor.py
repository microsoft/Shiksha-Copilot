import json
from litellm import completion
import logging
from ingestion_pipeline.base.metadata_extractor import MetadataExtractor

class SimpleMetadataExtractor(MetadataExtractor):
    _logger = logging.getLogger(__name__)
    _PROMPT = """
    You are a precise and careful information extraction assistant.

    Below is the content of a chapter from a student textbook written in **Markdown** format. Your task is to **generate a JSON object** that contains only the metadata explicitly present in the Markdown text — **do not hallucinate or infer** any information not directly mentioned.

    Only extract data exactly as it appears, and do not attempt to interpret or summarize it. If any field is not found in the text, **omit** that field from the output. Do not make up default values.

    ---

    ### 📄 Chapter Markdown Content:
    
    {{MARKDOWN_CONTENT}}
    
    ---
    
    ### 🧾 Expected Output Format:
    Please extract the metadata from the above content and structure it exactly like the following JSON format. Replace the placeholder values with actual content from the Markdown above.

    ```json
    {{OUTPUT_FORMAT}}
    ```
    
    Respond ONLY with the final JSON object. Do not add any additional explanation or preamble. Ensure zero hallucination: only use what's directly present in the Markdown text.
    """
    
    def extract(self, text_str: str, output_json_structure: dict, **kwargs) -> dict:
        """
        Extract metadata from a string (preferably in Markdown format) using a large language model (LLM).
        
        Required keyword arguments for Azure OpenAI:
            - Either:
                - `api_key`: Azure OpenAI API key
                - OR `azure_ad_token`: Azure Active Directory token
            - `api_base`: Base URL for the Azure OpenAI endpoint
            - `api_version`: API version
            - `deployment_name`: Name of the deployed model

        Args:
            text_str (str): The Markdown-formatted input text.
            output_json_structure (dict): JSON structure to guide the output.
            **kwargs: Azure OpenAI credentials and configuration.

        Returns:
            dict: Extracted metadata as JSON. Returns an empty dict on failure.
        """
        try:
            prompt = (
                self._PROMPT
                .replace("{{MARKDOWN_CONTENT}}", text_str)
                .replace("{{OUTPUT_FORMAT}}", json.dumps(output_json_structure, indent=2, ensure_ascii=False))
            )

            completion_args = {
                "model": f"azure/{kwargs.get('deployment_name', '')}",
                "api_base": kwargs.get("api_base", ""),
                "api_version": kwargs.get("api_version", ""),
                "messages": [{"role": "user", "content": prompt}],
            }

            if "azure_ad_token" in kwargs:
                completion_args["azure_ad_token"] = kwargs["azure_ad_token"]
            else:
                completion_args["api_key"] = kwargs.get("api_key", "")

            response = completion(**completion_args)
            content = response["choices"][0]["message"]["content"].strip("```json").strip('```')
            return json.loads(content)

        except json.JSONDecodeError as e:
            self._logger.error(f"Error decoding JSON: {e}")
            self._logger.error(f"Response content: {content}")
        except Exception as e:
            self._logger.error(f"Unexpected error in extract: {e}")
        
        return {}
