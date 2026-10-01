import { randomUUID } from "node:crypto";
import {
  ApiError, database, randomToken, requireMethod, requireSameOrigin,
  readJson, send, setLocationCookie, sha256, uuid, withApi
} from "../_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);
  const body = await readJson(req);
  const deliveryId = uuid(body.deliveryId);
  if (typeof body.shareToken !== "string" || body.shareToken.length < 32 || body.shareToken.length > 128) {
    throw new ApiError(401, "invalid_delivery_link", "This delivery link is not valid.");
  }
  const token = randomToken();
  const sql = database();
  const [session] = await sql`
    SELECT session_role, session_expires_at
      FROM paustik_redeem_location_link(
        ${deliveryId}::uuid, ${sha256(body.shareToken)}, ${randomUUID()}::uuid, ${sha256(token)}
      )
  `;
  if (!session) throw new ApiError(401, "invalid_delivery_link", "This delivery link expired or has already been used.");
  setLocationCookie(req, res, deliveryId, session.session_role, token, session.session_expires_at);
  return send(res, 200, { ok: true, deliveryId, role: session.session_role, expiresAt: session.session_expires_at });
});
