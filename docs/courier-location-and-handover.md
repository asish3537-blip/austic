# Courier location and handover — 13 November 2026

Approved delivery partners open `/delivery/dashboard` after sign-in. The workspace requests a fresh device location and saves a 25 km pickup-search area. Browser location permission is still required. Offline remains available. Opening the workspace again starts a new automatic location attempt. Location errors and the saved search centre are shown on the page; an inaccurate fix over 1 km is rejected. The optional pickup-area chooser is a fallback when GPS cannot provide a useful position.

Nearby discovery uses distance from the saved pin, rather than an exact city-name match. A database geographic prefilter runs before pagination; the exact radius is checked again for offers and acceptance. Existing assigned deliveries remain visible even outside this area or while offline. Search radius does not change pickup/drop-off verification distances or the three-order local batch rules. New pickup/departure hours remain 06:00–20:30 IST.

## Codes without GPS

- Once a courier accepts, the mother’s Incoming orders displays the six-digit **Kitchen pickup OTP** automatically, refreshing every 15 seconds.
- The customer’s Orders displays a separate **Your delivery OTP** above the tracking disclosure, from courier acceptance until completion. No customer GPS permission is needed to read or use it.
- The courier enters the mother’s code at pickup and the customer’s code only at physical delivery. Codes are private to the relevant order owner and are not returned in the courier offers API.
- Incorrect codes are rejected; existing attempt limits remain. A pickup code cannot confirm customer delivery. Completed/cancelled handovers stop exposing codes.
- ScooFoo school pickups are assigned separately through school operations. The courier workspace links to `/school-tiffins`; school reception confirmation remains independent.

## Verification

122 unit/regression tests passed, including five geographic discovery tests. Isolated API/database tests passed for: courier-only availability and 25 km validation; mismatched-city geographic discovery and distant-location exclusion; private role-scoped codes; complete pickup-to-delivery using codes without shared GPS or a customer GPS pin; offline offers. TypeScript and lint checks passed before release. These tests used synthetic local accounts and did not send external messages, take money or create real deliveries.

Actual phone GPS and browser permission behavior depend on the device. Production account GPS is checked separately after release; do not interpret synthetic coordinates as a physical-device test.
