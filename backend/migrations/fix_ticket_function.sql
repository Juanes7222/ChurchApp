-- Actualizar función fn_next_ticket_for_shift para usar text en lugar de uuid
DROP FUNCTION IF EXISTS fn_next_ticket_for_shift(uuid);
DROP FUNCTION IF EXISTS fn_next_ticket_for_shift(text);

CREATE OR REPLACE FUNCTION fn_next_ticket_for_shift(p_shift_uuid text) RETURNS integer AS $$
DECLARE
  v_last integer;
BEGIN
  -- Lock para evitar condiciones de carrera
  PERFORM pg_advisory_xact_lock(hashtext(p_shift_uuid));
  
  SELECT last_ticket INTO v_last FROM shift_counters WHERE shift_uuid = p_shift_uuid;
  
  IF NOT FOUND THEN
    INSERT INTO shift_counters (shift_uuid, last_ticket, updated_at) 
    VALUES (p_shift_uuid, 1, now())
    ON CONFLICT (shift_uuid) DO UPDATE 
      SET last_ticket = shift_counters.last_ticket + 1, updated_at = now()
    RETURNING last_ticket INTO v_last;
    RETURN v_last;
  ELSE
    UPDATE shift_counters 
    SET last_ticket = last_ticket + 1, updated_at = now()
    WHERE shift_uuid = p_shift_uuid
    RETURNING last_ticket INTO v_last;
    RETURN v_last;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recrear la función del trigger (ya existe pero asegurarnos de que funciona con text)
CREATE OR REPLACE FUNCTION trg_set_ticket_number() RETURNS trigger AS $$
BEGIN
  IF NEW.shift_uuid IS NOT NULL AND (NEW.numero_ticket IS NULL OR NEW.numero_ticket = 0) THEN
    NEW.numero_ticket := fn_next_ticket_for_shift(NEW.shift_uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trg_ventas_set_ticket ON ventas;
CREATE TRIGGER trg_ventas_set_ticket
  BEFORE INSERT ON ventas
  FOR EACH ROW
  WHEN (NEW.shift_uuid IS NOT NULL)
  EXECUTE FUNCTION trg_set_ticket_number();
