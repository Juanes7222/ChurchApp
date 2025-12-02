-- ====================================================================================
-- MIGRACIÓN: UUID a TEXT para Firebase UIDs
-- Este script convierte las columnas de identificadores de UUID a TEXT
-- para ser compatible con Firebase Authentication UIDs
-- ====================================================================================

BEGIN;

-- PASO 1: Eliminar TODAS las vistas que dependen de columnas UUID
DROP VIEW IF EXISTS vw_member_account_summary;
DROP VIEW IF EXISTS vw_leadership_gaps;

-- PASO 2: Eliminar TODAS las FK constraints en orden inverso de dependencia
-- Primero las FKs de tablas que dependen de otras tablas que también tienen FKs

-- FKs que dependen de ventas
ALTER TABLE venta_items DROP CONSTRAINT IF EXISTS venta_items_venta_uuid_fkey;
ALTER TABLE venta_items DROP CONSTRAINT IF EXISTS venta_items_producto_uuid_fkey;
ALTER TABLE pagos_venta DROP CONSTRAINT IF EXISTS pagos_venta_venta_uuid_fkey;
ALTER TABLE movimientos_cuenta DROP CONSTRAINT IF EXISTS movimientos_cuenta_cuenta_uuid_fkey;
ALTER TABLE movimientos_cuenta DROP CONSTRAINT IF EXISTS movimientos_cuenta_venta_uuid_fkey;

-- FKs que dependen de ventas (segundo nivel)
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_miembro_uuid_fkey;
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_shift_uuid_fkey;
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_vendedor_uuid_fkey;

-- FKs que dependen de productos
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_categoria_uuid_fkey;
ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_producto_uuid_fkey;

-- FKs de liderazgo
ALTER TABLE liderazgo_miembro DROP CONSTRAINT IF EXISTS liderazgo_miembro_liderazgo_uuid_fkey;
ALTER TABLE liderazgo_miembro DROP CONSTRAINT IF EXISTS liderazgo_miembro_miembro_uuid_fkey;
ALTER TABLE liderazgo DROP CONSTRAINT IF EXISTS liderazgo_grupo_uuid_fkey;

-- FKs de grupos
ALTER TABLE grupo_miembro DROP CONSTRAINT IF EXISTS grupo_miembro_grupo_uuid_fkey;
ALTER TABLE grupo_miembro DROP CONSTRAINT IF EXISTS grupo_miembro_miembro_uuid_fkey;

-- FKs de miembros (las más importantes)
ALTER TABLE fechas_miembro DROP CONSTRAINT IF EXISTS fechas_miembro_miembro_uuid_fkey;
ALTER TABLE observaciones DROP CONSTRAINT IF EXISTS observaciones_miembro_uuid_fkey;
ALTER TABLE cuentas_miembro DROP CONSTRAINT IF EXISTS cuentas_miembro_miembro_uuid_fkey;
ALTER TABLE cuentas_miembro DROP CONSTRAINT IF EXISTS cuentas_miembro_miembro_uuid_unique;
ALTER TABLE cuentas_miembro DROP CONSTRAINT IF EXISTS cuentas_miembro_miembro_uuid_key;

-- Eliminar índices UNIQUE que puedan interferir
DROP INDEX IF EXISTS cuentas_miembro_miembro_uuid_key;

-- PASO 2.5: Eliminar TRIGGERS que dependen de columnas UUID
DROP TRIGGER IF EXISTS trg_ventas_set_ticket ON ventas;
DROP TRIGGER IF EXISTS trg_audit_miembros ON miembros;
DROP TRIGGER IF EXISTS trg_audit_grupos ON grupos;
DROP TRIGGER IF EXISTS trg_audit_liderazgo ON liderazgo;
DROP TRIGGER IF EXISTS trg_audit_ventas ON ventas;
DROP TRIGGER IF EXISTS trg_audit_movimientos ON movimientos_cuenta;
DROP TRIGGER IF EXISTS trg_sync_mark_miembros ON miembros;
DROP TRIGGER IF EXISTS trg_sync_mark_grupos ON grupos;
DROP TRIGGER IF EXISTS trg_sync_mark_fechas_miembro ON fechas_miembro;
DROP TRIGGER IF EXISTS trg_sync_mark_observaciones ON observaciones;
DROP TRIGGER IF EXISTS trg_sync_mark_grupo_miembro ON grupo_miembro;
DROP TRIGGER IF EXISTS trg_sync_mark_liderazgo ON liderazgo;
DROP TRIGGER IF EXISTS trg_sync_mark_liderazgo_miembro ON liderazgo_miembro;
DROP TRIGGER IF EXISTS trg_sync_mark_ventas ON ventas;
DROP TRIGGER IF EXISTS trg_sync_mark_venta_items ON venta_items;
DROP TRIGGER IF EXISTS trg_sync_mark_cuentas_miembro ON cuentas_miembro;
DROP TRIGGER IF EXISTS trg_sync_mark_movimientos_cuenta ON movimientos_cuenta;
DROP TRIGGER IF EXISTS trg_check_liderazgo_limits ON liderazgo_miembro;
DROP TRIGGER IF EXISTS trg_movimientos_update_cuenta ON movimientos_cuenta;
DROP TRIGGER IF EXISTS trg_venta_items_decrement_inventario ON venta_items;
DROP TRIGGER IF EXISTS trg_miembros_search_vector ON miembros;

