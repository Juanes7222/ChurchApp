"""
Módulo POS - Reportes, Inventario y Sincronización
RF-STOCK, RF-REPORT, RF-OFFLINE
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional, cast
from core import config
from utils.auth import require_admin, require_pos_access, require_permission, require_auth_user
from utils.permissions import Permission
from datetime import datetime, timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)
pos_reportes_router = APIRouter(prefix="", tags=["pos-reportes"])
supabase = config.supabase

# ============= INVENTARIO (RF-STOCK) =============

@pos_reportes_router.get("/inventario")
async def list_inventario(
    producto_uuid: Optional[str] = None,
    bajo_stock: bool = False,
    current_user: Dict[str, Any] = Depends(require_permission(Permission.VIEW_INVENTORY))
) -> Dict[str, Any]:
    """RF-STOCK-01: Listar inventario con filtros"""
    try:
        query = supabase.table('inventario').select('*, productos(*)')
        
        if producto_uuid:
            query = query.eq('producto_uuid', producto_uuid)
        
        result = query.execute()
        inventario = result.data or []
        
        if bajo_stock:
            # Filtrar productos con stock bajo (threshold configurable)
            inventario = [
                item for item in inventario
                if isinstance(item, dict) and float(cast(Dict[str, Any], item).get('cantidad_actual', 0)) < 10
            ]
        
        return {"inventario": inventario}
    except Exception as e:
        logger.error(f"Error listing inventario: {e}")
        raise HTTPException(status_code=500, detail="Error al listar inventario")

@pos_reportes_router.put("/inventario/{producto_uuid}")
async def update_inventario(
    producto_uuid: str,
    cantidad: Decimal,
    ubicacion: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-STOCK-01: Actualizar stock de producto"""
    try:
        # Verificar si existe inventario para este producto
        existing = supabase.table('inventario').select('uuid').eq('producto_uuid', producto_uuid).execute()
        
        data = {
            'cantidad_actual': float(cantidad),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if ubicacion:
            data['ubicacion'] = ubicacion
        
        if existing.data:
            result = supabase.table('inventario').update(data).eq('producto_uuid', producto_uuid).execute()
        else:
            data['producto_uuid'] = producto_uuid
            result = supabase.table('inventario').insert(data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Error al actualizar inventario")
        
        return cast(Dict[str, Any], result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating inventario: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar inventario")

@pos_reportes_router.post("/inventario/ajuste")
async def ajuste_inventario(
    producto_uuid: str,
    cantidad_ajuste: Decimal,
    tipo: str,  # 'entrada' | 'salida' | 'ajuste'
    motivo: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-STOCK-03: Registrar ajuste de inventario con auditoría"""
    try:
        # Obtener inventario actual
        inv_result = supabase.table('inventario').select('cantidad_actual').eq('producto_uuid', producto_uuid).execute()
        
        if not inv_result.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado en inventario")
        
        cantidad_actual = float(cast(Dict[str, Any], inv_result.data[0]).get('cantidad_actual', 0))
        
        # Calcular nueva cantidad
        if tipo == 'entrada':
            nueva_cantidad = cantidad_actual + float(cantidad_ajuste)
        elif tipo == 'salida':
            nueva_cantidad = cantidad_actual - float(cantidad_ajuste)
        else:  # ajuste directo
            nueva_cantidad = float(cantidad_ajuste)
        
        # Actualizar inventario
        supabase.table('inventario').update({
            'cantidad_actual': nueva_cantidad,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('producto_uuid', producto_uuid).execute()
        
        # TODO: Registrar en audit_logs con motivo y actor
        
        return {
            "message": "Ajuste registrado",
            "cantidad_anterior": str(cantidad_actual),
            "cantidad_nueva": str(nueva_cantidad)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ajuste inventario: {e}")
        raise HTTPException(status_code=500, detail="Error al ajustar inventario")

# ============= REPORTES (RF-REPORT) =============

@pos_reportes_router.get("/reportes/ventas")
async def reporte_ventas(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    producto_uuid: Optional[str] = None,
    vendedor_uuid: Optional[str] = None,
    formato: str = Query("json", regex="^(json|csv)$"),
    current_user: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SALES_REPORTS))
) -> Dict[str, Any]:
    """RF-REPORT-02: Reporte de ventas por rango y producto"""
    try:
        query = supabase.table('ventas').select('*, venta_items(*), vendedor:usuarios_temporales(display_name)').eq('is_deleted', False)
        
        if fecha_desde:
            query = query.gte('fecha_hora', fecha_desde)
        
        if fecha_hasta:
            query = query.lte('fecha_hora', fecha_hasta)
        
        if vendedor_uuid:
            query = query.eq('vendedor_uuid', vendedor_uuid)
        
        query = query.order('fecha_hora', desc=True)
        result = query.execute()
        
        ventas = result.data or []
        
        # Filtrar por producto si se especifica
        if producto_uuid and ventas:
            ventas_filtradas = []
            for venta in ventas:
                if isinstance(venta, dict):
                    items = venta.get('venta_items', [])
                    if isinstance(items, list):
                        if any(isinstance(item, dict) and item.get('producto_uuid') == producto_uuid for item in items):
                            ventas_filtradas.append(venta)
            ventas = ventas_filtradas
        
        # Calcular totales
        total_ventas = sum(
            float(cast(Dict[str, Any], v).get('total', 0))
            for v in ventas
            if isinstance(v, dict)
        )
        num_ventas = len(ventas)
        
        # TODO: Implementar export CSV si formato == 'csv'
        
        return {
            "ventas": ventas,
            "resumen": {
                "num_ventas": num_ventas,
                "total_ventas": total_ventas
            }
        }
    except Exception as e:
        logger.error(f"Error reporte ventas: {e}")
        raise HTTPException(status_code=500, detail="Error al generar reporte")

@pos_reportes_router.get("/reportes/cuentas-pendientes")
async def reporte_cuentas_pendientes(
    antiguedad: Optional[int] = Query(None, description="Días de antigüedad: 30, 60, 90"),
    current_user: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ACCOUNTS_REPORTS))
) -> Dict[str, Any]:
    """RF-REPORT-03: Reporte de cuentas por miembro (deudas)"""
    try:
        # Usar vista creada en schema
        result = supabase.table('vw_member_account_summary').select('*').execute()
        
        cuentas = result.data or []
        
        # Filtrar solo con saldo deudor > 0
        cuentas_pendientes = [
            c for c in cuentas
            if isinstance(c, dict) and float(cast(Dict[str, Any], c).get('saldo_deudor', 0)) > 0
        ]
        
        # TODO: Filtrar por antigüedad si se especifica
        
        total_deuda = sum(
            float(cast(Dict[str, Any], c).get('saldo_deudor', 0))
            for c in cuentas_pendientes
            if isinstance(c, dict)
        )
        
        return {
            "cuentas": cuentas_pendientes,
            "resumen": {
                "num_cuentas": len(cuentas_pendientes),
                "total_deuda": total_deuda
            }
        }
    except Exception as e:
        logger.error(f"Error reporte cuentas: {e}")
        raise HTTPException(status_code=500, detail="Error al generar reporte de cuentas")

@pos_reportes_router.get("/admin/audit-logs")
async def get_audit_logs(
    entidad: Optional[str] = None,
    actor_uuid: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-REPORT-04: Auditoría POS y acciones de usuarios"""
    try:
        query = supabase.table('audit_logs').select('*')
        
        if entidad:
            query = query.eq('entidad', entidad)
        
        if actor_uuid:
            query = query.eq('actor_uuid', actor_uuid)
        
        if fecha_desde:
            query = query.gte('created_at', fecha_desde)
        
        if fecha_hasta:
            query = query.lte('created_at', fecha_hasta)
        
        # Paginación
        start = (page - 1) * page_size
        end = start + page_size - 1
        query = query.range(start, end).order('created_at', desc=True)
        
        result = query.execute()
        
        return {
            "logs": result.data,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener logs de auditoría")

# ============= SINCRONIZACIÓN OFFLINE (RF-OFFLINE) =============

@pos_reportes_router.post("/sync/push")
async def sync_push(
    ventas: List[Dict[str, Any]],
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-OFFLINE-01: Push de ventas creadas offline
    
    Procesa lote de ventas con idempotencia usando client_ticket_id
    """
    try:
        resultados = {
            "exitosas": [],
            "fallidas": [],
            "duplicadas": []
        }
        
        for venta_data in ventas:
            try:
                # Validar client_ticket_id obligatorio
                client_ticket_id = venta_data.get('client_ticket_id')
                if not client_ticket_id:
                    resultados['fallidas'].append({
                        "venta": venta_data,
                        "error": "client_ticket_id es obligatorio"
                    })
                    continue
                
                # Verificar si ya existe (idempotencia)
                existing = supabase.table('ventas').select('uuid').eq('client_ticket_id', client_ticket_id).execute()
                
                if existing.data:
                    resultados['duplicadas'].append({
                        "client_ticket_id": client_ticket_id,
                        "venta_uuid": cast(Dict[str, Any], existing.data[0]).get('uuid')
                    })
                    continue
                
                # Crear venta usando función create_sale
                actor_uuid = current_user.get('sub') or current_user.get('uid')
                result = supabase.rpc('create_sale', {
                    'p_payload': venta_data,
                    'p_actor_uuid': actor_uuid
                }).execute()
                
                if result.data and isinstance(result.data, list) and len(result.data) > 0:
                    venta_uuid = cast(Dict[str, Any], result.data[0]).get('venta_uuid')
                    resultados['exitosas'].append({
                        "client_ticket_id": client_ticket_id,
                        "venta_uuid": venta_uuid
                    })
                else:
                    resultados['fallidas'].append({
                        "venta": venta_data,
                        "error": "Error al crear venta"
                    })
                    
            except Exception as e:
                resultados['fallidas'].append({
                    "venta": venta_data,
                    "error": str(e)
                })
        
        return {
            "message": f"Sincronización completada: {len(resultados['exitosas'])} exitosas, {len(resultados['fallidas'])} fallidas, {len(resultados['duplicadas'])} duplicadas",
            "resultados": resultados
        }
    except Exception as e:
        logger.error(f"Error sync push: {e}")
        raise HTTPException(status_code=500, detail="Error en sincronización")

@pos_reportes_router.get("/sync/pending")
async def sync_pending(
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-OFFLINE-02: Obtener items pendientes de sincronización
    
    Útil para que el cliente verifique el estado
    """
    try:
        # Obtener ventas marcadas con needs_sync
        ventas_result = supabase.table('ventas').select('uuid, numero_ticket, total, fecha_hora, needs_sync').eq('needs_sync', True).execute()
        
        return {
            "ventas_pendientes": ventas_result.data or [],
            "count": len(ventas_result.data) if ventas_result.data else 0
        }
    except Exception as e:
        logger.error(f"Error sync pending: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener items pendientes")

# ============= PAGOS ADICIONALES (RF-SALE-04) =============

@pos_reportes_router.post("/ventas/{venta_uuid}/pagos")
async def agregar_pago(
    venta_uuid: str,
    metodo: str,
    monto: Decimal,
    referencia: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-SALE-04: Agregar pago parcial a venta existente"""
    try:
        # Verificar venta existe
        venta_result = supabase.table('ventas').select('total, estado').eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        venta = cast(Dict[str, Any], venta_result.data[0])
        
        if venta.get('estado') == 'cancelada':
            raise HTTPException(status_code=400, detail="No se pueden agregar pagos a ventas canceladas")
        
        # Insertar pago
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        pago_data = {
            'venta_uuid': venta_uuid,
            'metodo': metodo,
            'monto': float(monto),
            'referencia': referencia,
            'recibido_por_uuid': actor_uuid,
            'fecha': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table('pagos_venta').insert(pago_data).execute()
        
        # Actualizar pago_estado de la venta
        total_venta = float(venta.get('total', 0))
        
        # Calcular total pagado
        pagos_result = supabase.table('pagos_venta').select('monto').eq('venta_uuid', venta_uuid).execute()
        total_pagado = sum(float(cast(Dict[str, Any], p).get('monto', 0)) for p in (pagos_result.data or []))
        
        # Determinar estado de pago
        if total_pagado >= total_venta:
            nuevo_estado = 'pagado'
        elif total_pagado > 0:
            nuevo_estado = 'parcial'
        else:
            nuevo_estado = 'sin_pago'
        
        supabase.table('ventas').update({'pago_estado': nuevo_estado}).eq('uuid', venta_uuid).execute()
        
        return {
            "pago": result.data[0] if result.data else None,
            "total_venta": total_venta,
            "total_pagado": total_pagado,
            "pago_estado": nuevo_estado
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error agregando pago: {e}")
        raise HTTPException(status_code=500, detail="Error al agregar pago")
