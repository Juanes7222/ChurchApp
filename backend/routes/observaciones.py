from fastapi import APIRouter, Depends
from models.models import ObservacionCreate, ObservacionResponse
from utils import require_auth_user
from core import config
from typing import Dict, Any

supabase = config.supabase
api_router = APIRouter(prefix="")

# ============= OBSERVACIONES =============
@api_router.get("/miembros/{miembro_uuid}/observaciones")
async def get_observaciones(miembro_uuid: str, current_user: Dict[str, Any] = Depends(require_auth_user)):
    """Get member observations"""
    result = supabase.table('observaciones').select('*').eq('miembro_uuid', miembro_uuid).eq('is_deleted', False).order('fecha', desc=True).execute()
    return {"observaciones": result.data}

@api_router.post("/miembros/{miembro_uuid}/observaciones", response_model=ObservacionResponse)
async def create_observacion(
    miembro_uuid: str,
    obs: ObservacionCreate,
    current_user: Dict[str, Any] = Depends(require_auth_user)
):
    """Add observation to member"""
    data = {
        "miembro_uuid": miembro_uuid,
        "texto": obs.texto,
        "autor_uuid": current_user['sub']
    }
    result = supabase.table('observaciones').insert(data).execute()
    return result.data[0]

