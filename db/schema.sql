-- Paustik live delivery service, schema version 1.
-- Apply once in the Neon SQL Editor before deploying the API.

CREATE TABLE IF NOT EXISTS paustik_deliveries (
  id uuid PRIMARY KEY,
  order_ref text NOT NULL CHECK (length(order_ref) BETWEEN 1 AND 64),
  courier_label text NOT NULL CHECK (length(courier_label) BETWEEN 1 AND 80),
  destination_lat double precision NOT NULL CHECK (destination_lat BETWEEN -90 AND 90),
  destination_lon double precision NOT NULL CHECK (destination_lon BETWEEN -180 AND 180),
  geofence_meters integer NOT NULL DEFAULT 300 CHECK (geofence_meters BETWEEN 100 AND 1000),
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_transit', 'arrived', 'delivered', 'cancelled')),
  sharing_enabled boolean NOT NULL DEFAULT false,
  inside_fixes smallint NOT NULL DEFAULT 0 CHECK (inside_fixes BETWEEN 0 AND 10),
  outside_fixes smallint NOT NULL DEFAULT 0 CHECK (outside_fixes BETWEEN 0 AND 10),
  last_location_at timestamptz,
  arrived_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  handover_code_hash char(64) NOT NULL,
  handover_expires_at timestamptz NOT NULL,
  handover_attempts smallint NOT NULL DEFAULT 0 CHECK (handover_attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paustik_location_links (
  id uuid PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES paustik_deliveries(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('courier', 'parent')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paustik_location_sessions (
  id uuid PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES paustik_deliveries(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('courier', 'parent')),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consent_at timestamptz,
  consent_revoked_at timestamptz,
  consent_version text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Keep only the latest coordinate per delivery; no route history is retained.
CREATE TABLE IF NOT EXISTS paustik_latest_locations (
  delivery_id uuid PRIMARY KEY REFERENCES paustik_deliveries(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters double precision NOT NULL CHECK (accuracy_meters BETWEEN 0 AND 50),
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS paustik_delivery_events (
  id uuid PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES paustik_deliveries(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 40),
  detail text NOT NULL CHECK (length(detail) BETWEEN 1 AND 240),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paustik_sessions_expiry_idx
  ON paustik_location_sessions (expires_at);
CREATE INDEX IF NOT EXISTS paustik_links_expiry_idx
  ON paustik_location_links (expires_at);
CREATE INDEX IF NOT EXISTS paustik_events_delivery_idx
  ON paustik_delivery_events (delivery_id, created_at DESC);

CREATE OR REPLACE FUNCTION paustik_create_delivery(
  p_delivery_id uuid,
  p_order_ref text,
  p_courier_label text,
  p_destination_lat double precision,
  p_destination_lon double precision,
  p_geofence_meters integer,
  p_handover_code_hash text,
  p_courier_link_id uuid,
  p_courier_token_hash text,
  p_parent_link_id uuid,
  p_parent_token_hash text
) RETURNS uuid
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO paustik_deliveries (
    id, order_ref, courier_label, destination_lat, destination_lon,
    geofence_meters, handover_code_hash, handover_expires_at
  ) VALUES (
    p_delivery_id, p_order_ref, p_courier_label, p_destination_lat,
    p_destination_lon, p_geofence_meters, p_handover_code_hash, now() + interval '24 hours'
  );

  INSERT INTO paustik_location_links (id, delivery_id, role, token_hash, expires_at)
  VALUES
    (p_courier_link_id, p_delivery_id, 'courier', p_courier_token_hash, now() + interval '12 hours'),
    (p_parent_link_id, p_delivery_id, 'parent', p_parent_token_hash, now() + interval '48 hours');

  INSERT INTO paustik_delivery_events (id, delivery_id, event_type, detail)
  VALUES (gen_random_uuid(), p_delivery_id, 'assigned', 'A delivery tracking link was created.');

  RETURN p_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION paustik_redeem_location_link(
  p_delivery_id uuid,
  p_token_hash text,
  p_session_id uuid,
  p_session_token_hash text
) RETURNS TABLE (session_role text, session_expires_at timestamptz)
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
  v_link_expires timestamptz;
  v_session_expires timestamptz;
BEGIN
  UPDATE paustik_location_links
     SET redeemed_at = now()
   WHERE delivery_id = p_delivery_id
     AND token_hash = p_token_hash
     AND redeemed_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now()
   RETURNING role, expires_at INTO v_role, v_link_expires;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_session_expires := LEAST(v_link_expires, now() + interval '6 hours');
  INSERT INTO paustik_location_sessions (id, delivery_id, role, token_hash, expires_at)
  VALUES (p_session_id, p_delivery_id, v_role, p_session_token_hash, v_session_expires);

  RETURN QUERY SELECT v_role, v_session_expires;
END;
$$;

-- Remove the v1 prototype signature so it cannot remain callable without a session check.
DROP FUNCTION IF EXISTS paustik_record_location(uuid, double precision, double precision, double precision, timestamptz);

CREATE OR REPLACE FUNCTION paustik_record_location(
  p_delivery_id uuid,
  p_session_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_captured_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  d paustik_deliveries%ROWTYPE;
  previous_point paustik_latest_locations%ROWTYPE;
  v_a double precision;
  v_distance double precision;
  v_bearing double precision;
  v_move_a double precision;
  v_move_distance double precision;
  v_elapsed_seconds double precision;
  v_inside smallint;
  v_outside smallint;
  v_status text;
BEGIN
  SELECT * INTO d FROM paustik_deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'delivery_not_found');
  END IF;
  IF d.status IN ('delivered', 'cancelled') THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'delivery_closed', 'status', d.status);
  END IF;
  IF NOT d.sharing_enabled OR NOT EXISTS (
    SELECT 1 FROM paustik_location_sessions s
     WHERE s.id = p_session_id
       AND s.delivery_id = p_delivery_id
       AND s.role = 'courier'
       AND s.expires_at > now()
       AND s.revoked_at IS NULL
       AND s.consent_at IS NOT NULL
       AND s.consent_revoked_at IS NULL
       AND s.consent_version = 'paustik-location-v1'
  ) THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'sharing_stopped');
  END IF;
  IF p_accuracy_meters > 50 THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'accuracy_too_low');
  END IF;
  IF p_captured_at < now() - interval '2 minutes' OR p_captured_at > now() + interval '30 seconds' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'stale_fix');
  END IF;
  IF d.last_location_at IS NOT NULL AND d.last_location_at > now() - interval '5 seconds' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'too_soon');
  END IF;

  SELECT * INTO previous_point
    FROM paustik_latest_locations WHERE delivery_id = p_delivery_id;
  IF FOUND THEN
    IF p_captured_at <= previous_point.captured_at THEN
      RETURN jsonb_build_object('accepted', false, 'reason', 'stale_fix');
    END IF;
    v_elapsed_seconds := extract(epoch FROM (p_captured_at - previous_point.captured_at));
    v_move_a := power(sin(radians(p_latitude - previous_point.latitude) / 2), 2)
      + cos(radians(previous_point.latitude)) * cos(radians(p_latitude))
      * power(sin(radians(p_longitude - previous_point.longitude) / 2), 2);
    v_move_distance := 6371000 * 2 * asin(sqrt(least(1, greatest(0, v_move_a))));
    -- Ignore GPS jumps above 55 m/s (198 km/h), which are implausible for a local delivery.
    IF v_elapsed_seconds > 0 AND v_move_distance / v_elapsed_seconds > 55 THEN
      RETURN jsonb_build_object('accepted', false, 'reason', 'implausible_movement');
    END IF;
  END IF;

  v_a := power(sin(radians(p_latitude - d.destination_lat) / 2), 2)
       + cos(radians(d.destination_lat)) * cos(radians(p_latitude))
       * power(sin(radians(p_longitude - d.destination_lon) / 2), 2);
  v_distance := 6371000 * 2 * asin(sqrt(least(1, greatest(0, v_a))));
  v_bearing := degrees(atan2(
    sin(radians(p_longitude - d.destination_lon)) * cos(radians(p_latitude)),
    cos(radians(d.destination_lat)) * sin(radians(p_latitude))
      - sin(radians(d.destination_lat)) * cos(radians(p_latitude))
      * cos(radians(p_longitude - d.destination_lon))
  ));

  -- Include reported GPS uncertainty so an uncertain fix cannot claim arrival or a clear exit.
  v_inside := CASE WHEN v_distance + p_accuracy_meters <= d.geofence_meters THEN LEAST(d.inside_fixes + 1, 10) ELSE 0 END;
  v_outside := CASE WHEN v_distance - p_accuracy_meters > d.geofence_meters + 75 THEN LEAST(d.outside_fixes + 1, 10) ELSE 0 END;
  v_status := d.status;

  IF v_status = 'assigned' THEN
    v_status := 'in_transit';
  END IF;
  IF v_inside >= 2 THEN
    v_status := 'arrived';
  ELSIF d.status = 'arrived' AND v_outside >= 2 THEN
    v_status := 'in_transit';
  END IF;

  UPDATE paustik_deliveries
     SET status = v_status,
         sharing_enabled = true,
         inside_fixes = v_inside,
         outside_fixes = v_outside,
         last_location_at = now(),
         arrived_at = CASE WHEN v_status = 'arrived' THEN COALESCE(arrived_at, now()) ELSE arrived_at END,
         updated_at = now()
   WHERE id = p_delivery_id;

  INSERT INTO paustik_latest_locations (
    delivery_id, latitude, longitude, accuracy_meters, captured_at, received_at, expires_at
  ) VALUES (
    p_delivery_id, p_latitude, p_longitude, p_accuracy_meters, p_captured_at, now(), now() + interval '24 hours'
  ) ON CONFLICT (delivery_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy_meters = EXCLUDED.accuracy_meters,
    captured_at = EXCLUDED.captured_at,
    received_at = now(),
    expires_at = now() + interval '24 hours';

  IF v_status <> d.status THEN
    INSERT INTO paustik_delivery_events (id, delivery_id, event_type, detail)
    VALUES (
      gen_random_uuid(), p_delivery_id, v_status,
      CASE WHEN v_status = 'arrived'
        THEN 'Two accurate GPS fixes entered the delivery boundary.'
        ELSE 'Two accurate GPS fixes moved outside the exit buffer.'
      END
    );
  END IF;

  RETURN jsonb_build_object(
    'accepted', true,
    'status', v_status,
    'distance_meters', round(v_distance::numeric),
    'bearing_degrees', round(v_bearing::numeric),
    'inside_geofence', v_distance + p_accuracy_meters <= d.geofence_meters,
    'geofence_meters', d.geofence_meters,
    'captured_at', p_captured_at,
    'accuracy_meters', p_accuracy_meters
  );
END;
$$;

CREATE OR REPLACE FUNCTION paustik_stop_sharing(p_delivery_id uuid, p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE paustik_location_sessions
     SET consent_revoked_at = now()
   WHERE id = p_session_id AND delivery_id = p_delivery_id AND role = 'courier' AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  UPDATE paustik_deliveries
     SET sharing_enabled = false, last_location_at = NULL, updated_at = now()
   WHERE id = p_delivery_id AND status NOT IN ('delivered', 'cancelled');
  DELETE FROM paustik_latest_locations WHERE delivery_id = p_delivery_id;
  INSERT INTO paustik_delivery_events (id, delivery_id, event_type, detail)
  VALUES (gen_random_uuid(), p_delivery_id, 'sharing_stopped', 'The courier stopped live location sharing.');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION paustik_complete_handover(p_delivery_id uuid, p_code_hash text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  d paustik_deliveries%ROWTYPE;
BEGIN
  SELECT * INTO d FROM paustik_deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'delivery_not_found');
  END IF;
  IF d.status = 'delivered' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'delivered', 'already_complete', true);
  END IF;
  IF d.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'delivery_closed');
  END IF;
  IF d.status <> 'arrived' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_arrived');
  END IF;
  IF d.handover_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'code_expired');
  END IF;
  IF d.handover_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'attempts_exhausted');
  END IF;
  IF d.handover_code_hash <> p_code_hash THEN
    UPDATE paustik_deliveries SET handover_attempts = handover_attempts + 1 WHERE id = p_delivery_id;
    IF d.handover_attempts + 1 >= 5 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'attempts_exhausted');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'incorrect_code', 'attempts_left', 4 - d.handover_attempts);
  END IF;

  UPDATE paustik_deliveries
     SET status = 'delivered', sharing_enabled = false, delivered_at = now(),
         last_location_at = NULL, updated_at = now()
   WHERE id = p_delivery_id;
  DELETE FROM paustik_latest_locations WHERE delivery_id = p_delivery_id;
  UPDATE paustik_location_sessions
     SET revoked_at = now()
   WHERE delivery_id = p_delivery_id AND role = 'courier' AND revoked_at IS NULL;
  UPDATE paustik_location_links
     SET revoked_at = now()
   WHERE delivery_id = p_delivery_id AND role = 'courier' AND revoked_at IS NULL;
  INSERT INTO paustik_delivery_events (id, delivery_id, event_type, detail)
  VALUES (gen_random_uuid(), p_delivery_id, 'delivered', 'The recipient confirmed handover with the one-time code.');
  RETURN jsonb_build_object('ok', true, 'status', 'delivered');
