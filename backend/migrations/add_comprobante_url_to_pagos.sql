-- Agregar campo para almacenar URL del comprobante de pago (imagen/PDF)
-- Especialmente útil para pagos por transferencia

ALTER TABLE pagos_venta 
ADD COLUMN IF NOT EXISTS comprobante_url text;

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS ix_pagos_venta_comprobante ON pagos_venta(comprobante_url) WHERE comprobante_url IS NOT NULL;

-- Comentario
COMMENT ON COLUMN pagos_venta.comprobante_url IS 'URL pública del comprobante de pago almacenado en Supabase Storage';