-- PASO 2.6: Eliminar POLÍTICAS RLS que dependen de las funciones
-- Políticas de ventas
DROP POLICY IF EXISTS ventas_admin_read ON ventas;
DROP POLICY IF EXISTS ventas_admin_write_insert ON ventas;
DROP POLICY IF EXISTS ventas_admin_write_update ON ventas;
DROP POLICY IF EXISTS ventas_admin_write_delete ON ventas;

-- Políticas de cuentas_miembro
DROP POLICY IF EXISTS cuentas_admin_read ON cuentas_miembro;
DROP POLICY IF EXISTS cuentas_admin_write_insert ON cuentas_miembro;
DROP POLICY IF EXISTS cuentas_admin_write_update ON cuentas_miembro;
DROP POLICY IF EXISTS cuentas_admin_write_delete ON cuentas_miembro;

-- Políticas de movimientos_cuenta
DROP POLICY IF EXISTS movimientos_admin_read ON movimientos_cuenta;
DROP POLICY IF EXISTS movimientos_admin_write_insert ON movimientos_cuenta;
DROP POLICY IF EXISTS movimientos_admin_write_update ON movimientos_cuenta;
DROP POLICY IF EXISTS movimientos_admin_write_delete ON movimientos_cuenta;

-- Políticas de observaciones
DROP POLICY IF EXISTS observaciones_admin_read ON observaciones;
DROP POLICY IF EXISTS observaciones_admin_write_insert ON observaciones;
DROP POLICY IF EXISTS observaciones_admin_write_update ON observaciones;
DROP POLICY IF EXISTS observaciones_admin_write_delete ON observaciones;

-- Políticas de miembros
DROP POLICY IF EXISTS miembros_public_read ON miembros;
DROP POLICY IF EXISTS miembros_admin_full ON miembros;
DROP POLICY IF EXISTS miembros_self ON miembros;

-- Políticas de usuarios_temporales
DROP POLICY IF EXISTS usuarios_temp_admin ON usuarios_temporales;

-- PASO 3: Cambiar DEFAULT de columnas que usan uuid_generate_v4()
-- Primero quitar los defaults que generan UUIDs automáticamente
ALTER TABLE miembros ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE grupos ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE app_users ALTER COLUMN uid DROP DEFAULT;
ALTER TABLE fechas_miembro ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE observaciones ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE grupo_miembro ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE liderazgo ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE liderazgo_miembro ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE categorias_producto ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE productos ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE inventario ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE caja_shift ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE usuarios_temporales ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE ventas ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE venta_items ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE pagos_venta ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE cuentas_miembro ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE movimientos_cuenta ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE tipo_miembro ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE bautismo ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE audit_logs ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE conflicts ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE file_meta ALTER COLUMN uuid DROP DEFAULT;
ALTER TABLE invite_links ALTER COLUMN token DROP DEFAULT;

-- PASO 4: Convertir las tablas PRINCIPALES primero (las que son referenciadas)
-- Orden: primero las que NO tienen dependencias externas

-- Catálogos base (no tienen FKs salientes)
ALTER TABLE tipo_miembro ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE bautismo ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE categorias_producto ALTER COLUMN uuid TYPE text USING uuid::text;

-- Grupos (no depende de otras tablas de negocio)
ALTER TABLE grupos ALTER COLUMN uuid TYPE text USING uuid::text;

-- Miembros (tabla central, muchas otras dependen de ella)
ALTER TABLE miembros ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE miembros ALTER COLUMN created_by TYPE text USING created_by::text;
ALTER TABLE miembros ALTER COLUMN updated_by TYPE text USING updated_by::text;

-- App users (usuarios de autenticación)
ALTER TABLE app_users ALTER COLUMN uid TYPE text USING uid::text;
ALTER TABLE app_users ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;
ALTER TABLE app_users ALTER COLUMN created_by TYPE text USING created_by::text;

