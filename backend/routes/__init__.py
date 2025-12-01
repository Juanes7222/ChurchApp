from .admin import api_router as admin_router
from .auth import api_router as auth_router
from .miembos import api_router as miembos_router
from .observaciones import api_router as observaciones_router
from .grupos import api_router as grupos_router
from .dashboard import api_router as dashboard_router

__all__ = [
    "admin_router",
      "auth_router",
      "miembos_router",
      "observaciones_router",
      "grupos_router",
      "dashboard_router"
]