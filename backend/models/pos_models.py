from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal

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
