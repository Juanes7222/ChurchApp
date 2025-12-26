from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from core import config
from routes import (
    admin_router, auth_router, miembros_router, observaciones_router, grupos_router, dashboard_router,
    pos_reportes_router, pos_inventario_router, pos_meseros_router, pos_shifts_router, pos_ventas_router, pos_cuentas_router,
    files_router
)
from routes.pos_productos import pos_productos_router
from routes.pos_ventas import pos_ventas_router
from routes.pos_shifts import pos_shifts_router
from routes.pos_cuentas import pos_cuentas_router
from routes.pos_meseros import pos_meseros_router
from routes.pos_inventario import pos_inventario_router
from routes.monitoring import monitoring_router
import os
import logging
import time
from starlette.requests import Request

logging.basicConfig(
       level=getattr(logging, config.log_level.upper()),
       format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
      )
logger = logging.getLogger(__name__)

supabase = config.supabase

app = FastAPI(
    title="Sistema Iglesia API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
api_router = APIRouter(prefix="/api")


# ============= ROOT =============
@api_router.get("/")
async def root():
    return {"message": "Sistema Iglesia API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(files_router, prefix="/api")

# Include router
app.include_router(api_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(miembros_router, prefix="/api")
app.include_router(observaciones_router, prefix="/api")
app.include_router(grupos_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")

# Monitoring & Metrics
app.include_router(monitoring_router, prefix="/api")

# POS Routers (modularizados)
app.include_router(pos_productos_router, prefix="/api/pos")
app.include_router(pos_ventas_router, prefix="/api/pos")
app.include_router(pos_shifts_router, prefix="/api/pos")
app.include_router(pos_cuentas_router, prefix="/api/pos")
app.include_router(pos_meseros_router, prefix="/api/pos")
app.include_router(pos_inventario_router, prefix="/api/pos")
app.include_router(pos_reportes_router, prefix="/api/pos")

# ============= MIDDLEWARE (Orden importa!) =============

# 1. Trusted Host (seguridad)
allowed_hosts = os.environ.get('ALLOWED_HOSTS', '*').split(',')
if '*' not in allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# 2. CORS (debe ir antes de otros middlewares)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. GZip Compression (reduce tamaño de respuestas en ~70%)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

# 4. Request timing middleware (performance monitoring)
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(f"{process_time:.4f}")
    
    # Log slow requests (> 1 segundo)
    if process_time > 1.0:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.4f}s")
    
    return response