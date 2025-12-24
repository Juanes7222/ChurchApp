from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator
from decimal import Decimal
# UUID removido - ahora usamos str para todos los identificadores

class GoogleAuthRequest(BaseModel):
    token: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class InviteRequest(BaseModel):
    """
    Modelo para crear invitaciones de registro.
    
    Roles permitidos:
    - pastor: Ver información completa, sin modificar sistema
    - secretaria: Operativo-administrativo, puede editar miembros y registrar pagos
    - agente_restaurante: Administrador del restaurante
    - lider: Acceso limitado a su grupo (futuro)
    
    Nota: El rol 'admin' NO puede ser invitado, solo creado directamente
    
    expires_days: Días de validez de la invitación. Si es None, la invitación es permanente.
    """
    role: Literal["pastor", "secretaria", "agente_restaurante", "lider"]
    email: Optional[str] = None
    note: Optional[str] = None
    expires_days: Optional[int] = 7
    
    @validator('role')
    def validate_role(cls, v):
        """Validar que no se intente crear una invitación para admin"""
        if v == 'admin':
            raise ValueError('El rol admin no puede ser invitado, solo creado directamente')
        return v
    
    @validator('expires_days')
    def validate_expires_days(cls, v):
        """Validar que expires_days sea positivo si se proporciona"""
        if v is not None and v <= 0:
            raise ValueError('expires_days debe ser un número positivo')
        return v

class InviteResponse(BaseModel):
    token: str
    role: str
    expires_at: Optional[str] = None
    created_at: str

class ConsumeInviteRequest(BaseModel):
    token: str  # Token de invitación
    google_token: str  # Token de Firebase/Google

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
    es_temporal: Optional[bool] = False
    verificado: Optional[bool] = True

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
    categoria_uuid: Optional[str] = None
    favorito: Optional[bool] = False
    activo: Optional[bool] = True

class ProductoResponse(ProductoCreate):
    uuid: str

class CategoriaProducto(BaseModel):
    nombre: str
    orden: Optional[int] = 0
    activo: Optional[bool] = True

# --- Venta Models ---
class VentaItem(BaseModel):
    producto_uuid: str
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
    shift_uuid: str
    vendedor_uuid: Optional[str] = None  # Opcional, el backend lo determina del token
    tipo: str
    miembro_uuid: Optional[str] = None
    is_fiado: Optional[bool] = False
    items: List[VentaItem]
    pagos: List[PagoVenta]

# --- Shift Models ---
class MeseroPin(BaseModel):
    pin: str  # PIN de 4 dígitos para el mesero
    miembro_uuid: str  # UUID del miembro asociado

class CajaShiftCreate(BaseModel):
    apertura_por: str  # Firebase UID (not a standard UUID)
    efectivo_inicial: Decimal
    meseros: Optional[List[MeseroPin]] = []  # Lista de PINs para crear meseros

class CajaShiftResponse(CajaShiftCreate):
    uuid: str
    estado: str
    apertura_fecha: datetime

class CajaShiftClose(BaseModel):
    efectivo_recuento: Decimal
    notas: Optional[str] = None

# --- UsuarioTemporal Models ---
class UsuarioTemporalCreate(BaseModel):
    username: str
    display_name: str
    pin: str
    miembro_uuid: str  # Campo obligatorio: debe estar asociado a un miembro
    fin_validity: Optional[datetime] = None
    creado_por_uuid: str

class UsuarioTemporalLogin(BaseModel):
    username: str
    pin: str

class UsuarioTemporalResponse(BaseModel):
    uuid: str
    username: str
    display_name: str
    activo: bool
    inicio_validity: datetime
    fin_validity: Optional[datetime]
    fin_validity: datetime
    activo: bool

# --- Other Models ---
class Inventario(BaseModel):
    producto_uuid: str
    cantidad_actual: Decimal
    ubicacion: Optional[str] = None

class CuentaMiembro(BaseModel):
    miembro_uuid: str
    limite_credito: Optional[Decimal] = 0

class MovimientoCuenta(BaseModel):
    cuenta_uuid: str
    venta_uuid: Optional[str] = None
    tipo: str
    monto: Decimal
    descripcion: Optional[str] = None
