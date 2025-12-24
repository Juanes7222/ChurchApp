from fastapi import APIRouter, Depends, HTTPException
from models.models import GrupoCreate, GrupoUpdate, GrupoResponse
from utils import require_auth_user, require_admin
from core import config
from datetime import datetime, timezone
from typing import Dict, Any

supabase = config.supabase
api_router = APIRouter(prefix="")

# ============= GRUPOS =============
@api_router.get("/grupos")
async def list_grupos(current_user: Dict[str, Any] = Depends(require_auth_user)):
    """List all groups with member count"""
    result = supabase.table('grupos').select('*, grupo_miembro(count)').eq('is_deleted', False).order('nombre').execute()
    
    grupos = []
    for grupo in result.data:
        grupo_data = dict(grupo)
        # Extraer el contador de miembros
        if 'grupo_miembro' in grupo_data and grupo_data['grupo_miembro']:
            grupo_data['total_miembros'] = grupo_data['grupo_miembro'][0]['count'] if grupo_data['grupo_miembro'] else 0
        else:
            grupo_data['total_miembros'] = 0
        del grupo_data['grupo_miembro']
        grupos.append(grupo_data)
    
    return {"grupos": grupos}

@api_router.get("/grupos/{grupo_uuid}", response_model=GrupoResponse)
async def get_grupo(grupo_uuid: str, current_user: Dict[str, Any] = Depends(require_auth_user)):
    """Get a specific group with its members"""
    result = supabase.table('grupos').select('*, miembros:grupo_miembro(miembro_uuid, miembros(*))').eq('uuid', grupo_uuid).eq('is_deleted', False).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    grupo = result.data[0]
    
    # Procesar miembros
    if grupo.get('miembros'):
        grupo['miembros'] = [m['miembros'] for m in grupo['miembros'] if m.get('miembros')]
    else:
        grupo['miembros'] = []
    
    grupo['total_miembros'] = len(grupo['miembros'])
    
    return grupo

@api_router.post("/grupos", response_model=GrupoResponse)
async def create_grupo(grupo: GrupoCreate, current_user: Dict[str, Any] = Depends(require_admin)):
    """Create new group"""
    result = supabase.table('grupos').insert(grupo.model_dump()).execute()
    created_grupo = result.data[0]
    created_grupo['total_miembros'] = 0
    created_grupo['miembros'] = []
    return created_grupo

@api_router.put("/grupos/{grupo_uuid}", response_model=GrupoResponse)
async def update_grupo(grupo_uuid: str, grupo: GrupoUpdate, current_user: Dict[str, Any] = Depends(require_admin)):
    """Update a group"""
    # Verificar que el grupo existe
    existing = supabase.table('grupos').select('*').eq('uuid', grupo_uuid).eq('is_deleted', False).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # Actualizar solo los campos proporcionados
    update_data = {k: v for k, v in grupo.model_dump(exclude_unset=True).items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")
    
    result = supabase.table('grupos').update(update_data).eq('uuid', grupo_uuid).execute()
    
    # Obtener el grupo actualizado con miembros
    updated_grupo = supabase.table('grupos').select('*, miembros:grupo_miembro(miembro_uuid, miembros(*))').eq('uuid', grupo_uuid).execute()
    grupo_data = updated_grupo.data[0]
    
    # Procesar miembros
    if grupo_data.get('miembros'):
        grupo_data['miembros'] = [m['miembros'] for m in grupo_data['miembros'] if m.get('miembros')]
    else:
        grupo_data['miembros'] = []
    
    grupo_data['total_miembros'] = len(grupo_data['miembros'])
    
    return grupo_data

@api_router.delete("/grupos/{grupo_uuid}")
async def delete_grupo(grupo_uuid: str, current_user: Dict[str, Any] = Depends(require_admin)):
    """Soft delete a group"""
    # Verificar que el grupo existe
    existing = supabase.table('grupos').select('*').eq('uuid', grupo_uuid).eq('is_deleted', False).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    # Soft delete
    supabase.table('grupos').update({'is_deleted': True}).eq('uuid', grupo_uuid).execute()
    return {"message": "Grupo eliminado exitosamente"}

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