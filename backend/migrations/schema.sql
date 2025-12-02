-- ====================================================================================
-- DDL COMPLETO: Supabase / PostgreSQL
-- Incluye: tablas principales, triggers, funciones, RLS policies, vistas e índices
-- Ejecutar en Supabase SQL editor (Postgres 13+). Revisar comentarios y adaptar si hace falta.
-- ====================================================================================

-- 0) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- opcional, para búsquedas fuzzy
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- para índices GIN compuestos
CREATE EXTENSION IF NOT EXISTS "citext";       -- case-insensitive text

-- ====================================================================================
-- 1) Tablas soporte: sync_meta, audit_logs, conflicts, legacy_id_map, sync_jobs, file_meta
-- ====================================================================================

CREATE TABLE IF NOT EXISTS sync_meta (
  id serial PRIMARY KEY,
  device_id text UNIQUE,
  last_sync_timestamp timestamptz,
  last_sync_seq bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  entidad text NOT NULL,
  entidad_uuid uuid,
  accion text NOT NULL, -- CREATE | UPDATE | DELETE | ANULAR | CONSUME_INVITE | REVOKE_INVITE ...
  datos_previos jsonb,
  datos_nuevos jsonb,
  actor_uuid uuid,
  motivo text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_entidad ON audit_logs (entidad, entidad_uuid);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON audit_logs (actor_uuid);

CREATE TABLE IF NOT EXISTS conflicts (
  id bigserial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  entidad text NOT NULL,
  entidad_uuid uuid NOT NULL,
  device_id text,
  client_version integer,
  server_version integer,
  client_payload jsonb,
  server_payload jsonb,
  estado text DEFAULT 'pendiente', -- pendiente,resuelto,ignorado
  creado_en timestamptz DEFAULT now(),
  resuelto_en timestamptz,
  resuelto_por uuid
);
CREATE INDEX IF NOT EXISTS ix_conflict_entidad ON conflicts (entidad, entidad_uuid);
CREATE INDEX IF NOT EXISTS ix_conflict_estado ON conflicts (estado);

-- Mapa de IDs legacy (útil para migración)
CREATE TABLE IF NOT EXISTS legacy_id_map (
  id serial PRIMARY KEY,
  tabla_origen text NOT NULL,
  old_id text NOT NULL,
  new_uuid uuid NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_legacy_map_origen ON legacy_id_map(tabla_origen, old_id);

-- Jobs de sincronización (histórico)
CREATE TABLE IF NOT EXISTS sync_jobs (
  id bigserial PRIMARY KEY,
  device_id text,
  job_type text, -- push|pull
  status text, -- pending|success|failed
  records_processed integer,
  error jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_sync_jobs_device ON sync_jobs(device_id);

-- Metadatos de archivos subidos (si quieres control adicional sobre Storage)
CREATE TABLE IF NOT EXISTS file_meta (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  entity text,          -- p.ej. 'miembros'
  entity_uuid uuid,
  bucket text,
  path text,            -- ruta en storage
  filename text,
  mime text,
  size_bytes bigint,
  privacy text DEFAULT 'private', -- private|public
  checksum text,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_file_meta_entity ON file_meta(entity, entity_uuid);

-- ====================================================================================
-- 2) App users & invites (roles mapping + invitation links)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS app_users (
  id serial PRIMARY KEY,
  uid uuid UNIQUE,            -- auth.users.id (auth.uid())
  role text NOT NULL,         -- admin, pastor, secretaria, ti, restaurante
  miembro_uuid uuid NULL,     -- vinculo opcional a tabla miembros
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid NULL
);
CREATE INDEX IF NOT EXISTS ix_app_users_uid ON app_users(uid);

CREATE TABLE IF NOT EXISTS invite_links (
  id serial PRIMARY KEY,
  token uuid DEFAULT uuid_generate_v4() UNIQUE,    -- token seguro en URL
  role text NOT NULL,                              -- role propuesto ('pastor','secretaria'...)
  email text NULL,                                 -- opcional: restringe invitación a un correo
  created_by uuid NOT NULL,                        -- admin uid que generó
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_by uuid NULL,                                -- auth.uid() que consumió
  used_at timestamptz NULL,
  revoked boolean DEFAULT false,
  note text NULL
);
CREATE INDEX IF NOT EXISTS ix_invite_token ON invite_links(token);
CREATE INDEX IF NOT EXISTS ix_invite_email ON invite_links(email);

-- ====================================================================================
-- 3) Catálogos y entidades base (grupos, tipo_miembro, bautismo, etc.)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS tipo_miembro (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bautismo (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS grupos (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  nombre text NOT NULL UNIQUE,
  descripcion text,
  tipo text,
  activo boolean DEFAULT true,
  privacidad text DEFAULT 'public', -- 'public'|'private'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_grupos_nombre ON grupos(nombre);

-- ====================================================================================
-- 4) Miembros y tablas relacionadas
-- ====================================================================================

CREATE TABLE IF NOT EXISTS miembros (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  documento text NOT NULL,
  tipo_documento text,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  fecha_nac date,
  foto_url text,
  direccion text,
  telefono text,
  email citext,
  genero text,
  lugar_nac text,
  llamado text,
  otra_iglesia boolean DEFAULT false,
  notas text,
  public_profile boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_miembros_documento_lower ON miembros (lower(documento));
CREATE INDEX IF NOT EXISTS ix_miembros_uuid ON miembros(uuid);
CREATE INDEX IF NOT EXISTS ix_miembros_documento ON miembros(documento);

-- full-text search vector column for members (nombres + apellidos)
ALTER TABLE miembros
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- trigger to update search_vector (will create function later)
CREATE INDEX IF NOT EXISTS idx_miembros_search_vector ON miembros USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS fechas_miembro (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  miembro_uuid uuid REFERENCES miembros(uuid) ON DELETE CASCADE,
  fecha_nac date,
  fecha_bautismo date,
  fecha_ingreso date,
  fecha_conversion date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_fechas_miembro_miembro ON fechas_miembro(miembro_uuid);

CREATE TABLE IF NOT EXISTS observaciones (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  miembro_uuid uuid REFERENCES miembros(uuid) ON DELETE CASCADE,
  texto text NOT NULL,
  autor_uuid uuid,
  fecha timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_observaciones_miembro ON observaciones(miembro_uuid);

CREATE TABLE IF NOT EXISTS grupo_miembro (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  miembro_uuid uuid REFERENCES miembros(uuid) ON DELETE CASCADE,
  grupo_uuid uuid REFERENCES grupos(uuid) ON DELETE CASCADE,
  rol_en_grupo text,
  fecha_ingreso date,
  fecha_salida date,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1,
  CONSTRAINT ux_grupo_miembro UNIQUE(miembro_uuid, grupo_uuid)
);
CREATE INDEX IF NOT EXISTS ix_grupo_miembro_grupo ON grupo_miembro(grupo_uuid);
CREATE INDEX IF NOT EXISTS ix_grupo_miembro_miembro ON grupo_miembro(miembro_uuid);

-- ====================================================================================
-- 5) Liderazgos
-- ====================================================================================

CREATE TABLE IF NOT EXISTS liderazgo (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  grupo_uuid uuid REFERENCES grupos(uuid) ON DELETE CASCADE,
  nombre_periodo text,
  fecha_inicio date,
  fecha_fin date,
  estado text DEFAULT 'activo', -- activo|cerrado
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_liderazgo_grupo_estado ON liderazgo(grupo_uuid, estado);

CREATE TABLE IF NOT EXISTS liderazgo_miembro (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  liderazgo_uuid uuid REFERENCES liderazgo(uuid) ON DELETE CASCADE,
  miembro_uuid uuid REFERENCES miembros(uuid),
  rol text NOT NULL, -- 'leader'|'subleader'
  orden smallint,
  fecha_asignacion date DEFAULT now(),
  fecha_remocion date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1,
  CONSTRAINT ux_liderazgo_miembro UNIQUE(liderazgo_uuid, miembro_uuid)
);
CREATE INDEX IF NOT EXISTS ix_liderazgo_miembro_liderazgo ON liderazgo_miembro(liderazgo_uuid);
CREATE INDEX IF NOT EXISTS ix_liderazgo_miembro_miembro ON liderazgo_miembro(miembro_uuid);

-- Trigger para validar maximos por liderazgo (1 leader y max 4 subleaders)
CREATE OR REPLACE FUNCTION fn_check_liderazgo_limits() RETURNS trigger AS $$
DECLARE
  cnt_leader int;
  cnt_sub int;
BEGIN
  SELECT COUNT(*) INTO cnt_leader FROM liderazgo_miembro
    WHERE liderazgo_uuid = NEW.liderazgo_uuid
      AND rol = 'leader'
      AND is_deleted = false;
  SELECT COUNT(*) INTO cnt_sub FROM liderazgo_miembro
    WHERE liderazgo_uuid = NEW.liderazgo_uuid
      AND rol = 'subleader'
      AND is_deleted = false;

  IF (TG_OP = 'INSERT') THEN
    IF (NEW.rol = 'leader' AND cnt_leader >= 1) THEN
      RAISE EXCEPTION 'Ya existe un leader asignado para este liderazgo (solo 1 permitido).';
    ELSIF (NEW.rol = 'subleader' AND cnt_sub >= 4) THEN
      RAISE EXCEPTION 'Ya existen 4 subleaders asignados para este liderazgo (max 4).';
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Después del update validar conteos
    SELECT COUNT(*) INTO cnt_leader FROM liderazgo_miembro
      WHERE liderazgo_uuid = NEW.liderazgo_uuid
        AND rol = 'leader'
        AND is_deleted = false;
    SELECT COUNT(*) INTO cnt_sub FROM liderazgo_miembro
      WHERE liderazgo_uuid = NEW.liderazgo_uuid
        AND rol = 'subleader'
        AND is_deleted = false;
    IF cnt_leader > 1 THEN
      RAISE EXCEPTION 'Constraint violated: más de 1 leader en el liderazgo.';
    END IF;
    IF cnt_sub > 4 THEN
      RAISE EXCEPTION 'Constraint violated: más de 4 subleaders en el liderazgo.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_liderazgo_limits' AND tgrelid = 'liderazgo_miembro'::regclass) THEN
    CREATE TRIGGER trg_check_liderazgo_limits
      BEFORE INSERT OR UPDATE ON liderazgo_miembro
      FOR EACH ROW EXECUTE FUNCTION fn_check_liderazgo_limits();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Trigger ya existe o error: %', SQLERRM;
END;
$$;

-- ====================================================================================
-- 6) POS: categorias, productos, inventario
-- ====================================================================================

CREATE TABLE IF NOT EXISTS categorias_producto (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  nombre text NOT NULL,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);

CREATE TABLE IF NOT EXISTS productos (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  codigo text UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  categoria_uuid uuid REFERENCES categorias_producto(uuid),
  favorito boolean DEFAULT false,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS ix_productos_codigo ON productos(codigo);

CREATE TABLE IF NOT EXISTS inventario (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  producto_uuid uuid REFERENCES productos(uuid),
  cantidad_actual numeric(12,3) DEFAULT 0,
  ubicacion text,
  updated_at timestamptz DEFAULT now(),
  needs_sync boolean DEFAULT true
);
CREATE INDEX IF NOT EXISTS ix_inventario_producto ON inventario(producto_uuid);

-- ====================================================================================
-- 7) Caja / Shifts / Usuarios temporales
-- ====================================================================================

CREATE TABLE IF NOT EXISTS caja_shift (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  apertura_por uuid,
  apertura_fecha timestamptz DEFAULT now(),
  cierre_por uuid,
  cierre_fecha timestamptz,
  efectivo_inicial numeric(12,2) DEFAULT 0,
  efectivo_recuento numeric(12,2),
  estado text DEFAULT 'abierta', -- abierta|cerrada
  numero_shift integer,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_caja_shift_estado ON caja_shift(estado);

CREATE TABLE IF NOT EXISTS usuarios_temporales (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  username text,
  display_name text,
  pin_hash text, -- almacenar hash (pgcrypto: crypt)
  inicio_validity timestamptz DEFAULT now(),
  fin_validity timestamptz,
  creado_por_uuid uuid,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_usuarios_temp_username ON usuarios_temporales(username);
CREATE INDEX IF NOT EXISTS ix_usuarios_temp_fin_validity ON usuarios_temporales(fin_validity);

-- ====================================================================================
-- 8) Ventas, items y pagos
-- ====================================================================================

CREATE TABLE IF NOT EXISTS ventas (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  client_ticket_id text, -- idempotency key desde cliente
  numero_ticket integer,
  shift_uuid uuid REFERENCES caja_shift(uuid),
  vendedor_uuid uuid REFERENCES usuarios_temporales(uuid),
  fecha_hora timestamptz DEFAULT now(),
  subtotal numeric(12,2) DEFAULT 0,
  impuesto numeric(12,2) DEFAULT 0,
  descuento_total numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  tipo text, -- 'mostrador','mesa','takeaway'
  miembro_uuid uuid REFERENCES miembros(uuid),
  is_fiado boolean DEFAULT false,
  estado text DEFAULT 'cerrada', -- 'abierta','cerrada','cancelada'
  pago_estado text DEFAULT 'pagado', -- 'sin_pago','parcial','pagado'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_ventas_shift ON ventas(shift_uuid);
CREATE INDEX IF NOT EXISTS ix_ventas_vendedor ON ventas(vendedor_uuid);
CREATE INDEX IF NOT EXISTS ix_ventas_miembro ON ventas(miembro_uuid);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_client_ticket_shift_vendedor
  ON ventas (client_ticket_id, vendedor_uuid, shift_uuid)
  WHERE client_ticket_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS venta_items (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  venta_uuid uuid REFERENCES ventas(uuid) ON DELETE CASCADE,
  producto_uuid uuid REFERENCES productos(uuid),
  cantidad numeric(8,3) DEFAULT 1,
  precio_unitario numeric(12,2) DEFAULT 0,
  descuento numeric(12,2) DEFAULT 0,
  total_item numeric(12,2) DEFAULT 0,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_venta_items_venta ON venta_items(venta_uuid);
CREATE INDEX IF NOT EXISTS ix_venta_items_producto ON venta_items(producto_uuid);

CREATE TABLE IF NOT EXISTS pagos_venta (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  venta_uuid uuid REFERENCES ventas(uuid) ON DELETE CASCADE,
  metodo text, -- 'efectivo','tarjeta','transferencia','otro'
  monto numeric(12,2) NOT NULL,
  referencia text, -- id de tx
  fecha timestamptz DEFAULT now(),
  recibido_por_uuid uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_pagos_venta_venta ON pagos_venta(venta_uuid);
CREATE INDEX IF NOT EXISTS ix_pagos_venta_metodo ON pagos_venta(metodo);

-- ====================================================================================
-- 9) Cuentas y movimientos (fiado)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS cuentas_miembro (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  miembro_uuid uuid REFERENCES miembros(uuid) UNIQUE,
  saldo_deudor numeric(12,2) DEFAULT 0, -- positivo = debe
  saldo_acumulado numeric(12,2) DEFAULT 0,
  limite_credito numeric(12,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_cuentas_miembro_miembro ON cuentas_miembro(miembro_uuid);

CREATE TABLE IF NOT EXISTS movimientos_cuenta (
  id serial PRIMARY KEY,
  uuid uuid DEFAULT uuid_generate_v4() UNIQUE,
  cuenta_uuid uuid REFERENCES cuentas_miembro(uuid) ON DELETE CASCADE,
  venta_uuid uuid,
  tipo text, -- 'cargo','pago','ajuste'
  monto numeric(12,2),
  fecha timestamptz DEFAULT now(),
  descripcion text,
  created_by_uuid uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  needs_sync boolean DEFAULT true,
  version integer DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_movimientos_cuenta_cuenta ON movimientos_cuenta(cuenta_uuid);
CREATE INDEX IF NOT EXISTS ix_movimientos_cuenta_venta ON movimientos_cuenta(venta_uuid);

-- ====================================================================================
-- 10) Shift counters (tickets) - ya definido, agregar si no existe
-- ====================================================================================

CREATE TABLE IF NOT EXISTS shift_counters (
  shift_uuid uuid PRIMARY KEY,
  last_ticket integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- función reservadora de ticket (usa advisory lock)
CREATE OR REPLACE FUNCTION fn_next_ticket_for_shift(p_shift_uuid uuid) RETURNS integer AS $$
DECLARE
  v_last integer;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || replace(p_shift_uuid::text,'-',''))::bit(64)::bigint);
  SELECT last_ticket INTO v_last FROM shift_counters WHERE shift_uuid = p_shift_uuid;
  IF NOT FOUND THEN
    INSERT INTO shift_counters (shift_uuid, last_ticket, updated_at) VALUES (p_shift_uuid, 1, now())
    ON CONFLICT (shift_uuid) DO UPDATE SET last_ticket = shift_counters.last_ticket + 1, updated_at = now()
    RETURNING last_ticket INTO v_last;
    RETURN v_last;
  ELSE
    UPDATE shift_counters SET last_ticket = last_ticket + 1, updated_at = now()
      WHERE shift_uuid = p_shift_uuid
      RETURNING last_ticket INTO v_last;
    RETURN v_last;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- trigger auto-ticket
CREATE OR REPLACE FUNCTION trg_set_ticket_number() RETURNS trigger AS $$
BEGIN
  IF NEW.shift_uuid IS NOT NULL AND NEW.numero_ticket IS NULL THEN
    NEW.numero_ticket := fn_next_ticket_for_shift(NEW.shift_uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ventas_set_ticket ON ventas;
CREATE TRIGGER trg_ventas_set_ticket
  BEFORE INSERT ON ventas
  FOR EACH ROW
  WHEN (NEW.shift_uuid IS NOT NULL)
  EXECUTE FUNCTION trg_set_ticket_number();



-- ====================================================================================
-- 11) Triggers y funciones genéricas: audit + sync flag + actor extraction + search_vector update
-- ====================================================================================

-- function to get current actor from session variable (set by backend using: SET LOCAL app.current_actor = 'uuid';)
CREATE OR REPLACE FUNCTION fn_get_current_actor() RETURNS uuid AS $$
DECLARE
  v text;
BEGIN
  v := current_setting('app.current_actor', true);
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
END;
$$ LANGUAGE plpgsql;

-- Improved audit function that captures actor via fn_get_current_actor()
CREATE OR REPLACE FUNCTION fn_audit_changes() RETURNS trigger AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_actor uuid;
BEGIN
  v_actor := fn_get_current_actor();
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    INSERT INTO audit_logs(entidad, entidad_uuid, accion, datos_previos, datos_nuevos, actor_uuid, created_at)
      VALUES (TG_TABLE_NAME, NEW.uuid::uuid, 'CREATE', NULL, v_new, v_actor, now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    INSERT INTO audit_logs(entidad, entidad_uuid, accion, datos_previos, datos_nuevos, actor_uuid, created_at)
      VALUES (TG_TABLE_NAME, NEW.uuid::uuid, 'UPDATE', v_old, v_new, v_actor, now());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    INSERT INTO audit_logs(entidad, entidad_uuid, accion, datos_previos, datos_nuevos, actor_uuid, created_at)
      VALUES (TG_TABLE_NAME, OLD.uuid::uuid, 'DELETE', v_old, NULL, v_actor, now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- trigger to set updated_at, increment version and mark needs_sync
CREATE OR REPLACE FUNCTION fn_mark_updated_set_sync() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' THEN
    NEW.version := COALESCE(NEW.version,0) + 1;
    NEW.needs_sync := true;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    NEW.version := COALESCE(NEW.version,1);
    NEW.needs_sync := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- attach audit and sync triggers to key tables (safe: create only if not exists)
DO $$
BEGIN
  -- attach audit triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_miembros') THEN
    EXECUTE 'CREATE TRIGGER trg_audit_miembros AFTER INSERT OR UPDATE OR DELETE ON miembros FOR EACH ROW EXECUTE FUNCTION fn_audit_changes()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_grupos') THEN
    EXECUTE 'CREATE TRIGGER trg_audit_grupos AFTER INSERT OR UPDATE OR DELETE ON grupos FOR EACH ROW EXECUTE FUNCTION fn_audit_changes()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_liderazgo') THEN
    EXECUTE 'CREATE TRIGGER trg_audit_liderazgo AFTER INSERT OR UPDATE OR DELETE ON liderazgo FOR EACH ROW EXECUTE FUNCTION fn_audit_changes()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_ventas') THEN
    EXECUTE 'CREATE TRIGGER trg_audit_ventas AFTER INSERT OR UPDATE OR DELETE ON ventas FOR EACH ROW EXECUTE FUNCTION fn_audit_changes()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_movimientos') THEN
    EXECUTE 'CREATE TRIGGER trg_audit_movimientos AFTER INSERT OR UPDATE OR DELETE ON movimientos_cuenta FOR EACH ROW EXECUTE FUNCTION fn_audit_changes()';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Ignorando error al crear triggers de auditoria: %', SQLERRM;
END;
$$;

-- attach sync/version trigger to tables that have version/needs_sync columns
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    -- only attach to tables that have 'needs_sync' column (skip others)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'needs_sync') THEN
      BEGIN
        EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_mark_%s ON %I;', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_sync_mark_%s BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_mark_updated_set_sync();', tbl, tbl);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creando trigger sync para %: %', tbl, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

-- Search vector update for miembros
CREATE OR REPLACE FUNCTION fn_miembros_update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.nombres,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.apellidos,'')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.documento,'')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_miembros_search_vector ON miembros;
CREATE TRIGGER trg_miembros_search_vector
  BEFORE INSERT OR UPDATE ON miembros
  FOR EACH ROW EXECUTE FUNCTION fn_miembros_update_search_vector();

-- ====================================================================================
-- 12) Triggers y funciones de negocio: movimientos_cuenta -> actualizar cuentas_miembro
-- ====================================================================================

-- Trigger: al insertar o actualizar movimiento de cuenta actualizar saldo en cuenta
CREATE OR REPLACE FUNCTION fn_update_cuenta_on_movimiento() RETURNS trigger AS $$
DECLARE
  v_saldo numeric(12,2);
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.tipo = 'cargo' THEN
      UPDATE cuentas_miembro SET
        saldo_deudor = coalesce(saldo_deudor,0) + NEW.monto,
        saldo_acumulado = coalesce(saldo_acumulado,0) + NEW.monto,
        updated_at = now()
      WHERE uuid = NEW.cuenta_uuid;
    ELSIF NEW.tipo = 'pago' THEN
      UPDATE cuentas_miembro SET
        saldo_deudor = coalesce(saldo_deudor,0) - NEW.monto,
        updated_at = now()
      WHERE uuid = NEW.cuenta_uuid;
    ELSIF NEW.tipo = 'ajuste' THEN
      UPDATE cuentas_miembro SET
        saldo_deudor = coalesce(saldo_deudor,0) + NEW.monto,
        updated_at = now()
      WHERE uuid = NEW.cuenta_uuid;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- para simplificar no manejamos update de movimiento; ideal: calcular diff y aplicar
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movimientos_update_cuenta ON movimientos_cuenta;
CREATE TRIGGER trg_movimientos_update_cuenta
  AFTER INSERT ON movimientos_cuenta
  FOR EACH ROW EXECUTE FUNCTION fn_update_cuenta_on_movimiento();

-- ====================================================================================
-- 13) Trigger: venta_items -> descontar inventario (si aplica)
-- ====================================================================================

CREATE OR REPLACE FUNCTION fn_decrement_inventario_on_item() RETURNS trigger AS $$
BEGIN
  IF NEW.producto_uuid IS NOT NULL THEN
    UPDATE inventario
    SET cantidad_actual = cantidad_actual - NEW.cantidad,
        updated_at = now(),
        needs_sync = true
    WHERE producto_uuid = NEW.producto_uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venta_items_decrement_inventario ON venta_items;
CREATE TRIGGER trg_venta_items_decrement_inventario
  AFTER INSERT ON venta_items
  FOR EACH ROW EXECUTE FUNCTION fn_decrement_inventario_on_item();

-- ====================================================================================
-- 14) Función transaccional: create_sale(jsonb payload, actor_uuid)
--    payload JSON structure (example):
--    {
--      "client_ticket_id": "abc-1",
--      "shift_uuid": "...",
--      "vendedor_uuid": "...",
--      "tipo":"mostrador",
--      "miembro_uuid": "...",         -- optional
--      "is_fiado": true|false,
--      "items": [
--         {"producto_uuid":"...","cantidad":1,"precio_unitario":100,"descuento":0}
--      ],
--      "pagos": [
--         {"metodo":"efectivo","monto":50,"referencia":null}
--      ]
--    }
-- ====================================================================================

