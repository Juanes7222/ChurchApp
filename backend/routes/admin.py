from fastapi import APIRouter, HTTPException, Depends
from models import InviteRequest, InviteResponse, ConsumeInviteRequest, AuthResponse, GoogleAuthRequest
from utils import require_admin, create_access_token
from core import config
from datetime import datetime, timezone, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from typing import Dict, Any, cast
import logging

supabase = config.supabase
logging.basicConfig(
       level=getattr(logging, config.log_level.upper()),
       format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
      )
logger = logging.getLogger(__name__)
      
api_router = APIRouter(prefix="")

# ============= INVITATIONS =============
@api_router.post("/admin/invites", response_model=InviteResponse)
async def create_invite(invite: InviteRequest, current_user: Dict[str, Any] = Depends(require_admin)):
    """Create invitation link for new user"""
    expires_at = datetime.now(timezone.utc) + timedelta(days=invite.expires_days)
    
    data = {
        "role": invite.role,
        "email": invite.email,
        "created_by": current_user['sub'],
        "expires_at": expires_at.isoformat(),
        "note": invite.note
    }
    
    result = config.supabase.table('invite_links').insert(data).execute()
    created = result.data[0]
    
    return InviteResponse(
        token=created['token'],
        role=created['role'],
        expires_at=created['expires_at'],
        created_at=created['created_at']
    )

@api_router.get("/admin/invites")
async def list_invites(current_user: Dict[str, Any] = Depends(require_admin)):
    """List all invitations"""
    result = supabase.table('invite_links').select('*').order('created_at', desc=True).execute()
    return {"invites": result.data}

@api_router.post("/admin/invites/{token}/revoke")
async def revoke_invite(token: str, current_user: Dict[str, Any] = Depends(require_admin)):
    """Revoke an invitation"""
    result = supabase.table('invite_links').update({'revoked': True}).eq('token', token).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invitation not found")
    return {"message": "Invitation revoked"}

@api_router.post("/auth/consume-invite")
async def consume_invite(req: ConsumeInviteRequest, auth_req: GoogleAuthRequest):
    """Consume invitation and register user"""
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            auth_req.token, google_requests.Request(), config.GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        google_uid = idinfo['sub']
        
        # Call Supabase function to consume invite
        result = config.supabase.rpc('fn_consume_invite', {
            'p_token': req.token,
            'p_auth_uid': google_uid,
            'p_auth_email': email
        }).execute()
        
        if result.data != 'OK':
            raise HTTPException(status_code=400, detail=result.data)
        
        # Create access token
        user_result = config.supabase.table('app_users').select('*').eq('uid', google_uid).execute()
        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user_data = cast(Dict[str, Any], user_result.data[0])
        role = str(user_data.get('role', ''))
        
        access_token = create_access_token(
            data={
                "sub": google_uid,
                "email": email,
                "role": role
            }
        )
        
        return AuthResponse(
            access_token=access_token,
            user={
                "uid": google_uid,
                "email": email,
                "role": role
            }
        )
    except Exception as e:
        logger.error(f"Consume invite error: {e}")
        raise HTTPException(status_code=400, detail=str(e))