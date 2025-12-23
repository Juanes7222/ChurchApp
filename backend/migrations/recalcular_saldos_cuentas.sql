-- Script para recalcular saldos de cuentas_miembro basándose en movimientos_cuenta

-- Recalcular saldo_deudor para cada cuenta
UPDATE cuentas_miembro c
SET saldo_deudor = COALESCE(
    (SELECT 
        SUM(CASE 
            WHEN m.tipo = 'cargo' THEN m.monto
            WHEN m.tipo = 'pago' THEN -m.monto
            WHEN m.tipo = 'ajuste' THEN m.monto
            ELSE 0
        END)
    FROM movimientos_cuenta m
    WHERE m.cuenta_uuid = c.uuid
      AND m.is_deleted = false
    ), 0),
    updated_at = now()
WHERE c.uuid IS NOT NULL;

-- Verificar resultados
SELECT 
    m.nombres || ' ' || m.apellidos as nombre,
    c.uuid as cuenta_uuid,
    c.saldo_deudor,
    (SELECT COUNT(*) FROM movimientos_cuenta mc WHERE mc.cuenta_uuid = c.uuid AND mc.tipo = 'cargo') as num_cargos,
    (SELECT COUNT(*) FROM movimientos_cuenta mc WHERE mc.cuenta_uuid = c.uuid AND mc.tipo = 'pago') as num_pagos,
    (SELECT SUM(monto) FROM movimientos_cuenta mc WHERE mc.cuenta_uuid = c.uuid AND mc.tipo = 'cargo') as total_cargos,
    (SELECT SUM(monto) FROM movimientos_cuenta mc WHERE mc.cuenta_uuid = c.uuid AND mc.tipo = 'pago') as total_pagos
FROM cuentas_miembro c
JOIN miembros m ON m.uuid = c.miembro_uuid
ORDER BY c.created_at DESC;
