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
        
        if 'efectivo_inicial' in shift_data and shift_data['efectivo_inicial'] is not None:
            shift_data['efectivo_inicial'] = float(shift_data['efectivo_inicial'])
        elif 'efectivo_inicial' in shift_data:
            shift_data['efectivo_inicial'] = 0  # Valor por defecto si es None
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
                if not pin_mesero.miembro_uuid:
                    logger.warning(f"Mesero sin miembro_uuid, saltando")
                    continue
                
                # Obtener información del miembro (documento y nombres)
                miembro_result = supabase.table('miembros').select('documento, nombres, apellidos').eq('uuid', str(pin_mesero.miembro_uuid)).execute()
                if not miembro_result.data:
                    logger.warning(f"Miembro {pin_mesero.miembro_uuid} no encontrado")
                    continue
                
                miembro = cast(Dict[str, Any], miembro_result.data[0])
                numero_documento = miembro.get('documento')
                
                if not numero_documento or (isinstance(numero_documento, str) and numero_documento.strip() == ''):
                    logger.warning(f"Miembro {pin_mesero.miembro_uuid} no tiene documento válido")
                    continue
                
                # Usar el número de documento como username
                username = str(numero_documento).strip()
                display_name = f"{miembro.get('nombres', '')} {miembro.get('apellidos', '')}".strip()
                
                # Verificar si ya existe un usuario temporal con ese documento activo
                existing_user = supabase.table('usuarios_temporales')\
                    .select('uuid')\
                    .eq('username', username)\
                    .eq('activo', True)\
                    .execute()
                
                if existing_user.data and len(existing_user.data) > 0:
                    logger.info(f"Usuario temporal con documento {username} ya existe y está activo")
                    meseros_creados.append({
                        'username': username,
                        'display_name': display_name,
                        'documento': numero_documento,
                        'pin': pin_mesero.pin,
                        'ya_existia': True
                    })
                    continue
                
                pin_hash = hashlib.sha256(pin_mesero.pin.encode()).hexdigest()
                
                mesero_data = {
                    'uuid': str(uuid_lib.uuid4()),
                    'username': username,  # Documento como username
                    'display_name': display_name,  # Nombre completo del miembro
                    'pin_hash': pin_hash,
                    'pin_plain': pin_mesero.pin,  # Guardar PIN en texto plano para consulta administrativa
                    'shift_uuid': shift_data['uuid'],  # Relacionar mesero con el turno
                    'miembro_uuid': str(pin_mesero.miembro_uuid),
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
                        'pin': pin_mesero.pin,
                        'ya_existia': False
                    })
        
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
        
        # Obtener UUIDs de ventas de este turno
        venta_uuids = [cast(Dict[str, Any], v).get('uuid') for v in ventas if isinstance(v, dict)]
        
        # Obtener pagos de estas ventas
        pagos = []
        if venta_uuids:
            pagos_result = supabase.table('pagos_venta').select('*').in_('venta_uuid', venta_uuids).execute()
            pagos = pagos_result.data or []
        
        # Calcular totales por método de pago
        pagos_por_metodo = {}
        for pago_data in pagos:
            pago = cast(Dict[str, Any], pago_data)
            metodo = pago.get('metodo', 'efectivo')
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
        
        # Obtener información del cajero que abrió el turno
        cajero_info = None
        apertura_por = shift.get('apertura_por')
        if apertura_por:
            try:
                miembro_result = supabase.table('miembros').select('nombres, apellidos, uuid').eq('uuid', apertura_por).limit(1).execute()
                if miembro_result.data:
                    miembro = cast(Dict[str, Any], miembro_result.data[0])
                    cajero_info = {
                        'tipo': 'admin',
                        'nombre': f"{miembro.get('nombres', '')} {miembro.get('apellidos', '')}".strip(),
                        'uuid': miembro.get('uuid')
                    }
            except:
                pass
        
        # Obtener todos los meseros asignados a este turno (no solo los que vendieron)
        meseros_result = supabase.table('usuarios_temporales').select('uuid, username, display_name, miembro_uuid, pin_plain').eq('shift_uuid', shift_uuid).execute()
        meseros_data = meseros_result.data or []
        mesero_uuids = {cast(Dict[str, Any], m).get('uuid') for m in meseros_data}
        
        # Obtener UUIDs de vendedores que sí hicieron ventas
        vendedor_uuids_con_ventas = set(
            cast(Dict[str, Any], v).get('vendedor_uuid')
            for v in ventas
            if isinstance(v, dict) and cast(Dict[str, Any], v).get('vendedor_uuid')
        )
        
        # Verificar si el cajero/admin hizo ventas
        cajero_vendio = False
        if cajero_info and cajero_info['uuid'] in vendedor_uuids_con_ventas:
            cajero_vendio = True
        
        meseros_info = []
        for mesero_data in meseros_data:
            mesero = cast(Dict[str, Any], mesero_data)
            miembro_nombre = None
            if mesero.get('miembro_uuid'):
                try:
                    miembro_result = supabase.table('miembros').select('nombres, apellidos, documento').eq('uuid', mesero['miembro_uuid']).limit(1).execute()
                    if miembro_result.data:
                        miembro = cast(Dict[str, Any], miembro_result.data[0])
                        miembro_nombre = f"{miembro.get('nombres', '')} {miembro.get('apellidos', '')}".strip()
                except:
                    pass
            
            meseros_info.append({
                'tipo': 'mesero',
                'username': mesero.get('username'),
                'display_name': mesero.get('display_name'),
                'miembro_nombre': miembro_nombre,
                'miembro_uuid': mesero.get('miembro_uuid'),
                'pin': mesero.get('pin_plain'),  # PIN disponible para administradores
                'hizo_ventas': mesero.get('uuid') in vendedor_uuids_con_ventas  # Indicador si vendió o no
            })
        
        # Buscar otros vendedores (no meseros del turno ni el cajero) que hicieron ventas
        otros_vendedores_uuids = vendedor_uuids_con_ventas - mesero_uuids
        if cajero_info:
            otros_vendedores_uuids.discard(cajero_info['uuid'])
        
        otros_vendedores = []
        for vendedor_uuid in otros_vendedores_uuids:
            if vendedor_uuid:
                try:
                    # Buscar en miembros
                    miembro_result = supabase.table('miembros').select('nombres, apellidos').eq('uuid', vendedor_uuid).limit(1).execute()
                    if miembro_result.data:
                        miembro = cast(Dict[str, Any], miembro_result.data[0])
                        otros_vendedores.append({
                            'tipo': 'otro',
                            'nombre': f"{miembro.get('nombres', '')} {miembro.get('apellidos', '')}".strip(),
                            'hizo_ventas': True
                        })
                except:
                    pass
        
        return {
            "shift": shift,
            "num_tickets": num_tickets,
            "total_ventas": total_ventas,
            "total_fiado": total_fiado,
            "pagos_por_metodo": pagos_por_metodo_list,
            "cajero": cajero_info,
            "cajero_vendio": cajero_vendio,
            "meseros": meseros_info,
            "otros_vendedores": otros_vendedores,
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
) -> Dict[str, Any]:
    """RF-SHIFT-02: Cerrar turno de caja con cálculo automático de efectivo"""
    try:
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        # Obtener información del turno
        shift_result = supabase.table('caja_shift').select('*').eq('uuid', shift_uuid).execute()
        if not shift_result.data:
            raise HTTPException(status_code=404, detail="Turno no encontrado")
        
        shift = cast(Dict[str, Any], shift_result.data[0])
        efectivo_inicial = float(shift.get('efectivo_inicial', 0)) if shift.get('efectivo_inicial') else 0
        
        # Obtener todas las ventas del turno
        ventas_result = supabase.table('ventas').select('uuid').eq('shift_uuid', shift_uuid).eq('is_deleted', False).execute()
        ventas = ventas_result.data or []
        venta_uuids = [cast(Dict[str, Any], v).get('uuid') for v in ventas if isinstance(v, dict)]
        
        # Obtener todos los pagos en efectivo de estas ventas
        total_efectivo = 0
        if venta_uuids:
            pagos_result = supabase.table('pagos_venta').select('*').in_('venta_uuid', venta_uuids).eq('metodo', 'efectivo').execute()
            pagos = pagos_result.data or []
            
            total_efectivo = sum(
                float(cast(Dict[str, Any], p).get('monto', 0))
                for p in pagos
                if isinstance(p, dict)
            )
        
        # Calcular efectivo esperado: inicial + ventas en efectivo
        efectivo_calculado = efectivo_inicial + total_efectivo
        
        result = supabase.table('caja_shift').update({
            'cierre_por': actor_uuid,
            'cierre_fecha': datetime.now(timezone.utc).isoformat(),
            'efectivo_recuento': efectivo_calculado,  # Calculado automáticamente
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
            "message": f"Turno cerrado exitosamente. {usuarios_desactivados} meseros desactivados.",
            "efectivo_calculado": efectivo_calculado,
            "total_ventas_efectivo": total_efectivo,
            "efectivo_inicial": efectivo_inicial
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
    """Listar turnos de caja con información enriquecida del cajero"""
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
        
        # Enriquecer cada shift con información del cajero y mapear nombres de campos
        shifts_enriquecidos = []
        for shift_data in (result.data or []):
            shift = cast(Dict[str, Any], shift_data)
            
            # Intentar obtener nombre del usuario que abrió el turno
            cajero_nombre = None
            apertura_por = shift.get('apertura_por')
            if apertura_por:
                try:
                    # Buscar en miembros
                    miembro_result = supabase.table('miembros').select('nombres, apellidos').eq('uuid', apertura_por).limit(1).execute()
                    if miembro_result.data:
                        miembro = cast(Dict[str, Any], miembro_result.data[0])
                        cajero_nombre = f"{miembro.get('nombres', '')} {miembro.get('apellidos', '')}".strip()
                except:
                    pass
            
            # Mapear nombres de campos para el frontend
            shift_enriquecido = {
                **shift,
                'cajero_nombre': cajero_nombre or 'N/A',
                'monto_apertura': shift.get('efectivo_inicial', 0),
                'monto_cierre': shift.get('efectivo_recuento', 0)
            }
            shifts_enriquecidos.append(shift_enriquecido)
        
        return {"shifts": shifts_enriquecidos}
    except Exception as e:
        logger.error(f"Error listing shifts: {e}")
        raise HTTPException(status_code=500, detail="Error al listar turnos")

@pos_shifts_router.get("/caja-shifts/activo")
async def get_active_shift() -> Dict[str, Any]:
    """Obtener el turno actualmente abierto (si existe) con información enriquecida"""
    try:
        result = supabase.table('caja_shift')\
            .select('*')\
            .eq('estado', 'abierta')\
            .eq('is_deleted', False)\
            .limit(1)\
            .execute()
        
        if result.data and len(result.data) > 0:
            shift = cast(Dict[str, Any], result.data[0])
            
            # Intentar obtener nombre del usuario que abrió el turno
            cajero_nombre = None
            apertura_por = shift.get('apertura_por')
            if apertura_por:
                try:
                    # Buscar en miembros
                    miembro_result = supabase.table('miembros').select('nombres, apellidos').eq('uuid', apertura_por).limit(1).execute()
                    if miembro_result.data:
                        miembro = cast(Dict[str, Any], miembro_result.data[0])
                        cajero_nombre = f"{miembro.get('nombres', '')} {miembro.get('apellidos', '')}".strip()
                except:
                    pass
            
            # Enriquecer shift con información adicional
            shift_enriquecido = {
                **shift,
                'cajero_nombre': cajero_nombre or 'N/A',
                'monto_apertura': shift.get('efectivo_inicial', 0),
                'monto_cierre': shift.get('efectivo_recuento', 0)
            }
            
            return {
                "activo": True,
                "shift": shift_enriquecido
            }
        else:
            return {"activo": False, "shift": None}
    except Exception as e:
        logger.error(f"Error getting active shift: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener turno activo")
