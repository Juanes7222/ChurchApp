"""
Módulo POS - Gestión de Productos y Categorías
RF-PROD
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, cast
from models.models import ProductoCreate, CategoriaProducto
from core import config
from core.cache import cached, invalidate_cache_pattern
from utils.auth import require_admin, require_pos_access
import logging
import uuid as uuid_lib

logger = logging.getLogger(__name__)
pos_productos_router = APIRouter(prefix="", tags=["pos-productos"])
supabase = config.supabase

# ============= PRODUCTOS (RF-PROD) =============

@cached(ttl_seconds=180, key_prefix="productos")
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
        # Optimización: solo traer campos necesarios para el POS
        query = supabase.table('productos').select(
            'uuid, codigo, nombre, descripcion, precio, activo, favorito, categoria_uuid'
        ).eq('is_deleted', False)
        
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
    current_user: Dict[str, Any] = Depends(require_pos_access)
) -> Dict[str, Any]:
    """RF-PROD-01: Crear nuevo producto (admin/TI)"""
    try:
        # Validar precio >= 0
        if producto.precio < 0:
            raise HTTPException(status_code=400, detail="El precio debe ser mayor o igual a 0")
        
        data = producto.model_dump()
        
        # Generar código automáticamente si no se proporciona
        if not data.get('codigo') or data['codigo'].strip() == '':
            # Obtener el último número de código usado
            last_product = supabase.table('productos').select('codigo').eq('is_deleted', False).order('created_at', desc=True).limit(1).execute()
            
            next_number = 1
            if last_product.data and last_product.data[0].get('codigo'):
                last_code = last_product.data[0]['codigo']
                # Intentar extraer el número del código (formato: PRD-001, PROD-123, etc.)
                import re
                match = re.search(r'(\d+)$', last_code)
                if match:
                    next_number = int(match.group(1)) + 1
            
            # Generar código con formato PRD-XXX (3 dígitos con padding de ceros)
            data['codigo'] = f"PRD-{next_number:03d}"
        else:
            # Si se proporciona código, verificar que sea único
            existing = supabase.table('productos').select('uuid').eq('codigo', data['codigo']).eq('is_deleted', False).execute()
            if existing.data:
                raise HTTPException(status_code=400, detail="Ya existe un producto con ese código")
        
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
        
        # Invalidar caché después de crear producto
        invalidate_cache_pattern("productos")
        
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
    current_user: Dict[str, Any] = Depends(require_pos_access)
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
        
        # Invalidar caché después de actualizar producto
        invalidate_cache_pattern("productos")
        
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
        
        # Invalidar caché después de eliminar producto
        invalidate_cache_pattern("productos")
        
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