-- Usuarios temporales (para ventas)
ALTER TABLE usuarios_temporales ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE usuarios_temporales ALTER COLUMN creado_por_uuid TYPE text USING creado_por_uuid::text;

-- Caja shift (para ventas)
ALTER TABLE caja_shift ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE caja_shift ALTER COLUMN apertura_por TYPE text USING apertura_por::text;
ALTER TABLE caja_shift ALTER COLUMN cierre_por TYPE text USING cierre_por::text;

-- Productos (depende de categorias_producto)
ALTER TABLE productos ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE productos ALTER COLUMN categoria_uuid TYPE text USING categoria_uuid::text;

-- Inventario (depende de productos)
ALTER TABLE inventario ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE inventario ALTER COLUMN producto_uuid TYPE text USING producto_uuid::text;

-- PASO 5: Convertir tablas que tienen FK a miembros
-- Ahora que miembros.uuid ya es TEXT, podemos convertir las columnas que lo referencian

ALTER TABLE fechas_miembro ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE fechas_miembro ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;

ALTER TABLE observaciones ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE observaciones ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;
ALTER TABLE observaciones ALTER COLUMN autor_uuid TYPE text USING autor_uuid::text;

ALTER TABLE grupo_miembro ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE grupo_miembro ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;
ALTER TABLE grupo_miembro ALTER COLUMN grupo_uuid TYPE text USING grupo_uuid::text;

ALTER TABLE cuentas_miembro ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE cuentas_miembro ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;

-- Liderazgo (depende de grupos)
ALTER TABLE liderazgo ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE liderazgo ALTER COLUMN grupo_uuid TYPE text USING grupo_uuid::text;

ALTER TABLE liderazgo_miembro ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE liderazgo_miembro ALTER COLUMN liderazgo_uuid TYPE text USING liderazgo_uuid::text;
ALTER TABLE liderazgo_miembro ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;

-- Ventas (depende de miembros, shift, vendedor)
ALTER TABLE ventas ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE ventas ALTER COLUMN shift_uuid TYPE text USING shift_uuid::text;
ALTER TABLE ventas ALTER COLUMN vendedor_uuid TYPE text USING vendedor_uuid::text;
ALTER TABLE ventas ALTER COLUMN miembro_uuid TYPE text USING miembro_uuid::text;

-- Venta items (depende de ventas y productos)
ALTER TABLE venta_items ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE venta_items ALTER COLUMN venta_uuid TYPE text USING venta_uuid::text;
ALTER TABLE venta_items ALTER COLUMN producto_uuid TYPE text USING producto_uuid::text;

-- Pagos de venta (depende de ventas)
ALTER TABLE pagos_venta ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE pagos_venta ALTER COLUMN venta_uuid TYPE text USING venta_uuid::text;
ALTER TABLE pagos_venta ALTER COLUMN recibido_por_uuid TYPE text USING recibido_por_uuid::text;

-- Movimientos de cuenta (depende de cuentas_miembro y ventas)
ALTER TABLE movimientos_cuenta ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE movimientos_cuenta ALTER COLUMN cuenta_uuid TYPE text USING cuenta_uuid::text;
ALTER TABLE movimientos_cuenta ALTER COLUMN venta_uuid TYPE text USING venta_uuid::text;
ALTER TABLE movimientos_cuenta ALTER COLUMN created_by_uuid TYPE text USING created_by_uuid::text;

-- PASO 6: Convertir tablas auxiliares (auditoría, conflictos, etc.)
-- Cambiar UUIDs en tablas de auditoría y metadata
ALTER TABLE audit_logs ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE audit_logs ALTER COLUMN entidad_uuid TYPE text USING entidad_uuid::text;
ALTER TABLE audit_logs ALTER COLUMN actor_uuid TYPE text USING actor_uuid::text;

ALTER TABLE conflicts ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE conflicts ALTER COLUMN entidad_uuid TYPE text USING entidad_uuid::text;
ALTER TABLE conflicts ALTER COLUMN resuelto_por TYPE text USING resuelto_por::text;

ALTER TABLE file_meta ALTER COLUMN uuid TYPE text USING uuid::text;
ALTER TABLE file_meta ALTER COLUMN entity_uuid TYPE text USING entity_uuid::text;
ALTER TABLE file_meta ALTER COLUMN uploaded_by TYPE text USING uploaded_by::text;

-- Cambiar UUIDs en tablas de invitación
ALTER TABLE invite_links ALTER COLUMN token TYPE text USING token::text;
ALTER TABLE invite_links ALTER COLUMN created_by TYPE text USING created_by::text;
ALTER TABLE invite_links ALTER COLUMN used_by TYPE text USING used_by::text;

