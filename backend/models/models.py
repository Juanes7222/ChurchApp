from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, EmailStr
from decimal import Decimal
from uuid import UUID

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

# --- Product Models ---
class ProductoCreate(BaseModel):
    codigo: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    precio: Decimal
    categoria_uuid: Optional[UUID] = None
    favorito: Optional[bool] = False
    activo: Optional[bool] = True

class ProductoResponse(ProductoCreate):
    uuid: UUID

class CategoriaProducto(BaseModel):
    nombre: str
    orden: Optional[int] = 0
    activo: Optional[bool] = True

# --- Venta Models ---
class VentaItem(BaseModel):
    producto_uuid: UUID
    cantidad: Decimal
    precio_unitario: Decimal
    descuento: Optional[Decimal] = 0
    total_item: Decimal
    notas: Optional[str] = None

class PagoVenta(BaseModel):
    metodo: str
    monto: Decimal
    referencia: Optional[str] = None

class Venta(BaseModel):
    client_ticket_id: Optional[str] = None
    shift_uuid: UUID
    vendedor_uuid: UUID
    tipo: str
    miembro_uuid: Optional[UUID] = None
    is_fiado: Optional[bool] = False
    items: List[VentaItem]
    pagos: List[PagoVenta]

# --- Shift Models ---
class CajaShiftCreate(BaseModel):
    apertura_por: UUID
    efectivo_inicial: Decimal

class CajaShiftResponse(CajaShiftCreate):
    uuid: UUID
    estado: str
    apertura_fecha: datetime

# --- UsuarioTemporal Models ---
class UsuarioTemporalCreate(BaseModel):
    username: str
    display_name: str
    pin: str
    fin_validity: datetime

class UsuarioTemporalResponse(BaseModel):
    uuid: UUID
    username: str
    display_name: str
    fin_validity: datetime
    activo: bool

# --- Other Models ---
class Inventario(BaseModel):
    producto_uuid: UUID
    cantidad_actual: Decimal
    ubicacion: Optional[str] = None

class CuentaMiembro(BaseModel):
    miembro_uuid: UUID
    limite_credito: Optional[Decimal] = 0

class MovimientoCuenta(BaseModel):
    cuenta_uuid: UUID
    venta_uuid: Optional[UUID] = None
    tipo: str
    monto: Decimal
    descripcion: Optional[str] = None
