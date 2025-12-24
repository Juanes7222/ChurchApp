"""
Módulo POS - Gestión de Meseros Temporales
RF-USER
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, cast
from models.models import UsuarioTemporalLogin
from core import config
from utils.auth import require_admin, create_access_token
from datetime import datetime, timezone, timedelta
import logging
import hashlib

logger = logging.getLogger(__name__)
pos_meseros_router = APIRouter(prefix="", tags=["pos-meseros"])
supabase = config.supabase

# ============= MESEROS TEMPORALES =============

@pos_meseros_router.post("/meseros/login")
async def login_mesero(
    credentials: UsuarioTemporalLogin
) -> Dict[str, Any]:
    """Autenticar mesero con username y PIN"""
    try:
        # Buscar mesero
        result = supabase.table('usuarios_temporales')\
            .select('*')\
            .eq('username', credentials.username)\
            .eq('activo', True)\
            .eq('is_deleted', False)\
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=401, detail="Usuario o PIN incorrecto")
        
        mesero = cast(Dict[str, Any], result.data[0])
        
        # Verificar validez temporal
        fin_validity_str = mesero.get('fin_validity')
        if fin_validity_str and isinstance(fin_validity_str, str):
            fin_validity = datetime.fromisoformat(fin_validity_str.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > fin_validity:
                raise HTTPException(status_code=401, detail="Usuario expirado")
        
        # Verificar PIN
        pin_hash = hashlib.sha256(credentials.pin.encode()).hexdigest()
        if pin_hash != mesero.get('pin_hash'):
            raise HTTPException(status_code=401, detail="Usuario o PIN incorrecto")
        
        # Crear token JWT
        access_token = create_access_token(
            data={
                "sub": mesero['uuid'],
                "tipo": "mesero",
                "username": mesero['username'],
                "permisos": ['crear_ventas', 'crear_clientes_temporales']
            },
            expires_delta=timedelta(hours=12)
        )
        
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

@pos_meseros_router.get("/meseros")
async def get_meseros_activos(
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Obtener lista de meseros activos"""
    try:
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
        for m_data in meseros:
            m = cast(Dict[str, Any], m_data)
            fin_validity_str = m.get('fin_validity')
            if fin_validity_str and isinstance(fin_validity_str, str):
                fin_validity = datetime.fromisoformat(fin_validity_str.replace('Z', '+00:00'))
                if now <= fin_validity:
                    meseros_vigentes.append(m_data)
            else:
                meseros_vigentes.append(m_data)
        
        return {
            'meseros': meseros_vigentes,
            'total': len(meseros_vigentes)
        }
    except Exception as e:
        logger.error(f"Error getting meseros: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener meseros")

@pos_meseros_router.post("/meseros/{mesero_uuid}/desactivar")
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

@pos_meseros_router.post("/meseros/cerrar-expirados")
async def cerrar_meseros_expirados(
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Cerrar todos los meseros cuya validez haya expirado"""
    try:
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
