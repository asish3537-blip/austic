import { database, requireLocationSession, requireMethod, requireSameOrigin, readJson, send, uuid, withApi } from "../_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);
  const body = await readJson(req);
  const deliveryId = uuid(body.deliveryId);
  const sql = database();
  const session = await requireLocationSession(sql, req, deliveryId, "courier");
  const [result] = await sql`SELECT paustik_stop_sharing(${deliveryId}::uuid, ${session.id}::uuid) AS stopped`;
  return send(res, result?.stopped ? 200 : 409, { ok: Boolean(result?.stopped), sharingEnabled: false });
});