-- Cambiar shift_counters
ALTER TABLE shift_counters ALTER COLUMN shift_uuid TYPE text USING shift_uuid::text;

-- Cambiar legacy_id_map
ALTER TABLE legacy_id_map ALTER COLUMN new_uuid TYPE text USING new_uuid::text;

-- PASO 7: VALIDACIÓN INTERMEDIA - Verificar que TODAS las columnas relevantes son TEXT
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('miembros', 'cuentas_miembro', 'fechas_miembro', 'app_users')
    AND column_name IN ('uuid', 'uid', 'miembro_uuid')
    AND data_type != 'text';
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERROR: Aún existen % columnas que no son TEXT. Abortando migración.', v_count;
  END IF;
  
  RAISE NOTICE 'VALIDACIÓN OK: Todas las columnas críticas son TEXT';
END $$;

-- PASO 8: Recrear las FK constraints con tipo TEXT (ahora ambas columnas son TEXT)
-- Orden: primero las FKs base, luego las que dependen de ellas

-- FKs de grupos
ALTER TABLE grupo_miembro 
  ADD CONSTRAINT grupo_miembro_grupo_uuid_fkey 
  FOREIGN KEY (grupo_uuid) REFERENCES grupos(uuid) ON DELETE CASCADE;

ALTER TABLE grupo_miembro 
  ADD CONSTRAINT grupo_miembro_miembro_uuid_fkey 
  FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid) ON DELETE CASCADE;

-- FKs de miembros (las más importantes)
ALTER TABLE fechas_miembro 
  ADD CONSTRAINT fechas_miembro_miembro_uuid_fkey 
  FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid) ON DELETE CASCADE;

ALTER TABLE observaciones 
  ADD CONSTRAINT observaciones_miembro_uuid_fkey 
  FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid) ON DELETE CASCADE;

ALTER TABLE cuentas_miembro 
  ADD CONSTRAINT cuentas_miembro_miembro_uuid_fkey 
  FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid);

-- FKs de liderazgo
ALTER TABLE liderazgo 
  ADD CONSTRAINT liderazgo_grupo_uuid_fkey 
  FOREIGN KEY (grupo_uuid) REFERENCES grupos(uuid) ON DELETE CASCADE;

ALTER TABLE liderazgo_miembro 
  ADD CONSTRAINT liderazgo_miembro_liderazgo_uuid_fkey 
  FOREIGN KEY (liderazgo_uuid) REFERENCES liderazgo(uuid) ON DELETE CASCADE;

ALTER TABLE liderazgo_miembro 
  ADD CONSTRAINT liderazgo_miembro_miembro_uuid_fkey 
  FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid);

-- FKs de productos
ALTER TABLE productos 
  ADD CONSTRAINT productos_categoria_uuid_fkey 
  FOREIGN KEY (categoria_uuid) REFERENCES categorias_producto(uuid);

ALTER TABLE inventario 
  ADD CONSTRAINT inventario_producto_uuid_fkey 
  FOREIGN KEY (producto_uuid) REFERENCES productos(uuid);

-- FKs de ventas (nivel 1)
ALTER TABLE ventas 
  ADD CONSTRAINT ventas_miembro_uuid_fkey 
  FOREIGN KEY (miembro_uuid) REFERENCES miembros(uuid);

ALTER TABLE ventas 
  ADD CONSTRAINT ventas_shift_uuid_fkey 
  FOREIGN KEY (shift_uuid) REFERENCES caja_shift(uuid);

ALTER TABLE ventas 
  ADD CONSTRAINT ventas_vendedor_uuid_fkey 
  FOREIGN KEY (vendedor_uuid) REFERENCES usuarios_temporales(uuid);

-- FKs de ventas (nivel 2)
ALTER TABLE venta_items 
  ADD CONSTRAINT venta_items_venta_uuid_fkey 
  FOREIGN KEY (venta_uuid) REFERENCES ventas(uuid) ON DELETE CASCADE;

ALTER TABLE venta_items 
  ADD CONSTRAINT venta_items_producto_uuid_fkey 
  FOREIGN KEY (producto_uuid) REFERENCES productos(uuid);

ALTER TABLE pagos_venta 
  ADD CONSTRAINT pagos_venta_venta_uuid_fkey 
  FOREIGN KEY (venta_uuid) REFERENCES ventas(uuid) ON DELETE CASCADE;

-- FKs de movimientos de cuenta
ALTER TABLE movimientos_cuenta 
  ADD CONSTRAINT movimientos_cuenta_cuenta_uuid_fkey 
  FOREIGN KEY (cuenta_uuid) REFERENCES cuentas_miembro(uuid) ON DELETE CASCADE;

