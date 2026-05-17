"""
API Router aggregation and main router setup.
"""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.calls import router as calls_router
from app.api.analytics import router as analytics_router

# Main API router
router = APIRouter()

# Include all routers
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(calls_router)
router.include_router(analytics_router)


@router.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information."""
    return {
        "name": "SKOROZVON-GCK API",
        "version": "1.0.0",
        "description": "Call automation and analytics system",
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "calls": "/api/v1/calls",
            "analytics": "/api/v1/analytics",
            "docs": "/docs",
            "health": "/health",
        },
    }
