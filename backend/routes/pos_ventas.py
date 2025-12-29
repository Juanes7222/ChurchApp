"""
Módulo POS - Gestión de Ventas
RF-SALE
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, cast
from models.models import Venta
from core import config
from utils.auth import require_pos_access, require_any_authenticated, require_admin
from datetime import datetime, timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)
pos_ventas_router = APIRouter(prefix="", tags=["pos-ventas"])
supabase = config.supabase

# ============= VENTAS (RF-SALE) =============

@pos_ventas_router.post("/ventas")
async def create_venta(
    venta: Venta,
    current_user: Dict[str, Any] = Depends(require_any_authenticated)
) -> Dict[str, Any]:
    """RF-SALE-01/02/03: Crear venta con soporte para fiado y pagos mixtos
    
    RF-POS-GEN-03: Usa client_ticket_id para idempotencia
    RF-SALE-03: Valida límite de crédito si es fiado
    
    REGLA: Sin turno no hay ventas. Sin usuario no hay ventas.
    """
    try:
        # VALIDACIÓN CRÍTICA 1: Debe existir un turno abierto
        turno_abierto = supabase.table('caja_shift')\
            .select('uuid')\
            .eq('estado', 'abierta')\
            .eq('is_deleted', False)\
            .execute()
        
        if not turno_abierto.data or len(turno_abierto.data) == 0:
            raise HTTPException(
                status_code=400, 
                detail="No hay turno abierto. Debe abrir un turno antes de registrar ventas."
            )
        
        shift_uuid = cast(Dict[str, Any], turno_abierto.data[0])['uuid']
        
        # VALIDACIÓN CRÍTICA 2: Determinar vendedor_uuid
        if current_user.get('tipo') == 'mesero':
            vendedor_uuid = current_user.get('sub')
            usuario_temp = supabase.table('usuarios_temporales')\
                .select('uuid, activo')\
                .eq('uuid', vendedor_uuid)\
                .eq('activo', True)\
                .execute()
            
            if not usuario_temp.data:
                raise HTTPException(status_code=403, detail="Usuario temporal no autorizado")
        else:
            vendedor_uuid = current_user.get('miembro_uuid')
            print(f"DEBUG - vendedor_uuid: {current_user}")  # Debug log
            if not vendedor_uuid:
                raise HTTPException(status_code=400, detail="Usuario sin miembro_uuid asignado")
        
        # Validaciones básicas
        if not venta.items or len(venta.items) == 0:
            raise HTTPException(status_code=400, detail="La venta debe tener al menos un item")
        
        for item in venta.items:
            if item.cantidad <= 0:
                raise HTTPException(status_code=400, detail="Cantidad debe ser mayor a 0")
            if item.precio_unitario < 0:
                raise HTTPException(status_code=400, detail="Precio no puede ser negativo")
        
        # Validar fiado
        if venta.is_fiado:
            if not venta.miembro_uuid:
                raise HTTPException(status_code=400, detail="Venta fiada requiere miembro_uuid")
            
            cuenta_result = supabase.table('cuentas_miembro').select('saldo_deudor, limite_credito').eq('miembro_uuid', str(venta.miembro_uuid)).execute()
            
            if cuenta_result.data:
                cuenta = cast(Dict[str, Any], cuenta_result.data[0])
                # Calcular total de la venta sumando los items
                total_venta = sum(float(item.total_item) for item in venta.items)
                nuevo_saldo = float(cuenta.get('saldo_deudor', 0)) + total_venta
                if nuevo_saldo > float(cuenta.get('limite_credito', 0)):
                    raise HTTPException(status_code=400, detail="Límite de crédito excedido")
        
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        # Obtener siguiente número de ticket
        tickets_turno = supabase.table('ventas')\
            .select('numero_ticket')\
            .eq('shift_uuid', shift_uuid)\
            .order('numero_ticket', desc=True)\
            .limit(1)\
            .execute()
        
        siguiente_ticket = 1
        if tickets_turno.data and len(tickets_turno.data) > 0:
            ultimo_ticket_row = cast(Dict[str, Any], tickets_turno.data[0])
            ultimo_ticket = ultimo_ticket_row.get('numero_ticket')
            if ultimo_ticket:
                siguiente_ticket = int(ultimo_ticket) + 1
        
        payload = venta.model_dump()
        payload['shift_uuid'] = shift_uuid
        payload['vendedor_uuid'] = vendedor_uuid
        payload['numero_ticket'] = siguiente_ticket
        
        # Convertir Decimals a float
        for item in payload.get('items', []):
            if 'cantidad' in item:
                item['cantidad'] = float(item['cantidad'])
            if 'precio_unitario' in item:
                item['precio_unitario'] = float(item['precio_unitario'])
            if 'descuento' in item:
                item['descuento'] = float(item['descuento'])
            if 'total_item' in item:
                item['total_item'] = float(item['total_item'])
        
        for pago in payload.get('pagos', []):
            if 'monto' in pago:
                pago['monto'] = float(pago['monto'])
        
        result = supabase.rpc('create_sale', {
            'p_payload': payload,
            'p_actor_uuid': actor_uuid
        }).execute()
        
        logger.info(f"create_sale result: {result.data}")
        
        if not result.data or not isinstance(result.data, list) or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Error al crear venta")
        
        venta_result = cast(Dict[str, Any], result.data[0])
        venta_uuid = venta_result.get('venta_uuid')
        
        if not venta_uuid:
            logger.error(f"No venta_uuid in result: {venta_result}")
            raise HTTPException(status_code=500, detail=f"No se pudo obtener UUID de venta")
        
        venta_detail = supabase.table('ventas').select('*').eq('uuid', venta_uuid).execute()
        
        return {
            "venta_uuid": venta_uuid,
            "venta": venta_detail.data[0] if venta_detail.data else None,
            "message": "Venta creada exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating venta: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear venta: {str(e)}")

@pos_ventas_router.get("/ventas")
async def list_ventas(
    shift_uuid: Optional[str] = None,
    miembro_uuid: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    estado: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user: Dict[str, Any] = Depends(require_pos_access)
) -> Dict[str, Any]:
    """RF-REPORT-02: Listar ventas con filtros"""
    try:
        query = supabase.table('ventas').select('*').eq('is_deleted', False)
        
        if shift_uuid:
            query = query.eq('shift_uuid', shift_uuid)
        if miembro_uuid:
            query = query.eq('miembro_uuid', miembro_uuid)
        if fecha_desde:
            query = query.gte('fecha_hora', fecha_desde)
        if fecha_hasta:
            query = query.lte('fecha_hora', fecha_hasta)
        if estado:
            query = query.eq('estado', estado)
        
        start = (page - 1) * page_size
        end = start + page_size - 1
        query = query.range(start, end).order('fecha_hora', desc=True)
        
        result = query.execute()
        
        return {
            "ventas": result.data,
            "total": result.count,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        logger.error(f"Error listing ventas: {e}")
        raise HTTPException(status_code=500, detail="Error al listar ventas")

@pos_ventas_router.get("/ventas/{venta_uuid}")
async def get_venta(
    venta_uuid: str,
    current_user: Dict[str, Any] = Depends(require_pos_access)
) -> Dict[str, Any]:
    """Obtener detalle de venta con items y pagos"""
    try:
        venta_result = supabase.table('ventas').select('*').eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        venta = venta_result.data[0]
        items_result = supabase.table('venta_items').select('*').eq('venta_uuid', venta_uuid).execute()
        pagos_result = supabase.table('pagos_venta').select('*').eq('venta_uuid', venta_uuid).execute()
        
        return {
            "venta": venta,
            "items": items_result.data,
            "pagos": pagos_result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting venta: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener venta")

@pos_ventas_router.get("/ventas/{venta_uuid}/detalle")
async def get_venta_detalle(
    venta_uuid: str,
    current_user: Dict[str, Any] = Depends(require_pos_access)
) -> Dict[str, Any]:
    """Obtener detalle completo de una venta incluyendo items y productos"""
    try:
        venta_result = supabase.table('ventas').select(
            '*, miembros!ventas_miembro_uuid_fkey(nombres, apellidos)'
        ).eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        venta = cast(Dict[str, Any], venta_result.data[0])
        
        items_result = supabase.table('venta_items').select(
            '*, productos(nombre, precio, categoria_uuid, categorias_producto(nombre))'
        ).eq('venta_uuid', venta_uuid).eq('is_deleted', False).execute()
        
        pagos_result = supabase.table('pagos_venta').select('*').eq('venta_uuid', venta_uuid).execute()
        
        return {
            "venta": venta,
            "items": items_result.data or [],
            "pagos": pagos_result.data or [],
            "subtotal": float(venta.get('subtotal', 0)),
            "total": float(venta.get('total', 0))
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting venta detalle: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener detalle de venta")

@pos_ventas_router.post("/ventas/{venta_uuid}/anular")
async def anular_venta(
    venta_uuid: str,
    motivo: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-SALE-05: Anular venta (solo admin/cajero)"""
    try:
        venta_result = supabase.table('ventas').select('*').eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        supabase.table('ventas').update({
            'estado': 'cancelada',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('uuid', venta_uuid).execute()
        
        return {"message": "Venta anulada", "motivo": motivo}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error anulando venta: {e}")
        raise HTTPException(status_code=500, detail="Error al anular venta")
