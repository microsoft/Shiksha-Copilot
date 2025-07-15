import logging
import sys
from typing import Optional


class LoggerFactory:
    """Factory class for creating configured loggers."""

    _configured = False

    @classmethod
    def configure_logging(
        cls, level: str = "INFO", format_string: Optional[str] = None
    ) -> None:
        """
        Configure the root logger with the specified level and format.

        Args:
            level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            format_string: Custom format string for log messages
        """
        if cls._configured:
            return

        if format_string is None:
            format_string = (
                "%(asctime)s - %(name)s - %(levelname)s - "
                "%(filename)s:%(lineno)d - %(message)s"
            )

        logging.basicConfig(
            level=getattr(logging, level.upper()),
            format=format_string,
            handlers=[logging.StreamHandler(sys.stdout)],
        )

        cls._configured = True

    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """
        Get a logger with the specified name.

        Args:
            name: Logger name (typically __name__)

        Returns:
            Configured logger instance
        """
        if not cls._configured:
            cls.configure_logging()

        return logging.getLogger(name)


# Configure logging when module is imported
LoggerFactory.configure_logging()
