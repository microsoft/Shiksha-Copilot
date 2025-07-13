from rag_wrapper import InMemRagOps
from core.agents.base_azure_blob_rag_agent import BaseAzureBlobRAGAgent


class VectorIndexRAGAgent(BaseAzureBlobRAGAgent):
    """
    Handles Retrieval-Augmented Generation (RAG) operations using vector-based storage
    with Azure OpenAI services.

    This class uses InMemRagOps for traditional vector-based retrieval-augmented generation.
    It stores documents as vector embeddings and performs similarity search to find relevant content.

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
        Returns the InMemRagOps class for vector-based RAG.

        Returns:
            Type[InMemRagOps]: The InMemRagOps class for vector-based retrieval operations.
        """
        return InMemRagOps
