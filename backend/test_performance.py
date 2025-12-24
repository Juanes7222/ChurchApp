#!/usr/bin/env python3
"""
Script de prueba de optimizaciones de performance
Ejecutar con: python test_performance.py
"""

import requests
import time
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_cache_performance(endpoint: str, description: str) -> Dict[str, Any]:
    """
    Test de performance de caché
    Compara primera llamada (sin caché) vs segunda (con caché)
    """
    print(f"\n🧪 Testing: {description}")
    print(f"   Endpoint: {endpoint}")
    
    # Primera llamada - SIN caché
    start = time.time()
    response1 = requests.get(f"{BASE_URL}{endpoint}")
    time1 = time.time() - start
    
    if response1.status_code != 200:
        print(f"   ❌ Error: {response1.status_code}")
        return {}
    
    process_time1 = float(response1.headers.get('X-Process-Time', 0))
    
    # Segunda llamada - CON caché
    time.sleep(0.1)  # Pequeña pausa
    start = time.time()
    response2 = requests.get(f"{BASE_URL}{endpoint}")
    time2 = time.time() - start
    
    process_time2 = float(response2.headers.get('X-Process-Time', 0))
    
    # Calcular mejora
    speedup = time1 / time2 if time2 > 0 else 0
    
    print(f"   📊 Primera llamada (sin caché):  {time1*1000:.2f}ms (process: {process_time1*1000:.2f}ms)")
    print(f"   ⚡ Segunda llamada (con caché):   {time2*1000:.2f}ms (process: {process_time2*1000:.2f}ms)")
    print(f"   🚀 Speedup: {speedup:.1f}x más rápido")
    
    if speedup > 5:
        print(f"   ✅ EXCELENTE - Caché funcionando perfectamente")
    elif speedup > 2:
        print(f"   ✅ BIEN - Mejora notable")
    else:
        print(f"   ⚠️  REVISAR - Mejora menor a lo esperado")
    
    return {
        "endpoint": endpoint,
        "time_without_cache": time1,
        "time_with_cache": time2,
        "speedup": speedup
    }

def test_compression():
    """
    Test de compresión GZip
    """
    print(f"\n🗜️  Testing: Compresión GZip")
    
    endpoint = "/api/miembros"
    
    # Sin compresión
    response_uncompressed = requests.get(
        f"{BASE_URL}{endpoint}",
        headers={"Accept-Encoding": "identity"}
    )
    size_uncompressed = len(response_uncompressed.content)
    
    # Con compresión
    response_compressed = requests.get(
        f"{BASE_URL}{endpoint}",
        headers={"Accept-Encoding": "gzip"}
    )
    size_compressed = len(response_compressed.content)
    
    reduction = (1 - size_compressed / size_uncompressed) * 100 if size_uncompressed > 0 else 0
    
    print(f"   📦 Sin compresión:  {size_uncompressed:,} bytes")
    print(f"   🗜️  Con compresión:  {size_compressed:,} bytes")
    print(f"   📉 Reducción: {reduction:.1f}%")
    
    if reduction > 60:
        print(f"   ✅ EXCELENTE - Compresión efectiva")
    elif reduction > 40:
        print(f"   ✅ BIEN - Compresión moderada")
    else:
        print(f"   ⚠️  REVISAR - Compresión menor a lo esperado")

def test_metrics(admin_token: str = None):
    """
    Test del endpoint de métricas
    """
    print(f"\n📊 Testing: Endpoint de Métricas")
    
    if not admin_token:
        print(f"   ⚠️  Token de admin no proporcionado, saltando test")
        return
    
    response = requests.get(
        f"{BASE_URL}/api/metrics",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code != 200:
        print(f"   ❌ Error: {response.status_code}")
        return
    
    metrics = response.json()
    
    print(f"   ⏱️  Uptime: {metrics.get('uptime_formatted', 'N/A')}")
    print(f"   📊 Total Requests: {metrics.get('requests', {}).get('total', 0)}")
    print(f"   ⚡ Avg Response: {metrics.get('requests', {}).get('avg_response_time_ms', 0):.2f}ms")
    
    cache = metrics.get('cache', {})
    print(f"   💾 Cache Hit Rate: {cache.get('hit_rate', 0):.1f}%")
    print(f"   🎯 Cache Keys: {cache.get('total_keys', 0)}")
    
    print(f"   ✅ Métricas funcionando correctamente")

def main():
    print("=" * 60)
    print("🚀 Test de Optimizaciones de Performance - ChurchApp")
    print("=" * 60)
    
    # Verificar que el servidor está corriendo
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code != 200:
            print("❌ Error: El servidor no está respondiendo correctamente")
            sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: No se puede conectar al servidor en {BASE_URL}")
        print(f"   Asegúrate de que el backend esté corriendo")
        print(f"   Error: {e}")
        sys.exit(1)
    
    print(f"✅ Servidor corriendo en {BASE_URL}\n")
    
    # Tests de caché
    results = []
    
    # Test productos (caché 180s)
    results.append(test_cache_performance(
        "/api/pos/productos",
        "Productos POS (TTL: 180s)"
    ))
    
    # Test miembros (caché 300s)
    results.append(test_cache_performance(
        "/api/miembros",
        "Lista de Miembros (TTL: 300s)"
    ))
    
    # Test grupos (caché 600s)
    results.append(test_cache_performance(
        "/api/grupos",
        "Lista de Grupos (TTL: 600s)"
    ))
    
    # Test compresión
    test_compression()
    
    # Test métricas (requiere token admin)
    admin_token = input("\n🔑 Token de Admin (Enter para saltar): ").strip()
    if admin_token:
        test_metrics(admin_token)
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE RESULTADOS")
    print("=" * 60)
    
    valid_results = [r for r in results if r]
    
    if valid_results:
        avg_speedup = sum(r['speedup'] for r in valid_results) / len(valid_results)
        print(f"⚡ Speedup promedio con caché: {avg_speedup:.1f}x")
        
        if avg_speedup > 10:
            print(f"✅ EXCELENTE - Las optimizaciones están funcionando perfectamente")
        elif avg_speedup > 5:
            print(f"✅ BIEN - Las optimizaciones están funcionando bien")
        elif avg_speedup > 2:
            print(f"⚠️  ACEPTABLE - Las optimizaciones tienen margen de mejora")
        else:
            print(f"❌ REVISAR - Las optimizaciones no están teniendo el efecto esperado")
    
    print("\n" + "=" * 60)
    print("✅ Tests completados")
    print("=" * 60)

if __name__ == "__main__":
    main()
