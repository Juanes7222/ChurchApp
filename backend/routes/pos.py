from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models.pos_models import (
    ProductoCreate,
    ProductoResponse,
    Venta,
    CajaShiftCreate,
    CajaShiftResponse,
    UsuarioTemporalCreate,
    UsuarioTemporalResponse,
)
from core.config import supabase
from core.security import get_current_user, get_current_admin_user, create_access_token
from uuid import UUID
from postgrest.exceptions import APIError
import bcrypt
from datetime import datetime, timedelta

pos_router = APIRouter(prefix="/pos", tags=["pos"])

# Product Endpoints
@pos_router.get("/productos", response_model=List[ProductoResponse])
async def get_productos(current_user: UUID = Depends(get_current_user)):
    """
    Retrieves all products from the database.
    """
    try:
        res = supabase.table("productos").select("*").execute()
        return res.data
    except APIError as e:
        raise HTTPException(status_code=int(e.code), detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@pos_router.post("/productos", response_model=ProductoResponse)
async def create_producto(producto: ProductoCreate, current_user: UUID = Depends(get_current_admin_user)):
    """
    Creates a new product in the database.
    """
    try:
        res = supabase.table("productos").insert(producto.dict()).execute()
        return res.data[0]
    except APIError as e:
        raise HTTPException(status_code=int(e.code), detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Sales Endpoints
@pos_router.post("/ventas")
async def create_venta(venta: Venta, current_user: UUID = Depends(get_current_user)):
    """
    Creates a new sale by calling the `create_sale` postgres function.
    """
    try:
        res = supabase.rpc("create_sale", {"p_payload": venta.dict(), "p_actor_uuid": str(current_user)}).execute()
        return {"venta_uuid": res.data[0]["venta_uuid"]}
    except APIError as e:
        raise HTTPException(status_code=int(e.code), detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Shift Endpoints
@pos_router.post("/shifts", response_model=CajaShiftResponse)
async def open_shift(shift: CajaShiftCreate, current_user: UUID = Depends(get_current_admin_user)):
    """
    Opens a new shift in the database.
    """
    try:
        res = supabase.table("caja_shift").insert(shift.dict()).execute()
        return res.data[0]
    except APIError as e:
        raise HTTPException(status_code=int(e.code), detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Temporary User Endpoints
@pos_router.post("/usuarios-temporales", response_model=UsuarioTemporalResponse)
async def create_usuario_temporal(usuario: UsuarioTemporalCreate, current_user: UUID = Depends(get_current_admin_user)):
    """
    Creates a new temporary user in the database.
    """
    try:
        hashed_pin = bcrypt.hashpw(usuario.pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        usuario_data = usuario.dict()
        usuario_data["pin_hash"] = hashed_pin
        del usuario_data["pin"]
        res = supabase.table("usuarios_temporales").insert(usuario_data).execute()
        return res.data[0]
    except APIError as e:
        raise HTTPException(status_code=int(e.code), detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@pos_router.post("/login-temp")
async def login_temporal(username: str, pin: str, shift_uuid: UUID):
    """
    Logs in a temporary user and returns a JWT token with shift_uuid and scope.
    """
    try:
        res = supabase.table("usuarios_temporales").select("uuid, pin_hash").eq("username", username).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User not found")

        user = res.data[0]
        hashed_pin = user["pin_hash"]
        if bcrypt.checkpw(pin.encode('utf-8'), hashed_pin.encode('utf-8')):
            access_token_expires = timedelta(minutes=config.JWT_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": str(user["uuid"]), "shift_uuid": str(shift_uuid), "scope": "ventas:create"},
                expires_delta=access_token_expires
            )
            return {"access_token": access_token, "token_type": "bearer"}
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except APIError as e:
        raise HTTPException(status_code=int(e.code), detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
