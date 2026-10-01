# Live delivery tracking and geofencing

## Status

The project includes the Vercel API and database schema, but live tracking is **not active yet**. The Vercel project has no connected database or required environment variables. Complete the activation steps in [README.md](README.md) and redeploy before using these pages for cross-device tracking.

## Delivery flow

1. Operations creates a delivery at `delivery-admin.html`, enters its reference, courier label, destination latitude/longitude, and a geofence radius from 100 to 1,000 m.
2. The API returns a single-use courier link, family link, and six-digit handover code. Send the code separately from either link.
3. The courier opens their link, accepts the location notice, clicks **Start location sharing**, and accepts the browser’s GPS prompt. The browser submits HTTPS fixes while the delivery page is active.
4. The API checks session consent, delivery state, timestamp, GPS accuracy (maximum 50 m), update interval, and plausible movement. It stores only the latest point—no route history.
5. The server calculates distance to the destination. Arrival requires two consecutive fixes whose distance plus reported GPS uncertainty is within the geofence. Leaving the geofence requires two fixes clearly beyond the radius plus a 75 m buffer.
6. The family page polls for status and displays the courier’s current point, distance, and direction on an inline schematic. The family link does not expose the destination coordinates. No external map provider is used.
7. Once the server marks the delivery as arrived, the recipient can enter the separate handover code. Five incorrect attempts lock the code. Successful handover closes the delivery, revokes courier access, and deletes the current point. Stop or cancellation does the same for the point; cleanup makes expired points unavailable and then deletes them.

## Browser and geofence behavior

- Geolocation is opt-in and is only captured after the courier explicitly starts sharing. The site requires a secure HTTPS context and browser permission.
- Updates are limited to one accepted fix every five seconds and stop when the courier presses Stop, closes/leaves the page, or the delivery closes.
- GPS accuracy is not guaranteed. Poor fixes are rejected. Arrival needs two fixes whose uncertainty fits inside the boundary; a geofence can therefore take longer to register near its edge.
- The configured radius should reflect the delivery site: tighter for a small building, wider for a large campus or weak GPS conditions. Operations supplies the destination coordinates and radius.
- A high-speed jump above 55 m/s is rejected as implausible. This is a sanity check, not proof against a modified device or deliberate GPS spoofing.
- Sessions last at most six hours. The courier link expires after 12 hours; the family link expires after 48 hours. Each link can be redeemed once per browser session.

## Data and access controls

- Precise courier coordinates are stored as one latest point, expire from tracking views after 24 hours, and are removed in the daily cleanup. They are deleted immediately on Stop, handover, or cancellation.
- Completed/cancelled delivery data, including destination coordinates and audit events, is purged after 30 days. Active deliveries older than seven days are cancelled by cleanup.
- The operations admin secret is server-side and must not be embedded in any public page or source control.
- The location consent notice is versioned (`paustik-location-v1`). Courier sessions cannot send further accepted points after consent is revoked.
- Use individual staff accounts and a formal privacy/retention review before moving beyond a controlled pilot. The current shared admin bearer secret is suitable only for a small, trusted operations pilot.

## API routes

| Route | Purpose | Access |
| --- | --- | --- |
| `GET /api/health` | Backend/database setup status | Public status only |
| `POST /api/admin/deliveries` | Create delivery and issue one-time links/code | `Authorization: Bearer <PAUSTIK_ADMIN_TOKEN>` |
| `GET /api/admin/deliveries` | List active deliveries | Admin token |
| `DELETE /api/admin/deliveries` | Cancel a delivery and erase its latest point | Admin token + same-origin request |
| `POST /api/location/session` | Redeem one-time link into an HttpOnly session cookie | Same-origin request |
| `POST /api/location/consent` | Record the courier’s explicit consent | Courier session + same-origin request |
| `GET /api/location?deliveryId=...` | Read status and role-limited location data | Parent or courier session |
| `POST /api/location` | Submit a courier GPS fix | Consented courier session + same-origin request |
| `POST /api/location/stop` | Revoke sharing and remove the latest point | Courier session + same-origin request |
| `POST /api/location/handover` | Confirm delivery with six-digit code | Family session + same-origin request |
| `GET /api/cleanup` | Expire/purge old data on the daily schedule | Vercel Cron bearer secret |

## Known scope limits

The system uses latitude/longitude, not address geocoding. It has no map tiles, background location app, push notifications, courier accounts, customer accounts, payment or order integration, staff-level admin roles, or dispatch/routing optimization. Web GPS depends on the courier’s browser and device; it may stop when the browser is closed or the operating system suspends it. The site’s local demo portal still uses fictional browser-local records and is not connected to this service.
