"""
Módulo POS - Gestión de Turnos/Shifts de Caja
RF-SHIFT
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, cast
from models.models import CajaShiftCreate, CajaShiftClose
from core import config
from utils.auth import require_admin, require_auth_user, require_any_authenticated
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import logging
import uuid as uuid_lib
import bcrypt
import hashlib

logger = logging.getLogger(__name__)
pos_shifts_router = APIRouter(prefix="", tags=["pos-shifts"])
supabase = config.supabase

# ============= CAJA / SHIFTS (RF-SHIFT) =============

@pos_shifts_router.post("/caja-shifts")
async def open_shift(
    shift: CajaShiftCreate,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-SHIFT-01: Abrir nuevo turno de caja y crear meseros temporales"""
    try:
        # Validar no hay turno abierto
        turno_existente = supabase.table('caja_shift')\
            .select('uuid')\
            .eq('estado', 'abierta')\
            .eq('is_deleted', False)\
            .execute()
        
        if turno_existente.data and len(turno_existente.data) > 0:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un turno abierto. Debe cerrarlo antes de abrir uno nuevo."
            )
        
        # Crear el turno
        shift_data = shift.model_dump(exclude={'meseros'})
        shift_data['uuid'] = str(uuid_lib.uuid4())
        
        if 'efectivo_inicial' in shift_data:
            shift_data['efectivo_inicial'] = float(shift_data['efectivo_inicial'])
        if 'apertura_por' in shift_data:
            shift_data['apertura_por'] = str(shift_data['apertura_por'])
        
        result = supabase.table('caja_shift').insert(shift_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Error al abrir shift")
        
        shift_created = result.data[0]
        
        # Crear meseros temporales si se proporcionaron
        meseros_creados = []
        if shift.meseros and len(shift.meseros) > 0:
            existing_meseros = supabase.table('usuarios_temporales')\
                .select('username')\
                .like('username', 'mesero_%')\
                .execute()
            
            next_num = 1
            if existing_meseros.data:
                for m_data in existing_meseros.data:
                    m = cast(Dict[str, Any], m_data)
                    try:
                        username = m.get('username', '')
                        if isinstance(username, str):
                            num = int(username.replace('mesero_', ''))
                            if num >= next_num:
                                next_num = num + 1
                    except:
                        continue
            
            # Calcular fin_validity: 4 PM hora Colombia (UTC-5)
            now_utc = datetime.now(timezone.utc)
            colombia_tz = timezone(timedelta(hours=-5))
            now_colombia = now_utc.astimezone(colombia_tz)
            
            cierre_hora = now_colombia.replace(hour=16, minute=0, second=0, microsecond=0)
            if now_colombia.hour >= 16:
                cierre_hora = cierre_hora + timedelta(days=1)
            
            fin_validity = cierre_hora.astimezone(timezone.utc)
            
            for pin_mesero in shift.meseros:
                username = f"mesero_{next_num}"
                display_name = f"Mesero {next_num}"
                
                if not pin_mesero.miembro_uuid:
                    logger.warning(f"Mesero sin miembro_uuid, usando username como fallback")
                
                numero_documento = None
                if pin_mesero.miembro_uuid:
                    miembro_result = supabase.table('miembros').select('documento').eq('uuid', str(pin_mesero.miembro_uuid)).execute()
                    if miembro_result.data:
                        miembro = cast(Dict[str, Any], miembro_result.data[0])
                        numero_documento = miembro.get('documento')
                        
                        if not numero_documento or (isinstance(numero_documento, str) and numero_documento.strip() == ''):
                            logger.warning(f"Miembro {pin_mesero.miembro_uuid} no tiene documento")
                            numero_documento = None
                
                pin_hash = hashlib.sha256(pin_mesero.pin.encode()).hexdigest()
                
                mesero_data = {
                    'uuid': str(uuid_lib.uuid4()),
                    'username': username,
                    'display_name': display_name,
                    'pin_hash': pin_hash,
                    'miembro_uuid': str(pin_mesero.miembro_uuid) if pin_mesero.miembro_uuid else None,
                    'activo': True,
                    'inicio_validity': now_utc.isoformat(),
                    'fin_validity': fin_validity.isoformat(),
                    'creado_por_uuid': current_user.get('sub') or current_user.get('uid')
                }
                
                mesero_result = supabase.table('usuarios_temporales').insert(mesero_data).execute()
                
                if mesero_result.data:
                    meseros_creados.append({
                        'username': username,
                        'display_name': display_name,
                        'documento': numero_documento,
                        'pin': pin_mesero.pin
                    })
                
                next_num += 1
        
        return cast(Dict[str, Any], {
            **cast(Dict[str, Any], shift_created),
            'meseros_creados': meseros_creados
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening shift: {e}")
        raise HTTPException(status_code=500, detail=f"Error al abrir turno: {str(e)}")

@pos_shifts_router.get("/caja-shifts/{shift_uuid}/summary")
async def get_shift_summary(
    shift_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-SHIFT-02: Obtener resumen de turno para cierre"""
    try:
        shift_result = supabase.table('caja_shift').select('*').eq('uuid', shift_uuid).execute()
        
        if not shift_result.data:
            raise HTTPException(status_code=404, detail="Turno no encontrado")
        
        shift = cast(Dict[str, Any], shift_result.data[0])
        
        ventas_result = supabase.table('ventas').select('*').eq('shift_uuid', shift_uuid).eq('is_deleted', False).execute()
        ventas = ventas_result.data or []
        
        pagos_result = supabase.table('ventas_pago').select('*').eq('shift_uuid', shift_uuid).execute()
        pagos = pagos_result.data or []
        
        # Calcular totales por método de pago
        pagos_por_metodo = {}
        for pago_data in pagos:
            pago = cast(Dict[str, Any], pago_data)
            metodo = pago.get('metodo_pago', 'efectivo')
            if metodo not in pagos_por_metodo:
                pagos_por_metodo[metodo] = {'metodo': metodo, 'total': 0}
            pagos_por_metodo[metodo]['total'] += float(pago.get('monto', 0))
        
        pagos_por_metodo_list = list(pagos_por_metodo.values())
        
        total_ventas = sum(
            float(cast(Dict[str, Any], v).get('total', 0))
            for v in ventas
            if isinstance(v, dict)
        )
        total_fiado = sum(
            float(cast(Dict[str, Any], v).get('total', 0))
            for v in ventas
            if isinstance(v, dict) and cast(Dict[str, Any], v).get('is_fiado')
        )
        num_tickets = len(ventas)
        
        return {
            "shift": shift,
            "num_tickets": num_tickets,
            "total_ventas": total_ventas,
            "total_fiado": total_fiado,
            "pagos_por_metodo": pagos_por_metodo_list,
            "ventas": ventas
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shift summary: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener resumen de turno")

@pos_shifts_router.post("/caja-shifts/{shift_uuid}/close")
async def close_shift(
    shift_uuid: str,
    close_data: CajaShiftClose,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-SHIFT-02: Cerrar turno de caja con conciliación"""
    try:
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        result = supabase.table('caja_shift').update({
            'cierre_por': actor_uuid,
            'cierre_fecha': datetime.now(timezone.utc).isoformat(),
            'efectivo_recuento': float(close_data.efectivo_recuento),
            'estado': 'cerrada',
            'notas': close_data.notas
        }).eq('uuid', shift_uuid).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Turno no encontrado")
        
        # Desactivar todos los usuarios temporales activos
        desactivar_result = supabase.table('usuarios_temporales')\
            .update({'activo': False})\
            .eq('activo', True)\
            .execute()
        
        usuarios_desactivados = len(desactivar_result.data) if desactivar_result.data else 0
        
        logger.info(f"Turno {shift_uuid} cerrado. {usuarios_desactivados} usuarios temporales desactivados.")
        
        return {
            "message": f"Turno cerrado exitosamente. {usuarios_desactivados} meseros desactivados."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing shift: {e}")
        raise HTTPException(status_code=500, detail="Error al cerrar turno")

@pos_shifts_router.get("/caja-shifts")
async def list_shifts(
    estado: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_any_authenticated)
) -> Dict[str, Any]:
    """Listar turnos de caja"""
    try:
        query = supabase.table('caja_shift').select('*').eq('is_deleted', False)
        
        if estado:
            query = query.eq('estado', estado)
        if fecha_desde:
            query = query.gte('apertura_fecha', fecha_desde)
        if fecha_hasta:
            query = query.lte('apertura_fecha', fecha_hasta)
        
        query = query.order('apertura_fecha', desc=True)
        result = query.execute()
        
        return {"shifts": result.data or []}
    except Exception as e:
        logger.error(f"Error listing shifts: {e}")
        raise HTTPException(status_code=500, detail="Error al listar turnos")

@pos_shifts_router.get("/caja-shifts/activo")
async def get_active_shift() -> Dict[str, Any]:
    """Obtener el turno actualmente abierto (si existe)"""
    try:
        result = supabase.table('caja_shift')\
            .select('*')\
            .eq('estado', 'abierta')\
            .eq('is_deleted', False)\
            .limit(1)\
            .execute()
        
        if result.data and len(result.data) > 0:
            return {
                "activo": True,
                "shift": result.data[0]
            }
        else:
            return {"activo": False, "shift": None}
    except Exception as e:
        logger.error(f"Error getting active shift: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener turno activo")
