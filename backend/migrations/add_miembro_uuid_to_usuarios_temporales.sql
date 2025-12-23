-- Agregar columna miembro_uuid a usuarios_temporales para vincular meseros con miembros

-- Agregar la columna
ALTER TABLE usuarios_temporales 
ADD COLUMN IF NOT EXISTS miembro_uuid text;

-- Agregar índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS ix_usuarios_temporales_miembro 
ON usuarios_temporales(miembro_uuid);

-- Agregar foreign key (opcional, comentado por si hay problemas de integridad)
-- ALTER TABLE usuarios_temporales 
-- ADD CONSTRAINT fk_usuarios_temporales_miembro 
-- FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid);

-- Verificar la estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios_temporales'
ORDER BY ordinal_position;
