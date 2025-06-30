"""
Health check and monitoring endpoints.
"""
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter
import structlog
from api.models import HealthResponse, ServiceStatsResponse
from services import azure_auth_service, rag_service, litellm_service, autogen_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Comprehensive health check for all services.
    """
    services_health = {}
    
    # Check each service
    try:
        services_health["azure_auth"] = True  # Azure auth is always available once initialized
    except Exception:
        services_health["azure_auth"] = False
    
    try:
        services_health["rag"] = await rag_service.health_check()
    except Exception:
        services_health["rag"] = False
    
    try:
        services_health["completions"] = await litellm_service.health_check()
    except Exception:
        services_health["completions"] = False
    
    try:
        services_health["agents"] = await autogen_service.health_check()
    except Exception:
        services_health["agents"] = False
    
    # Determine overall status
    all_healthy = all(services_health.values())
    status = "healthy" if all_healthy else "degraded"
    
    response = HealthResponse(
        status=status,
        timestamp=datetime.utcnow().isoformat(),
        services=services_health,
        version="1.0.0"
    )
    
    logger.info("Health check completed", status=status, services=services_health)
    return response


@router.get("/services/{service_name}")
async def service_health(service_name: str) -> Dict[str, Any]:
    """
    Get health and stats for a specific service.
    """
    try:
        if service_name == "rag":
            healthy = await rag_service.health_check()
            stats = await rag_service.get_stats() if healthy else {}
        elif service_name == "completions":
            healthy = await litellm_service.health_check()
            stats = litellm_service.get_stats()
        elif service_name == "agents":
            healthy = await autogen_service.health_check()
            stats = autogen_service.get_stats()
        elif service_name == "azure_auth":
            healthy = True  # Assume healthy if initialized
            stats = {"status": "initialized"}
        else:
            return {
                "error": f"Unknown service: {service_name}",
                "available_services": ["rag", "completions", "agents", "azure_auth"]
            }
        
        return {
            "service": service_name,
            "healthy": healthy,
            "status": "ok" if healthy else "degraded",
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Service health check failed", service=service_name, error=str(e))
        return {
            "service": service_name,
            "healthy": False,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/readiness")
async def readiness_check() -> Dict[str, Any]:
    """
    Kubernetes-style readiness probe.
    """
    try:
        # Check if core services are ready
        rag_ready = await rag_service.health_check()
        completions_ready = await litellm_service.health_check()
        
        # Service is ready if at least one core service is available
        ready = rag_ready or completions_ready
        
        return {
            "ready": ready,
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "rag": rag_ready,
                "completions": completions_ready
            }
        }
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        return {
            "ready": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/liveness")
async def liveness_check() -> Dict[str, Any]:
    """
    Kubernetes-style liveness probe.
    """
    # Simple liveness check - if we can respond, we're alive
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat()
    }
