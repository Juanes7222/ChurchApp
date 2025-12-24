from fastapi import APIRouter, HTTPException, Depends
from models import InviteRequest, InviteResponse, ConsumeInviteRequest, AuthResponse, GoogleAuthRequest
from utils import require_admin, create_access_token
from core import config
from datetime import datetime, timezone, timedelta
from firebase_admin import auth as firebase_auth
from typing import Dict, Any, cast
import logging
import uuid

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
    # Si expires_days es None, la invitación es permanente (sin expiración)
    expires_at = None
    if invite.expires_days is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=invite.expires_days)
        expires_at = expires_at.isoformat()
    
    # Generar token manualmente ya que la tabla no tiene DEFAULT
    invite_token = str(uuid.uuid4())
    
    # Convertir strings vacíos a None para que se guarden como NULL en la BD
    email = invite.email if invite.email and invite.email.strip() else None
    note = invite.note if invite.note and invite.note.strip() else None
    
    data = {
        "token": invite_token,
        "role": invite.role,
        "email": email,
        "created_by": current_user['sub'],
        "expires_at": expires_at,
        "note": note
    }
    
    # Insert
    result = config.supabase.table('invite_links').insert(data).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Error al crear invitación")
    
    created = result.data[0]
    
    return InviteResponse(
        token=created.get('token', invite_token),
        role=created['role'],
        expires_at=created.get('expires_at'),
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
async def consume_invite(req: ConsumeInviteRequest):
    """Consume invitation and register user"""
    try:
        logger.info(f"Attempting to consume invite with token: {req.token[:8]}...")
        
        # Verify the Firebase ID token using Firebase Admin SDK
        try:
            decoded_token = firebase_auth.verify_id_token(req.google_token)
            email = decoded_token.get('email', '')
            google_uid = decoded_token['uid']
            logger.info(f"Firebase token verified for user: {email}")
        except Exception as verify_error:
            logger.error(f"Firebase token verification failed: {verify_error}")
            raise HTTPException(status_code=401, detail="Token de Firebase inválido")
        
        # Call Supabase function to consume invite
        result = config.supabase.rpc('fn_consume_invite', {
            'p_token': req.token,
            'p_auth_uid': google_uid,
            'p_auth_email': email
        }).execute()
        
        logger.info(f"Supabase RPC result: {result.data}")
        
        # Mapeo de mensajes de error más claros
        error_messages = {
            'INVITE_NOT_FOUND': 'Invitación no encontrada o inválida',
            'INVITE_ALREADY_USED_OR_REVOKED': 'Esta invitación ya fue utilizada o revocada',
            'INVITE_EXPIRED': 'Esta invitación ha expirado',
            'EMAIL_MISMATCH': 'El email no coincide con la invitación'
        }
        
        if result.data != 'OK':
            error_detail = error_messages.get(result.data, result.data)
            logger.warning(f"Invite consumption failed: {result.data}")
            raise HTTPException(status_code=400, detail=error_detail)
        
        # Create access token
        user_result = config.supabase.table('app_users').select('*').eq('uid', google_uid).execute()
        if not user_result.data or len(user_result.data) == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado después de crear")
        
        user_data = cast(Dict[str, Any], user_result.data[0])
        role = str(user_data.get('role', ''))
        
        logger.info(f"User created successfully with role: {role}")
        
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Consume invite error: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar invitación: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))