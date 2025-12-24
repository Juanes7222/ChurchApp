-- Agregar campo pin_plain a usuarios_temporales para poder recuperar el PIN
-- Los PINs son temporales y de corta duración, por lo que se almacenan en texto plano
-- para facilitar que los administradores puedan consultarlos cuando sea necesario

ALTER TABLE usuarios_temporales 
ADD COLUMN IF NOT EXISTS pin_plain TEXT;

-- Agregar campo shift_uuid para relacionar meseros con el turno en que fueron creados
-- Usando TEXT porque caja_shift.uuid es TEXT en la base de datos actual
ALTER TABLE usuarios_temporales
ADD COLUMN IF NOT EXISTS shift_uuid TEXT;

COMMENT ON COLUMN usuarios_temporales.pin_plain IS 'PIN en texto plano para acceso administrativo. Solo para usuarios temporales de corta duración.';
COMMENT ON COLUMN usuarios_temporales.shift_uuid IS 'UUID del turno de caja en el que fue creado este mesero temporal.';

-- Índice para búsquedas por turno
CREATE INDEX IF NOT EXISTS ix_usuarios_temp_shift ON usuarios_temporales(shift_uuid);
