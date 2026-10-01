import { database, requireLocationSession, requireMethod, requireSameOrigin, readJson, send, uuid, ApiError, withApi } from "../_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);
  const body = await readJson(req);
  const deliveryId = uuid(body.deliveryId);
  if (body.accepted !== true || body.consentVersion !== "paustik-location-v1") {
    throw new ApiError(400, "consent_required", "Confirm the location-sharing notice before starting GPS.");
  }
  const sql = database();
  const session = await requireLocationSession(sql, req, deliveryId, "courier");
  const [updated] = await sql`
    UPDATE paustik_location_sessions
       SET consent_at = now(), consent_revoked_at = NULL, consent_version = 'paustik-location-v1'
     WHERE id = ${session.id}::uuid AND revoked_at IS NULL
     RETURNING id
  `;
  if (!updated) throw new ApiError(401, "tracking_session_expired", "This courier link has expired.");
  await sql`UPDATE paustik_deliveries SET sharing_enabled = true, updated_at = now() WHERE id = ${deliveryId}::uuid AND status NOT IN ('delivered', 'cancelled')`;
  return send(res, 200, { ok: true, consentRecorded: true });
});
