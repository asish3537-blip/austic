import { database, send, withApi, requireMethod } from "./_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["GET"]);
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.PAUSTIK_ADMIN_TOKEN) missing.push("PAUSTIK_ADMIN_TOKEN");
  if (!process.env.CRON_SECRET) missing.push("CRON_SECRET");
  if (missing.length) {
    return send(res, 503, { ok: false, state: "setup_required", missing });
  }
  const sql = database();
  const [row] = await sql`
    SELECT to_regclass('public.paustik_deliveries') IS NOT NULL AS schema_ready
  `;
  if (!row?.schema_ready) return send(res, 503, { ok: false, state: "schema_required" });
  return send(res, 200, { ok: true, state: "ready", service: "paustik-location" });
});
