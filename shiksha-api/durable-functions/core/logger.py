"""
Centralized logging configuration for the Durable Functions application.

This module provides a standardized logging setup for all components of the
Azure Durable Functions application, ensuring consistent log formatting,
appropriate log levels, and optimal performance for cloud environments.
"""

import logging
import os
import sys
from typing import Optional


class ShikshaFormatter(logging.Formatter):
    """Custom formatter for Shiksha application logs."""

    def __init__(self):
        super().__init__()
        self.default_format = "[{levelname}] {name} - {message}"
        self.detailed_format = "[{asctime}] [{levelname}] {name}:{lineno} - {message}"

    def format(self, record):
        # Use detailed format for WARNING and above, simple format for INFO and below
        if record.levelno >= logging.WARNING:
            formatter = logging.Formatter(
                self.detailed_format, style="{", datefmt="%Y-%m-%d %H:%M:%S"
            )
        else:
            formatter = logging.Formatter(self.default_format, style="{")

        return formatter.format(record)


class LoggerFactory:
    """Factory class for creating and configuring loggers throughout the application."""

    _configured = False
    _root_logger = None

    @classmethod
    def _configure_root_logger(cls):
        """Configure the root logger once for the entire application."""
        if cls._configured:
            return

        # Get log level from environment variable or default to INFO
        log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
        log_level = getattr(logging, log_level_str, logging.INFO)

        # Configure root logger
        cls._root_logger = logging.getLogger("shiksha")
        cls._root_logger.setLevel(log_level)

        # Remove existing handlers to avoid duplicates
        for handler in cls._root_logger.handlers[:]:
            cls._root_logger.removeHandler(handler)

        # Create console handler (primary handler for Azure Functions)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)

        # Set custom formatter
        formatter = ShikshaFormatter()
        console_handler.setFormatter(formatter)

        # Add handler to root logger
        cls._root_logger.addHandler(console_handler)

        # Prevent propagation to avoid duplicate logs in Azure Functions
        cls._root_logger.propagate = False

        # Configure third-party loggers to reduce noise
        cls._configure_third_party_loggers()

        cls._configured = True

    @classmethod
    def _configure_third_party_loggers(cls):
        """Configure third-party library loggers to reduce noise."""
        # Reduce verbosity of common Azure SDK loggers
        azure_loggers = [
            "azure.core.pipeline.policies.http_logging_policy",
            "azure.storage.blob",
            "azure.identity",
            "azure.functions",
            "urllib3.connectionpool",
            "requests.packages.urllib3",
            "openai._base_client",
        ]

        for logger_name in azure_loggers:
            logger = logging.getLogger(logger_name)
            logger.setLevel(logging.WARNING)

    @classmethod
    def get_logger(cls, name: Optional[str] = None) -> logging.Logger:
        """
        Get a logger instance for the specified module/class.

        Args:
            name: The name for the logger (typically __name__ from the calling module).
                  If None, returns the root logger.

        Returns:
            A configured logger instance.

        Examples:
            # In a module
            from core.logger import LoggerFactory
            logger = LoggerFactory.get_logger(__name__)

            # In a class
            class MyClass:
                def __init__(self):
                    self.logger = LoggerFactory.get_logger(f"{__name__}.{self.__class__.__name__}")
        """
        cls._configure_root_logger()

        if name is None:
            return cls._root_logger

        # Create child logger under the shiksha namespace
        logger_name = f"shiksha.{name.replace('core.', '').replace('__main__', 'main')}"
        logger = logging.getLogger(logger_name)

        # Child loggers inherit configuration from parent
        logger.setLevel(cls._root_logger.level)

        return logger

    @classmethod
    def get_function_logger(cls, function_name: str) -> logging.Logger:
        """
        Get a logger specifically for Azure Functions.

        Args:
            function_name: The name of the Azure Function

        Returns:
            A configured logger instance for the function.
        """
        return cls.get_logger(f"functions.{function_name}")

    @classmethod
    def get_agent_logger(cls, agent_name: str) -> logging.Logger:
        """
        Get a logger specifically for agents.

        Args:
            agent_name: The name of the agent class

        Returns:
            A configured logger instance for the agent.
        """
        return cls.get_logger(f"agents.{agent_name}")

    @classmethod
    def set_log_level(cls, level: str):
        """
        Dynamically change the log level for all loggers.

        Args:
            level: The new log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        if cls._root_logger:
            log_level = getattr(logging, level.upper(), logging.INFO)
            cls._root_logger.setLevel(log_level)
            for handler in cls._root_logger.handlers:
                handler.setLevel(log_level)

    @classmethod
    def add_context_filter(cls, context: dict):
        """
        Add contextual information to all log messages.

        Args:
            context: Dictionary of context information to add to logs
        """

        class ContextFilter(logging.Filter):
            def filter(self, record):
                for key, value in context.items():
                    setattr(record, key, value)
                return True

        if cls._root_logger:
            context_filter = ContextFilter()
            for handler in cls._root_logger.handlers:
                handler.addFilter(context_filter)


# Convenience function for backward compatibility and simple usage
def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Convenience function to get a logger instance.

    Args:
        name: The name for the logger (typically __name__ from the calling module)

    Returns:
        A configured logger instance.
    """
    return LoggerFactory.get_logger(name)


# Pre-configured logger instances for common use cases
main_logger = LoggerFactory.get_logger("main")
function_logger = LoggerFactory.get_function_logger("durable_functions")
agent_logger = LoggerFactory.get_agent_logger("base")
