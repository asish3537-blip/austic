import {
  ApiError, database, finiteNumber, haversineAndBearing, requireAnyLocationSession,
  requireLocationSession, requireMethod, requireSameOrigin, readJson, send, uuid, withApi
} from "./_lib/common.js";

export default withApi(async (req, res) => {
  requireMethod(req, ["GET", "POST"]);
  const sql = database();

  if (req.method === "GET") {
    const deliveryId = uuid(req.query?.deliveryId);
    const session = await requireAnyLocationSession(sql, req, deliveryId);
    const [delivery] = await sql`
      SELECT d.id, d.order_ref, d.courier_label, d.status, d.geofence_meters,
             d.sharing_enabled, d.arrived_at, d.delivered_at,
             l.latitude, l.longitude, l.accuracy_meters, l.captured_at
        FROM paustik_deliveries d
        LEFT JOIN paustik_latest_locations l
          ON l.delivery_id = d.id AND l.expires_at > now() AND d.sharing_enabled = true
       WHERE d.id = ${deliveryId}::uuid
       LIMIT 1
    `;
    if (!delivery) throw new ApiError(404, "delivery_not_found", "This delivery is no longer available.");
    const hasPoint = Number.isFinite(delivery.latitude) && Number.isFinite(delivery.longitude);
    const deliveryDestination = session.role === "courier" || hasPoint ? await destination(sql, deliveryId) : null;
    const position = hasPoint ? {
      latitude: Number(delivery.latitude),
      longitude: Number(delivery.longitude),
      accuracyMeters: Number(delivery.accuracy_meters),
      capturedAt: delivery.captured_at
    } : null;
    const distance = hasPoint && deliveryDestination ? haversineAndBearing(
      Number(delivery.latitude), Number(delivery.longitude),
      deliveryDestination.latitude, deliveryDestination.longitude
    ) : null;
    return send(res, 200, {
      ok: true,
      delivery: {
        id: delivery.id,
        orderRef: delivery.order_ref,
        courierLabel: delivery.courier_label,
        status: delivery.status,
        geofenceMeters: delivery.geofence_meters,
        sharingEnabled: delivery.sharing_enabled,
        arrivedAt: delivery.arrived_at,
        deliveredAt: delivery.delivered_at,
        location: position,
        distanceMeters: distance?.distance ?? null,
        bearingDegrees: distance?.bearing ?? null,
        destination: session.role === "courier" ? deliveryDestination : undefined
      },
      viewerRole: session.role,
      canConfirmHandover: session.role === "parent" && delivery.status !== "delivered" && delivery.status !== "cancelled"
    });
  }

  requireSameOrigin(req);
  const body = await readJson(req);
  const deliveryId = uuid(body.deliveryId);
  const session = await requireLocationSession(sql, req, deliveryId, "courier");
  if (!session.consent_at || session.consent_revoked_at) {
    throw new ApiError(403, "location_consent_required", "The courier must confirm location sharing before sending GPS updates.");
  }
  const latitude = finiteNumber(body.latitude, "latitude", -90, 90);
  const longitude = finiteNumber(body.longitude, "longitude", -180, 180);
  const accuracy = finiteNumber(body.accuracyMeters, "accuracyMeters", 0, 50);
  const capturedAt = new Date(body.capturedAt);
  if (!Number.isFinite(capturedAt.getTime()) || capturedAt.getTime() < Date.now() - 120_000 || capturedAt.getTime() > Date.now() + 30_000) {
    throw new ApiError(400, "stale_location", "The location fix is too old to use.");
  }
  const [row] = await sql`
    SELECT paustik_record_location(
      ${deliveryId}::uuid, ${session.id}::uuid, ${latitude}, ${longitude}, ${accuracy}, ${capturedAt.toISOString()}::timestamptz
    ) AS result
  `;
  const result = row?.result;
  if (!result?.accepted) {
    const status = result?.reason === "too_soon" ? 429 : result?.reason === "delivery_closed" ? 409 : 422;
    return send(res, status, { ok: false, ...result });
  }
  return send(res, 200, { ok: true, ...result });
});

async function destination(sql, deliveryId) {
  const [row] = await sql`
    SELECT destination_lat AS latitude, destination_lon AS longitude
      FROM paustik_deliveries WHERE id = ${deliveryId}::uuid LIMIT 1
  `;
  return row ? { latitude: Number(row.latitude), longitude: Number(row.longitude) } : null;
}
