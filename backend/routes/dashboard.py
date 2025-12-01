from fastapi import APIRouter, Depends
from utils import require_auth_user
from core import config
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

supabase = config.supabase
api_router = APIRouter(prefix="")

# ============= DASHBOARD =============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: Dict[str, Any] = Depends(require_auth_user)):
    """Get dashboard statistics"""
    # Total miembros
    miembros_result = supabase.table('miembros').select('uuid', count='exact').eq('is_deleted', False).execute()
    total_miembros = miembros_result.count
    
    # Total grupos
    grupos_result = supabase.table('grupos').select('uuid', count='exact').eq('is_deleted', False).execute()
    total_grupos = grupos_result.count
    
    # Recent members (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_result = supabase.table('miembros').select('uuid', count='exact').eq('is_deleted', False).gte('created_at', thirty_days_ago).execute()
    recent_miembros = recent_result.count
    
    return {
        "total_miembros": total_miembros,
        "total_grupos": total_grupos,
        "recent_miembros": recent_miembros
    }
