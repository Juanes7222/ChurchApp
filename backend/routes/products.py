from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional, cast
from models.models import (
    ProductoCreate,
    ProductoResponse,
    Venta,
    CajaShiftCreate,
    CajaShiftResponse,
    UsuarioTemporalCreate,
    UsuarioTemporalResponse,
    CategoriaProducto,
)
from core import config
from utils.auth import require_admin, require_auth_user, create_access_token
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import bcrypt
import logging

logger = logging.getLogger(__name__)
pos_router = APIRouter(prefix="", tags=["pos"])
supabase = config.supabase

# ============= PRODUCTOS (RF-PROD) =============

@pos_router.get("/productos")
async def list_productos(
    q: Optional[str] = None,
    categoria_uuid: Optional[str] = None,
    favoritos: Optional[bool] = None,
    activo: bool = True,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-PROD-01: Listar productos con búsqueda y filtros rápidos para POS"""
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
async def list_categorias(
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-PROD-02: Listar categorías para organización del POS"""
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
        result = supabase.table('categorias_producto').insert(data).execute()
        return cast(Dict[str, Any], result.data[0])
    except Exception as e:
        logger.error(f"Error creating categoria: {e}")
        raise HTTPException(status_code=500, detail="Error al crear categoría")

# ============= VENTAS (RF-SALE) =============

@pos_router.post("/ventas")
async def create_venta(
    venta: Venta,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """RF-SALE-01/02/03: Crear venta con soporte para fiado y pagos mixtos
    
    RF-POS-GEN-03: Usa client_ticket_id para idempotencia
    RF-SALE-03: Valida límite de crédito si es fiado
    """
    try:
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
        payload = venta.model_dump()
        
        result = supabase.rpc('create_sale', {
            'p_payload': payload,
            'p_actor_uuid': actor_uuid
        }).execute()
        
        if not result.data or not isinstance(result.data, list) or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Error al crear venta")
        
        # Cast seguro del resultado
        venta_result = cast(Dict[str, Any], result.data[0])
        venta_uuid = venta_result.get('venta_uuid')
        
        if not venta_uuid:
            raise HTTPException(status_code=500, detail="No se pudo obtener UUID de venta")
        
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
    """RF-SHIFT-01: Abrir nuevo turno de caja"""
    try:
        data = shift.model_dump()
        result = supabase.table('caja_shift').insert(data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Error al abrir shift")
        
        return cast(Dict[str, Any], result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error opening shift: {e}")
        raise HTTPException(status_code=500, detail="Error al abrir turno")

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
        
        # Calcular totales por método de pago
        pagos_result = supabase.rpc('fn_get_shift_payment_summary', {'p_shift_uuid': shift_uuid}).execute()
        pagos_por_metodo = pagos_result.data if pagos_result.data else []
        
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
            "pagos_por_metodo": pagos_por_metodo,
            "ventas": ventas
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shift summary: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener resumen de turno")

@pos_router.post("/caja-shifts/{shift_uuid}/cerrar")
async def close_shift(
    shift_uuid: str,
    efectivo_recuento: Decimal,
    notas: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """RF-SHIFT-02: Cerrar turno de caja con conciliación"""
    try:
        actor_uuid = current_user.get('sub') or current_user.get('uid')
        
        result = supabase.table('caja_shift').update({
            'cierre_por': actor_uuid,
            'cierre_fecha': datetime.now(timezone.utc).isoformat(),
            'efectivo_recuento': float(efectivo_recuento),
            'estado': 'cerrada',
            'notas': notas
        }).eq('uuid', shift_uuid).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Shift no encontrado")
        
        # TODO: Registrar en audit_logs
        
        return {"message": "Turno cerrado exitosamente"}
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
    current_user: Dict[str, Any] = Depends(require_auth_user)
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
        
        return {"shifts": result.data}
    except Exception as e:
        logger.error(f"Error listing shifts: {e}")
        raise HTTPException(status_code=500, detail="Error al listar turnos")

# ============= USUARIOS TEMPORALES (RF-USER) =============

@pos_router.post("/usuarios-temporales")
async def create_usuario_temporal(
    usuario: UsuarioTemporalCreate,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """RF-USER-01: Crear usuario temporal con PIN hasheado"""
    try:
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