-- PASO 9: Recrear las vistas con el nuevo tipo TEXT
CREATE OR REPLACE VIEW vw_member_account_summary AS
SELECT
  m.uuid as miembro_uuid,
  m.nombres || ' ' || m.apellidos AS nombre,
  coalesce(c.saldo_deudor,0) AS saldo_deudor,
  coalesce(c.saldo_acumulado,0) AS saldo_acumulado,
  coalesce(c.limite_credito,0) AS limite_credito,
  ( SELECT jsonb_agg(item) FROM ( SELECT jsonb_build_object( 'fecha', mv.fecha, 'tipo', mv.tipo, 'monto', mv.monto, 'descripcion', mv.descripcion ) AS item FROM movimientos_cuenta mv WHERE mv.cuenta_uuid = c.uuid ORDER BY mv.fecha DESC LIMIT 5 ) t ) AS ultimos_movimientos
FROM miembros m
LEFT JOIN cuentas_miembro c ON c.miembro_uuid = m.uuid;

CREATE OR REPLACE VIEW vw_leadership_gaps AS
SELECT
  g.uuid as grupo_uuid,
  g.nombre as grupo,
  COALESCE(l.uuid, NULL) AS liderazgo_uuid,
  COALESCE(leader_count.count,0) AS leader_count,
  COALESCE(sub_count.count,0) AS subleader_count
FROM grupos g
LEFT JOIN liderazgo l ON l.grupo_uuid = g.uuid AND l.estado = 'activo'
LEFT JOIN (
  SELECT liderazgo_uuid, count(*) AS count FROM liderazgo_miembro WHERE rol = 'leader' AND is_deleted = false GROUP BY liderazgo_uuid
) leader_count ON leader_count.liderazgo_uuid = l.uuid
LEFT JOIN (
  SELECT liderazgo_uuid, count(*) AS count FROM liderazgo_miembro WHERE rol = 'subleader' AND is_deleted = false GROUP BY liderazgo_uuid
) sub_count ON sub_count.liderazgo_uuid = l.uuid;

-- PASO 10: Actualizar las funciones que usan UUID para que usen TEXT

-- Función fn_get_current_actor()
DROP FUNCTION IF EXISTS fn_get_current_actor();
CREATE OR REPLACE FUNCTION fn_get_current_actor() RETURNS text AS $$
DECLARE
  v text;
BEGIN
  v := current_setting('app.current_actor', true);
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  RETURN v;
END;
$$ LANGUAGE plpgsql;

