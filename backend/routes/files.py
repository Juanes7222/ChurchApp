from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from typing import Dict, Any
from utils.auth import require_any_authenticated
from core import config
from logging import getLogger
import os
import uuid

logger = getLogger(__name__)

supabase = config.supabase
files_router = APIRouter(prefix="")

@files_router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    bucket: str = os.getenv("TRANSFERS_STORAGE_NAME", "TRANSFERENCIAS"),
    current_user: Dict[str, Any] = Depends(require_any_authenticated)
) -> Dict[str, str]:
    """Upload image to Supabase Storage (generic endpoint)"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
    
    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo muy grande. Máximo 10MB")
    
    # Generate unique filename
    filename = file.filename or "upload"
    file_ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    
    # Bucket name from parameter
    bucket_name = bucket or "transferencias"
    
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
            "filename": unique_filename,
            "bucket": bucket_name
        }
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")