CREATE OR REPLACE FUNCTION create_sale(p_payload jsonb, p_actor_uuid uuid) RETURNS TABLE (venta_uuid uuid) AS $$
DECLARE
  v_total numeric(12,2) := 0;
  v_sub numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_desc_total numeric(12,2) := 0;
  v_v_uuid uuid;
  v_item jsonb;
  v_prod_uuid uuid;
  v_cantidad numeric;
  v_precio numeric;
  v_desc numeric;
  v_mv_uuid uuid;
  v_cuenta_uuid uuid;
BEGIN
  -- start transaction implicit
  -- validate payload minimally
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'Payload vacio';
  END IF;

  -- compute subtotal and item inserts
  v_sub := 0;
  v_desc_total := 0;

  -- insert venta header with totals = 0 temporarily (numero_ticket assigned by trigger)
  INSERT INTO ventas (client_ticket_id, shift_uuid, vendedor_uuid, tipo, miembro_uuid, is_fiado, subtotal, impuesto, descuento_total, total, estado, pago_estado, created_at, updated_at)
  VALUES (
    p_payload->>'client_ticket_id',
    (p_payload->>'shift_uuid')::uuid,
    (p_payload->>'vendedor_uuid')::uuid,
    p_payload->>'tipo',
    CASE WHEN (p_payload->>'miembro_uuid') IS NOT NULL THEN (p_payload->>'miembro_uuid')::uuid ELSE NULL END,
    (p_payload->>'is_fiado')::boolean,
    0, 0, 0, 0, 'abierta', 'sin_pago', now(), now()
  )
  RETURNING uuid INTO v_v_uuid;

  -- iterate items
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'items','[]'::jsonb))
  LOOP
    v_prod_uuid := (v_item->>'producto_uuid')::uuid;
    v_cantidad := (v_item->>'cantidad')::numeric;
    v_precio := (v_item->>'precio_unitario')::numeric;
    v_desc := COALESCE((v_item->>'descuento')::numeric, 0);

    INSERT INTO venta_items (venta_uuid, producto_uuid, cantidad, precio_unitario, descuento, total_item, created_at, updated_at)
    VALUES (v_v_uuid, v_prod_uuid, v_cantidad, v_precio, v_desc, (v_precio * v_cantidad) - v_desc, now(), now());

    v_sub := v_sub + ((v_precio * v_cantidad) - v_desc);
    v_desc_total := v_desc_total + v_desc;

    -- decrement inventory (via update)
    UPDATE inventario SET cantidad_actual = cantidad_actual - v_cantidad, updated_at = now(), needs_sync = true
    WHERE producto_uuid = v_prod_uuid;
  END LOOP;

  -- compute tax if needed (placeholder: 0)
  v_tax := 0;
  v_total := v_sub + v_tax;

  -- update venta header with totals
  UPDATE ventas SET subtotal = v_sub, impuesto = v_tax, descuento_total = v_desc_total, total = v_total, estado = 'cerrada' WHERE uuid = v_v_uuid;

  -- handle pagos
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

  -- If fiado, create movimiento_cuenta and update cuentas_miembro
  IF (p_payload->>'is_fiado')::boolean = true THEN
    -- ensure cuenta exists
    SELECT uuid INTO v_cuenta_uuid FROM cuentas_miembro WHERE miembro_uuid = (p_payload->>'miembro_uuid')::uuid;
    IF NOT FOUND THEN
      INSERT INTO cuentas_miembro (miembro_uuid, saldo_deudor, saldo_acumulado, limite_credito, created_at, updated_at)
      VALUES ((p_payload->>'miembro_uuid')::uuid, v_total, v_total, 0, now(), now())
      RETURNING uuid INTO v_cuenta_uuid;
    ELSE
      UPDATE cuentas_miembro SET
        saldo_deudor = coalesce(saldo_deudor,0) + v_total,
        saldo_acumulado = coalesce(saldo_acumulado,0) + v_total,
        updated_at = now()
      WHERE uuid = v_cuenta_uuid;
    END IF;

    -- movimientos_cuenta
    INSERT INTO movimientos_cuenta (cuenta_uuid, venta_uuid, tipo, monto, fecha, descripcion, created_by_uuid, created_at, updated_at)
    VALUES (v_cuenta_uuid, v_v_uuid, 'cargo', v_total, now(), 'Cargo por venta fiada', p_actor_uuid, now(), now());
  END IF;

  -- set pago_estado depending on pagos sum
  UPDATE ventas SET pago_estado = CASE
    WHEN (SELECT SUM(monto) FROM pagos_venta WHERE venta_uuid = v_v_uuid) >= total THEN 'pagado'
    WHEN (SELECT SUM(monto) FROM pagos_venta WHERE venta_uuid = v_v_uuid) > 0 THEN 'parcial'
    ELSE 'sin_pago' END
  WHERE uuid = v_v_uuid;

  -- return venta uuid
  venta_uuid := v_v_uuid;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: la función está definida SECURITY DEFINER: en Supabase el backend (service role) la invoca.
