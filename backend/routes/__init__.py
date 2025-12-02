from .admin import api_router as admin_router
from .auth import api_router as auth_router
from .miembros import api_router as miembros_router
from .observaciones import api_router as observaciones_router
from .grupos import api_router as grupos_router
from .dashboard import api_router as dashboard_router
from .products import pos_router as products_router
from .pos_reportes import pos_reportes_router

__all__ = [
    "admin_router",
      "auth_router",
      "miembros_router",
      "observaciones_router",
      "grupos_router",
      "dashboard_router",
      "products_router",
      "pos_reportes_router"
]