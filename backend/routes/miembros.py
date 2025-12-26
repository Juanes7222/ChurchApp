from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from models.models import MiembroCreate, MiembroUpdate, MiembroResponse
from utils import require_auth_user, require_admin
from utils.auth import require_any_authenticated
from core import config
from core.cache import cached, invalidate_cache_pattern
from typing import Optional, Dict, Any, List, cast
from datetime import datetime, timezone
import uuid
import os

supabase = config.supabase
api_router = APIRouter(prefix="")

# ============= MIEMBROS =============
@cached(ttl_seconds=300, key_prefix="miembros_list")
@api_router.get("/miembros", response_model=Dict[str, Any])
async def list_miembros(
    q: Optional[str] = None,
    grupo: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    current_user: Dict[str, Any] = Depends(require_any_authenticated)
) -> Dict[str, Any]:
    """List members with search and filters - Accessible by any authenticated user including meseros"""
    # Optimización: solo traer campos necesarios para la vista de lista
    query = supabase.table('miembros').select(
        'uuid, documento, nombres, apellidos, telefono, email, foto_url, created_at',
        count='exact'  # type: ignore
    ).eq('is_deleted', False)
    
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
async def get_miembro(miembro_uuid: str, current_user: Dict[str, Any] = Depends(require_auth_user)) -> Dict[str, Any]:
    """Get member by UUID"""
    result = supabase.table('miembros').select('*, grupos:grupo_miembro(grupo_uuid, grupos(*))').eq('uuid', miembro_uuid).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    miembro = cast(Dict[str, Any], result.data[0])
    
    # Transform grupos relationship
    if miembro.get('grupos'):
        miembro['grupos'] = [cast(Dict[str, Any], g).get('grupos') for g in cast(List[Any], miembro['grupos']) if cast(Dict[str, Any], g).get('grupos')]
    else:
        miembro['grupos'] = []
    
    return miembro

@api_router.post("/miembros", response_model=MiembroResponse)
async def create_miembro(miembro: MiembroCreate, current_user: Dict[str, Any] = Depends(require_auth_user)) -> Dict[str, Any]:
    """Create new member"""
    # Check for duplicate documento
    existing = supabase.table('miembros').select('uuid').eq('documento', miembro.documento).eq('is_deleted', False).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya existe un miembro con este documento")
    
    data = miembro.model_dump()
    print(f"DEBUG - Data to insert: {data}")  # Debug log
    print(f"DEBUG - foto_url: {data.get('foto_url')}")  # Debug log
    data['uuid'] = str(uuid.uuid4())  # Generar UUID
    data['created_by'] = current_user['sub']
    data['updated_by'] = current_user['sub']
    
    result = supabase.table('miembros').insert(data).execute()
    print(f"DEBUG - Inserted data: {result.data[0]}")  # Debug log
    
    # Invalidar caché después de crear miembro
    invalidate_cache_pattern("miembros")
    
    return cast(Dict[str, Any], result.data[0])

@api_router.put("/miembros/{miembro_uuid}", response_model=MiembroResponse)
async def update_miembro(
    miembro_uuid: str,
    miembro: MiembroUpdate,
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, Any]:
    """Update member"""
    # Check if exists
    existing = supabase.table('miembros').select('uuid').eq('uuid', miembro_uuid).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    data = miembro.model_dump(exclude_unset=True)
    print(f"DEBUG - Data to update: {data}")  # Debug log
    print(f"DEBUG - foto_url: {data.get('foto_url')}")  # Debug log
    data['updated_by'] = current_user['sub']
    
    result = supabase.table('miembros').update(data).eq('uuid', miembro_uuid).execute()
    print(f"DEBUG - Updated data: {result.data[0]}")  # Debug log
    
    # Invalidar caché después de actualizar miembro
    invalidate_cache_pattern("miembros")
    
    return cast(Dict[str, Any], result.data[0])

@api_router.delete("/miembros/{miembro_uuid}")
async def delete_miembro(miembro_uuid: str, current_user: Dict[str, Any] = Depends(require_admin)) -> Dict[str, str]:
    """Soft delete member"""
    result = supabase.table('miembros').update({
        'is_deleted': True,
        'deleted_at': datetime.now(timezone.utc).isoformat()
    }).eq('uuid', miembro_uuid).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    # Invalidar caché después de eliminar miembro
    invalidate_cache_pattern("miembros")
    
    return {"message": "Miembro eliminado"}


# ============= CLIENTES TEMPORALES =============

