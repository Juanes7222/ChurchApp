-- Agregar campos para clientes temporales en miembros
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS es_temporal boolean DEFAULT false;
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS verificado boolean DEFAULT true;

-- Crear índice para buscar miembros temporales no verificados
CREATE INDEX IF NOT EXISTS ix_miembros_temporal_verificado ON miembros(es_temporal, verificado) WHERE es_temporal = true;

-- Comentarios
COMMENT ON COLUMN miembros.es_temporal IS 'Indica si el miembro fue creado temporalmente por un mesero';
COMMENT ON COLUMN miembros.verificado IS 'Indica si un admin ha verificado los datos del miembro temporal';
