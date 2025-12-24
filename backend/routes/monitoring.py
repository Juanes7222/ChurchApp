"""
Módulo de Monitoreo y Métricas
Endpoints para observabilidad y performance monitoring
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any
from core.cache import cache
from utils.auth import require_admin
import time

monitoring_router = APIRouter(prefix="/metrics", tags=["monitoring"])

# Contadores globales (en producción usar Redis o similar)
_start_time = time.time()
_request_count = 0
_total_response_time = 0.0
_slow_requests = 0

def track_request(response_time: float):
    """Track request metrics"""
    global _request_count, _total_response_time, _slow_requests
    _request_count += 1
    _total_response_time += response_time
    if response_time > 1.0:
        _slow_requests += 1

@monitoring_router.get("")
async def get_metrics(current_user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Performance metrics dashboard - Admin only
    Retorna métricas de caché, tiempos de respuesta y uptime
    """
    uptime_seconds = time.time() - _start_time
    
    return {
        "cache": cache.get_stats(),
        "uptime_seconds": round(uptime_seconds, 2),
        "uptime_formatted": _format_uptime(uptime_seconds),
        "requests": {
            "total": _request_count,
            "avg_response_time_ms": round((_total_response_time / _request_count * 1000) if _request_count > 0 else 0, 2),
            "slow_requests": _slow_requests,
            "slow_request_rate": round((_slow_requests / _request_count * 100) if _request_count > 0 else 0, 2)
        }
    }

@monitoring_router.post("/cache/clear")
async def clear_cache(current_user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, str]:
    """
    Clear all cache - Admin only
    Útil para debugging o después de actualizaciones masivas
    """
    cache.clear()
    return {"message": "Cache cleared successfully"}

def _format_uptime(seconds: float) -> str:
    """Format uptime in human-readable format"""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    parts.append(f"{secs}s")
    
    return " ".join(parts)
