from fastapi import APIRouter, Depends, HTTPException
from models.models import GrupoCreate, GrupoResponse
from utils import require_auth_user, require_admin
from core import config
from datetime import datetime, timezone
from typing import Dict, Any

supabase = config.supabase
api_router = APIRouter(prefix="")

# ============= GRUPOS =============
@api_router.get("/grupos")
async def list_grupos(current_user: Dict[str, Any] = Depends(require_auth_user)):
    """List all groups"""
    result = supabase.table('grupos').select('*').eq('is_deleted', False).order('nombre').execute()
    return {"grupos": result.data}

@api_router.post("/grupos", response_model=GrupoResponse)
async def create_grupo(grupo: GrupoCreate, current_user: Dict[str, Any] = Depends(require_admin)):
    """Create new group"""
    result = supabase.table('grupos').insert(grupo.model_dump()).execute()
    return result.data[0]

@api_router.post("/grupos/{grupo_uuid}/miembros/{miembro_uuid}")
async def assign_member_to_group(
    grupo_uuid: str,
    miembro_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
):
    """Assign member to group"""
    data = {
        "grupo_uuid": grupo_uuid,
        "miembro_uuid": miembro_uuid,
        "fecha_ingreso": datetime.now(timezone.utc).date().isoformat()
    }
    result = supabase.table('grupo_miembro').insert(data).execute()
    return {"message": "Miembro asignado al grupo", "data": result.data[0]}

@api_router.delete("/grupos/{grupo_uuid}/miembros/{miembro_uuid}")
async def remove_member_from_group(
    grupo_uuid: str,
    miembro_uuid: str,
    current_user: Dict[str, Any] = Depends(require_auth_user)
):
    """Remove member from group"""
    result = supabase.table('grupo_miembro').delete().eq('grupo_uuid', grupo_uuid).eq('miembro_uuid', miembro_uuid).execute()
    return {"message": "Miembro removido del grupo"}