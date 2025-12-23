-- Actualizar límite de crédito a 300,000 pesos para todas las cuentas

-- 1. Cambiar el DEFAULT de la columna para nuevas cuentas
ALTER TABLE cuentas_miembro 
ALTER COLUMN limite_credito SET DEFAULT 300000;

-- 2. Actualizar todas las cuentas existentes a 300,000
UPDATE cuentas_miembro 
SET limite_credito = 300000
WHERE is_deleted = false;

-- 3. Verificar los cambios
SELECT 
  'Cuentas actualizadas' as resultado,
  COUNT(*) as total_cuentas,
  COUNT(CASE WHEN limite_credito = 300000 THEN 1 END) as con_limite_300k,
  MIN(limite_credito) as limite_minimo,
  MAX(limite_credito) as limite_maximo
FROM cuentas_miembro
WHERE is_deleted = false;

-- Comentario descriptivo
COMMENT ON COLUMN cuentas_miembro.limite_credito IS 'Límite de crédito en pesos (DEFAULT: 300,000)';
