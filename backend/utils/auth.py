from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from .permissions import Permission, Role, has_permission, has_any_permission, can_access_section

# JWT config
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '1440'))

security = HTTPBearer()

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        if uid is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Guards tradicionales (mantener compatibilidad)
async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") not in ["admin", "ti"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def require_auth_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if current_user.get("role") not in ["admin", "pastor", "secretaria", "ti"]:
        raise HTTPException(status_code=403, detail="Authorized user required")
    return current_user

# Nuevos guards basados en permisos
def require_permission(permission: Permission):
    """
    Dependency factory que requiere un permiso específico
    Uso: current_user: Dict = Depends(require_permission(Permission.VIEW_MIEMBROS))
    """
    async def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if not user_role:
            raise HTTPException(status_code=403, detail="No role assigned")
        
        if not has_permission(user_role, permission):
            raise HTTPException(
                status_code=403, 
                detail=f"Permission denied. Required: {permission.value}"
            )
        return current_user
    return permission_checker

def require_any_permission(permissions: List[Permission]):
    """
    Dependency factory que requiere al menos uno de los permisos especificados
    Uso: current_user: Dict = Depends(require_any_permission([Permission.VIEW_MIEMBROS, Permission.CREATE_MIEMBROS]))
    """
    async def permission_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if not user_role:
            raise HTTPException(status_code=403, detail="No role assigned")
        
        if not has_any_permission(user_role, permissions):
            perms_str = ", ".join([p.value for p in permissions])
            raise HTTPException(
                status_code=403, 
                detail=f"Permission denied. Required any of: {perms_str}"
            )
        return current_user
    return permission_checker

def require_role(allowed_roles: List[str]):
    """
    Dependency factory que requiere uno de los roles especificados
    Uso: current_user: Dict = Depends(require_role([Role.ADMIN, Role.AGENTE_RESTAURANTE]))
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if not user_role:
            raise HTTPException(status_code=403, detail="No role assigned")
        
        if user_role not in allowed_roles:
            roles_str = ", ".join(allowed_roles)
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required role: {roles_str}"
            )
        return current_user
    return role_checker

# Guards específicos para secciones
async def require_pos_access(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Requiere acceso al módulo POS"""
    user_role = current_user.get("role")
    if not user_role or not can_access_section(user_role, "pos"):
        raise HTTPException(status_code=403, detail="POS access denied")
    return current_user

async def require_miembros_access(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Requiere acceso a la gestión de miembros"""
    user_role = current_user.get("role")
    if not user_role or not can_access_section(user_role, "miembros"):
        raise HTTPException(status_code=403, detail="Miembros access denied")
    return current_user

async def require_grupos_access(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Requiere acceso a la gestión de grupos"""
    user_role = current_user.get("role")
    if not user_role or not can_access_section(user_role, "grupos"):
        raise HTTPException(status_code=403, detail="Grupos access denied")
    return current_user