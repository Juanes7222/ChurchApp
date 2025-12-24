"""
Módulo POS - Gestión de Cuentas de Miembros
RF-CUENTA
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, cast
from core import config
from utils.auth import require_auth_user, require_admin
from datetime import datetime, timezone
from decimal import Decimal
import logging
import uuid as uuid_lib

logger = logging.getLogger(__name__)
pos_cuentas_router = APIRouter(prefix="", tags=["pos-cuentas"])
supabase = config.supabase

# ============= CUENTAS DE MIEMBROS (RF-CUENTA) =============

@pos_cuentas_router.get("/cuentas")
async def list_cuentas_miembro(
    con_saldo: Optional[bool] = None,
    q: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Listar cuentas de miembros con saldos"""
    try:
        query = supabase.table('cuentas_miembro').select(
            '*, miembros!inner(uuid, nombres, apellidos, email, telefono)'
        )
        
        if con_saldo:
            query = query.gt('saldo_deudor', 0)
        
        result = query.execute()
        cuentas = result.data or []
        
        if q:
            filtered_cuentas = []
            for c_data in cuentas:
                c = cast(Dict[str, Any], c_data)
                miembros = c.get('miembros', {})
                if isinstance(miembros, dict):
                    nombres = miembros.get('nombres', '')
                    apellidos = miembros.get('apellidos', '')
                    nombre_completo = f"{nombres} {apellidos}".lower()
                    if q.lower() in nombre_completo:
                        filtered_cuentas.append(c_data)
            cuentas = filtered_cuentas
        
        return {"cuentas": cuentas}
    except Exception as e:
        logger.error(f"Error listing cuentas: {e}")
        raise HTTPException(status_code=500, detail="Error al listar cuentas")

