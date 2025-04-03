import logging
import re
from litellm import completion

from ingestion_pipeline.base.text_postprocessor import TextPostProcessor

class CleanMarkdownPostProcessor(TextPostProcessor):
    """
    A post-processor for cleaning and restructuring textbook content written in Markdown format.
    This class uses a large language model (LLM) to:
      - Correct minor OCR errors where context allows.
      - Reorder extra text (such as activities or side notes) by moving them to the end of the current subtopic under appropriate labels.
      - Preserve all original content and structure in Markdown format without hallucination.
    """

    _logger = logging.getLogger(__name__)
    _CLEAN_PROMPT = """
    You are a meticulous and fact-respecting assistant that helps clean and restructure student textbook content written in **Markdown**.

    Below is a section of OCR-extracted text from a textbook. It may contain:
    - Minor OCR errors (e.g., broken or missing words),
    - Incorrect use of Markdown headings (lines starting with '#' that are not actual section titles),
    - Math equations that do not follow proper Markdown format,
    - Not easily readable and/or student-friendly

    ---

    Your job is to return a **cleaned and logically structured Pandoc-compliant Markdown version** of the content with the following rules:

    1. **Fix minor OCR errors**: Correct broken or missing words *only if clearly and unambiguously deducible* from context. Do **not hallucinate** or invent anything.
    2. **Fix incorrect headings**: If a line starts with one or more `#` characters but is not a proper heading (e.g., part of a paragraph, annotation, or side note), remove the `#` and convert it into plain text.
    3. **Preserve all valid original content**, but improve readability by:
        - Marking any reading flow breaking text inside a markdown code block  
        - Wrap each of these blocks in a **code block** like this:
            ```
            Your moved block content here. It may span multiple lines.
            ```
    4. Use **Pandoc-compatible Markdown** syntax throughout, including:
    - `#` for valid headings
    - Lists, tables, images, and block quotes
    - **Math equations**:
        - Inline math: use `$...$`
        - Display math: use `$$...$$`

    ---

    ### 📝 Raw Extracted Markdown:
    ```
    {{MARKDOWN_CONTENT}}
    ```
    ---
    
    ### ✅ Output:
    Return the cleaned and corrected content as **Pandoc Markdown**.

    - The main text should be clearly readable, well-structured, and student-friendly.
    - All boxed or disruptive inserts should appear inside **code** blocks.
    - Math should use `$...$` for inline and `$$...$$` for block equations.
    - No hallucination, summarization, or interpretation.

    Respond only with the cleaned Markdown output.
    """
    def post_process(self, text: str, **kwargs) -> str:
        """
        Clean and restructure extracted Markdown content to improve readability and comprehension.
        For large content, segments the text into logical chunks and processes each separately.

        Args:
            text (str): The raw extracted Markdown content to be cleaned.
            **kwargs: Additional parameters for the LLM API, such as deployment name, API base, and API version.

        Returns:
            str: The cleaned and restructured Markdown text, or an empty string in case of an error.
        """
        try:
            # Split the text into logical segments
            segments = self._segment_markdown(text)
            
            self._logger.info(f"Split markdown content into {len(segments)} segments")
            
            # Process each segment and collect the results
            processed_segments = []
            messages = []
            
            for i, segment in enumerate(segments):
                self._logger.info(f"************** Processing content: \n\n{segment}\n\n**************")
                
                # Construct the prompt by replacing the placeholder with the segment
                prompt = self._CLEAN_PROMPT.replace("{{MARKDOWN_CONTENT}}", segment)
                messages.append({"role": "user", "content": prompt})

                # Build the parameters for the completion API
                completion_args = {
                    "model": f"azure/{kwargs.get('deployment_name', '')}",
                    "api_base": kwargs.get("api_base", ""),
                    "api_version": kwargs.get("api_version", ""),
                    "messages": messages,
                    "num_retries": 3,
                }
                if "azure_ad_token" in kwargs:
                    completion_args["azure_ad_token"] = kwargs["azure_ad_token"]
                else:
                    completion_args["api_key"] = kwargs.get("api_key", "")

                response = completion(**completion_args)
                content = response["choices"][0]["message"]["content"]

                # Remove any markdown code fences if present
                content = content.strip('```markdown').strip("```")

                messages.append({"role": "assistant", "content": content})
                processed_segments.append(content)
            
            # Combine all processed segments
            final_content = self._combine_segments(processed_segments)
            return final_content

        except Exception as e:
            self._logger.error(f"Error during markdown post-processing: {e}")
            return ""
            
    def _segment_markdown(self, text: str, max_segment_size: int = 4000) -> list[str]:
        """
        Segments markdown text into logical chunks, preserving paragraph and sentence integrity.
        
        Args:
            text (str): The markdown text to segment
            max_segment_size (int): Maximum size of each segment in characters
            
        Returns:
            list[str]: List of text segments
        """
        # Return as is if text is smaller than max size
        if len(text) <= max_segment_size:
            return [text]
        
        segments = []
        remaining_text = text
        
        while remaining_text:
            # If remaining text fits in one segment
            if len(remaining_text) <= max_segment_size:
                segments.append(remaining_text)
                break
            
            # Find the best breakpoint within max_segment_size
            text_to_split = remaining_text[:max_segment_size]
            
            # Try to find breakpoints in order of preference
            breakpoint = -1
            
            # 1. Try to break at headers (# Header)
            header_positions = [match.start() for match in re.finditer(r'\n#{1,6} ', text_to_split)]
            if header_positions:
                # Get the position of the last header in this segment
                # We want to break right BEFORE the header, so the header starts the next segment
                breakpoint = max(header_positions)
            
            # 2. If no header found, try to break at blank lines
            if breakpoint == -1:
                blank_line_positions = [match.start() for match in re.finditer(r'\n\s*\n', text_to_split)]
                if blank_line_positions:
                    breakpoint = max(blank_line_positions) + 1  # +1 to include the first newline
            
            # 3. If no blank line, try to break at the end of a sentence
            if breakpoint == -1:
                sentence_end_positions = [match.end() for match in re.finditer(r'[.!?]\s', text_to_split)]
                if sentence_end_positions:
                    breakpoint = max(sentence_end_positions)
            
            # 4. If all else fails, break at the last newline
            if breakpoint == -1:
                last_newline = text_to_split.rfind('\n')
                if last_newline > 0:  # Ensure we found a newline
                    breakpoint = last_newline + 1  # +1 to include the newline
            
            # 5. If there are no good break points, just use max_segment_size
            if breakpoint <= 0:
                breakpoint = max_segment_size
            
            # Create segment and update remaining text
            segment = remaining_text[:breakpoint].rstrip()
            segments.append(segment)
            remaining_text = remaining_text[breakpoint:].lstrip()
        
        return segments
    
    def _combine_segments(self, segments: list[str]) -> str:
        """
        Combines processed markdown segments into a cohesive document.
        
        Args:
            segments (list[str]): List of processed markdown segments
            
        Returns:
            str: Combined markdown document
        """
        return '\n\n'.join(segments)