@api_router.post("/miembros/temporal", response_model=MiembroResponse)
async def create_temporal_miembro(
    miembro: MiembroCreate, 
    current_user: Dict[str, Any] = Depends(require_any_authenticated)
) -> Dict[str, Any]:
    """Crear cliente temporal - Solo meseros y admin
    
    Los clientes temporales se crean con es_temporal=true y verificado=false
    Un administrador debe verificarlos posteriormente
    Si no se provee documento, se genera automáticamente con formato TEMP-XXXXXX
    """
    data = miembro.model_dump()
    
    # Si no hay documento, generar uno automático
    if not data.get('documento') or data['documento'].strip() == '':
        # Generar documento temporal único
        import time
        timestamp = int(time.time() * 1000) % 1000000  # Últimos 6 dígitos del timestamp
        documento_temporal = f"TEMP-{timestamp:06d}"
        
        # Verificar que no exista (muy poco probable)
        existing = supabase.table('miembros').select('uuid').eq('documento', documento_temporal).eq('is_deleted', False).execute()
        if existing.data:
            # Si por casualidad existe, agregar un número aleatorio
            import random
            documento_temporal = f"TEMP-{random.randint(100000, 999999)}"
        
        data['documento'] = documento_temporal
        data['tipo_documento'] = 'TEMP'
    else:
        # Verificar que no exista el documento
        existing = supabase.table('miembros').select('uuid').eq('documento', miembro.documento).eq('is_deleted', False).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con este documento")
    
    data['uuid'] = str(uuid.uuid4())  # Generar UUID
    data['es_temporal'] = True
    data['verificado'] = False
    data['otra_iglesia'] = False
    data['public_profile'] = False
    data['created_by'] = current_user.get('sub')
    data['updated_by'] = current_user.get('sub')
    
    result = supabase.table('miembros').insert(data).execute()
    miembro_creado = cast(Dict[str, Any], result.data[0])
    
    # Crear cuenta automáticamente para el miembro temporal
    cuenta_data = {
        'uuid': str(uuid.uuid4()),
        'miembro_uuid': miembro_creado['uuid'],
        'saldo_deudor': 0,
        'saldo_acumulado': 0,
        'limite_credito': 300000  # Límite por defecto
    }
    supabase.table('cuentas_miembro').insert(cuenta_data).execute()
    
    return miembro_creado


@api_router.get("/miembros/temporales/pendientes")
async def get_temporales_pendientes(
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Listar clientes temporales pendientes de verificación"""
    result = supabase.table('miembros')\
        .select('*')\
        .eq('es_temporal', True)\
        .eq('verificado', False)\
        .eq('is_deleted', False)\
        .order('created_at', desc=True)\
        .execute()
    
    return {
        "miembros_pendientes": result.data or [],
        "total": len(result.data) if result.data else 0
    }


@api_router.post("/miembros/{miembro_uuid}/verificar")
async def verificar_miembro_temporal(
    miembro_uuid: str,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, Any]:
    """Verificar un cliente temporal - Solo admin"""
    # Verificar que existe y es temporal
    miembro = supabase.table('miembros')\
        .select('*')\
        .eq('uuid', miembro_uuid)\
        .eq('es_temporal', True)\
        .execute()
    
    if not miembro.data:
        raise HTTPException(status_code=404, detail="Cliente temporal no encontrado")
    
    # Marcar como verificado
    result = supabase.table('miembros')\
        .update({
            'verificado': True,
            'updated_by': current_user.get('sub'),
            'updated_at': datetime.now(timezone.utc).isoformat()
        })\
        .eq('uuid', miembro_uuid)\
        .execute()
    
    return {
        "message": "Cliente verificado exitosamente",
        "miembro": result.data[0]
    }


@api_router.delete("/miembros/{miembro_uuid}/rechazar")
async def rechazar_miembro_temporal(
    miembro_uuid: str,
    motivo: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_admin)
) -> Dict[str, str]:
    """Rechazar y eliminar un cliente temporal - Solo admin"""
    # Verificar que existe y es temporal
    miembro = supabase.table('miembros')\
        .select('*')\
        .eq('uuid', miembro_uuid)\
        .eq('es_temporal', True)\
        .execute()
    
    if not miembro.data:
        raise HTTPException(status_code=404, detail="Cliente temporal no encontrado")
    
    # Eliminar (soft delete)
    result = supabase.table('miembros')\
        .update({
            'is_deleted': True,
            'deleted_at': datetime.now(timezone.utc).isoformat(),
            'notas': f"Rechazado: {motivo}" if motivo else "Rechazado por administrador"
        })\
        .eq('uuid', miembro_uuid)\
        .execute()
    
    return {
        "message": "Cliente temporal rechazado y eliminado"
    }

@api_router.post("/miembros/upload-foto")
async def upload_foto_miembro(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_auth_user)
) -> Dict[str, str]:
    """Upload member photo to Supabase Storage"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use JPG, PNG, WEBP o GIF")
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 5MB")
    
    # Generate unique filename
    filename = file.filename or "upload"
    file_ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Bucket name
    bucket_name = config.STORAGE_NAME
    
    try:
        # Upload to Supabase Storage
        result = supabase.storage.from_(bucket_name).upload(
            path=unique_filename,
            file=contents,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
        
        return {
            "url": public_url,
            "filename": unique_filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")

@api_router.get("/miembros/storage-check")
async def check_storage_bucket(current_user: Dict[str, Any] = Depends(require_auth_user)) -> Dict[str, Any]:
    """Check if storage bucket exists and is accessible"""
    bucket_name = config.STORAGE_NAME
    try:
        # Try to list buckets
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.name == bucket_name for b in buckets)
        
        return {
            "bucket_name": bucket_name,
            "exists": bucket_exists,
            "all_buckets": [b.name for b in buckets]
        }
    except Exception as e:
        return {
            "bucket_name": bucket_name,
            "error": str(e),
            "message": "Error al verificar bucket de storage"
        }