-- Actualizar función fn_is_role
DROP FUNCTION IF EXISTS fn_is_role(text);
CREATE OR REPLACE FUNCTION fn_is_role(p_role text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM app_users au WHERE au.uid = auth.uid()::text AND au.role = p_role AND au.active = true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Actualizar función fn_is_any_role
DROP FUNCTION IF EXISTS fn_is_any_role(text[]);
CREATE OR REPLACE FUNCTION fn_is_any_role(roles text[]) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM app_users au WHERE au.uid = auth.uid()::text AND au.role = ANY(roles) AND au.active = true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Actualizar función fn_mark_synced
DROP FUNCTION IF EXISTS fn_mark_synced(text, uuid);
CREATE OR REPLACE FUNCTION fn_mark_synced(p_table text, p_uuid text) RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET needs_sync = false WHERE uuid = %L', p_table, p_uuid);
END;
$$ LANGUAGE plpgsql;

-- Actualizar función fn_consume_invite
DROP FUNCTION IF EXISTS fn_consume_invite(uuid, uuid, text);
CREATE OR REPLACE FUNCTION fn_consume_invite(p_token text, p_auth_uid text, p_auth_email text) RETURNS text AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM invite_links WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'INVITE_NOT_FOUND';
  END IF;
  IF r.used = true OR r.revoked = true THEN
    RETURN 'INVITE_ALREADY_USED_OR_REVOKED';
  END IF;
  IF r.expires_at < now() THEN
    RETURN 'INVITE_EXPIRED';
  END IF;
  IF r.email IS NOT NULL AND lower(r.email) <> lower(p_auth_email) THEN
    RETURN 'EMAIL_MISMATCH';
  END IF;

  INSERT INTO app_users (uid, role, created_by, created_at)
  VALUES (p_auth_uid, r.role, r.created_by, now())
  ON CONFLICT (uid) DO UPDATE SET role = EXCLUDED.role, active = true;

  UPDATE invite_links SET used = true, used_by = p_auth_uid, used_at = now() WHERE id = r.id;

  INSERT INTO audit_logs(entidad, entidad_uuid, accion, datos_previos, datos_nuevos, actor_uuid, created_at)
    VALUES ('invite_links', r.token, 'CONSUME_INVITE', to_jsonb(r.*), jsonb_build_object('used', true, 'used_by', p_auth_uid), p_auth_uid, now());

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar función create_sale para usar text en lugar de uuid
DROP FUNCTION IF EXISTS create_sale(jsonb, uuid);
CREATE OR REPLACE FUNCTION create_sale(p_payload jsonb, p_actor_uuid text) RETURNS TABLE (venta_uuid text) AS $$
DECLARE
  v_total numeric(12,2) := 0;
  v_sub numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_desc_total numeric(12,2) := 0;
  v_v_uuid text;
  v_item jsonb;
  v_prod_uuid text;
  v_cantidad numeric;
  v_precio numeric;
  v_desc numeric;
  v_mv_uuid text;
  v_cuenta_uuid text;
BEGIN
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'Payload vacio';
  END IF;

  v_sub := 0;
  v_desc_total := 0;

  INSERT INTO ventas (client_ticket_id, shift_uuid, vendedor_uuid, tipo, miembro_uuid, is_fiado, subtotal, impuesto, descuento_total, total, estado, pago_estado, created_at, updated_at)
  VALUES (
    p_payload->>'client_ticket_id',
    (p_payload->>'shift_uuid')::text,
    (p_payload->>'vendedor_uuid')::text,
    p_payload->>'tipo',
    CASE WHEN (p_payload->>'miembro_uuid') IS NOT NULL THEN (p_payload->>'miembro_uuid')::text ELSE NULL END,
    (p_payload->>'is_fiado')::boolean,
    0, 0, 0, 0, 'abierta', 'sin_pago', now(), now()
  )
  RETURNING uuid INTO v_v_uuid;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'items','[]'::jsonb))
  LOOP
    v_prod_uuid := (v_item->>'producto_uuid')::text;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio := (v_item->>'precio_unitario')::numeric;
    v_desc := COALESCE((v_item->>'descuento')::numeric, 0);

    INSERT INTO venta_items (venta_uuid, producto_uuid, cantidad, precio_unitario, descuento, total_item, created_at, updated_at)
    VALUES (v_v_uuid, v_prod_uuid, v_cantidad, v_precio, v_desc, (v_precio * v_cantidad) - v_desc, now(), now());

    v_sub := v_sub + ((v_precio * v_cantidad) - v_desc);
    v_desc_total := v_desc_total + v_desc;

    UPDATE inventario SET cantidad_actual = cantidad_actual - v_cantidad, updated_at = now(), needs_sync = true
    WHERE producto_uuid = v_prod_uuid;
  END LOOP;

  v_tax := 0;
  v_total := v_sub + v_tax;

  UPDATE ventas SET subtotal = v_sub, impuesto = v_tax, descuento_total = v_desc_total, total = v_total, estado = 'cerrada' WHERE uuid = v_v_uuid;

  IF jsonb_typeof(p_payload->'pagos') = 'array' THEN
    FOREACH v_item IN ARRAY (SELECT jsonb_array_elements(COALESCE(p_payload->'pagos','[]'::jsonb))) LOOP
      INSERT INTO pagos_venta (venta_uuid, metodo, monto, referencia, fecha, recibido_por_uuid, created_at, updated_at)
      VALUES (v_v_uuid,
              v_item->>'metodo',
              (v_item->>'monto')::numeric,
              v_item->>'referencia',
              now(),
              p_actor_uuid,
              now(), now());
    END LOOP;
  END IF;

  IF (p_payload->>'is_fiado')::boolean = true THEN
    SELECT uuid INTO v_cuenta_uuid FROM cuentas_miembro WHERE miembro_uuid = (p_payload->>'miembro_uuid')::text;
    IF NOT FOUND THEN
      INSERT INTO cuentas_miembro (miembro_uuid, saldo_deudor, saldo_acumulado, limite_credito, created_at, updated_at)
      VALUES ((p_payload->>'miembro_uuid')::text, v_total, v_total, 0, now(), now())
      RETURNING uuid INTO v_cuenta_uuid;
    ELSE
      UPDATE cuentas_miembro SET
        saldo_deudor = coalesce(saldo_deudor,0) + v_total,
        saldo_acumulado = coalesce(saldo_acumulado,0) + v_total,
        updated_at = now()
      WHERE uuid = v_cuenta_uuid;
    END IF;

    INSERT INTO movimientos_cuenta (cuenta_uuid, venta_uuid, tipo, monto, fecha, descripcion, created_by_uuid, created_at, updated_at)
    VALUES (v_cuenta_uuid, v_v_uuid, 'cargo', v_total, now(), 'Cargo por venta fiada', p_actor_uuid, now(), now());
  END IF;

  UPDATE ventas SET pago_estado = CASE
    WHEN (SELECT SUM(monto) FROM pagos_venta WHERE venta_uuid = v_v_uuid) >= total THEN 'pagado'
    WHEN (SELECT SUM(monto) FROM pagos_venta WHERE venta_uuid = v_v_uuid) > 0 THEN 'parcial'
    ELSE 'sin_pago' END
  WHERE uuid = v_v_uuid;

  venta_uuid := v_v_uuid;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 11: Insertar primer usuario administrador con Firebase UID
