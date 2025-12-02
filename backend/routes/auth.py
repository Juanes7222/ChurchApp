# ============= AUTH ENDPOINTS =============
from typing import Dict, Any, cast
from models import AuthResponse, GoogleAuthRequest
from fastapi import APIRouter, HTTPException, Depends
from utils import create_access_token, get_current_user
from core import config
from firebase_admin import credentials, auth as firebase_auth
import logging
import firebase_admin

# Inicializar Firebase Admin SDK


if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        logger = logging.getLogger(__name__)
        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

api_router = APIRouter()
logging.basicConfig(
       level=getattr(logging, config.log_level.upper()),
       format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
      )
logger = logging.getLogger(__name__)

@api_router.post("/auth/google", response_model=AuthResponse)
async def google_auth(auth_req: GoogleAuthRequest):
    """Authenticate with Google OAuth token using Firebase"""
    try:
        # Verify Firebase ID token
        decoded_token = firebase_auth.verify_id_token(auth_req.token)
        
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        name = decoded_token.get('name', '')
        picture = decoded_token.get('picture', '')
        
        # Check if user exists in app_users (usar config.supabase)
        result = config.supabase.table('app_users').select('*').eq('uid', firebase_uid).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=403,
                detail="Usuario no autorizado. Contacte al administrador para obtener una invitación."
            )
        
        # Cast para tipado correcto
        user_data = cast(Dict[str, Any], result.data[0])
        if not user_data.get('active', True):
            raise HTTPException(status_code=403, detail="Usuario desactivado")
        
        # Create JWT token
        role = str(user_data.get('role', ''))
        miembro_uuid = user_data.get('miembro_uuid')
        
        access_token = create_access_token(
            data={
                "sub": firebase_uid,
                "email": email,
                "role": role,
                "miembro_uuid": str(miembro_uuid) if miembro_uuid else None
            }
        )
        
        return AuthResponse(
            access_token=access_token,
            user={
                "uid": firebase_uid,
                "email": email,
                "name": name,
                "picture": picture,
                "role": role,
                "miembro_uuid": str(miembro_uuid) if miembro_uuid else None
            }
        )
    except (firebase_auth.ExpiredIdTokenError, firebase_auth.RevokedIdTokenError, firebase_auth.InvalidIdTokenError) as e:
        logger.error(f"Invalid/Expired/Revoked Firebase token: {e}")
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    except firebase_auth.CertificateFetchError as e:
        logger.error(f"Certificate fetch error: {e}")
        raise HTTPException(status_code=500, detail="Error en certificado Firebase")
    except ValueError as e:
        logger.error(f"Firebase token validation error: {e}")
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current user info"""
    return current_user

@api_router.get("/auth/permissions")
async def get_user_permissions(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current user's permissions and accessible sections"""
    from utils.permissions import get_role_permissions, can_access_section
    
    user_role = current_user.get("role", "")
    
    # Obtener permisos del rol
    permissions = get_role_permissions(user_role)
    permissions_list = [perm.value for perm in permissions]
    
    # Obtener secciones accesibles
    sections = {
        "dashboard": can_access_section(user_role, "dashboard"),
        "miembros": can_access_section(user_role, "miembros"),
        "grupos": can_access_section(user_role, "grupos"),
        "pos": can_access_section(user_role, "pos"),
        "admin": can_access_section(user_role, "admin"),
    }
    
    return {
        "role": user_role,
        "permissions": permissions_list,
        "sections": sections
    }