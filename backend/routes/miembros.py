from fastapi import APIRouter, Depends, HTTPException
from models.models import MiembroCreate, MiembroUpdate, MiembroResponse
from utils import require_auth_user, require_admin
from utils.auth import require_any_authenticated
from core import config
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

supabase = config.supabase
api_router = APIRouter(prefix="")

# ============= MIEMBROS =============
@api_router.get("/miembros", response_model=Dict[str, Any])
async def list_miembros(
    q: Optional[str] = None,
    grupo: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user: Dict[str, Any] = Depends(require_auth_user)
):
    """List members with search and filters"""
    query = supabase.table('miembros').select('*', count='exact').eq('is_deleted', False)
    
    if q:
        # Search by documento, nombres, apellidos
        query = query.or_(f"documento.ilike.%{q}%,nombres.ilike.%{q}%,apellidos.ilike.%{q}%")
    
    # Pagination
    start = (page - 1) * page_size
    end = start + page_size - 1
    query = query.range(start, end).order('created_at', desc=True)
    
    result = query.execute()
    
    return {
        "miembros": result.data,
        "total": result.count,
        "page": page,
        "page_size": page_size
    }

@api_router.get("/miembros/{miembro_uuid}", response_model=MiembroResponse)
async def get_miembro(miembro_uuid: str, current_user: Dict[str, Any] = Depends(require_auth_user)):
    """Get member by UUID"""
    result = supabase.table('miembros').select('*').eq('uuid', miembro_uuid).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    return result.data[0]

@api_router.post("/miembros", response_model=MiembroResponse)
async def create_miembro(miembro: MiembroCreate, current_user: Dict[str, Any] = Depends(require_auth_user)):
    """Create new member"""
    # Check for duplicate documento
    existing = supabase.table('miembros').select('uuid').eq('documento', miembro.documento).eq('is_deleted', False).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya existe un miembro con este documento")
    
    data = miembro.model_dump()
    data['uuid'] = str(uuid.uuid4())  # Generar UUID
    data['created_by'] = current_user['sub']
    data['updated_by'] = current_user['sub']
    
    result = supabase.table('miembros').insert(data).execute()
    return result.data[0]

@api_router.put("/miembros/{miembro_uuid}", response_model=MiembroResponse)
async def update_miembro(
    miembro_uuid: str,
    miembro: MiembroUpdate,
    current_user: Dict[str, Any] = Depends(require_auth_user)
):
    """Update member"""
    # Check if exists
    existing = supabase.table('miembros').select('uuid').eq('uuid', miembro_uuid).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    data = miembro.model_dump(exclude_unset=True)
    data['updated_by'] = current_user['sub']
    
    result = supabase.table('miembros').update(data).eq('uuid', miembro_uuid).execute()
    return result.data[0]

@api_router.delete("/miembros/{miembro_uuid}")
async def delete_miembro(miembro_uuid: str, current_user: Dict[str, Any] = Depends(require_admin)):
    """Soft delete member"""
    result = supabase.table('miembros').update({
        'is_deleted': True,
        'deleted_at': datetime.now(timezone.utc).isoformat()
    }).eq('uuid', miembro_uuid).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    return {"message": "Miembro eliminado"}


# ============= CLIENTES TEMPORALES =============

@api_router.post("/miembros/temporal", response_model=MiembroResponse)
async def create_temporal_miembro(
    miembro: MiembroCreate, 
    current_user: Dict[str, Any] = Depends(require_any_authenticated)
):
    """Crear cliente temporal - Solo meseros y admin
    
    Los clientes temporales se crean con es_temporal=true y verificado=false
    Un administrador debe verificarlos posteriormente
    """
    # Verificar que no exista el documento
    existing = supabase.table('miembros').select('uuid').eq('documento', miembro.documento).eq('is_deleted', False).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya existe un cliente con este documento")
    
    data = miembro.model_dump()
    data['uuid'] = str(uuid.uuid4())  # Generar UUID
    data['es_temporal'] = True
    data['verificado'] = False
    data['created_by'] = current_user.get('sub')
    data['updated_by'] = current_user.get('sub')
    
    result = supabase.table('miembros').insert(data).execute()
    return result.data[0]


@api_router.get("/miembros/temporales/pendientes")
async def get_temporales_pendientes(
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Listar clientes temporales pendientes de verificación"""
    result = supabase.table('miembros')\
        .select('*')\
        .eq('es_temporal', True)\
        .eq('verificado', False)\
        .eq('is_deleted', False)\
        .order('created_at', desc=True)\
        .execute()
    
    return {
        "miembros_pendientes": result.data or [],
        "total": len(result.data) if result.data else 0
    }


@api_router.post("/miembros/{miembro_uuid}/verificar")
async def verificar_miembro_temporal(
    miembro_uuid: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Verificar un cliente temporal - Solo admin"""
    # Verificar que existe y es temporal
    miembro = supabase.table('miembros')\
        .select('*')\
        .eq('uuid', miembro_uuid)\
        .eq('es_temporal', True)\
        .execute()
    
    if not miembro.data:
        raise HTTPException(status_code=404, detail="Cliente temporal no encontrado")
    
    # Marcar como verificado
    result = supabase.table('miembros')\
        .update({
            'verificado': True,
            'updated_by': current_user.get('sub'),
            'updated_at': datetime.now(timezone.utc).isoformat()
        })\
        .eq('uuid', miembro_uuid)\
        .execute()
    
    return {
        "message": "Cliente verificado exitosamente",
        "miembro": result.data[0]
    }


@api_router.delete("/miembros/{miembro_uuid}/rechazar")
async def rechazar_miembro_temporal(
    miembro_uuid: str,
    motivo: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Rechazar y eliminar un cliente temporal - Solo admin"""
    # Verificar que existe y es temporal
    miembro = supabase.table('miembros')\
        .select('*')\
        .eq('uuid', miembro_uuid)\
        .eq('es_temporal', True)\
        .execute()
    
    if not miembro.data:
        raise HTTPException(status_code=404, detail="Cliente temporal no encontrado")
    
    # Eliminar (soft delete)
    result = supabase.table('miembros')\
        .update({
            'is_deleted': True,
            'deleted_at': datetime.now(timezone.utc).isoformat(),
            'notas': f"Rechazado: {motivo}" if motivo else "Rechazado por administrador"
        })\
        .eq('uuid', miembro_uuid)\
        .execute()
    
    return {
        "message": "Cliente temporal rechazado y eliminado"
    }