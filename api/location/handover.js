import { database, hmacCode, requireLocationSession, requireMethod, requireSameOrigin, readJson, send, uuid, ApiError, withApi } from "../_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);
  const body = await readJson(req);
  const deliveryId = uuid(body.deliveryId);
  if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
    throw new ApiError(400, "invalid_handover_code", "Enter the six-digit handover code.");
  }
  const sql = database();
  await requireLocationSession(sql, req, deliveryId, "parent");
  const [row] = await sql`SELECT paustik_complete_handover(${deliveryId}::uuid, ${hmacCode(deliveryId, body.code)}) AS result`;
  const result = row?.result || { ok: false, reason: "unknown" };
  if (!result.ok) {
    const status = result.reason === "incorrect_code" ? 422 : result.reason === "code_expired" ? 410 : result.reason === "attempts_exhausted" ? 429 : 409;
    return send(res, status, { ok: false, ...result });
  }
  return send(res, 200, { ok: true, status: "delivered" });
});
