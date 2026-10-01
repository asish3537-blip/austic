import { database, requireMethod, secureEquals, send, withApi } from "./_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["GET"]);
  const expected = process.env.CRON_SECRET;
  const supplied = (req.headers.authorization || "").startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  if (!expected || !secureEquals(supplied, expected)) {
    return send(res, 401, { ok: false, error: "unauthorized" });
  }
  const sql = database();
  const locations = await sql`
    DELETE FROM paustik_latest_locations
     WHERE expires_at <= now()
        OR delivery_id IN (SELECT id FROM paustik_deliveries WHERE status IN ('delivered', 'cancelled'))
     RETURNING delivery_id
  `;
  const stale = await sql`
    UPDATE paustik_deliveries
       SET sharing_enabled = false, last_location_at = NULL, updated_at = now()
     WHERE sharing_enabled = true AND last_location_at < now() - interval '24 hours'
     RETURNING id
  `;
  const [abandoned] = await sql`
    WITH stale AS (
      SELECT id FROM paustik_deliveries
       WHERE status NOT IN ('delivered', 'cancelled')
         AND created_at < now() - interval '7 days'
       ORDER BY created_at
       LIMIT 200
       FOR UPDATE SKIP LOCKED
    ), cancelled AS (
      UPDATE paustik_deliveries d
         SET status = 'cancelled', sharing_enabled = false, cancelled_at = now(),
             last_location_at = NULL, updated_at = now()
        FROM stale s
       WHERE d.id = s.id
       RETURNING d.id
    ), erased_locations AS (
      DELETE FROM paustik_latest_locations l USING cancelled c
       WHERE l.delivery_id = c.id RETURNING l.delivery_id
    ), revoked_sessions AS (
      UPDATE paustik_location_sessions s SET revoked_at = now()
        FROM cancelled c
       WHERE s.delivery_id = c.id AND s.revoked_at IS NULL
       RETURNING s.id
    ), revoked_links AS (
      UPDATE paustik_location_links l SET revoked_at = now()
        FROM cancelled c
       WHERE l.delivery_id = c.id AND l.revoked_at IS NULL
       RETURNING l.id
    ), events AS (
      INSERT INTO paustik_delivery_events (id, delivery_id, event_type, detail)
      SELECT gen_random_uuid(), c.id, 'cancelled', 'The delivery expired without completion and was closed by cleanup.'
        FROM cancelled c
      RETURNING id
    )
    SELECT count(*)::int AS count FROM cancelled
  `;
  await sql`DELETE FROM paustik_location_sessions WHERE expires_at <= now() OR revoked_at < now() - interval '7 days'`;
  await sql`DELETE FROM paustik_location_links WHERE expires_at <= now() OR revoked_at IS NOT NULL OR redeemed_at < now() - interval '7 days'`;
  const purged = await sql`
    DELETE FROM paustik_deliveries
     WHERE status IN ('delivered', 'cancelled')
       AND COALESCE(delivered_at, cancelled_at) < now() - interval '30 days'
     RETURNING id
  `;
  return send(res, 200, {
    ok: true,
    deletedLocationRows: locations.length,
    pausedStaleDeliveries: stale.length,
    cancelledAbandonedDeliveries: abandoned?.count || 0,
    purgedTerminalDeliveries: purged.length
  });
});
