# QA report - food marketplace and meal periods

Date: 6 November 2026. Environment: isolated local Next.js/PostgreSQL preview, synthetic accounts, simulated GPS. No real food, bank payment or message was sent.

## Results

- 94/94 unit tests passed.
- TypeScript and targeted ESLint checks passed.
- Nine marketplace/API/browser scenario groups passed.
- The previous eight-group complete meal-order regression passed.
- Browser page errors: zero in the captured customer, mother and admin journeys.
- Mobile widths checked at 390 px; admin at 1440 px.

| Case | Result | Verification |
|---|---|---|
| QA-01 | PASS | Mother creates a product; nearby customer discovers correct unit, price and ingredients |
| QA-02 | PASS | Time negotiation, customer counter, kitchen acceptance, final checkout, stale-version rejection and duplicate-checkout idempotency |
| QA-03 | PASS | Kitchen cancellation returns full wallet spend and unprepared capacity without a customer fee |
| QA-04 | PASS | Ready-batch expiry, bulk minimum, after-21:00 slot and expired request are rejected without payment |
| QA-05 | PASS | Concurrent purchase of the final unit has one winner and never debits the losing wallet |
| QA-06 | PASS | Changed allergens invalidate old agreements; stale stock edits cannot overwrite a new inventory state |
| QA-07 | PASS | Breakfast one-time and 3-day plan work; light dinner accepts 21:00 and rejects 21:01; mixed periods and one-day subscriptions are rejected; cancellation preserves menu pause |
| QA-08 | PASS | Product order completes the shared kitchen, courier claim, GPS pickup/drop-off and separate feedback lifecycle |
| QA-09 | PASS | Browser form flow: mother publishes, customer requests time, mother accepts, customer confirms checkout and lands on Orders; mobile and admin screens have no overflow |

## Evidence

Four populated screenshots are captured for the delivery-time agreement, customer products, mother editor and admin oversight. They are synthetic test evidence, accessible through the protected admin gallery.

## Findings corrected during this release

- Cancelled capacity no longer forces a paused menu back on sale.
- Kitchen cancellations return wallet spend without a customer cancellation fee.
- Ready batch expiry and changed ingredients/allergens prevent stale checkout.
- Duplicate confirmation is idempotent, and stock competition cannot debit a losing customer.
- India date rollover and meal-period boundaries are explicit.
- A GPS test initially sent location updates too fast; the test was adjusted to respect the existing rate limit, which remains active.

## Practical limits and required UAT

No physical-phone route, food preparation/quality, real email/SMS/WhatsApp/push receipt, live payment, bank payout or external courier integration was validated in this release. Test wallet credit is not cash. The 30-minute travel buffer is a scheduling allowance, not a road ETA. Real late delivery completion remains recordable and flagged; no software can guarantee physical arrival by a cutoff.

No real customer, seller or order was created for the production smoke check. Final production status and checks will be noted after release.
