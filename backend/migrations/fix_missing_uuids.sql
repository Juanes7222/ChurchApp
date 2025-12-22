-- Arreglar UUIDs faltantes en productos
UPDATE productos 
SET uuid = uuid_generate_v4()
WHERE uuid IS NULL;

-- Arreglar UUIDs faltantes en miembros  
UPDATE miembros
SET uuid = uuid_generate_v4()
WHERE uuid IS NULL;

-- Arreglar UUIDs faltantes en categorias_producto
UPDATE categorias_producto
SET uuid = uuid_generate_v4()
WHERE uuid IS NULL;

-- Verificar resultados
SELECT 'productos' as tabla, COUNT(*) as sin_uuid FROM productos WHERE uuid IS NULL
UNION ALL
SELECT 'miembros', COUNT(*) FROM miembros WHERE uuid IS NULL
UNION ALL
SELECT 'categorias', COUNT(*) FROM categorias_producto WHERE uuid IS NULL;
