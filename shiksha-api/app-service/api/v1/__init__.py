"""
API v1 router configuration.
"""

from fastapi import APIRouter
from api.v1 import rag, completions, agents

# Create v1 router
v1_router = APIRouter(prefix="/v1")

# Include all endpoint routers
v1_router.include_router(rag.router)
v1_router.include_router(completions.router)
v1_router.include_router(agents.router)
