from .admin import api_router as admin_router
from .auth import api_router as auth_router
from .miembros import api_router as miembros_router
from .observaciones import api_router as observaciones_router
from .grupos import api_router as grupos_router
from .dashboard import api_router as dashboard_router
from .pos_reportes import pos_reportes_router
from .pos_cuentas import pos_cuentas_router
from .pos_inventario import pos_inventario_router
from .pos_meseros import pos_meseros_router
from .pos_productos import pos_productos_router
from .pos_shifts import pos_shifts_router
from .pos_ventas import pos_ventas_router

__all__ = [
    "admin_router",
      "auth_router",
      "miembros_router",
      "observaciones_router",
      "grupos_router",
      "dashboard_router",
      "pos_reportes_router",
      "pos_cuentas_router",
      "pos_inventario_router",
      "pos_meseros_router",
      "pos_productos_router",
      "pos_shifts_router",
      "pos_ventas_router"
]