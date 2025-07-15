from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from contextlib import asynccontextmanager
from app.config import settings
from app.routers import chat_router
from app.models.chat import ErrorResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for proper startup and shutdown"""
    # Startup
    yield
    # Shutdown
    from app.services.general_chat_service import GENERAL_CHAT_SERVICE_INSTANCE
    from app.services.lesson_chat_service import LESSON_CHAT_SERVICE_INSTANCE

    try:
        await GENERAL_CHAT_SERVICE_INSTANCE.cleanup()
        await LESSON_CHAT_SERVICE_INSTANCE.cleanup()
    except Exception as e:
        print(f"Error during cleanup: {e}")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="AI-powered educational chat API for Shiksha platform",
    debug=settings.debug,
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)


@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {
        "message": "Welcome to Shiksha Copilot API",
        "version": settings.version,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": settings.app_name}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app", host=settings.host, port=settings.port, reload=settings.debug
    )
