"""
Módulo POS - Gestión de Inventario
RF-INV
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, cast
from core import config
from utils.auth import require_auth_user, require_admin
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
pos_inventario_router = APIRouter(prefix="", tags=["pos-inventario"])
supabase = config.supabase

# ============= INVENTARIO (RF-INV) =============

@pos_inventario_router.get("/inventario")
async def get_inventario(
    bajo_stock: Optional[bool] = None,
    categoria_uuid: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-INV-01: Obtener estado del inventario"""
    try:
        query = supabase.table('productos').select(
            'uuid, nombre, codigo, precio, stock, stock_minimo, activo, categoria_uuid, categorias_producto(nombre)'
        ).eq('is_deleted', False).eq('activo', True)
        
        if categoria_uuid:
            query = query.eq('categoria_uuid', categoria_uuid)
        
        query = query.order('nombre')
        result = query.execute()
        productos = result.data or []
        
        # Filtrar por bajo stock
        if bajo_stock:
            filtered_productos = []
            for p_data in productos:
                p = cast(Dict[str, Any], p_data)
                if p.get('stock', 0) <= p.get('stock_minimo', 0):
                    filtered_productos.append(p_data)
            productos = filtered_productos
        
        # Calcular estadísticas
        total_productos = len(result.data or [])
        productos_bajo_stock = 0
        for p_data in (result.data or []):
            p = cast(Dict[str, Any], p_data)
            if p.get('stock', 0) <= p.get('stock_minimo', 0):
                productos_bajo_stock += 1
        
        return {
            "productos": productos,
            "estadisticas": {
                "total_productos": total_productos,
                "productos_bajo_stock": productos_bajo_stock
            }
        }
    except Exception as e:
        logger.error(f"Error getting inventario: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener inventario")

@pos_inventario_router.put("/inventario/{producto_uuid}/ajustar")
async def ajustar_stock(
    producto_uuid: str,
    nuevo_stock: int,
    motivo: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-INV-02: Ajustar stock de producto"""
    try:
        if nuevo_stock < 0:
            raise HTTPException(status_code=400, detail="El stock no puede ser negativo")
        
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        producto_result = supabase.table('productos').select('stock').eq('uuid', producto_uuid).execute()
        
        if not producto_result.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        producto_row = cast(Dict[str, Any], producto_result.data[0])
        stock_anterior = producto_row.get('stock', 0)
        
        result = supabase.table('productos').update({
            'stock': nuevo_stock,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('uuid', producto_uuid).execute()
        
        # Registrar movimiento si existe tabla
        try:
            supabase.table('movimientos_inventario').insert({
                'producto_uuid': producto_uuid,
                'tipo': 'ajuste',
                'cantidad': nuevo_stock - stock_anterior,
                'stock_anterior': stock_anterior,
                'stock_nuevo': nuevo_stock,
                'motivo': motivo,
                'realizado_por': actor_uuid
            }).execute()
        except:
            pass  # Tabla puede no existir
        
        return {
            "producto_uuid": producto_uuid,
            "stock_anterior": stock_anterior,
            "stock_nuevo": nuevo_stock,
            "diferencia": nuevo_stock - stock_anterior
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adjusting stock: {e}")
        raise HTTPException(status_code=500, detail="Error al ajustar stock")
