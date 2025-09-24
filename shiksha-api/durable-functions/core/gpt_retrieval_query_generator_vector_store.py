from core.logger import LoggerFactory
from typing import Optional, Dict, Any, List
from textwrap import dedent

from .agents import AgentPool
from .models.workflow_models import GPTInput


class GPTRetrievalQueryGeneratorVectorStore:
    """
    Uses GPT to intelligently generate retrieval queries for vector store containing
    textbook chapters. Given a section description, this class creates optimized
    search queries to find the most relevant textbook content.
    """

    logger = LoggerFactory.get_logger("GPTRetrievalQueryGeneratorVectorStore")

    async def generate_retrieval_query(
        self,
        section_description: str,
        topics: Optional[List[str]] = None,
        learning_outcomes: Optional[List[str]] = None,
        max_query_length: int = 500,
    ) -> str:
        """
        Generate an intelligent retrieval query for textbook content based on section description,
        topics, and learning outcomes.

        Args:
            section_description: Description of the section content needed
            topics: Optional list of topics/subtopics to focus on
            learning_outcomes: Optional list of specific learning outcomes
            max_query_length: Maximum length of the generated query

        Returns:
            Optimized retrieval query for finding relevant textbook content
        """
        if not section_description or len(section_description.strip()) < 10:
            raise ValueError("Section description must be provided and meaningful")

        # Create the query generation prompt
        query_generation_prompt = self._build_query_generation_prompt(
            section_description=section_description,
            topics=topics,
            learning_outcomes=learning_outcomes,
            max_query_length=max_query_length,
        )

        try:
            # Get GPT agent and generate retrieval query
            gpt_agent = AgentPool.get_gpt_agent()
            gpt_input = GPTInput(prompt=query_generation_prompt)

            retrieval_query = await gpt_agent.generate_section(gpt_input)

            # Clean and validate the generated query
            retrieval_query = self._clean_and_validate_query(
                retrieval_query, max_query_length
            )

            self.logger.info(
                f"Successfully generated retrieval query for section: {section_description[:100]}..."
            )
            return retrieval_query.strip()

        except Exception as e:
            self.logger.error(f"Failed to generate retrieval query: {str(e)}")
            # Fallback to basic query construction
            return self._create_fallback_query(
                section_description, topics, learning_outcomes
            )

    def _build_query_generation_prompt(
        self,
        section_description: str,
        topics: Optional[List[str]],
        learning_outcomes: Optional[List[str]],
        max_query_length: int,
    ) -> str:
        """Build the prompt for GPT to generate retrieval queries."""

        prompt = dedent(
            f"""
            You are an expert educational content retrieval specialist. Your task is to create an optimized search query to find the most relevant textbook content from a vector store containing school textbook chapters.

            **OBJECTIVE**: Generate a precise and effective retrieval query that will help find textbook content most relevant to the given section description, topics, and learning outcomes.

            **SECTION INFORMATION**:
            Section Description: {section_description}
            """
        ).strip()

        # Add optional context information
        if topics:
            topics_text = "\n".join([f"- {topic}" for topic in topics])
            prompt += f"\nTopics/Subtopics:\n{topics_text}"

        if learning_outcomes:
            outcomes_text = "\n".join([f"- {outcome}" for outcome in learning_outcomes])
            prompt += f"\nLearning Outcomes:\n{outcomes_text}"

        prompt += dedent(
            f"""

            **QUERY GENERATION GUIDELINES**:
            1. **Focus on Key Concepts**: Identify the core educational concepts, topics, and subtopics that need to be retrieved
            2. **Use Educational Terminology**: Include relevant academic terms, subject-specific vocabulary, and pedagogical concepts
            3. **Consider Learning Objectives**: Align the query with what students need to learn and understand
            4. **Include Context Clues**: Add relevant grade-appropriate terms and conceptual frameworks
            5. **Optimize for Semantic Search**: Use natural language that captures the meaning and intent, not just keywords
            6. **Be Specific but Comprehensive**: Balance specificity with breadth to capture relevant content

            **QUERY STRUCTURE**:
            Create a retrieval query that includes:
            - Primary concepts and topics to search for
            - Related educational terms and vocabulary
            - Learning context and objectives
            - Subject-specific terminology where applicable

            **OUTPUT REQUIREMENTS**:
            - Maximum length: {max_query_length} characters
            - Format: Natural language query optimized for semantic search
            - Focus: Educational content retrieval from textbook chapters
            - Style: Clear, concise, and educationally relevant

            Generate the retrieval query:
            """
        ).strip()

        return prompt

    def _clean_and_validate_query(self, query: str, max_length: int) -> str:
        """Clean and validate the generated retrieval query."""
        if not query:
            raise ValueError("Generated query is empty")

        # Remove any unwanted formatting or extra whitespace
        query = query.strip()

        # Remove common prefixes that GPT might add
        prefixes_to_remove = [
            "Retrieval Query:",
            "Query:",
            "Search Query:",
            "Generated Query:",
        ]

        for prefix in prefixes_to_remove:
            if query.startswith(prefix):
                query = query[len(prefix) :].strip()

        # Ensure query doesn't exceed max length
        if len(query) > max_length:
            # Truncate gracefully at sentence or phrase boundaries
            truncated = query[:max_length]

            # Try to truncate at sentence boundary
            last_period = truncated.rfind(".")
            last_comma = truncated.rfind(",")
            last_space = truncated.rfind(" ")

            # Choose the best truncation point
            truncation_point = max(last_period, last_comma, last_space)

            if truncation_point > max_length * 0.7:  # Keep at least 70% of content
                if last_period > max_length * 0.7:
                    query = truncated[: last_period + 1]
                elif last_comma > max_length * 0.7:
                    query = truncated[:last_comma]
                else:
                    query = truncated[:last_space]
            else:
                query = truncated

        return query

    def _create_fallback_query(
        self,
        section_description: str,
        topics: Optional[List[str]],
        learning_outcomes: Optional[List[str]],
    ) -> str:
        """Create a fallback query when GPT generation fails."""

        query_parts = []

        # Add section description as primary content
        query_parts.append(section_description)

        # Add topics if available
        if topics:
            topics_str = " ".join(topics)
            query_parts.append(f"topics: {topics_str}")

        # Add learning outcomes if available
        if learning_outcomes:
            outcomes_str = " ".join(learning_outcomes)
            query_parts.append(f"learning outcomes: {outcomes_str}")

        # Join parts with appropriate separators
        fallback_query = " ".join(query_parts)

        self.logger.info("Using fallback query generation due to GPT failure")

        return fallback_query[:500]  # Ensure reasonable length

    async def generate_multiple_retrieval_queries(
        self, section_description: str, num_queries: int = 3, **kwargs
    ) -> List[str]:
        """
        Generate multiple diverse retrieval queries for the same section.

        This can be useful for improving retrieval coverage by using
        different query formulations.

        Args:
            section_description: Description of the section content needed
            num_queries: Number of different queries to generate
            **kwargs: Additional parameters passed to generate_retrieval_query

        Returns:
            List of diverse retrieval queries
        """
        if num_queries < 1:
            raise ValueError("num_queries must be at least 1")

        queries = []

        for i in range(num_queries):
            try:
                # Modify the prompt slightly for each query to get diversity
                modified_kwargs = kwargs.copy()
                # For diversity in query generation, we can vary the emphasis or approach
                # but keep the same core parameters since we're only using topics,
                # learning outcomes and section description

                query = await self.generate_retrieval_query(
                    section_description=section_description, **modified_kwargs
                )

                # Avoid duplicate queries
                if query not in queries:
                    queries.append(query)

            except Exception as e:
                self.logger.warning(f"Failed to generate query variant {i+1}: {str(e)}")

        # Ensure we have at least one query
        if not queries:
            fallback = self._create_fallback_query(
                section_description,
                kwargs.get("topics"),
                kwargs.get("learning_outcomes"),
            )
            queries.append(fallback)

        self.logger.info(f"Generated {len(queries)} retrieval queries for section")
        return queries
