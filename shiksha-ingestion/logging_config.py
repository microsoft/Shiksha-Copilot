"""
Centralized logging configuration for all pipeline runners.

This module provides a consistent logging setup across all pipeline runner files.
It configures logging to show INFO level and above, while suppressing DEBUG logs
from noisy third-party modules.

Usage:
    In any pipeline runner file, simply import and use:

    ```python
    from logging_config import setup_logging

    # Setup logging for this module
    logger = setup_logging("your_module_name")

    # Use the logger
    logger.info("This is an info message")
    logger.error("This is an error message")
    ```

Features:
    - Consistent log format across all modules
    - Suppresses DEBUG logs from noisy third-party libraries
    - Easy to use single function setup
    - Centralized configuration for easy maintenance
"""

import logging
from typing import Optional


def setup_logging(logger_name: Optional[str] = None) -> logging.Logger:
    """
    Set up logging configuration with INFO level and suppress DEBUG logs from noisy modules.

    Args:
        logger_name: Name for the logger. If None, uses the calling module's name.

    Returns:
        Configured logger instance.
    """
    # Setup basic logging configuration
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Set root logger level to INFO to suppress DEBUG logs
    logging.getLogger().setLevel(logging.INFO)

    # Suppress DEBUG logs from common noisy modules
    _suppress_noisy_loggers()

    # Create and return logger for the specific module
    if logger_name is None:
        logger_name = __name__

    return logging.getLogger(logger_name)


def _suppress_noisy_loggers():
    """Suppress DEBUG logs from commonly noisy third-party modules."""
    noisy_modules = [
        "urllib3",
        "requests",
        "httpx",
        "httpcore",
        "openai",
        "asyncio",
        "boto3",
        "botocore",
        "s3transfer",
        "matplotlib",
        "PIL",
        "transformers",
    ]

    for module in noisy_modules:
        logging.getLogger(module).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for the given name.
    Assumes setup_logging() has already been called.

    Args:
        name: Name for the logger (typically the module name).

    Returns:
        Logger instance.
    """
    return logging.getLogger(name)
