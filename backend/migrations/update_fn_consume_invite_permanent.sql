-- Actualizar función fn_consume_invite para soportar invitaciones permanentes
-- Una invitación permanente tiene expires_at = NULL

DROP FUNCTION IF EXISTS fn_consume_invite(text, text, text);

CREATE OR REPLACE FUNCTION fn_consume_invite(p_token text, p_auth_uid text, p_auth_email text) 
RETURNS text AS $$
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
  
  -- Si expires_at es NULL, la invitación es permanente (no expira)
  -- Solo validar expiración si expires_at tiene un valor
  IF r.expires_at IS NOT NULL AND r.expires_at < now() THEN
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

-- Comentarios
COMMENT ON FUNCTION fn_consume_invite IS 'Consume una invitación y crea o actualiza un usuario. Soporta invitaciones permanentes (expires_at = NULL)';
