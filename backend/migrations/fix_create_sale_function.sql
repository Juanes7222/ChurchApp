-- Corregir la función create_sale para manejar arrays JSONB correctamente
DROP FUNCTION IF EXISTS create_sale(jsonb, text);

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

  -- Generar UUID para la venta
  v_v_uuid := gen_random_uuid()::text;

  INSERT INTO ventas (uuid, client_ticket_id, shift_uuid, vendedor_uuid, tipo, miembro_uuid, is_fiado, subtotal, impuesto, descuento_total, total, estado, pago_estado, created_at, updated_at)
  VALUES (
    v_v_uuid,
    p_payload->>'client_ticket_id',
    (p_payload->>'shift_uuid')::text,
    (p_payload->>'vendedor_uuid')::text,
    p_payload->>'tipo',
    CASE WHEN (p_payload->>'miembro_uuid') IS NOT NULL THEN (p_payload->>'miembro_uuid')::text ELSE NULL END,
    (p_payload->>'is_fiado')::boolean,
    0, 0, 0, 0, 'abierta', 'sin_pago', now(), now()
  );

  -- Iterar sobre items usando FOR ... IN SELECT
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

  -- Iterar sobre pagos usando FOR ... IN SELECT
  IF jsonb_typeof(p_payload->'pagos') = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'pagos','[]'::jsonb))
    LOOP
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
      -- Generar UUID para la nueva cuenta
      v_cuenta_uuid := gen_random_uuid()::text;
      INSERT INTO cuentas_miembro (uuid, miembro_uuid, saldo_deudor, saldo_acumulado, limite_credito, created_at, updated_at)
      VALUES (v_cuenta_uuid, (p_payload->>'miembro_uuid')::text, v_total, v_total, 0, now(), now());
    ELSE
      UPDATE cuentas_miembro SET
        saldo_deudor = coalesce(saldo_deudor,0) + v_total,
        saldo_acumulado = coalesce(saldo_acumulado,0) + v_total,
        updated_at = now()
      WHERE uuid = v_cuenta_uuid;
    END IF;

    -- Generar UUID para el movimiento
    v_mv_uuid := gen_random_uuid()::text;
    INSERT INTO movimientos_cuenta (uuid, cuenta_uuid, venta_uuid, tipo, monto, fecha, descripcion, created_by_uuid, created_at, updated_at)
    VALUES (v_mv_uuid, v_cuenta_uuid, v_v_uuid, 'cargo', v_total, now(), 'Cargo por venta fiada', p_actor_uuid, now(), now());
  END IF;

  UPDATE ventas SET pago_estado = CASE
    WHEN (SELECT SUM(monto) FROM pagos_venta WHERE pagos_venta.venta_uuid = v_v_uuid) >= total THEN 'pagado'
    WHEN (SELECT SUM(monto) FROM pagos_venta WHERE pagos_venta.venta_uuid = v_v_uuid) > 0 THEN 'parcial'
    ELSE 'sin_pago' END
  WHERE uuid = v_v_uuid;

  -- Retornar el UUID de la venta creada
  RETURN QUERY SELECT v_v_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
