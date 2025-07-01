"""
Logging configuration for the FastAPI application.
Uses structured logging with JSON output for better observability.
"""

import sys
import logging
from typing import Dict, Any
import structlog
from config import settings


def configure_logging() -> None:
    """Configure structured logging for the application."""

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )

    # Configure structlog
    structlog.configure(
        processors=[
            # Add log level and timestamp
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # Add JSON formatting for production
            (
                structlog.processors.JSONRenderer()
                if not settings.debug
                else structlog.dev.ConsoleRenderer(colors=True)
            ),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


# Middleware for request logging
def log_request_middleware():
    """Middleware to log HTTP requests."""

    async def middleware(request, call_next):
        logger = get_logger("http")

        # Log request
        logger.info(
            "Request started",
            method=request.method,
            url=str(request.url),
            headers=dict(request.headers),
            client_ip=request.client.host if request.client else None,
        )

        # Process request
        try:
            response = await call_next(request)

            # Log response
            logger.info(
                "Request completed",
                method=request.method,
                url=str(request.url),
                status_code=response.status_code,
                response_time_ms=0,  # You can add timing here
            )

            return response

        except Exception as e:
            # Log error
            logger.error(
                "Request failed",
                method=request.method,
                url=str(request.url),
                error=str(e),
                exc_info=True,
            )
            raise

    return middleware
