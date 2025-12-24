"""
Sistema de caché en memoria simple para mejorar performance
Ideal para datos que no cambian frecuentemente
"""
from typing import Any, Optional, Callable
from datetime import datetime, timedelta
import functools
import hashlib
import json

class SimpleCache:
    """Caché en memoria con TTL (Time To Live)"""
    
    def __init__(self):
        self._cache: dict[str, dict[str, Any]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Obtener valor del caché si no ha expirado"""
        if key in self._cache:
            entry = self._cache[key]
            if datetime.now() < entry['expires_at']:
                return entry['value']
            else:
                # Expiró, eliminarlo
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Guardar valor en caché con TTL (default 5 minutos)"""
        self._cache[key] = {
            'value': value,
            'expires_at': datetime.now() + timedelta(seconds=ttl_seconds),
            'created_at': datetime.now()
        }
    
    def delete(self, key: str):
        """Eliminar entrada del caché"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self):
        """Limpiar todo el caché"""
        self._cache.clear()
    
    def get_stats(self) -> dict[str, Any]:
        """Obtener estadísticas del caché"""
        now = datetime.now()
        valid_entries = sum(1 for entry in self._cache.values() if now < entry['expires_at'])
        return {
            'total_entries': len(self._cache),
            'valid_entries': valid_entries,
            'expired_entries': len(self._cache) - valid_entries
        }


# Instancia global del caché
cache = SimpleCache()


def cached(ttl_seconds: int = 300, key_prefix: str = ""):
    """
    Decorador para cachear resultados de funciones
    
    Uso:
        @cached(ttl_seconds=600, key_prefix="productos")
        async def get_productos():
            return await fetch_productos()
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generar clave única basada en función y argumentos
            cache_key = _generate_cache_key(func.__name__, key_prefix, args, kwargs)
            
            # Intentar obtener del caché
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # No está en caché, ejecutar función
            result = await func(*args, **kwargs)
            
            # Guardar en caché
            cache.set(cache_key, result, ttl_seconds)
            
            return result
        
        return wrapper
    return decorator


def _generate_cache_key(func_name: str, prefix: str, args: tuple, kwargs: dict) -> str:
    """Generar clave única para el caché"""
    # Crear string con todos los parámetros
    key_parts = [prefix, func_name]
    
    # Agregar args (excluyendo 'self' y objetos no serializables)
    for arg in args:
        if not isinstance(arg, (str, int, float, bool, type(None))):
            continue
        key_parts.append(str(arg))
    
    # Agregar kwargs
    for k, v in sorted(kwargs.items()):
        if not isinstance(v, (str, int, float, bool, type(None))):
            continue
        key_parts.append(f"{k}={v}")
    
    # Generar hash para mantener claves cortas
    key_string = ":".join(str(p) for p in key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def invalidate_cache_pattern(pattern: str):
    """Invalidar todas las entradas que coincidan con un patrón"""
    keys_to_delete = [key for key in cache._cache.keys() if pattern in key]
    for key in keys_to_delete:
        cache.delete(key)
