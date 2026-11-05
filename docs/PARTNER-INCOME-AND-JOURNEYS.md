# Partner journeys, offers and income

The website starts with Customers, Mother Kitchen Partners and Delivery Partners. The four-slide illustrated meal carousel shows base ₹69, egg ₹79, cheese ₹89 and chicken ₹99. Subscription links open `/app`; partner links preselect the signup role.

## Courier operations

An approved delivery partner opens `/delivery/dashboard`, chooses the exact kitchen city and a 5–10 km service radius, and taps Go online using my location. Permission is required. The service-area pin is distinct from delivery GPS sharing. Going offline stops new offers; accepted work stays available.

New nearby orders create an upcoming offer and an in-app notification. Ready orders can be accepted. The board polls every 20 seconds. An offer pop-up provides locality, pickup and approximate pay; full customer address/navigation appears only after acceptance. Concurrent claims have one winner. Browser/PWA push requires separate device opt-in and configured signing keys; this release does not claim native Android push receipt.

## Income

Mother and courier dashboards show recorded earnings, all-time available ledger balances, payouts recorded paid and future open-work estimates. A what-if calculator is available. Neither estimates nor calculator values are spendable money.

Admin opens `/admin/earnings` to see partner totals, open-order estimates, payment/refund/payout records and wallet movements. Wallet movement is not counted as cash. Net recorded cash movement is not profit or bank reconciliation. Synthetic TEST-LIFE orders and demo marketplace identities are excluded. Demo P&L has a separate link.

Admin may adjust estimate rules. Defaults: mother 80% of food subtotal; courier ₹9 base including 2 straight-line km, then ₹3/km, maximum ₹60. These are editable estimates before costs, not random pay. Missing coordinates use the base and display a distance warning. Accepted courier estimates retain their rate snapshot. Customer delivery fees, posted earnings and bank payouts are unaffected. Changing rules writes an admin audit entry.

## Verification

90 unit tests passed. Local browser/API checks covered the three journeys, carousel, mobile overflow, role access, offline/wrong-city filtering, upcoming offers, admin settings, concurrent acceptance and frozen accepted estimates. A complete saved order regression passed reservation, wallet debit, preparation, assignment, GPS-geofenced pickup/drop-off and separate food/courier feedback. No live order or payment was created. Six new screenshots are in Admin → Test evidence.

## Release

Additive migration `202611050002_partner_income_offers` adds courier service-area fields, delivery estimate snapshots and estimate-policy history. The existing production build applies pending migrations. All couriers begin offline for new offers and must explicitly go online. Existing assigned deliveries remain accessible.
