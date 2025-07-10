import logging
import re
from typing import List, Dict, Any
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
    _SYSTEM_MESSAGE = """
    You are a precise Markdown cleaner processing a document in segments. Your primary jobs are:
    1. Fix minor OCR issues when context makes it clear what the correction should be
    2. Correctly identify true headings vs lines with spurious # characters
    3. FORMAT math properly ($...$ for inline, $$...$$for display)
    4. AGGRESSIVELY ELIMINATE all repeated text, paragraphs and spurious characters
    5. **PRESERVE all page markers** (such as -- Page # ---) exactly as they appear in the input.
    
    Track the document structure across segments to maintain coherence and avoid treating
    non-heading text as headings. The document is being processed in sequential segments,
    so maintain awareness of what you've already seen.
    """

    _CLEAN_PROMPT = """
    You'll receive a fragment of OCR-extracted textbook text that may include:
    
    - Minor OCR glitches (broken or missing words)
    - Spurious heading marks (`#`) inside prose
    - Un-formatted math
    - Disruptive inserts that break reading flow
    - Repeated sentences, paragraphs, or phrases
    - Randomly repeated text or special characters
    - Page markers in the format `-- Page # ---`
    
    ### RAW INPUT
    ```markdown
    {{MARKDOWN_CONTENT}}
    ```
    
    ### YOUR TASK
    Return **only** a Pandoc-compliant Markdown version with these rules:
    
    1. **Correct OCR errors** only when context makes it unambiguous—do not invent new content.  
    2. **Headings**:  
        - Keep valid `#` headings.  
        - Lines beginning with `#` that aren't true titles → strip the leading `#` and treat as normal text. 
        - Decide if the line is a heading or not based on current and previous messages. 
    3. **Math**:  
        - Inline → `$…$`  
        - Display → `$$…$$`  
    4. **Disruptive blocks** (annotations, fragmented code, illegible snippets): wrap the actual content of the block in a fenced code block, like this:  
        ```
        [the actual content from the input markdown goes here]
        ```  
    5. **Preserve** all genuine lists, tables, images, blockquotes and valid structure. 
    6. **No hallucination**: Do not summarize or interpret the text.
    7. **AGGRESSIVELY remove all repetitions**: Delete redundant sentences, paragraphs, or phrases that are duplicated in the current markdown content OR from previous segments.
    8. **Clean up artifacts**: Remove randomly repeated text and special characters that do not belong to the text. 
    9. **PRESERVE all page markers** (such as -- Page # ---) exactly as they appear in the input, in the correct position.
    
    Respond **only** with the cleaned Markdown — nothing else.
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
            # Preprocess text to reduce obvious repetitions before chunking
            text = self._preprocess_repetitions(text)

            # Split the text into logical segments
            segments = self._segment_markdown(text)

            self._logger.info(f"Split markdown content into {len(segments)} segments")

            # Process each segment and collect the results
            processed_segments = []

            # Initialize messages list with system message to maintain context across batches
            all_messages = [{"role": "system", "content": self._SYSTEM_MESSAGE}]

            # Process segments in batches of at most 3 (to prevent context window overflows)
            for i in range(0, len(segments), 3):
                # Take up to 3 segments at a time
                batch_segments = segments[i : i + 3]
                messages_for_batch = (
                    all_messages.copy()
                )  # Start with accumulated context

                for segment in batch_segments:
                    # Construct the prompt by replacing the placeholder with the segment
                    prompt = self._CLEAN_PROMPT.replace("{{MARKDOWN_CONTENT}}", segment)
                    messages_for_batch.append({"role": "user", "content": prompt})

                    # Build the parameters for the completion API
                    completion_args = {
                        "model": f"azure/{kwargs.get('deployment_name', '')}",
                        "api_base": kwargs.get("api_base", ""),
                        "api_version": kwargs.get("api_version", ""),
                        "messages": messages_for_batch,
                        "num_retries": 3,
                    }
                    if "azure_ad_token" in kwargs:
                        completion_args["azure_ad_token"] = kwargs["azure_ad_token"]
                    else:
                        completion_args["api_key"] = kwargs.get("api_key", "")

                    response = completion(**completion_args)
                    content = response["choices"][0]["message"]["content"]

                    # Remove any markdown code fences if present
                    content = content.strip("```markdown").strip("```")

                    # Add to running context for future segments
                    messages_for_batch.append({"role": "assistant", "content": content})

                    # For efficiency, only keep the most recent cleaned segments in the context
                    # This helps prevent token limit issues while maintaining enough context
                    if (
                        len(messages_for_batch) > 7
                    ):  # system + 3 pairs of user/assistant messages
                        all_messages = [messages_for_batch[0]] + messages_for_batch[-6:]
                    else:
                        all_messages = messages_for_batch.copy()

                    processed_segments.append(content)

            # Combine all processed segments
            final_content = self._combine_segments(processed_segments)
            return final_content

        except Exception as e:
            self._logger.error(f"Error during markdown post-processing: {e}")
            return ""

    def _preprocess_repetitions(self, text: str) -> str:
        """
        Performs basic preprocessing to remove obvious repetitions before chunking.
        This helps reduce the size of the input and make the LLM's job easier.

        Args:
            text (str): Raw markdown text

        Returns:
            str: Preprocessed text with obvious repetitions removed
        """
        # Remove consecutive duplicate lines (exact matches)
        lines = text.split("\n")
        unique_lines = []
        prev_line = None

        for line in lines:
            if line != prev_line:
                unique_lines.append(line)
            prev_line = line

        # Remove sequences of repeated characters (more than 3 in a row)
        text = "\n".join(unique_lines)
        text = re.sub(r"([^\w\s])\1{3,}", r"\1\1", text)

        return text

    def _segment_markdown(self, text: str, max_segment_size: int = 4000) -> List[str]:
        """
        Segments markdown text into logical chunks under max_segment_size characters,
        preferring headers, blank lines, sentence ends, then newlines.
        """
        import re, bisect

        # Compile regexes
        header_re = re.compile(r"\n#{1,6}\s")
        blank_line_re = re.compile(r"\n\s*\n")
        sentence_end_re = re.compile(r"[\.!?]\s")
        newline_re = re.compile(r"\n")

        n = len(text)
        if n <= max_segment_size:
            return [text.strip()]

        # 1. Gather all candidate breakpoints with priority
        #    1=header, 2=blank line, 3=sentence end, 4=newline
        breaks: List[tuple[int, int]] = []
        for m in header_re.finditer(text):
            breaks.append((m.start(), 1))
        for m in blank_line_re.finditer(text):
            breaks.append((m.start() + 1, 2))
        for m in sentence_end_re.finditer(text):
            breaks.append((m.end(), 3))
        for m in newline_re.finditer(text):
            breaks.append((m.start() + 1, 4))

        # 2. Sort once by position then priority, and extract positions
        breaks.sort(key=lambda x: (x[0], x[1]))
        positions = [pos for pos, _ in breaks]

        # 3. Slide a window and pick the best split via bisect
        segments: List[str] = []
        start = 0

        while start < n:
            # If remainder is small enough, take it all
            if n - start <= max_segment_size:
                segments.append(text[start:].strip())
                break

            window_end = start + max_segment_size
            idx = bisect.bisect_right(positions, window_end)

            # Choose the breakpoint with lowest priority and closest to window_end
            best: tuple[int, int] | None = None
            for pos, prio in breaks[:idx]:
                if pos <= start:
                    continue
                if best is None or (prio, window_end - pos) < (
                    best[1],
                    window_end - best[0],
                ):
                    best = (pos, prio)

            split = best[0] if best else window_end
            segments.append(text[start:split].strip())
            start = split

        return segments

    def _combine_segments(self, segments: list[str]) -> str:
        """
        Combines processed markdown segments into a cohesive document.

        Args:
            segments (list[str]): List of processed markdown segments

        Returns:
            str: Combined markdown document
        """
        return "\n\n".join(segments)
