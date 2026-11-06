# Agile release - meals and Mother Kitchen products

Release: 6 November 2026. Product owner: founder review. Status: implemented; local automated QA passed; physical neighbourhood UAT pending.

| Story | User need | Acceptance criteria | QA evidence |
|---|---|---|---|
| MK-01 | As a mother I can sell homemade products | Unit/pack, price, stock, minimum, readiness, ingredients, allergens, storage and shelf life saved; only own kitchen editable; approval gates public selling | Catalogue and ownership checks; browser product form |
| MK-02 | As a customer I can find nearby products | Saved pin and city/radius checked; paused, unapproved, expired or sold-out products excluded | Nearby catalogue test, role gates, expiry test |
| MK-03 | Both parties can agree delivery time | Request, mother accept/proposal, customer counter and final confirmation; 48-hour review / 30-minute offer expiry; version/history retained | Complete negotiation with a stale version rejected |
| MK-04 | Checkout cannot oversell or double-charge | No hold/charge during request; atomic stock/wallet update; one final order per request; changed terms rejected | Last-unit race, duplicate checkout, changed allergens and stale edit tests |
| ML-01 | Customers can buy breakfast, lunch or light dinner once | Correct IST period; direct one-time order; light meal components; 21:00 latest slot | Breakfast order; valid dinner; invalid 21:01 rejected |
| ML-02 | Customers can subscribe to a meal period | 3-7 distinct dates; one period per plan; separate plans for other periods | Breakfast plan; mixed-period and one-day plan rejected |
| OP-01 | Cancellations release safe spare capacity | Five-hour customer rule remains; keep pauses; kitchen refund has no customer fee; no prepared-food auto-relisting | Cancellation stock and wallet checks |
| OP-02 | Operations end delivery service at 9 p.m. | 21:00 latest slot; pickup/departure starts close at 20:30; real late completion still recorded and flagged | Service-window boundary tests; route guards reviewed |
| OP-03 | Admin sees the shared lifecycle | Products, quote history and linked orders visible; earnings distinguish estimates and ledger; demo identities remain separate | Admin browser page; product-to-delivery lifecycle |
| QA-01 | Existing functionality continues | Sign-in roles, wallet, subscriptions, tracking, GPS geofences, feedback, languages and evidence protection retained | Existing complete meal regression and 94 unit tests |

## Definition of done

Type checks and lint pass; unit tests pass; browser/API acceptance groups pass; four populated screenshots captured; user help and assistant guidance updated; migration is additive; no local seed data or private settings included in release. Public deployment and anonymous access smoke checks are recorded separately after publishing.

## Pilot backlog

- Founder: confirm actual operating slots, product pack conventions, preparation capacity and delivery feasibility with real partners.
- Kitchen lead: validate readiness, food-safety requirements, allergens, packing and shelf-life claims.
- Delivery lead: validate physical-phone GPS, route travel times, opt-in notifications and the 20:30 last-pickup policy.
- Finance lead: verify configured payment provider, collection/refund reconciliation and payouts before treating them as live operations.
- UAT testers: sign off actual food, delivery, cancellations and return handling; use a separate issue log with severity, owner and retest outcome.

Follow-up enhancements are not implied as delivered: national shipping, fractional-weight checkout, automatic bank payouts, dynamic route ETA, automated food-safety certification, recurring auto-debit and product subscription replenishment.
