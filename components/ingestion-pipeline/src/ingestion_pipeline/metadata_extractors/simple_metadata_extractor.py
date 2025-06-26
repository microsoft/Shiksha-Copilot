import json
from litellm import completion
import logging
import re
from typing import List, Dict, Any, Tuple, Type, TypeVar
from pydantic import BaseModel
from ingestion_pipeline.base.metadata_extractor import MetadataExtractor, T

class SimpleMetadataExtractor(MetadataExtractor):
    _logger = logging.getLogger(__name__)
    _PROMPT = """
        You are a precise information extraction assistant for textbook analysis.

        Below is the content of a chapter from a student textbook written in **Markdown** format. Your task is to **generate a JSON object** that follows the structure defined in the provided JSON schema.

        IMPORTANT INSTRUCTIONS:
        - Your output must ONLY include the actual data fields from the schema, not descriptions or metadata
        - Include ONLY the attributes shown in the schema's "properties" section
        - If you cannot find information for a required field, include it with an empty value (empty array [] or empty string "")
        - DO NOT include any schema metadata like "description", "type", "title", etc. in your output
        - Examine the schema carefully to understand what each field represents, but only output the field names and their values

        ---

        ### 📄 Chapter Markdown Content:
        
        {{MARKDOWN_CONTENT}}
        
        ---
        
        ### 📝 Field Descriptions:
        {{FIELD_DESCRIPTIONS}}
        
        ### 🧾 JSON Output Structure:
        ```json
        {{OUTPUT_FORMAT}}
        ```
        
        Respond ONLY with a valid JSON object containing just the required data fields from the schema. Do not include any explanations or preamble.
    """
    
    _CHUNKING_PROMPT = """
        You are a precise information extraction assistant for textbook analysis.

        Below is a PORTION of content from a student textbook written in **Markdown** format. Your task is to **generate a JSON object** that follows the structure defined in the provided JSON schema, based only on this portion of text.

        IMPORTANT INSTRUCTIONS:
        - Your output must ONLY include the actual data fields from the schema, not descriptions or metadata
        - Include ONLY the attributes shown in the schema's "properties" section
        - DO NOT include any schema metadata like "description", "type", "title", etc. in your output
        - Since this is just a portion of the full document, you may not find all information - that's expected
        - For any field you cannot populate from this portion, include it with an empty value (empty array [] or empty string "")
        - Examine the schema carefully to understand what each field represents, but only output the field names and their values

        ---

        ### 📄 Chapter Markdown Content (PORTION {{CHUNK_NUMBER}} of {{TOTAL_CHUNKS}}):
        
        {{MARKDOWN_CONTENT}}
        
        ---
        
        ### 📝 Field Descriptions:
        {{FIELD_DESCRIPTIONS}}
        
        ### 🧾 JSON Output Structure:
        ```json
        {{OUTPUT_FORMAT}}
        ```
        
        Respond ONLY with a valid JSON object containing just the required data fields from the schema. Do not include any explanations or preamble.
    """
    
    _CLEANUP_PROMPT = """
        You are a precision data cleaner for textbook metadata.

        Below is metadata JSON that was extracted from chunks of a student textbook and then merged. Your task is to produce a FINAL JSON object that follows the provided schema structure while ensuring the data is clean and consistent.

        Clean up the merged metadata by:
        1. Including ONLY the fields defined in the schema's "properties" section
        2. Removing any redundant or duplicate information in arrays or other multi-value fields
        3. Ensuring consistent formatting and resolving any contradictions
        4. Preserving all unique information without unnecessary repetition
        
        CRITICAL REQUIREMENTS:
        - Your output must be valid JSON containing ONLY the data fields from the schema
        - DO NOT include any schema metadata like "description", "type", "title", etc. in your output
        - All required fields must be present in your output, even if empty
        - If a field is absent in the merged metadata but present in the schema, include it with an appropriate empty value
        - Examine the schema carefully to understand what each field represents, but only output the field names and their values

        ---

        ### Original Merged Metadata JSON:
        ```json
        {{MERGED_METADATA}}
        ```

        ---
        
        ### 📝 Field Descriptions:
        {{FIELD_DESCRIPTIONS}}

        ### 🧾 JSON Output Structure:
        ```json
        {{OUTPUT_FORMAT}}
        ```

        Respond ONLY with a valid JSON object containing just the data fields from the schema. Do not include any explanations or preamble.
    """
    
    def _adaptively_split_text(self, text: str, num_parts: int) -> List[str]:
        """
        Split text into approximately equal parts by paragraphs.
        
        Args:
            text (str): The text to split
            num_parts (int): Number of parts to split the text into
            
        Returns:
            List[str]: List of text chunks of approximately equal size
        """
        # Split text by paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        
        # Calculate the approximate number of paragraphs per chunk
        paragraphs_per_chunk = max(1, len(paragraphs) // num_parts)
        
        chunks = []
        current_chunk = []
        
        for i, paragraph in enumerate(paragraphs):
            current_chunk.append(paragraph)
            
            # If we've reached the target paragraphs per chunk or it's the last paragraph
            if (i + 1) % paragraphs_per_chunk == 0 or i == len(paragraphs) - 1:
                chunks.append("\n\n".join(current_chunk))
                current_chunk = []
        
        # Handle any remaining paragraphs
        if current_chunk:
            chunks.append("\n\n".join(current_chunk))
            
        return chunks
        
    def _merge_metadata(self, metadata_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Merge metadata extracted from different chunks into a single coherent metadata object.
        
        Args:
            metadata_list (List[Dict[str, Any]]): List of metadata dictionaries from each chunk
            
        Returns:
            Dict[str, Any]: Merged metadata
        """
        if not metadata_list:
            return {}
        
        # Start with the first metadata dict
        merged = metadata_list[0].copy()
        
        for metadata in metadata_list[1:]:
            for key, value in metadata.items():
                # Skip empty values
                if not value:
                    continue
                    
                # If key doesn't exist in merged yet, add it
                if key not in merged:
                    merged[key] = value
                    continue
                
                # If both are lists, merge lists without duplicates
                if isinstance(merged[key], list) and isinstance(value, list):
                    # Convert all items to strings for comparison to avoid type issues
                    existing_items = [str(item).lower() for item in merged[key]]
                    for item in value:
                        # Check for duplicates case-insensitively
                        if str(item).lower() not in existing_items:
                            merged[key].append(item)
                            existing_items.append(str(item).lower())
                
                # If current value is empty but new one isn't
                elif not merged[key] and value:
                    merged[key] = value
                    
                # If both are strings, concatenate if they're different
                elif isinstance(merged[key], str) and isinstance(value, str):
                    # Only concatenate if they're different and both non-empty
                    if merged[key].lower() != value.lower() and value:
                        if "title" in key.lower() or "chapter" in key.lower() or "heading" in key.lower():
                            # For titles, prefer the longer or more complete version
                            if len(value) > len(merged[key]):
                                merged[key] = value
                        else:
                            # For other text fields, concatenate with a separator
                            merged[key] = f"{merged[key]}; {value}"
        
        return merged
        
    def _clean_merged_metadata(self, merged_metadata: Dict[str, Any], output_json_structure: dict, field_descriptions: str, **kwargs) -> Dict[str, Any]:
        """
        Clean up merged metadata using a final LLM pass to remove redundancies and inconsistencies.
        
        Args:
            merged_metadata (Dict[str, Any]): The merged metadata from multiple chunks
            output_json_structure (dict): The expected structure of the output
            field_descriptions (str): Descriptions of the fields formatted as a string
            **kwargs: Azure OpenAI credentials and configuration
            
        Returns:
            Dict[str, Any]: Cleaned metadata
        """
        try:
            prompt = (
                self._CLEANUP_PROMPT
                .replace("{{MERGED_METADATA}}", json.dumps(merged_metadata, indent=2, ensure_ascii=False))
                .replace("{{OUTPUT_FORMAT}}", json.dumps(output_json_structure, indent=2, ensure_ascii=False))
                .replace("{{FIELD_DESCRIPTIONS}}", field_descriptions)
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

            self._logger.info("Performing final cleanup of merged metadata")
            response = completion(**completion_args)
            content = response["choices"][0]["message"]["content"].strip()
            
            # Handle various JSON formatting in responses
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            
            return json.loads(content)
            
        except json.JSONDecodeError as e:
            self._logger.error(f"Error decoding JSON in cleanup: {e}")
            self._logger.error(f"Response content: {content if 'content' in locals() else 'No content'}")
            # Return the original merged metadata if cleanup fails
            return merged_metadata
        except Exception as e:
            self._logger.error(f"Unexpected error in cleanup: {e}")
            # Return the original merged metadata if cleanup fails
            return merged_metadata
        
    def _extract_from_chunk(self, text_str: str, output_json_structure: dict, field_descriptions: str, chunk_info=None, **kwargs) -> Tuple[dict, bool]:
        """
        Extract metadata from a single chunk of text.
        
        Args:
            text_str (str): The chunk of Markdown-formatted input text.
            output_json_structure (dict): JSON structure to guide the output.
            field_descriptions (str): Descriptions of the fields formatted as a string
            chunk_info (dict, optional): Information about the current chunk for prompt formatting.
            **kwargs: Azure OpenAI credentials and configuration.
            
        Returns:
            Tuple[dict, bool]: (Extracted metadata as JSON, Success flag). 
                              Returns an empty dict and False on context length error.
        """
        try:
            # Use chunking prompt if chunk_info is provided
            if chunk_info:
                prompt_template = self._CHUNKING_PROMPT
                prompt = (
                    prompt_template
                    .replace("{{MARKDOWN_CONTENT}}", text_str)
                    .replace("{{OUTPUT_FORMAT}}", json.dumps(output_json_structure, indent=2, ensure_ascii=False))
                    .replace("{{FIELD_DESCRIPTIONS}}", field_descriptions)
                    .replace("{{CHUNK_NUMBER}}", str(chunk_info["current"]))
                    .replace("{{TOTAL_CHUNKS}}", str(chunk_info["total"]))
                )
            else:
                prompt = (
                    self._PROMPT
                    .replace("{{MARKDOWN_CONTENT}}", text_str)
                    .replace("{{OUTPUT_FORMAT}}", json.dumps(output_json_structure, indent=2, ensure_ascii=False))
                    .replace("{{FIELD_DESCRIPTIONS}}", field_descriptions)
                )

            # print('------------------------------------\n', prompt, '\n------------------------------------')
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
            content = response["choices"][0]["message"]["content"].strip()
            
            print('------------------------------------\n', content, '\n------------------------------------')
            
            # Handle various JSON formatting in responses
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            
            return json.loads(content), True

        except json.JSONDecodeError as e:
            self._logger.error(f"Error decoding JSON: {e}")
            self._logger.error(f"Response content: {content if 'content' in locals() else 'No content'}")
            return {}, False
        except Exception as e:
            self._logger.error(f"Unexpected error in extract: {e}")
            # Check if the error is related to context length
            error_str = str(e).lower()
            if any(term in error_str for term in ["context length", "token limit", "too long", "maximum context", "maximum tokens"]):
                self._logger.info("Detected context length error, will try splitting the content")
                return {}, False
            return {}, False
    
    def extract(self, text_str: str, model_class: Type[T], **kwargs) -> T:
        """
        Extract metadata from a string (preferably in Markdown format) using a large language model (LLM).
        Handles large documents by adaptively splitting into chunks when necessary and merging results.
        
        Required keyword arguments for Azure OpenAI:
            - Either:
                - `api_key`: Azure OpenAI API key
                - OR `azure_ad_token`: Azure Active Directory token
            - `api_base`: Base URL for the Azure OpenAI endpoint
            - `api_version`: API version
            - `deployment_name`: Name of the deployed model

        Args:
            text_str (str): The Markdown-formatted input text.
            model_class (Type[T]): The Pydantic model class defining the output structure.
            **kwargs: Azure OpenAI credentials and configuration.

        Returns:
            T: An instance of the provided Pydantic model class populated with extracted data.
                Returns an empty model instance on failure.
        """
        # Extract schema structure and field descriptions from the Pydantic model
        output_json_structure, field_descriptions = self._extract_schema_info(model_class)
        
        # Start with the entire document
        result_dict, success = self._extract_from_chunk(text_str, output_json_structure, field_descriptions, **kwargs)
        if success:
            self._logger.info("Successfully processed entire document in a single call")
            return model_class.model_validate(result_dict)
            
        # If single call failed due to context limits, try adaptive chunking
        num_parts = 2
        max_attempts = 5  # Limit the number of recursive splits to prevent infinite loops
        
        for attempt in range(max_attempts):
            self._logger.info(f"Splitting document into {num_parts} parts for attempt {attempt+1}")
            chunks = self._adaptively_split_text(text_str, num_parts)
            
            # Process each chunk and collect results
            metadata_list = []
            all_chunks_succeeded = True
            
            for i, chunk in enumerate(chunks):
                self._logger.info(f"Processing chunk {i+1}/{len(chunks)}")
                chunk_metadata, success = self._extract_from_chunk(
                    chunk, 
                    output_json_structure,
                    field_descriptions,
                    chunk_info={"current": i+1, "total": len(chunks)},
                    **kwargs
                )
                
                if success:
                    if chunk_metadata:
                        metadata_list.append(chunk_metadata)
                else:
                    all_chunks_succeeded = False
                    break
            
            # If all chunks were processed successfully, merge and return
            if all_chunks_succeeded and metadata_list:
                merged_metadata = self._merge_metadata(metadata_list)
                
                # Skip cleanup if we only had one chunk
                if len(metadata_list) <= 1:
                    return model_class.model_validate(merged_metadata)
                
                # Perform a final LLM pass to clean up the merged metadata
                cleaned_metadata = self._clean_merged_metadata(merged_metadata, output_json_structure, field_descriptions, **kwargs)
                return model_class.model_validate(cleaned_metadata)
            
            # Double the number of parts for the next attempt
            num_parts *= 2
        
        self._logger.error(f"Failed to process document after {max_attempts} splitting attempts")
        return model_class()
    
    def _extract_schema_info(self, model_class: Type[BaseModel]) -> Tuple[dict, str]:
        """
        Extract schema structure and field descriptions from a Pydantic model.
        
        Args:
            model_class (Type[BaseModel]): The Pydantic model class
            
        Returns:
            Tuple[dict, str]: (Output JSON structure, Field descriptions formatted as string)
        """
        # Get the JSON schema
        schema = model_class.model_json_schema()
        
        # Extract field descriptions
        field_descriptions = []
        if "properties" in schema:
            for field_name, field_info in schema["properties"].items():
                description = field_info.get("description", "No description provided")
                field_descriptions.append(f"- {field_name}: {description}")
        
        # Create the output structure
        output_structure = self._process_schema_properties(schema)
        
        return output_structure, "\n".join(field_descriptions)
        
    def _process_schema_properties(self, schema: dict) -> dict:
        """
        Process schema properties recursively to handle nested Pydantic models.
        
        Args:
            schema (dict): The JSON schema or a part of it
            
        Returns:
            dict: Output structure with proper handling of nested models
        """
        output_structure = {}
        
        if "properties" in schema:
            for field_name, field_info in schema["properties"].items():
                if field_info.get("type") == "array":
                    # Handle array of objects/nested models
                    if "items" in field_info and field_info["items"].get("type") == "object":
                        if "properties" in field_info["items"]:
                            # This is an array of objects with a defined schema
                            item_structure = self._process_schema_properties(field_info["items"])
                            output_structure[field_name] = [item_structure]
                        else:
                            output_structure[field_name] = []
                    else:
                        # For arrays of primitive types, include a sample value based on the item type
                        if "items" in field_info:
                            item_type = field_info["items"].get("type")
                            if item_type == "string":
                                output_structure[field_name] = [""]
                            elif item_type == "number":
                                output_structure[field_name] = [0]
                            elif item_type == "integer":
                                output_structure[field_name] = [0]
                            elif item_type == "boolean":
                                output_structure[field_name] = [False]
                            else:
                                output_structure[field_name] = []
                        else:
                            output_structure[field_name] = []
                elif field_info.get("type") == "object":
                    # Handle nested object/model
                    if "properties" in field_info:
                        output_structure[field_name] = self._process_schema_properties(field_info)
                    else:
                        output_structure[field_name] = {}
                elif field_info.get("type") == "string":
                    output_structure[field_name] = ""
                elif field_info.get("type") == "number":
                    output_structure[field_name] = 0
                elif field_info.get("type") == "integer":
                    output_structure[field_name] = 0
                elif field_info.get("type") == "boolean":
                    output_structure[field_name] = False
                else:
                    # For any other type or references to other schemas
                    if "$ref" in field_info:
                        # This is a reference to another schema definition
                        # For now, treat it as an empty object
                        output_structure[field_name] = {}
                    else:
                        output_structure[field_name] = None
        
        return output_structure