@pos_cuentas_router.get("/cuentas/{miembro_uuid}")
async def get_cuenta_miembro(
    miembro_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Obtener cuenta de un miembro específico con resumen financiero"""
    try:
        cuenta_result = supabase.table('cuentas_miembro').select(
            '*, miembros!inner(uuid, nombres, apellidos, email, telefono)'
        ).eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta = cast(Dict[str, Any], cuenta_result.data[0])
        
        ventas_result = supabase.table('ventas').select(
            'uuid, total, created_at, is_fiado, estado, numero_ticket'
        ).eq('miembro_uuid', miembro_uuid).eq('is_fiado', True).eq('is_deleted', False).order('created_at', desc=True).execute()
        
        ventas_fiadas = ventas_result.data or []
        
        movimientos_result = supabase.table('movimientos_cuenta').select('*').eq('cuenta_uuid', cuenta.get('uuid')).eq('is_deleted', False).order('fecha', desc=True).limit(10).execute()
        
        todos_movimientos = supabase.table('movimientos_cuenta').select('tipo, monto').eq('cuenta_uuid', cuenta.get('uuid')).eq('is_deleted', False).execute()
        
        # Calcular estadísticas
        total_cargos = 0
        total_pagos = 0
        saldo_calculado = 0
        
        for mov_data in (todos_movimientos.data or []):
            mov = cast(Dict[str, Any], mov_data)
            tipo = mov.get('tipo')
            monto = float(mov.get('monto', 0))
            
            if tipo == 'cargo':
                total_cargos += monto
                saldo_calculado += monto
            elif tipo == 'pago':
                total_pagos += monto
                saldo_calculado -= monto
        
        # Actualizar saldo si difiere
        if abs(saldo_calculado - float(cuenta.get('saldo_deudor', 0))) > 0.01:
            supabase.table('cuentas_miembro').update({
                'saldo_deudor': saldo_calculado
            }).eq('miembro_uuid', miembro_uuid).execute()
        
        return {
            "cuenta": cuenta,
            "ventas_fiadas": ventas_fiadas,
            "movimientos_recientes": movimientos_result.data or [],
            "estadisticas": {
                "total_cargos": total_cargos,
                "total_pagos": total_pagos,
                "saldo_actual": saldo_calculado
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cuenta: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener cuenta")

@pos_cuentas_router.get("/cuentas/{miembro_uuid}/movimientos")
async def get_movimientos_cuenta(
    miembro_uuid: str,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Obtener historial completo de movimientos de una cuenta con paginación"""
    try:
        cuenta_result = supabase.table('cuentas_miembro').select('uuid').eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data or len(cuenta_result.data) == 0:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta_row = cast(Dict[str, Any], cuenta_result.data[0])
        cuenta_uuid = cuenta_row.get('uuid')
        
        if not cuenta_uuid:
            raise HTTPException(status_code=500, detail="Cuenta sin UUID")
        
        movimientos_result = supabase.table('movimientos_cuenta').select('*').eq('cuenta_uuid', cuenta_uuid).eq('is_deleted', False).execute()
        
        ventas_pagadas_result = supabase.table('ventas').select(
            'uuid, total, created_at, numero_ticket, is_fiado'
        ).eq('miembro_uuid', miembro_uuid).eq('is_fiado', False).eq('is_deleted', False).execute()
        
        items = []
        
        for mov_data in (movimientos_result.data or []):
            mov = cast(Dict[str, Any], mov_data)
            items.append({
                'uuid': mov.get('uuid'),
                'fecha': mov.get('fecha'),
                'tipo': mov.get('tipo'),
                'monto': float(mov.get('monto', 0)),
                'descripcion': mov.get('descripcion'),
                'venta_uuid': mov.get('venta_uuid'),
                'metodo_pago': mov.get('metodo_pago')
            })
        
        for venta_data in (ventas_pagadas_result.data or []):
            venta = cast(Dict[str, Any], venta_data)
            items.append({
                'uuid': venta.get('uuid'),
                'fecha': venta.get('created_at'),
                'tipo': 'venta_pagada',
                'monto': float(venta.get('total', 0)),
                'descripcion': f"Venta #{venta.get('numero_ticket')} pagada directamente",
                'venta_uuid': venta.get('uuid'),
                'numero_ticket': venta.get('numero_ticket')
            })
        
        items.sort(key=lambda x: x.get('fecha', ''), reverse=True)
        
        total_count = len(items)
        items_paginados = items[offset:offset + limit]
        
        return {
            "movimientos": items_paginados,
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting movimientos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener movimientos")

@pos_cuentas_router.post("/cuentas/{miembro_uuid}/abonos")
async def registrar_abono(
    miembro_uuid: str,
    monto: Decimal,
    metodo_pago: str = "efectivo",
    notas: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-CUENTA-01: Registrar abono a cuenta de miembro"""
    try:
        if monto <= 0:
            raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
        
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        cuenta_result = supabase.table('cuentas_miembro').select('*').eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta = cast(Dict[str, Any], cuenta_result.data[0])
        cuenta_uuid = cuenta.get('uuid')
        
        # Calcular saldo real
        todos_movimientos = supabase.table('movimientos_cuenta').select('tipo, monto').eq('cuenta_uuid', cuenta_uuid).eq('is_deleted', False).execute()
        
        saldo_real = 0
        for mov_data in (todos_movimientos.data or []):
            mov = cast(Dict[str, Any], mov_data)
            tipo = mov.get('tipo')
            monto_mov = float(mov.get('monto', 0))
            if tipo == 'cargo':
                saldo_real += monto_mov
            elif tipo == 'pago':
                saldo_real -= monto_mov
        
        if float(monto) > saldo_real:
            raise HTTPException(
                status_code=400,
                detail=f"El abono ({monto}) excede el saldo actual ({saldo_real})"
            )
        
        # Registrar movimiento
        movimiento_data = {
            'uuid': str(uuid_lib.uuid4()),
            'cuenta_uuid': cuenta_uuid,
            'tipo': 'pago',
            'monto': float(monto),
            'descripcion': f"Abono - {metodo_pago}" + (f" - {notas}" if notas else ""),
            'created_by_uuid': actor_uuid,
            'fecha': datetime.now(timezone.utc).isoformat()
        }
        
        movimiento_result = supabase.table('movimientos_cuenta').insert(movimiento_data).execute()
        
        if not movimiento_result.data:
            raise HTTPException(status_code=500, detail="Error al registrar abono")
        
        # Actualizar saldo
        nuevo_saldo = saldo_real - float(monto)
        supabase.table('cuentas_miembro').update({
            'saldo_deudor': nuevo_saldo,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('miembro_uuid', miembro_uuid).execute()
        
        return {
            "abono": movimiento_result.data[0],
            "saldo_anterior": saldo_real,
            "nuevo_saldo": nuevo_saldo
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering abono: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar abono")

@pos_cuentas_router.post("/cuentas/{miembro_uuid}/ajustes")
async def crear_ajuste_cuenta(
    miembro_uuid: str,
    monto: Decimal,
    justificacion: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Crear ajuste administrativo en cuenta de miembro"""
    try:
        if not justificacion or len(justificacion.strip()) < 10:
            raise HTTPException(status_code=400, detail="La justificación debe tener al menos 10 caracteres")
        
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        cuenta_result = supabase.table('cuentas_miembro').select('*').eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta = cast(Dict[str, Any], cuenta_result.data[0])
        saldo_actual = float(cuenta.get('saldo_deudor', 0))
        
        movimiento_data = {
            'uuid': str(uuid_lib.uuid4()),
            'cuenta_uuid': cuenta.get('uuid'),
            'tipo': 'ajuste',
            'monto': float(monto),
            'descripcion': f"Ajuste administrativo: {justificacion}",
            'created_by_uuid': actor_uuid,
            'fecha': datetime.now(timezone.utc).isoformat()
        }
        
        movimiento_result = supabase.table('movimientos_cuenta').insert(movimiento_data).execute()
        
        if not movimiento_result.data:
            raise HTTPException(status_code=500, detail="Error al crear ajuste")
        
        nuevo_saldo = saldo_actual + float(monto)
        
        supabase.table('cuentas_miembro').update({
            'saldo_deudor': nuevo_saldo,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('miembro_uuid', miembro_uuid).execute()
        
        return {
            "ajuste": movimiento_result.data[0],
            "saldo_anterior": saldo_actual,
            "nuevo_saldo": nuevo_saldo,
            "monto": float(monto)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ajuste: {e}")
        raise HTTPException(status_code=500, detail="Error al crear ajuste")