-- Validaciones adicionales (limite de crédito, checks, inventario negativo) deben agregarse según política.

-- ====================================================================================
-- 15) VISTAS utiles: resumen de cuenta y Liderazgo gaps
-- ====================================================================================

-- Vista resumen de cuenta por miembro
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

-- Vista para detectar vacantes de liderazgo
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

-- ====================================================================================
-- 16) RLS Policies (ejemplos): miembros, ventas, cuentas_miembro, usuarios_temporales, observaciones
-- ====================================================================================

-- Habilitar RLS en tablas sensibles
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_temporales ENABLE ROW LEVEL SECURITY;
ALTER TABLE observaciones ENABLE ROW LEVEL SECURITY;


-- POLICY HELPERS
CREATE OR REPLACE FUNCTION fn_is_role(p_role text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM app_users au WHERE au.uid = auth.uid()::uuid AND au.role = p_role AND au.active = true);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION fn_is_any_role(roles text[]) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM app_users au WHERE au.uid = auth.uid()::uuid AND au.role = ANY(roles) AND au.active = true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Miembros (sin cambios)
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
    EXISTS (SELECT 1 FROM app_users au WHERE au.uid = auth.uid()::uuid AND au.miembro_uuid = miembros.uuid)
  );

-- Ventas (corregidas)
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

