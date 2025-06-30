"""
RAG (Retrieval Augmented Generation) API endpoints.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import structlog
from api.models import (
    RAGQueryRequest,
    RAGQueryResponse,
    RAGSource,
    DocumentAddRequest,
    DocumentAddResponse,
    ErrorResponse,
)
from services import rag_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Execute a RAG query to retrieve relevant information and generate an answer.
    """
    try:
        result = await rag_service.query(
            query=request.query,
            context=request.context,
            top_k=request.top_k,
            filters=request.filters,
        )

        # Convert sources to API model
        sources = [
            RAGSource(
                document_id=source.get("document_id", ""),
                title=source.get("title"),
                content=source.get("content", ""),
                score=source.get("score", 0.0),
                metadata=source.get("metadata", {}),
            )
            for source in result.sources
        ]

        response = RAGQueryResponse(
            answer=result.answer,
            sources=sources,
            confidence=result.confidence,
            query=request.query,
            metadata=result.metadata,
        )

        logger.info(
            "RAG query completed", query=request.query, sources_count=len(sources)
        )
        return response

    except Exception as e:
        logger.error("RAG query failed", query=request.query, error=str(e))
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")


@router.post("/documents", response_model=DocumentAddResponse)
async def add_documents(request: DocumentAddRequest) -> DocumentAddResponse:
    """
    Add documents to the RAG index.
    """
    try:
        success = await rag_service.add_documents(request.documents)

        response = DocumentAddResponse(
            success=success,
            message=(
                "Documents added successfully" if success else "Failed to add documents"
            ),
            documents_added=len(request.documents) if success else 0,
        )

        logger.info(
            "Documents added to RAG index",
            count=len(request.documents),
            success=success,
        )
        return response

    except Exception as e:
        logger.error(
            "Failed to add documents", count=len(request.documents), error=str(e)
        )
        raise HTTPException(
            status_code=500, detail=f"Failed to add documents: {str(e)}"
        )


@router.get("/stats")
async def rag_stats() -> Dict[str, Any]:
    """
    Get RAG service statistics.
    """
    try:
        stats = await rag_service.get_stats()
        return {"service": "rag", "stats": stats, "healthy": True}
    except Exception as e:
        logger.error("Failed to get RAG stats", error=str(e))
        raise HTTPException(
            status_code=500, detail=f"Failed to get RAG stats: {str(e)}"
        )
