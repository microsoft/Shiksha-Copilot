from rag_wrapper import InMemGraphRagOps
from core.agents.base_azure_blob_rag_agent import BaseAzureBlobRAGAgent


class GraphIndexRAGAgent(BaseAzureBlobRAGAgent):
    """
    Handles Retrieval-Augmented Generation (RAG) operations using Property Graph
    with Azure OpenAI services.

    This class uses InMemGraphRagOps for property graph-based retrieval-augmented generation.
    It extracts entities and relationships from documents, creating a knowledge graph that
    enables more sophisticated reasoning.

    Inherits from BaseAzureBlobRAGAgent which provides common Azure OpenAI setup and blob storage management.
    """

    def __init__(self, index_path: str):
        """
        Initializes the InMemRAGAgent with the specified index path.

        Args:
            index_path (str): Path to the RAG index in blob storage.
        """
        super().__init__(index_path)

    def get_rag_ops_class(self):
        """
        Returns the InMemGraphRagOps class for property graph-based RAG.

        Returns:
            Type[InMemGraphRagOps]: The InMemGraphRagOps class for property graph-based retrieval operations.
        """
        return InMemGraphRagOps