-- Cuentas (corregidas)
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

-- Movimientos_cuenta (corregidas)
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

-- Usuarios temporales (sin cambios)
CREATE POLICY usuarios_temp_admin ON usuarios_temporales
  FOR ALL
  USING ( fn_is_any_role(ARRAY['admin','ti']) );

-- Observaciones (corregidas)
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

-- Note: service_role bypasses RLS; recommended pattern: POS client invokes backend which uses service_role to insert ventas.

-- ====================================================================================
-- 17) Índices adicionales: full-text, partials, GIN
-- ====================================================================================

-- Ensure search_vector index: needs column present and trigger updating it
CREATE INDEX IF NOT EXISTS idx_miembros_search ON miembros USING GIN (search_vector);

-- Index for case-insensitive email via citext already handled by citext type
CREATE INDEX IF NOT EXISTS idx_miembros_email ON miembros(email);

-- Partial index for active members (not deleted)
CREATE INDEX IF NOT EXISTS ix_miembros_active ON miembros((lower(nombres)), (lower(apellidos)))
  WHERE is_deleted = false;

-- Trigram index for fuzzy search on names
CREATE INDEX IF NOT EXISTS idx_miembros_nombres_trgm ON miembros USING gin (nombres gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_miembros_apellidos_trgm ON miembros USING gin (apellidos gin_trgm_ops);

-- ====================================================================================
-- 18) Utility functions: mark synced, clear sync flag
-- ====================================================================================

