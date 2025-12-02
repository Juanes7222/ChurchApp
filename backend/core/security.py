from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from uuid import UUID
from datetime import datetime, timedelta
from core.config import config, supabase

security = HTTPBearer()

credentials_exception = HTTPException(
    status_code=401,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return UUID(user_id)
    except JWTError:
        raise credentials_exception

async def get_current_admin_user(current_user: UUID = Depends(get_current_user)):
    try:
        res = supabase.table("app_users").select("role").eq("uid", str(current_user)).execute()
        if not res.data or res.data[0]["role"] != "admin":
            raise HTTPException(status_code=403, detail="The user does not have admin privileges")
        return current_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