INSERT INTO miembros (uuid, email, nombres, apellidos, documento)
VALUES ('8SlWCfYunQgOshySA18GnFZrAjB3', 'juanblandon975@gmail.com', 'Juan', 'Cardona', '1113858851')
ON CONFLICT (uuid) DO NOTHING;

INSERT INTO app_users (uid, role, active, miembro_uuid)
VALUES ('8SlWCfYunQgOshySA18GnFZrAjB3', 'admin', true, '8SlWCfYunQgOshySA18GnFZrAjB3')
ON CONFLICT (uid) DO NOTHING;

-- PASO 12: Recrear TRIGGERS con los nuevos tipos TEXT
-- Trigger para asignar número de ticket automáticamente
CREATE TRIGGER trg_ventas_set_ticket
  BEFORE INSERT ON ventas
  FOR EACH ROW
  WHEN (NEW.shift_uuid IS NOT NULL)
  EXECUTE FUNCTION trg_set_ticket_number();

-- Triggers de auditoría
CREATE TRIGGER trg_audit_miembros 
  AFTER INSERT OR UPDATE OR DELETE ON miembros 
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

CREATE TRIGGER trg_audit_grupos 
  AFTER INSERT OR UPDATE OR DELETE ON grupos 
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

CREATE TRIGGER trg_audit_liderazgo 
  AFTER INSERT OR UPDATE OR DELETE ON liderazgo 
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

CREATE TRIGGER trg_audit_ventas 
  AFTER INSERT OR UPDATE OR DELETE ON ventas 
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

CREATE TRIGGER trg_audit_movimientos 
  AFTER INSERT OR UPDATE OR DELETE ON movimientos_cuenta 
  FOR EACH ROW EXECUTE FUNCTION fn_audit_changes();

-- Triggers de sincronización (marcar needs_sync = true)
CREATE TRIGGER trg_sync_mark_miembros 
  BEFORE INSERT OR UPDATE ON miembros 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_grupos 
  BEFORE INSERT OR UPDATE ON grupos 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_fechas_miembro 
  BEFORE INSERT OR UPDATE ON fechas_miembro 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_observaciones 
  BEFORE INSERT OR UPDATE ON observaciones 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_grupo_miembro 
  BEFORE INSERT OR UPDATE ON grupo_miembro 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_liderazgo 
  BEFORE INSERT OR UPDATE ON liderazgo 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_liderazgo_miembro 
  BEFORE INSERT OR UPDATE ON liderazgo_miembro 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_ventas 
  BEFORE INSERT OR UPDATE ON ventas 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_venta_items 
  BEFORE INSERT OR UPDATE ON venta_items 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_cuentas_miembro 
  BEFORE INSERT OR UPDATE ON cuentas_miembro 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

CREATE TRIGGER trg_sync_mark_movimientos_cuenta 
  BEFORE INSERT OR UPDATE ON movimientos_cuenta 
  FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();

-- Trigger para validar límites de liderazgo
CREATE TRIGGER trg_check_liderazgo_limits
  BEFORE INSERT OR UPDATE ON liderazgo_miembro
  FOR EACH ROW EXECUTE FUNCTION fn_check_liderazgo_limits();

-- Trigger para actualizar cuenta cuando hay movimiento
CREATE TRIGGER trg_movimientos_update_cuenta
  AFTER INSERT ON movimientos_cuenta
  FOR EACH ROW EXECUTE FUNCTION fn_update_cuenta_on_movimiento();

-- Trigger para descontar inventario
CREATE TRIGGER trg_venta_items_decrement_inventario
  AFTER INSERT ON venta_items
  FOR EACH ROW EXECUTE FUNCTION fn_decrement_inventario_on_item();

-- Trigger para actualizar search_vector en miembros
CREATE TRIGGER trg_miembros_search_vector
  BEFORE INSERT OR UPDATE ON miembros
  FOR EACH ROW EXECUTE FUNCTION fn_miembros_update_search_vector();

-- PASO 13: Recrear POLÍTICAS RLS con los nuevos tipos TEXT
-- Políticas para miembros
CREATE POLICY miembros_public_read ON miembros
  FOR SELECT
  USING ( public_profile = true );