CREATE OR REPLACE FUNCTION fn_mark_synced(p_table text, p_uuid uuid) RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET needs_sync = false WHERE uuid = %L', p_table, p_uuid::text);
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- 19) Helper: consumo de invitación (backend should call this via service)
-- ====================================================================================

CREATE OR REPLACE FUNCTION fn_consume_invite(p_token uuid, p_auth_uid uuid, p_auth_email text) RETURNS text AS $$
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

  -- create app_user mapping
  INSERT INTO app_users (uid, role, created_by, created_at)
  VALUES (p_auth_uid, r.role, r.created_by, now())
  ON CONFLICT (uid) DO UPDATE SET role = EXCLUDED.role, active = true;

  -- mark invite used
  UPDATE invite_links SET used = true, used_by = p_auth_uid, used_at = now() WHERE id = r.id;

  -- audit
  INSERT INTO audit_logs(entidad, entidad_uuid, accion, datos_previos, datos_nuevos, actor_uuid, created_at)
    VALUES ('invite_links', r.token, 'CONSUME_INVITE', to_jsonb(r.*), jsonb_build_object('used', true, 'used_by', p_auth_uid), p_auth_uid, now());

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================================
-- 20) Ejemplos de seed data para catálogos (opcional)
-- ====================================================================================

