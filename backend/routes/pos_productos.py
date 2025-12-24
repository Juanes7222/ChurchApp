"""
Módulo POS - Gestión de Productos y Categorías
RF-PROD
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, cast
from models.models import ProductoCreate, CategoriaProducto
from core import config
from utils.auth import require_admin
from datetime import datetime, timezone
import logging
import uuid as uuid_lib

logger = logging.getLogger(__name__)
pos_productos_router = APIRouter(prefix="", tags=["pos-productos"])
supabase = config.supabase

# ============= PRODUCTOS (RF-PROD) =============

@pos_productos_router.get("/productos")
async def list_productos(
    q: Optional[str] = None,
    categoria_uuid: Optional[str] = None,
    favoritos: Optional[bool] = None,
    activo: bool = True
) -> Dict[str, Any]:
    """RF-PROD-01: Listar productos con búsqueda y filtros rápidos para POS
    
    NOTA: Endpoint público para permitir acceso sin autenticación (catálogo)
    """
    try:
        query = supabase.table('productos').select('*').eq('is_deleted', False)
        
        if activo is not None:
            query = query.eq('activo', activo)
        
        if favoritos is not None:
            query = query.eq('favorito', favoritos)
        
        if categoria_uuid:
            query = query.eq('categoria_uuid', categoria_uuid)
        
        if q:
            query = query.or_(f"codigo.ilike.%{q}%,nombre.ilike.%{q}%")
        
        query = query.order('favorito', desc=True).order('nombre')
        result = query.execute()
        
        return {"productos": result.data}
    except Exception as e:
        logger.error(f"Error listing productos: {e}")
        raise HTTPException(status_code=500, detail="Error al listar productos")

@pos_productos_router.post("/productos")
async def create_producto(
    producto: ProductoCreate,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-PROD-01: Crear nuevo producto (admin/TI)"""
    try:
        # Validar precio >= 0
        if producto.precio < 0:
            raise HTTPException(status_code=400, detail="El precio debe ser mayor o igual a 0")
        
        # Verificar código único si existe
        if producto.codigo:
            existing = supabase.table('productos').select('uuid').eq('codigo', producto.codigo).eq('is_deleted', False).execute()
            if existing.data:
                raise HTTPException(status_code=400, detail="Ya existe un producto con ese código")
        
        data = producto.model_dump()
        # Generar UUID para el nuevo producto
        data['uuid'] = str(uuid_lib.uuid4())
        # Convertir Decimal a float para JSON serialization
        if 'precio' in data:
            data['precio'] = float(data['precio'])
        # categoria_uuid ya es string, no necesita conversión
        if not data.get('categoria_uuid'):
            data['categoria_uuid'] = None
            
        result = supabase.table('productos').insert(data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Error al crear producto")
        
        return cast(Dict[str, Any], result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating producto: {e}")
        raise HTTPException(status_code=500, detail="Error al crear producto")

@pos_productos_router.put("/productos/{producto_uuid}")
async def update_producto(
    producto_uuid: str,
    producto: ProductoCreate,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-PROD-01: Actualizar producto existente"""
    try:
        # Validar precio
        if producto.precio < 0:
            raise HTTPException(status_code=400, detail="El precio debe ser mayor o igual a 0")
        
        # Verificar existencia
        existing = supabase.table('productos').select('uuid').eq('uuid', producto_uuid).eq('is_deleted', False).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        data = producto.model_dump(exclude_unset=True)
        # Convertir Decimal a float para JSON serialization
        if 'precio' in data:
            data['precio'] = float(data['precio'])
        # Convertir UUID a string
        if data.get('categoria_uuid'):
            data['categoria_uuid'] = str(data['categoria_uuid'])
        else:
            data['categoria_uuid'] = None
            
        result = supabase.table('productos').update(data).eq('uuid', producto_uuid).execute()
        
        return cast(Dict[str, Any], result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating producto: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar producto")

@pos_productos_router.delete("/productos/{producto_uuid}")
async def delete_producto(
    producto_uuid: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-PROD-01: Soft delete de producto"""
    try:
        result = supabase.table('productos').update({'is_deleted': True}).eq('uuid', producto_uuid).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        return {"message": "Producto eliminado"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting producto: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar producto")

# ============= CATEGORÍAS (RF-PROD-02) =============

@pos_productos_router.get("/categorias")
async def list_categorias() -> Dict[str, Any]:
    """RF-PROD-02: Listar categorías para organización del POS
    
    NOTA: Endpoint público para permitir acceso sin autenticación (catálogo)
    """
    try:
        result = supabase.table('categorias_producto').select('*').eq('activo', True).order('orden').execute()
        return {"categorias": result.data}
    except Exception as e:
        logger.error(f"Error listing categorias: {e}")
        raise HTTPException(status_code=500, detail="Error al listar categorías")

@pos_productos_router.post("/categorias")
async def create_categoria(
    categoria: CategoriaProducto,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-PROD-02: Crear categoría de producto"""
    try:
        data = categoria.model_dump()
        data['uuid'] = str(uuid_lib.uuid4())  # Generar UUID
        result = supabase.table('categorias_producto').insert(data).execute()
        return cast(Dict[str, Any], result.data[0])
    except Exception as e:
        logger.error(f"Error creating categoria: {e}")
        raise HTTPException(status_code=500, detail="Error al crear categoría")
