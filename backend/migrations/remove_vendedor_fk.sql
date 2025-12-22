-- Eliminar el constraint que fuerza vendedor_uuid a solo usuarios_temporales
-- porque vendedor_uuid puede ser tanto un miembro_uuid (para admins) como un usuario_temporal.uuid (para meseros)

ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_vendedor_uuid_fkey;

-- Nota: vendedor_uuid ahora es un campo TEXT sin FK constraint
-- El backend valida la existencia del vendedor según el tipo de usuario