INSERT INTO grupos (nombre) VALUES ('ebicol') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('juvic') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('icam') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('salomon') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('ester') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('simeon') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('alabanza') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('audio') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('mardoqueo') ON CONFLICT DO NOTHING;
INSERT INTO grupos (nombre) VALUES ('levi') ON CONFLICT DO NOTHING;

INSERT INTO bautismo (nombre) VALUES ('agua') ON CONFLICT DO NOTHING;
INSERT INTO bautismo (nombre) VALUES ('agua y espiritu') ON CONFLICT DO NOTHING;
INSERT INTO bautismo (nombre) VALUES ('n/a') ON CONFLICT DO NOTHING;

INSERT INTO tipo_miembro (nombre) VALUES ('si') ON CONFLICT DO NOTHING;
INSERT INTO tipo_miembro (nombre) VALUES ('n/a') ON CONFLICT DO NOTHING;
INSERT INTO tipo_miembro (nombre) VALUES ('probante') ON CONFLICT DO NOTHING;
INSERT INTO tipo_miembro (nombre) VALUES ('observacion') ON CONFLICT DO NOTHING;

-- ====================================================================================
-- 21) Final notes: permisos y recomendaciones
-- ====================================================================================
-- 1) Revise y ajuste las políticas RLS a las necesidades reales. Pruébalas con cuentas de test (admin/pastor/secretaria/miembro).
-- 2) El backend (endpoint POS) debe ejecutar la función 'create_sale' y/o insertar ventas usando la service_role key
--    (service_role bypass RLS, por eso es seguro que tu backend valide PIN y shift antes de insertar).
-- 3) Para que el trigger de auditoría capture actor, el backend debe ejecutar: SET LOCAL app.current_actor = '<uid>'; antes de las operaciones.
-- 4) Reemplaza/añade validaciones de negocio (p.ej. límite de crédito, inventario negativo) según sus reglas.
-- 5) Haz backups/exports periódicos (en free tier de Supabase automatizar export).
-- 6) Antes de migrar datos reales, prueba todo en staging con dataset reducido.

-- ====================================================================================
-- FIN del script
-- ====================================================================================
