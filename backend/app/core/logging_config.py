"""
Logging configuration using structlog for structured logging.
"""

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.types import Processor

from app.core.config import settings


def setup_logging() -> None:
    """Configure structured logging for the application."""
    
    # Determine log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Configure logging handlers
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    
    # Configure root logger
    logging.basicConfig(
        format="%(message)s",
        level=log_level,
        handlers=[handler],
    )
    
    # Configure structlog processors
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
    ]
    
    if settings.LOG_FORMAT == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


class LogContext:
    """Context manager for adding temporary context to logs."""
    
    def __init__(self, **kwargs: Any):
        self.context = kwargs
        self.token = None
    
    def __enter__(self) -> "LogContext":
        self.token = structlog.contextvars.bind_contextvars(**self.context)
        return self
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        structlog.contextvars.clear_contextvars()


def log_exception(logger: structlog.BoundLogger, message: str, **kwargs: Any) -> None:
    """Log an exception with full traceback."""
    logger.error(message, exc_info=True, **kwargs)
