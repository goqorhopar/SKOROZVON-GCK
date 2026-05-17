"""
API module initialization.
"""

from app.api.routes import router
from app.api.schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserLogin,
    Token,
    TokenRefresh,
    CallCreate,
    CallUpdate,
    CallResponse,
    CallListResponse,
    DashboardStats,
    ErrorResponse,
)

__all__ = [
    "router",
    # Schemas
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "UserLogin",
    "Token",
    "TokenRefresh",
    "CallCreate",
    "CallUpdate",
    "CallResponse",
    "CallListResponse",
    "DashboardStats",
    "ErrorResponse",
]