CREATE POLICY miembros_admin_full ON miembros
  FOR ALL
  USING (
    fn_is_any_role(ARRAY['admin','pastor','secretaria','ti'])
  );

CREATE POLICY miembros_self ON miembros
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM app_users au WHERE au.uid = auth.uid()::text AND au.miembro_uuid = miembros.uuid)
  );

-- Políticas para ventas
CREATE POLICY ventas_admin_read ON ventas
  FOR SELECT
  USING (
    fn_is_any_role(ARRAY['admin','pastor','secretaria','ti'])
  );

CREATE POLICY ventas_admin_write_insert ON ventas
  FOR INSERT
  WITH CHECK (
    fn_is_any_role(ARRAY['admin','ti'])
  );

CREATE POLICY ventas_admin_write_update ON ventas
  FOR UPDATE
  USING (
    fn_is_any_role(ARRAY['admin','ti'])
  )
  WITH CHECK (
    fn_is_any_role(ARRAY['admin','ti'])
  );

CREATE POLICY ventas_admin_write_delete ON ventas
  FOR DELETE
  USING (
    fn_is_any_role(ARRAY['admin','ti'])
  );

-- Políticas para cuentas_miembro
CREATE POLICY cuentas_admin_read ON cuentas_miembro
  FOR SELECT
  USING (
    fn_is_any_role(ARRAY['admin','pastor','secretaria','ti'])
  );

CREATE POLICY cuentas_admin_write_insert ON cuentas_miembro
  FOR INSERT
  WITH CHECK (
    fn_is_any_role(ARRAY['admin','ti'])
  );

CREATE POLICY cuentas_admin_write_update ON cuentas_miembro
  FOR UPDATE
  USING (
    fn_is_any_role(ARRAY['admin','ti'])
  )
  WITH CHECK (
    fn_is_any_role(ARRAY['admin','ti'])
  );

CREATE POLICY cuentas_admin_write_delete ON cuentas_miembro
  FOR DELETE
  USING (
    fn_is_any_role(ARRAY['admin','ti'])
  );

-- Políticas para movimientos_cuenta
CREATE POLICY movimientos_admin_read ON movimientos_cuenta
  FOR SELECT
  USING ( fn_is_any_role(ARRAY['admin','pastor','secretaria','ti']) );

CREATE POLICY movimientos_admin_write_insert ON movimientos_cuenta
  FOR INSERT
  WITH CHECK ( fn_is_any_role(ARRAY['admin','ti']) );

CREATE POLICY movimientos_admin_write_update ON movimientos_cuenta
  FOR UPDATE
  USING ( fn_is_any_role(ARRAY['admin','ti']) )
  WITH CHECK ( fn_is_any_role(ARRAY['admin','ti']) );

CREATE POLICY movimientos_admin_write_delete ON movimientos_cuenta
  FOR DELETE
  USING ( fn_is_any_role(ARRAY['admin','ti']) );

-- Políticas para observaciones
CREATE POLICY observaciones_admin_read ON observaciones
  FOR SELECT
  USING ( fn_is_any_role(ARRAY['admin','pastor','secretaria','ti']) );

CREATE POLICY observaciones_admin_write_insert ON observaciones
  FOR INSERT
  WITH CHECK ( fn_is_any_role(ARRAY['admin','pastor','secretaria','ti']) );

CREATE POLICY observaciones_admin_write_update ON observaciones
  FOR UPDATE
  USING ( fn_is_any_role(ARRAY['admin','pastor','secretaria','ti']) )
  WITH CHECK ( fn_is_any_role(ARRAY['admin','pastor','secretaria','ti']) );

CREATE POLICY observaciones_admin_write_delete ON observaciones
  FOR DELETE
  USING ( fn_is_any_role(ARRAY['admin','pastor','secretaria','ti']) );

-- Políticas para usuarios_temporales
CREATE POLICY usuarios_temp_admin ON usuarios_temporales
  FOR ALL
  USING ( fn_is_any_role(ARRAY['admin','ti']) );

COMMIT;

-- Verificar que las columnas ahora son TEXT
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name LIKE '%uuid%' 
  AND table_name IN ('miembros', 'app_users', 'fechas_miembro', 'observaciones', 'grupo_miembro', 'cuentas_miembro')
ORDER BY table_name, column_name;

-- Verificar que el usuario admin fue creado
SELECT 'Usuario administrador:', * FROM app_users WHERE uid = '8SlWCfYunQgOshySA18GnFZrAjB3';
SELECT 'Miembro:', * FROM miembros WHERE uuid = '8SlWCfYunQgOshySA18GnFZrAjB3';
