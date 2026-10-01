import { randomInt, randomUUID } from "node:crypto";
import {
  ApiError, database, finiteNumber, hmacCode, nonEmptyString, randomToken,
  requireAdmin, requireMethod, requireSameOrigin, readJson, send, sha256, shareUrl, uuid, withApi
} from "../_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["POST", "GET", "DELETE"]);
  requireAdmin(req);
  const sql = database();

  if (req.method === "GET") {
    const rows = await sql`
      SELECT id, order_ref, courier_label, status, geofence_meters,
             sharing_enabled, created_at, arrived_at, delivered_at
        FROM paustik_deliveries
       WHERE status NOT IN ('delivered', 'cancelled')
       ORDER BY created_at DESC
       LIMIT 100
    `;
    return send(res, 200, { ok: true, deliveries: rows });
  }

  requireSameOrigin(req);
  const body = await readJson(req);

  if (req.method === "DELETE") {
    const id = uuid(body.deliveryId);
    const [result] = await sql`SELECT paustik_cancel_delivery(${id}) AS cancelled`;
    if (!result?.cancelled) throw new ApiError(409, "delivery_not_cancellable", "This delivery is already closed or does not exist.");
    return send(res, 200, { ok: true, deliveryId: id, status: "cancelled" });
  }

  const orderRef = nonEmptyString(body.orderRef, "orderRef", 64);
  const courierLabel = typeof body.courierLabel === "string" && body.courierLabel.trim()
    ? nonEmptyString(body.courierLabel, "courierLabel", 80)
    : "Paustik courier";
  const latitude = finiteNumber(body.destinationLat, "destinationLat", -90, 90);
  const longitude = finiteNumber(body.destinationLon, "destinationLon", -180, 180);
  const geofenceMeters = Math.round(finiteNumber(body.geofenceMeters ?? 300, "geofenceMeters", 100, 1000));
  const id = randomUUID();
  const courierLinkId = randomUUID();
  const parentLinkId = randomUUID();
  const courierToken = randomToken();
  const parentToken = randomToken();
  const handoverCode = String(randomInt(100000, 1000000));
  const handoverCodeHash = hmacCode(id, handoverCode);

  await sql`
    SELECT paustik_create_delivery(
      ${id}::uuid, ${orderRef}, ${courierLabel}, ${latitude}, ${longitude},
      ${geofenceMeters}, ${handoverCodeHash}, ${courierLinkId}::uuid,
      ${sha256(courierToken)}, ${parentLinkId}::uuid, ${sha256(parentToken)}
    )
  `;

  return send(res, 201, {
    ok: true,
    delivery: { id, orderRef, courierLabel, status: "assigned", geofenceMeters },
    courierUrl: shareUrl(req, "courier.html", id, courierToken),
    parentUrl: shareUrl(req, "track.html", id, parentToken),
    handoverCode,
    handoverCodeExpiresInHours: 24,
    linkExpiresInHours: { courier: 12, parent: 48 }
  });
});
