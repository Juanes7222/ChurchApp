from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase config
supabase_url = os.environ.get('SUPABASE_URL', 'https://example.supabase.co')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'dummy-key')
supabase_anon_key = os.environ.get('SUPABASE_ANON_KEY', 'dummy-anon-key')
supabase: Client = create_client(supabase_url, supabase_key)

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', 'dummy-client-id')

# JWT config
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '1440'))

app = FastAPI(title="Sistema Iglesia API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= MODELS =============
class GoogleAuthRequest(BaseModel):
    token: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class InviteRequest(BaseModel):
    role: str
    email: Optional[str] = None
    note: Optional[str] = None
    expires_days: int = 7

class InviteResponse(BaseModel):
    token: str
    role: str
    expires_at: str
    created_at: str

class ConsumeInviteRequest(BaseModel):
    token: str

class MiembroCreate(BaseModel):
    documento: str
    tipo_documento: Optional[str] = "CC"
    nombres: str
    apellidos: str
    fecha_nac: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    genero: Optional[str] = None
    lugar_nac: Optional[str] = None
    llamado: Optional[str] = None
    otra_iglesia: bool = False
    notas: Optional[str] = None
    public_profile: bool = False

class MiembroUpdate(BaseModel):
    documento: Optional[str] = None
    tipo_documento: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    fecha_nac: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    genero: Optional[str] = None
    lugar_nac: Optional[str] = None
    llamado: Optional[str] = None
    otra_iglesia: Optional[bool] = None
    notas: Optional[str] = None
    public_profile: Optional[bool] = None
    foto_url: Optional[str] = None

class MiembroResponse(BaseModel):
    uuid: str
    documento: str
    tipo_documento: Optional[str]
    nombres: str
    apellidos: str
    fecha_nac: Optional[str]
    telefono: Optional[str]
    email: Optional[str]
    direccion: Optional[str]
    genero: Optional[str]
    lugar_nac: Optional[str]
    llamado: Optional[str]
    otra_iglesia: bool
    notas: Optional[str]
    public_profile: bool
    foto_url: Optional[str]
    created_at: str
    updated_at: str

class ObservacionCreate(BaseModel):
    texto: str

class ObservacionResponse(BaseModel):
    uuid: str
    miembro_uuid: str
    texto: str
    fecha: str
    autor_uuid: Optional[str]

class GrupoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    privacidad: str = "public"

class GrupoResponse(BaseModel):
    uuid: str
    nombre: str
    descripcion: Optional[str]
    tipo: Optional[str]
    activo: bool
    privacidad: str
    created_at: str

# ============= AUTH HELPERS =============
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "ti"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def require_auth_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["admin", "pastor", "secretaria", "ti"]:
        raise HTTPException(status_code=403, detail="Authorized user required")
    return current_user

# ============= AUTH ENDPOINTS =============
@api_router.post("/auth/google", response_model=AuthResponse)
async def google_auth(auth_req: GoogleAuthRequest):
    """Authenticate with Google OAuth token"""
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            auth_req.token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        google_uid = idinfo['sub']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        # Check if user exists in app_users
        result = supabase.table('app_users').select('*').eq('uid', google_uid).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=403,
                detail="Usuario no autorizado. Contacte al administrador para obtener una invitación."
            )
        
        user_data = result.data[0]
        if not user_data.get('active', True):
            raise HTTPException(status_code=403, detail="Usuario desactivado")
        
        # Create JWT token
        access_token = create_access_token(
            data={
                "sub": google_uid,
                "email": email,
                "role": user_data['role'],
                "miembro_uuid": user_data.get('miembro_uuid')
            }
        )
        
        return AuthResponse(
            access_token=access_token,
            user={
                "uid": google_uid,
                "email": email,
                "name": name,
                "picture": picture,
                "role": user_data['role'],
                "miembro_uuid": user_data.get('miembro_uuid')
            }
        )
    except ValueError as e:
        logger.error(f"Google token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# ============= INVITATIONS =============
@api_router.post("/admin/invites", response_model=InviteResponse)
async def create_invite(invite: InviteRequest, current_user: dict = Depends(require_admin)):
    """Create invitation link for new user"""
    expires_at = datetime.now(timezone.utc) + timedelta(days=invite.expires_days)
    
    data = {
        "role": invite.role,
        "email": invite.email,
        "created_by": current_user['sub'],
        "expires_at": expires_at.isoformat(),
        "note": invite.note
    }
    
    result = supabase.table('invite_links').insert(data).execute()
    created = result.data[0]
    
    return InviteResponse(
        token=created['token'],
        role=created['role'],
        expires_at=created['expires_at'],
        created_at=created['created_at']
    )

@api_router.get("/admin/invites")
async def list_invites(current_user: dict = Depends(require_admin)):
    """List all invitations"""
    result = supabase.table('invite_links').select('*').order('created_at', desc=True).execute()
    return {"invites": result.data}

@api_router.post("/admin/invites/{token}/revoke")
async def revoke_invite(token: str, current_user: dict = Depends(require_admin)):
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
            auth_req.token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        google_uid = idinfo['sub']
        
        # Call Supabase function to consume invite
        result = supabase.rpc('fn_consume_invite', {
            'p_token': req.token,
            'p_auth_uid': google_uid,
            'p_auth_email': email
        }).execute()
        
        if result.data != 'OK':
            raise HTTPException(status_code=400, detail=result.data)
        
        # Create access token
        user_result = supabase.table('app_users').select('*').eq('uid', google_uid).execute()
        user_data = user_result.data[0]
        
        access_token = create_access_token(
            data={
                "sub": google_uid,
                "email": email,
                "role": user_data['role']
            }
        )
        
        return AuthResponse(
            access_token=access_token,
            user={
                "uid": google_uid,
                "email": email,
                "role": user_data['role']
            }
        )
    except Exception as e:
        logger.error(f"Consume invite error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= MIEMBROS =============
@api_router.get("/miembros", response_model=Dict[str, Any])
async def list_miembros(
    q: Optional[str] = None,
    grupo: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user: dict = Depends(require_auth_user)
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
async def get_miembro(miembro_uuid: str, current_user: dict = Depends(require_auth_user)):
    """Get member by UUID"""
    result = supabase.table('miembros').select('*').eq('uuid', miembro_uuid).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    return result.data[0]

@api_router.post("/miembros", response_model=MiembroResponse)
async def create_miembro(miembro: MiembroCreate, current_user: dict = Depends(require_auth_user)):
    """Create new member"""
    # Check for duplicate documento
    existing = supabase.table('miembros').select('uuid').eq('documento', miembro.documento).eq('is_deleted', False).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya existe un miembro con este documento")
    
    data = miembro.model_dump()
    data['created_by'] = current_user['sub']
    data['updated_by'] = current_user['sub']
    
    result = supabase.table('miembros').insert(data).execute()
    return result.data[0]

@api_router.put("/miembros/{miembro_uuid}", response_model=MiembroResponse)
async def update_miembro(
    miembro_uuid: str,
    miembro: MiembroUpdate,
    current_user: dict = Depends(require_auth_user)
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
async def delete_miembro(miembro_uuid: str, current_user: dict = Depends(require_admin)):
    """Soft delete member"""
    result = supabase.table('miembros').update({
        'is_deleted': True,
        'deleted_at': datetime.now(timezone.utc).isoformat()
    }).eq('uuid', miembro_uuid).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    return {"message": "Miembro eliminado"}

# ============= OBSERVACIONES =============
@api_router.get("/miembros/{miembro_uuid}/observaciones")
async def get_observaciones(miembro_uuid: str, current_user: dict = Depends(require_auth_user)):
    """Get member observations"""
    result = supabase.table('observaciones').select('*').eq('miembro_uuid', miembro_uuid).eq('is_deleted', False).order('fecha', desc=True).execute()
    return {"observaciones": result.data}

@api_router.post("/miembros/{miembro_uuid}/observaciones", response_model=ObservacionResponse)
async def create_observacion(
    miembro_uuid: str,
    obs: ObservacionCreate,
    current_user: dict = Depends(require_auth_user)
):
    """Add observation to member"""
    data = {
        "miembro_uuid": miembro_uuid,
        "texto": obs.texto,
        "autor_uuid": current_user['sub']
    }
    result = supabase.table('observaciones').insert(data).execute()
    return result.data[0]

# ============= GRUPOS =============
@api_router.get("/grupos")
async def list_grupos(current_user: dict = Depends(require_auth_user)):
    """List all groups"""
    result = supabase.table('grupos').select('*').eq('is_deleted', False).order('nombre').execute()
    return {"grupos": result.data}

@api_router.post("/grupos", response_model=GrupoResponse)
async def create_grupo(grupo: GrupoCreate, current_user: dict = Depends(require_admin)):
    """Create new group"""
    result = supabase.table('grupos').insert(grupo.model_dump()).execute()
    return result.data[0]

@api_router.post("/grupos/{grupo_uuid}/miembros/{miembro_uuid}")
async def assign_member_to_group(
    grupo_uuid: str,
    miembro_uuid: str,
    current_user: dict = Depends(require_auth_user)
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
    current_user: dict = Depends(require_auth_user)
):
    """Remove member from group"""
    result = supabase.table('grupo_miembro').delete().eq('grupo_uuid', grupo_uuid).eq('miembro_uuid', miembro_uuid).execute()
    return {"message": "Miembro removido del grupo"}

# ============= DASHBOARD =============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(require_auth_user)):
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

# ============= ROOT =============
@api_router.get("/")
async def root():
    return {"message": "Sistema Iglesia API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)