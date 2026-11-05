# Notifications and Google Maps

All active roles have a Notifications control and /notifications inbox. It shows the latest 30 account updates and an unread count. Users can mark one or all updates as read. Database ownership checks apply to every request.

## Device push

Supported browsers and installed web apps can opt in from Notifications > Enable device push. No permission prompt is shown automatically. Users can turn push off on the same device or request a test notification. The test is limited to once per 30 seconds. Browser settings, OS notification settings and background restrictions still apply.

Web Push requires persistent WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY values in Vercel Production. Only the public key is returned to the browser. Production key activation needs the owner's approval and is not implied by the simulated local delivery checks. Keep the pair stable across deployments; rotating keys may require subscribers to turn push off and enable it again. No paid push provider is provisioned.

The additive web_push_devices table stores endpoint encryption information and binds devices to an active sign-in session. Expired/revoked sessions, suspended users and outdated admin authentication sessions are excluded. Sign-out also unsubscribes the browser when possible. Expired endpoints are removed after provider 404/410 responses. Transient failures keep the delivery cursor and retry on a later order/inbox request; no guaranteed scheduled retry service is configured in this release.

Committed order, reservation, cancellation, kitchen progress, courier progress, partner approval and payment events schedule dispatch after the response. Notifications are batched into generic lock-screen alerts. Order descriptions, names, addresses, balances and payment details stay behind sign-in in the inbox. Test marketplace users and DEMO notifications are excluded from outbound push.

This is browser/PWA push. A native Android APK requires Firebase Cloud Messaging configuration for native background push. Its website-based inbox can be used independently. On iPhone/iPad use the installed Home Screen web app; unsupported browsers keep the inbox available.

## Google Maps

Kitchen profiles, selected admin map points and fresh courier tracking provide explicit Google Maps and directions links. Google Maps URLs work without a Maps API key. They may open the Google Maps app or browser. No Google map iframe or location request is loaded automatically. Tapping a link sends the displayed coordinates to Google. The admin coordinate diagram remains local. Paustik does not claim traffic-based arrival estimates or road routing inside the app.

Courier location still requires consent, active delivery, freshness and accuracy checks, and is removed after completion. Google directions do not change the delivery state or geofence rules.

## Verification

85 auth, email, meal-selection, push-safety and service-worker checks passed. Isolated browser tests covered opt-in/off, session ownership, invalid endpoints, CSRF, Google URLs, no map requests before a tap and mobile layout. A database-backed test used a mocked transport to verify batching, cursor advancement, revocation and expired-device cleanup. No physical-phone push receipt is asserted by these tests. The full local reservation, wallet, delivery/GPS and feedback regression also passed.
