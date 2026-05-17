"""
SKOROZVON-GCK Backend Application
Production-ready FastAPI application for call automation and analytics.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings
from app.core.database import get_db, init_db
from app.api.routes import router as api_router
from app.core.logging_config import setup_logging
from app.core.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown events."""
    # Startup
    setup_logging()
    logger = structlog.get_logger(__name__)
    logger.info("application_startup", app_name=settings.APP_NAME)
    
    await init_db()
    logger.info("database_initialized")
    
    yield
    
    # Shutdown
    logger.info("application_shutdown")


def create_app() -> FastAPI:
    """Application factory for creating FastAPI instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="Call automation and analytics system for sales departments",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security middleware
    if not settings.DEBUG:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"],  # Configure in production
        )

    # Register exception handlers
    register_exception_handlers(app)

    # Include routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Health check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "environment": settings.APP_ENV,
        }

    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS if not settings.DEBUG else 1,
    )
