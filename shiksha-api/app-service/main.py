"""
FastAPI application main module.
Entry point for the Shiksha API service with RAG, completions, and agent capabilities.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import structlog

from config import settings
from logging_config import configure_logging, get_logger
from api import v1_router
from services import azure_auth_service, rag_service, litellm_service, autogen_service

# Configure logging
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.
    Handles service initialization and cleanup.
    """
    logger.info("Starting Shiksha API application", version="1.0.0")

    # Initialize services
    try:
        # Initialize Azure authentication first
        await azure_auth_service.initialize()
        logger.info("Azure authentication service initialized")

        # Initialize other services in parallel for faster startup
        await asyncio.gather(
            rag_service.initialize(),
            litellm_service.initialize(),
            autogen_service.initialize(),
            return_exceptions=True,
        )

        logger.info("All services initialized successfully")

    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise

    # Application is ready
    yield

    # Cleanup on shutdown
    logger.info("Shutting down Shiksha API application")
    try:
        await asyncio.gather(
            azure_auth_service.close(),
            rag_service.close(),
            # LiteLLM and Autogen don't have explicit close methods
            return_exceptions=True,
        )
        logger.info("Services shutdown completed")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))


# Create FastAPI application
app = FastAPI(
    title="Shiksha API",
    description="AI-powered API for RAG, completions, and agent interactions using Azure OpenAI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=["*"]  # Configure appropriately for production
)

# Include API routers
app.include_router(v1_router, prefix="/api")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(
        "Unhandled exception",
        url=str(request.url),
        method=request.method,
        error=str(exc),
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred",
            "timestamp": structlog.get_logger().info.__self__.now().isoformat(),
        },
    )


# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging."""
    logger.warning(
        "HTTP exception",
        url=str(request.url),
        method=request.method,
        status_code=exc.status_code,
        detail=exc.detail,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "status": "healthy",
        "name": settings.app_name,
        "version": "1.0.0",
        "timestamp": structlog.get_logger().info.__self__.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_config=None,  # Use our custom logging config
        access_log=False,  # We handle logging in middleware
    )