END;
$$;

CREATE OR REPLACE FUNCTION paustik_cancel_delivery(p_delivery_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE paustik_deliveries
     SET status = 'cancelled', sharing_enabled = false, cancelled_at = now(),
         last_location_at = NULL, updated_at = now()
   WHERE id = p_delivery_id AND status NOT IN ('delivered', 'cancelled');
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  DELETE FROM paustik_latest_locations WHERE delivery_id = p_delivery_id;
  UPDATE paustik_location_sessions SET revoked_at = now()
   WHERE delivery_id = p_delivery_id AND revoked_at IS NULL;
  UPDATE paustik_location_links SET revoked_at = now()
   WHERE delivery_id = p_delivery_id AND revoked_at IS NULL;
  INSERT INTO paustik_delivery_events (id, delivery_id, event_type, detail)
  VALUES (gen_random_uuid(), p_delivery_id, 'cancelled', 'The delivery was cancelled by operations.');
  RETURN true;
END;
$$;

REVOKE ALL ON paustik_deliveries, paustik_location_links, paustik_location_sessions,
  paustik_latest_locations, paustik_delivery_events FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION paustik_create_delivery(uuid, text, text, double precision, double precision, integer, text, uuid, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION paustik_redeem_location_link(uuid, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION paustik_record_location(uuid, uuid, double precision, double precision, double precision, timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION paustik_stop_sharing(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION paustik_complete_handover(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION paustik_cancel_delivery(uuid) FROM PUBLIC;
