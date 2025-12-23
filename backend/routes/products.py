from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional, cast
from models.models import (
    ProductoCreate,
    ProductoResponse,
    Venta,
    CajaShiftCreate,
    CajaShiftResponse,
    CajaShiftClose,
    UsuarioTemporalCreate,
    UsuarioTemporalLogin,
    UsuarioTemporalResponse,
    CategoriaProducto,
    MeseroPin,
)
from core import config
from utils.auth import require_admin, require_auth_user, require_any_authenticated, create_access_token
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import bcrypt
import logging
import uuid

logger = logging.getLogger(__name__)
pos_router = APIRouter(prefix="", tags=["pos"])
supabase = config.supabase

# ============= PRODUCTOS (RF-PROD) =============

@pos_router.get("/productos")
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

@pos_router.post("/productos")
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
                raise HTTPException(status_code=409, detail="Ya existe un producto con este código")
        
        data = producto.model_dump()
        # Generar UUID para el nuevo producto
        data['uuid'] = str(uuid.uuid4())
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

@pos_router.put("/productos/{producto_uuid}")
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

@pos_router.delete("/productos/{producto_uuid}")
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

@pos_router.get("/categorias")
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

@pos_router.post("/categorias")
async def create_categoria(
    categoria: CategoriaProducto,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-PROD-02: Crear categoría de producto"""
    try:
        data = categoria.model_dump()
        data['uuid'] = str(uuid.uuid4())  # Generar UUID
        result = supabase.table('categorias_producto').insert(data).execute()
        return cast(Dict[str, Any], result.data[0])
    except Exception as e:
        logger.error(f"Error creating categoria: {e}")
        raise HTTPException(status_code=500, detail="Error al crear categoría")

# ============= VENTAS (RF-SALE) =============

@pos_router.post("/ventas")
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
        
        shift_uuid = turno_abierto.data[0]['uuid']
        
        # VALIDACIÓN CRÍTICA 2: Determinar vendedor_uuid
        # Para usuarios admin de Firebase, usar su miembro_uuid si existe
        # Para meseros temporales, usar su UUID directamente
        if current_user.get('tipo') == 'mesero':
            # Usuario temporal (mesero)
            vendedor_uuid = current_user.get('sub')
            # Validar que el usuario temporal esté activo y vigente
            usuario_temp = supabase.table('usuarios_temporales')\
                .select('uuid, activo')\
                .eq('uuid', vendedor_uuid)\
                .eq('activo', True)\
                .execute()
            
            if not usuario_temp.data:
                raise HTTPException(
                    status_code=403,
                    detail="Usuario temporal inactivo o expirado"
                )
        else:
            # Usuario admin de Firebase - usar miembro_uuid del token
            vendedor_uuid = current_user.get('miembro_uuid')
            if not vendedor_uuid:
                # Si no tiene miembro_uuid, buscar en app_users
                firebase_uid = current_user.get('sub')
                user_result = supabase.table('app_users').select('miembro_uuid').eq('uid', firebase_uid).execute()
                if user_result.data and user_result.data[0].get('miembro_uuid'):
                    vendedor_uuid = user_result.data[0]['miembro_uuid']
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Usuario no tiene miembro asociado. Contacte al administrador."
                    )
        
        # Validaciones básicas
        if not venta.items or len(venta.items) == 0:
            raise HTTPException(status_code=400, detail="La venta debe tener al menos un item")
        
        # Validar cantidades y precios
        for item in venta.items:
            if item.cantidad <= 0:
                raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
            if item.precio_unitario < 0:
                raise HTTPException(status_code=400, detail="El precio no puede ser negativo")
        
        # Validar fiado
        if venta.is_fiado:
            if not venta.miembro_uuid:
                raise HTTPException(status_code=400, detail="Venta fiada requiere miembro_uuid")
            
            # Validar límite de crédito
            cuenta_result = supabase.table('cuentas_miembro').select('saldo_deudor, limite_credito').eq('miembro_uuid', str(venta.miembro_uuid)).execute()
            
            if cuenta_result.data:
                cuenta = cast(Dict[str, Any], cuenta_result.data[0])
                saldo_actual = float(cuenta.get('saldo_deudor', 0))
                limite = float(cuenta.get('limite_credito', 0))
                
                # Calcular total de la venta
                total_venta = sum(float(item.total_item) for item in venta.items)
                
                if saldo_actual + total_venta > limite:
                    # RF-SALE-03: Excede límite - requiere autorización admin
                    if current_user.get('role') not in ['admin', 'ti']:
                        raise HTTPException(
                            status_code=409,
                            detail=f"Límite de crédito excedido. Saldo: ${saldo_actual:.2f}, Límite: ${limite:.2f}. Requiere autorización de administrador."
                        )
        
        # Llamar función create_sale
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        # Obtener siguiente número de ticket para este turno
        tickets_turno = supabase.table('ventas')\
            .select('numero_ticket')\
            .eq('shift_uuid', shift_uuid)\
            .order('numero_ticket', desc=True)\
            .limit(1)\
            .execute()
        
        siguiente_ticket = 1
        if tickets_turno.data and len(tickets_turno.data) > 0:
            ultimo_ticket = tickets_turno.data[0].get('numero_ticket')
            if ultimo_ticket:
                siguiente_ticket = int(ultimo_ticket) + 1
        
        payload = venta.model_dump()
        # Agregar campos obligatorios del turno
        payload['shift_uuid'] = shift_uuid
        payload['vendedor_uuid'] = vendedor_uuid
        payload['numero_ticket'] = siguiente_ticket
        
        # Convertir todos los Decimal a float para JSON serialization
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
        
        # Cast seguro del resultado
        venta_result = cast(Dict[str, Any], result.data[0])
        logger.info(f"venta_result: {venta_result}")
        venta_uuid = venta_result.get('venta_uuid')
        
        if not venta_uuid:
            logger.error(f"No venta_uuid in result: {venta_result}")
            raise HTTPException(status_code=500, detail=f"No se pudo obtener UUID de venta. Resultado: {venta_result}")
        
        # Obtener detalles de la venta creada
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

@pos_router.get("/ventas")
async def list_ventas(
    shift_uuid: Optional[str] = None,
    miembro_uuid: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    estado: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user: Dict[str, Any] = Depends(require_auth_user)
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
        
        # Paginación
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

@pos_router.get("/ventas/{venta_uuid}")
async def get_venta(
    venta_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Obtener detalle de venta con items y pagos"""
    try:
        venta_result = supabase.table('ventas').select('*').eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        venta = venta_result.data[0]
        
        # Obtener items
        items_result = supabase.table('venta_items').select('*').eq('venta_uuid', venta_uuid).execute()
        
        # Obtener pagos
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

@pos_router.post("/ventas/{venta_uuid}/anular")
async def anular_venta(
    venta_uuid: str,
    motivo: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-SALE-05: Anular venta (solo admin/cajero)"""
    try:
        # Verificar que existe
        venta_result = supabase.table('ventas').select('*').eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        venta = cast(Dict[str, Any], venta_result.data[0])
        
        # Anular venta
        supabase.table('ventas').update({
            'estado': 'cancelada',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('uuid', venta_uuid).execute()
        
        # TODO: Crear ajustes en cuenta e inventario si aplica
        # TODO: Registrar en audit_logs
        
        return {"message": "Venta anulada", "motivo": motivo}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error anulando venta: {e}")
        raise HTTPException(status_code=500, detail="Error al anular venta")

# ============= CAJA / SHIFTS (RF-SHIFT) =============

@pos_router.post("/caja-shifts")
async def open_shift(
    shift: CajaShiftCreate,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-SHIFT-01: Abrir nuevo turno de caja y crear meseros temporales
    
    REGLA: No se puede abrir un turno si ya existe uno abierto
    """
    try:
        # VALIDACIÓN CRÍTICA: No puede haber más de un turno abierto
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
        
        import uuid as uuid_lib
        import hashlib
        from datetime import timezone, timedelta
        
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
        
        # Crear meseros temporales si se proporcionaron PINs
        meseros_creados = []
        if shift.meseros and len(shift.meseros) > 0:
            # Obtener el próximo número de mesero
            existing_meseros = supabase.table('usuarios_temporales')\
                .select('username')\
                .like('username', 'mesero_%')\
                .execute()
            
            next_num = 1
            if existing_meseros.data:
                nums = []
                for m in existing_meseros.data:
                    try:
                        num = int(m['username'].replace('mesero_', ''))
                        nums.append(num)
                    except:
                        pass
                if nums:
                    next_num = max(nums) + 1
            
            # Calcular fin_validity: 4 PM hora Colombia (UTC-5)
            from datetime import datetime
            now_utc = datetime.now(timezone.utc)
            # Convertir a hora Colombia (UTC-5)
            colombia_tz = timezone(timedelta(hours=-5))
            now_col = now_utc.astimezone(colombia_tz)
            
            # Establecer fin_validity a las 4 PM de hoy
            fin_validity_col = now_col.replace(hour=16, minute=0, second=0, microsecond=0)
            
            # Si ya pasaron las 4 PM, establecer para mañana
            if now_col.hour >= 16:
                fin_validity_col = fin_validity_col + timedelta(days=1)
            
            # Convertir de vuelta a UTC
            fin_validity_utc = fin_validity_col.astimezone(timezone.utc)
            
            for idx, mesero_data_input in enumerate(shift.meseros):
                # Obtener información del miembro para usar su número de documento
                miembro_result = supabase.table('miembros').select('uuid, documento, nombres, apellidos').eq('uuid', mesero_data_input.miembro_uuid).execute()
                
                if not miembro_result.data:
                    raise HTTPException(status_code=404, detail=f"Miembro {mesero_data_input.miembro_uuid} no encontrado")
                
                miembro = miembro_result.data[0]
                numero_documento = miembro.get('documento')
                
                # Si no tiene documento, usar el UUID como username
                if not numero_documento or numero_documento.strip() == '':
                    mesero_username = f"mesero_{miembro.get('uuid')[:8]}"  # Usar primeros 8 chars del UUID
                else:
                    mesero_username = numero_documento  # Usar número de documento como username
                
                mesero_display = f"{miembro.get('nombres')} {miembro.get('apellidos')}"
                
                # Hash del PIN (usar SHA256 simple por ahora)
                pin_hash = hashlib.sha256(mesero_data_input.pin.encode()).hexdigest()
                
                mesero_data = {
                    'uuid': str(uuid_lib.uuid4()),
                    'username': mesero_username,
                    'display_name': mesero_display,
                    'miembro_uuid': mesero_data_input.miembro_uuid,
                    'pin_hash': pin_hash,
                    'creado_por_uuid': current_user.get('sub'),  # JWT usa 'sub' para el user ID
                    'activo': True,
                    'fin_validity': fin_validity_utc.isoformat()
                }
                
                mesero_result = supabase.table('usuarios_temporales').insert(mesero_data).execute()
                
                if mesero_result.data:
                    meseros_creados.append({
                        'username': mesero_username,
                        'display_name': mesero_display,
                        'uuid': mesero_result.data[0]['uuid']
                    })
        
        return {
            **shift_created,
            'meseros_creados': meseros_creados
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening shift: {e}")
        raise HTTPException(status_code=500, detail=f"Error al abrir turno: {str(e)}")

@pos_router.get("/caja-shifts/{shift_uuid}/summary")
async def get_shift_summary(
    shift_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-SHIFT-02: Obtener resumen de turno para cierre
    
    RF-REPORT-01: Reporte diario por shift
    """
    try:
        # Obtener shift
        shift_result = supabase.table('caja_shift').select('*').eq('uuid', shift_uuid).execute()
        
        if not shift_result.data:
            raise HTTPException(status_code=404, detail="Shift no encontrado")
        
        shift = cast(Dict[str, Any], shift_result.data[0])
        
        # Obtener ventas del shift
        ventas_result = supabase.table('ventas').select('*').eq('shift_uuid', shift_uuid).eq('is_deleted', False).execute()
        ventas = ventas_result.data or []
        
        # Obtener pagos del shift
        pagos_result = supabase.table('ventas_pago').select('*').eq('shift_uuid', shift_uuid).execute()
        pagos = pagos_result.data or []
        
        # Calcular totales por método de pago manualmente
        pagos_por_metodo = {}
        for pago in pagos:
            metodo = pago.get('metodo', 'efectivo')
            monto = float(pago.get('monto', 0))
            if metodo not in pagos_por_metodo:
                pagos_por_metodo[metodo] = {'metodo': metodo, 'total': 0, 'cantidad': 0}
            pagos_por_metodo[metodo]['total'] += monto
            pagos_por_metodo[metodo]['cantidad'] += 1
        
        pagos_por_metodo_list = list(pagos_por_metodo.values())
        
        # Calcular totales con cast seguro
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

@pos_router.post("/caja-shifts/{shift_uuid}/close")
async def close_shift(
    shift_uuid: str,
    close_data: CajaShiftClose,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-SHIFT-02: Cerrar turno de caja con conciliación
    
    REGLA: Al cerrar el turno, se desactivan automáticamente todos los usuarios temporales
    """
    try:
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        efectivo_recuento = close_data.efectivo_recuento
        notas = close_data.notas
        
        # Cerrar el turno
        result = supabase.table('caja_shift').update({
            'cierre_por': actor_uuid,
            'cierre_fecha': datetime.now(timezone.utc).isoformat(),
            'efectivo_recuento': float(efectivo_recuento),
            'estado': 'cerrada',
            'notas': notas
        }).eq('uuid', shift_uuid).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Shift no encontrado")
        
        # REGLA CRÍTICA: Desactivar todos los usuarios temporales activos
        # Los usuarios temporales mueren con el turno
        desactivar_result = supabase.table('usuarios_temporales')\
            .update({'activo': False})\
            .eq('activo', True)\
            .execute()
        
        usuarios_desactivados = len(desactivar_result.data) if desactivar_result.data else 0
        
        logger.info(f"Turno {shift_uuid} cerrado. {usuarios_desactivados} usuarios temporales desactivados.")
        
        # TODO: Registrar en audit_logs
        
        return {
            "message": f"Turno cerrado exitosamente. {usuarios_desactivados} meseros desactivados."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error closing shift: {e}")
        raise HTTPException(status_code=500, detail="Error al cerrar turno")

@pos_router.get("/caja-shifts")
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


@pos_router.get("/caja-shifts/activo")
async def get_active_shift() -> Dict[str, Any]:
    """Obtener el turno actualmente abierto (si existe)
    
    REGLA: Solo puede haber un turno abierto a la vez
    NOTA: Este endpoint es público para que meseros puedan verificar el turno
    """
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
            return {
                "activo": False,
                "shift": None
            }
    except Exception as e:
        logger.error(f"Error getting active shift: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener turno activo")

# ============= USUARIOS TEMPORALES (RF-USER) =============

@pos_router.post("/usuarios-temporales")
async def create_usuario_temporal(
    usuario: UsuarioTemporalCreate,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-USER-01: Crear usuario temporal con PIN hasheado"""
    try:
        # Validar PIN: debe tener al menos 4 caracteres y solo dígitos
        if not usuario.pin or len(usuario.pin) < 4:
            raise HTTPException(status_code=400, detail="El PIN debe tener al menos 4 dígitos")
        
        if not usuario.pin.isdigit():
            raise HTTPException(status_code=400, detail="El PIN solo puede contener números")
        
        # Validar que el miembro existe
        if not usuario.miembro_uuid:
            raise HTTPException(status_code=400, detail="Debe asociar el usuario temporal a un miembro")
        
        miembro_result = supabase.table('miembros').select('uuid').eq('uuid', usuario.miembro_uuid).execute()
        if not miembro_result.data:
            raise HTTPException(status_code=404, detail="El miembro especificado no existe")
        
        # Hashear PIN con bcrypt
        hashed_pin = bcrypt.hashpw(usuario.pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        data = usuario.model_dump()
        data['pin_hash'] = hashed_pin
        data['creado_por_uuid'] = actor_uuid
        del data['pin']
        
        result = supabase.table('usuarios_temporales').insert(data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Error al crear usuario temporal")
        
        # Retornar sin el hash
        user_data = cast(Dict[str, Any], result.data[0])
        user_data.pop('pin_hash', None)
        
        return {
            "usuario": user_data,
            "message": "Usuario temporal creado. PIN: " + usuario.pin + " (guardar en lugar seguro)"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating usuario temporal: {e}")
        raise HTTPException(status_code=500, detail="Error al crear usuario temporal")

@pos_router.post("/pos/login-temp")
async def login_temporal(
    username: str,
    pin: str,
    shift_uuid: str
) -> Dict[str, Any]:
    """RF-USER-02: Login con PIN para usuario temporal
    
    Retorna JWT con scope ventas:create y shift_uuid
    """
    try:
        # Buscar usuario
        result = supabase.table('usuarios_temporales').select('uuid, pin_hash, activo, inicio_validity, fin_validity').eq('username', username).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user = cast(Dict[str, Any], result.data[0])
        
        # Validar activo
        if not user.get('activo'):
            raise HTTPException(status_code=401, detail="Usuario desactivado")
        
        # Validar validez temporal
        now = datetime.now(timezone.utc)
        fin_validity = datetime.fromisoformat(user.get('fin_validity', '').replace('Z', '+00:00'))
        
        if now > fin_validity:
            raise HTTPException(status_code=401, detail="Usuario temporal expirado")
        
        # Verificar PIN
        pin_hash = user.get('pin_hash', '')
        if not bcrypt.checkpw(pin.encode('utf-8'), pin_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="PIN incorrecto")
        
        # Crear token con expiración corta (12h)
        access_token = create_access_token(
            data={
                "sub": str(user['uuid']),
                "shift_uuid": shift_uuid,
                "scope": "ventas:create",
                "role": "pos_temp"
            },
            expires_delta=timedelta(hours=12)
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "shift_uuid": shift_uuid
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error login temporal: {e}")
        raise HTTPException(status_code=500, detail="Error al iniciar sesión")

@pos_router.put("/usuarios-temporales/{usuario_uuid}/deactivate")
async def deactivate_usuario_temporal(
    usuario_uuid: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-USER-03: Desactivar usuario temporal antes de expiración"""
    try:
        result = supabase.table('usuarios_temporales').update({'activo': False}).eq('uuid', usuario_uuid).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # TODO: Registrar en audit_logs
        
        return {"message": "Usuario temporal desactivado"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating usuario temporal: {e}")
        raise HTTPException(status_code=500, detail="Error al desactivar usuario")

@pos_router.get("/usuarios-temporales")
async def list_usuarios_temporales(
    activo: Optional[bool] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Listar usuarios temporales"""
    try:
        query = supabase.table('usuarios_temporales').select('uuid, username, display_name, activo, inicio_validity, fin_validity, created_at').eq('is_deleted', False)
        
        if activo is not None:
            query = query.eq('activo', activo)
        
        query = query.order('created_at', desc=True)
        result = query.execute()
        
        return {"usuarios": result.data}
    except Exception as e:
        logger.error(f"Error listing usuarios temporales: {e}")
        raise HTTPException(status_code=500, detail="Error al listar usuarios temporales")

# ============= CUENTAS DE MIEMBROS (RF-CUENTA) =============

@pos_router.get("/cuentas")
async def list_cuentas_miembro(
    con_saldo: Optional[bool] = None,
    q: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Listar cuentas de miembros con saldos"""
    try:
        # Join con miembros para obtener nombre
        query = supabase.table('cuentas_miembro').select(
            '*, miembros!inner(uuid, nombres, apellidos, email, telefono)'
        )
        
        if con_saldo:
            query = query.gt('saldo_deudor', 0)
        
        result = query.execute()
        cuentas = result.data or []
        
        # Si hay búsqueda, filtrar por nombre/apellido del miembro
        if q:
            q_lower = q.lower()
            cuentas = [
                c for c in cuentas
                if q_lower in c.get('miembros', {}).get('nombres', '').lower() 
                or q_lower in c.get('miembros', {}).get('apellidos', '').lower()
            ]
        
        return {"cuentas": cuentas}
    except Exception as e:
        logger.error(f"Error listing cuentas: {e}")
        raise HTTPException(status_code=500, detail="Error al listar cuentas")

@pos_router.get("/cuentas/{miembro_uuid}")
async def get_cuenta_miembro(
    miembro_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Obtener cuenta de un miembro específico con resumen financiero"""
    try:
        # Obtener cuenta con info del miembro
        cuenta_result = supabase.table('cuentas_miembro').select(
            '*, miembros!inner(uuid, nombres, apellidos, email, telefono)'
        ).eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta = cuenta_result.data[0]
        
        # Obtener resumen de ventas fiadas
        ventas_result = supabase.table('ventas').select(
            'uuid, total, created_at, is_fiado, estado, numero_ticket'
        ).eq('miembro_uuid', miembro_uuid).eq('is_fiado', True).eq('is_deleted', False).order('created_at', desc=True).execute()
        
        ventas_fiadas = ventas_result.data or []
        
        # Obtener movimientos recientes para mostrar
        movimientos_result = supabase.table('movimientos_cuenta').select('*').eq('cuenta_uuid', cuenta.get('uuid')).eq('is_deleted', False).order('fecha', desc=True).limit(10).execute()
        
        # Obtener TODOS los movimientos para calcular estadísticas correctamente
        todos_movimientos = supabase.table('movimientos_cuenta').select('tipo, monto').eq('cuenta_uuid', cuenta.get('uuid')).eq('is_deleted', False).execute()
        
        # Calcular estadísticas usando TODOS los movimientos
        total_cargos = 0
        total_pagos = 0
        saldo_calculado = 0
        
        for mov in (todos_movimientos.data or []):
            monto = float(mov.get('monto', 0))
            if mov.get('tipo') == 'cargo':
                total_cargos += monto
                saldo_calculado += monto
            elif mov.get('tipo') == 'pago':
                total_pagos += monto
                saldo_calculado -= monto
            elif mov.get('tipo') == 'ajuste':
                saldo_calculado += monto
        
        # Actualizar el saldo en la tabla para mantener sincronización
        if abs(saldo_calculado - float(cuenta.get('saldo_deudor', 0))) > 0.01:
            supabase.table('cuentas_miembro').update({
                'saldo_deudor': saldo_calculado,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('uuid', cuenta.get('uuid')).execute()
            cuenta['saldo_deudor'] = saldo_calculado
        
        return {
            "cuenta": cuenta,
            "ventas_fiadas": ventas_fiadas,
            "movimientos_recientes": movimientos_result.data or [],
            "estadisticas": {
                "total_cargos": total_cargos,
                "total_pagos": total_pagos,
                "saldo_actual": saldo_calculado  # Usar saldo calculado, no el de la tabla
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cuenta: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener cuenta")

@pos_router.get("/cuentas/{miembro_uuid}/movimientos")
async def get_movimientos_cuenta(
    miembro_uuid: str,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Obtener historial completo de movimientos de una cuenta con paginación
    Incluye movimientos de cuenta (cargos/pagos/ajustes) y ventas pagadas directamente"""
    try:
        # Verificar que existe la cuenta
        cuenta_result = supabase.table('cuentas_miembro').select('uuid').eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data or len(cuenta_result.data) == 0:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta_uuid = cuenta_result.data[0].get('uuid')
        
        if not cuenta_uuid:
            raise HTTPException(status_code=404, detail="UUID de cuenta no disponible")
        
        # Obtener movimientos de cuenta (cargos, pagos, ajustes)
        movimientos_result = supabase.table('movimientos_cuenta').select('*').eq('cuenta_uuid', cuenta_uuid).eq('is_deleted', False).execute()
        
        # Obtener ventas pagadas directamente (no fiadas) del miembro
        ventas_pagadas_result = supabase.table('ventas').select(
            'uuid, total, created_at, numero_ticket, is_fiado'
        ).eq('miembro_uuid', miembro_uuid).eq('is_fiado', False).eq('is_deleted', False).execute()
        
        # Combinar y formatear todos los items
        items = []
        
        # Agregar movimientos de cuenta
        for mov in (movimientos_result.data or []):
            items.append({
                **mov,
                'item_type': 'movimiento',
                'fecha': mov.get('fecha') or mov.get('created_at')
            })
        
        # Agregar ventas pagadas directamente como un tipo especial
        for venta in (ventas_pagadas_result.data or []):
            items.append({
                'uuid': venta.get('uuid'),
                'tipo': 'venta_directa',
                'item_type': 'venta_directa',
                'monto': float(venta.get('total', 0)),
                'fecha': venta.get('created_at'),
                'descripcion': f"Compra pagada - Ticket #{venta.get('numero_ticket')}",
                'venta_uuid': venta.get('uuid'),
                'ventas': {
                    'numero_ticket': venta.get('numero_ticket'),
                    'total': venta.get('total')
                }
            })
        
        # Ordenar todos los items por fecha descendente
        items.sort(key=lambda x: x.get('fecha', ''), reverse=True)
        
        # Aplicar paginación
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

@pos_router.post("/cuentas/{miembro_uuid}/abonos")
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
        
        # Verificar que existe la cuenta
        cuenta_result = supabase.table('cuentas_miembro').select('*').eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta = cuenta_result.data[0]
        cuenta_uuid = cuenta.get('uuid')
        
        # CALCULAR SALDO REAL desde movimientos (no confiar en saldo_deudor de la tabla)
        todos_movimientos = supabase.table('movimientos_cuenta').select('tipo, monto').eq('cuenta_uuid', cuenta_uuid).eq('is_deleted', False).execute()
        
        saldo_real = 0
        for mov in (todos_movimientos.data or []):
            if mov.get('tipo') == 'cargo':
                saldo_real += float(mov.get('monto', 0))
            elif mov.get('tipo') == 'pago':
                saldo_real -= float(mov.get('monto', 0))
            elif mov.get('tipo') == 'ajuste':
                saldo_real += float(mov.get('monto', 0))
        
        if float(monto) > saldo_real:
            raise HTTPException(
                status_code=400, 
                detail=f"El abono (${float(monto):,.0f}) excede el saldo deudor real (${saldo_real:,.0f})"
            )
        
        # Registrar movimiento de tipo 'pago'
        movimiento_uuid = str(uuid.uuid4())
        movimiento_data = {
            'uuid': movimiento_uuid,
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
        
        # Recalcular y actualizar saldo en la tabla
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

@pos_router.post("/cuentas/{miembro_uuid}/ajustes")
async def crear_ajuste_cuenta(
    miembro_uuid: str,
    monto: Decimal,
    justificacion: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Crear ajuste administrativo en cuenta de miembro (positivo o negativo)"""
    try:
        if not justificacion or len(justificacion.strip()) < 10:
            raise HTTPException(status_code=400, detail="Se requiere una justificación de al menos 10 caracteres")
        
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        # Verificar que existe la cuenta
        cuenta_result = supabase.table('cuentas_miembro').select('*').eq('miembro_uuid', miembro_uuid).execute()
        
        if not cuenta_result.data:
            raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
        cuenta = cuenta_result.data[0]
        saldo_actual = float(cuenta.get('saldo_deudor', 0))
        
        # Crear movimiento de tipo 'ajuste'
        movimiento_uuid = str(uuid.uuid4())
        movimiento_data = {
            'uuid': movimiento_uuid,
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
        
        # Actualizar saldo (monto positivo = incrementa deuda, negativo = reduce deuda)
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

@pos_router.get("/ventas/{venta_uuid}/detalle")
async def get_venta_detalle(
    venta_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Obtener detalle completo de una venta incluyendo items y productos"""
    try:
        # Obtener venta con datos del vendedor
        venta_result = supabase.table('ventas').select(
            '*, miembros!ventas_miembro_uuid_fkey(nombres, apellidos)'
        ).eq('uuid', venta_uuid).execute()
        
        if not venta_result.data:
            raise HTTPException(status_code=404, detail="Venta no encontrada")
        
        venta = venta_result.data[0]
        
        # Obtener items de la venta con info de productos
        items_result = supabase.table('venta_items').select(
            '*, productos(nombre, precio, categoria_uuid, categorias_producto(nombre))'
        ).eq('venta_uuid', venta_uuid).eq('is_deleted', False).execute()
        
        # Obtener pagos asociados
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

# ============= REPORTES (RF-REPORT) =============

@pos_router.get("/reportes/ventas")
async def get_reporte_ventas(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-REPORT-02: Reporte de ventas con filtros de fecha"""
    try:
        query = supabase.table('ventas').select('*').eq('is_deleted', False)
        
        if fecha_desde:
            query = query.gte('created_at', fecha_desde)
        
        if fecha_hasta:
            query = query.lte('created_at', fecha_hasta)
        
        query = query.order('created_at', desc=True)
        result = query.execute()
        ventas = result.data or []
        
        # Calcular totales
        total_ventas = sum(float(v.get('total', 0)) for v in ventas)
        total_fiado = sum(float(v.get('total', 0)) for v in ventas if v.get('is_fiado'))
        total_efectivo = sum(float(v.get('total', 0)) for v in ventas if not v.get('is_fiado'))
        
        # Agrupar por día
        ventas_por_dia = {}
        for v in ventas:
            fecha = v.get('created_at', '')[:10]
            if fecha not in ventas_por_dia:
                ventas_por_dia[fecha] = {'total': 0, 'cantidad': 0}
            ventas_por_dia[fecha]['total'] += float(v.get('total', 0))
            ventas_por_dia[fecha]['cantidad'] += 1
        
        return {
            "ventas": ventas,
            "resumen": {
                "total_ventas": total_ventas,
                "total_fiado": total_fiado,
                "total_efectivo": total_efectivo,
                "num_transacciones": len(ventas)
            },
            "ventas_por_dia": ventas_por_dia
        }
    except Exception as e:
        logger.error(f"Error getting reporte ventas: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener reporte")

@pos_router.get("/reportes/productos")
async def get_reporte_productos(
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-REPORT-03: Reporte de productos más vendidos"""
    try:
        # Obtener detalles de ventas
        query = supabase.table('venta_detalle').select(
            '*, productos(nombre, codigo, categoria_uuid)'
        )
        
        result = query.execute()
        detalles = result.data or []
        
        # Agrupar por producto
        productos_vendidos = {}
        for d in detalles:
            prod_uuid = d.get('producto_uuid')
            if prod_uuid not in productos_vendidos:
                productos_vendidos[prod_uuid] = {
                    'producto': d.get('productos', {}),
                    'cantidad_total': 0,
                    'ingresos_total': 0
                }
            productos_vendidos[prod_uuid]['cantidad_total'] += d.get('cantidad', 0)
            productos_vendidos[prod_uuid]['ingresos_total'] += float(d.get('subtotal', 0))
        
        # Ordenar por cantidad vendida
        productos_list = sorted(
            productos_vendidos.values(),
            key=lambda x: x['cantidad_total'],
            reverse=True
        )
        
        return {
            "productos_vendidos": productos_list[:20],  # Top 20
            "total_productos": len(productos_list)
        }
    except Exception as e:
        logger.error(f"Error getting reporte productos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener reporte")

# ============= INVENTARIO (RF-INV) =============

@pos_router.get("/inventario")
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
        
        # Filtrar por bajo stock si se solicita
        if bajo_stock:
            productos = [
                p for p in productos 
                if p.get('stock', 0) <= p.get('stock_minimo', 0)
            ]
        
        # Calcular estadísticas
        total_productos = len(result.data or [])
        productos_bajo_stock = len([
            p for p in (result.data or [])
            if p.get('stock', 0) <= p.get('stock_minimo', 0)
        ])
        
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

@pos_router.put("/inventario/{producto_uuid}/ajustar")
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
        
        # Obtener stock anterior
        producto_result = supabase.table('productos').select('stock').eq('uuid', producto_uuid).execute()
        
        if not producto_result.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        stock_anterior = producto_result.data[0].get('stock', 0)
        
        # Actualizar stock
        result = supabase.table('productos').update({
            'stock': nuevo_stock,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('uuid', producto_uuid).execute()
        
        # Registrar movimiento (si existe tabla)
        try:
            supabase.table('movimientos_inventario').insert({
                'producto_uuid': producto_uuid,
                'stock_anterior': stock_anterior,
                'stock_nuevo': nuevo_stock,
                'diferencia': nuevo_stock - stock_anterior,
                'motivo': motivo,
                'usuario_uuid': actor_uuid,
                'fecha': datetime.now(timezone.utc).isoformat()
            }).execute()
        except:
            pass  # Tabla opcional
        
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


# ============= MESEROS TEMPORALES =============

@pos_router.post("/meseros/login")
async def login_mesero(
    credentials: UsuarioTemporalLogin
) -> Dict[str, Any]:
    """Autenticar mesero con username y PIN"""
    try:
        import hashlib
        from datetime import timezone
        
        # Buscar mesero
        result = supabase.table('usuarios_temporales')\
            .select('*')\
            .eq('username', credentials.username)\
            .eq('activo', True)\
            .eq('is_deleted', False)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=401, detail="Usuario o PIN incorrecto")
        
        mesero = result.data[0]
        
        # Verificar validez temporal
        if mesero.get('fin_validity'):
            fin_validity = datetime.fromisoformat(mesero['fin_validity'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > fin_validity:
                raise HTTPException(status_code=401, detail="Usuario temporal expirado")
        
        # Verificar PIN
        pin_hash = hashlib.sha256(credentials.pin.encode()).hexdigest()
        if pin_hash != mesero.get('pin_hash'):
            raise HTTPException(status_code=401, detail="Usuario o PIN incorrecto")
        
        # Crear token JWT para el mesero
        access_token = create_access_token(
            data={
                "sub": mesero['uuid'],
                "tipo": "mesero",
                "username": mesero['username'],
                "permisos": ['crear_ventas', 'crear_clientes_temporales']
            },
            expires_delta=timedelta(hours=12)
        )
        
        # Retornar datos del mesero con token
        return {
            'access_token': access_token,
            'token_type': 'bearer',
            'uuid': mesero['uuid'],
            'username': mesero['username'],
            'display_name': mesero['display_name'],
            'tipo': 'mesero',
            'permisos': ['crear_ventas', 'crear_clientes_temporales']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error login mesero: {e}")
        raise HTTPException(status_code=500, detail="Error al autenticar")


@pos_router.get("/meseros")
async def get_meseros_activos(
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Obtener lista de meseros activos"""
    try:
        from datetime import timezone
        
        result = supabase.table('usuarios_temporales')\
            .select('uuid, username, display_name, activo, inicio_validity, fin_validity')\
            .eq('activo', True)\
            .eq('is_deleted', False)\
            .order('created_at', desc=True)\
            .execute()
        
        meseros = result.data or []
        
        # Filtrar los que aún están vigentes
        now = datetime.now(timezone.utc)
        meseros_vigentes = []
        for m in meseros:
            if m.get('fin_validity'):
                fin = datetime.fromisoformat(m['fin_validity'].replace('Z', '+00:00'))
                if now <= fin:
                    meseros_vigentes.append(m)
            else:
                meseros_vigentes.append(m)
        
        return {
            'meseros': meseros_vigentes,
            'total': len(meseros_vigentes)
        }
    except Exception as e:
        logger.error(f"Error getting meseros: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener meseros")


@pos_router.post("/meseros/{mesero_uuid}/desactivar")
async def desactivar_mesero(
    mesero_uuid: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Desactivar manualmente un mesero temporal"""
    try:
        result = supabase.table('usuarios_temporales')\
            .update({'activo': False})\
            .eq('uuid', mesero_uuid)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Mesero no encontrado")
        
        return {"message": "Mesero desactivado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating mesero: {e}")
        raise HTTPException(status_code=500, detail="Error al desactivar mesero")


@pos_router.post("/meseros/cerrar-expirados")
async def cerrar_meseros_expirados(
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Cerrar todos los meseros cuya validez haya expirado (usar en cron job)"""
    try:
        from datetime import timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        result = supabase.table('usuarios_temporales')\
            .update({'activo': False})\
            .eq('activo', True)\
            .lt('fin_validity', now)\
            .execute()
        
        cantidad = len(result.data) if result.data else 0
        
        return {
            'message': f'{cantidad} meseros expirados desactivados',
            'cantidad': cantidad
        }
    except Exception as e:
        logger.error(f"Error closing expired meseros: {e}")
        raise HTTPException(status_code=500, detail="Error al cerrar meseros expirados")
