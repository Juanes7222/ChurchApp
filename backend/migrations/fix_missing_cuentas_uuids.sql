-- Script para arreglar UUIDs faltantes en cuentas_miembro y movimientos_cuenta

-- 1. Generar UUIDs para cuentas_miembro que tienen uuid NULL
UPDATE cuentas_miembro 
SET uuid = gen_random_uuid()::text 
WHERE uuid IS NULL;

-- 2. Para cada movimiento sin cuenta_uuid, buscar la cuenta por el miembro asociado a la venta
UPDATE movimientos_cuenta m
SET cuenta_uuid = c.uuid
FROM ventas v
JOIN cuentas_miembro c ON c.miembro_uuid = v.miembro_uuid
WHERE m.cuenta_uuid IS NULL 
  AND m.venta_uuid = v.uuid
  AND m.tipo = 'cargo';

-- 3. Generar UUIDs para movimientos que tienen uuid NULL
UPDATE movimientos_cuenta 
SET uuid = gen_random_uuid()::text 
WHERE uuid IS NULL;

-- 4. Verificar resultados
SELECT 
    'cuentas_miembro' as tabla,
    COUNT(*) as total,
    COUNT(uuid) as con_uuid,
    COUNT(*) - COUNT(uuid) as sin_uuid
FROM cuentas_miembro
UNION ALL
SELECT 
    'movimientos_cuenta' as tabla,
    COUNT(*) as total,
    COUNT(uuid) as con_uuid,
    COUNT(*) - COUNT(uuid) as sin_uuid
FROM movimientos_cuenta;
