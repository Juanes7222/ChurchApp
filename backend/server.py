from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from core import config
from routes import (
    admin_router, auth_router, miembros_router, observaciones_router, grupos_router, dashboard_router,
    pos_reportes_router
)
from routes.pos_productos import pos_productos_router
from routes.pos_ventas import pos_ventas_router
from routes.pos_shifts import pos_shifts_router
from routes.pos_cuentas import pos_cuentas_router
from routes.pos_meseros import pos_meseros_router
from routes.pos_inventario import pos_inventario_router
import os
import logging

logging.basicConfig(
       level=getattr(logging, config.log_level.upper()),
       format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
      )
logger = logging.getLogger(__name__)

supabase = config.supabase

app = FastAPI(title="Sistema Iglesia API")
api_router = APIRouter(prefix="/api")


# ============= ROOT =============
@api_router.get("/")
async def root():
    return {"message": "Sistema Iglesia API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(miembros_router, prefix="/api")
app.include_router(observaciones_router, prefix="/api")
app.include_router(grupos_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

# POS Routers (modularizados)
app.include_router(pos_productos_router, prefix="/api/pos")
app.include_router(pos_ventas_router, prefix="/api/pos")
app.include_router(pos_shifts_router, prefix="/api/pos")
app.include_router(pos_cuentas_router, prefix="/api/pos")
app.include_router(pos_meseros_router, prefix="/api/pos")
app.include_router(pos_inventario_router, prefix="/api/pos")
app.include_router(pos_reportes_router, prefix="/api/pos")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)