# Marketplace and delivery update — 6 November 2026

- Products enabled by an approved, open Mother Kitchen list directly. No additional product-approval step.
- Product delivery is checked against a 25 km straight-line radius from the kitchen; meal-plan kitchen radii retain their configured values.
- Same-city published products remain visible outside the saved delivery area, with a coverage warning and disabled booking. A saved city can be browsed while its GPS pin is missing; booking still requires valid pins.
- Product requests, final checkout, one-time meals and new subscriptions require an approved, active courier marked available whose service area covers the kitchen. This is a current availability check, not a guaranteed assignment or road ETA.
- Existing subscribed meals continue through confirmation, preparation and pickup even when no courier is online. Operations must fulfil existing commitments.
- Product purchases and tracking: /customer/purchases. Meal history: /customer/orders. Links are available in marketplace and profile menus.
- In-app notification inbox gets a visible unread badge. New ORDER/DELIVERY events can send transactional emails to verified active customers/mothers using existing Resend configuration. No historical email backfill.
- Email acceptance, attempt count and retry lease are persisted. Retries occur on order events and inbox polling, up to three attempts within 23 hours; there is no independent minute-by-minute retry worker in this release. Provider acceptance is not proof of inbox delivery.
- Device push remains opt-in under account settings. SMS/WhatsApp has not been activated or verified by this release.
- Website and customer app hero images sit behind readable text and CTA buttons, including 390px mobile layouts.

## Verification
97 existing automated tests passed; TypeScript and scoped lint passed. Local synthetic integration checks covered direct publication, 25 km coverage, out-of-range visibility, offline booking rejection without stock debit, online checkout, duplicate checkout, new-subscription guarding, continued existing subscription preparation, separated product history and pickup notifications. Captured email transport verified provider acceptance, retry after rejection, duplicate protection and opt-out handling. No real order, payment or message was created for these checks.

Five proposed products were saved as drafts under Sonali's existing Mother account. Proposed prices and packs are review values; recipe, allergen, stock, preparation and storage/shelf-life facts need Mother confirmation before listing. Her existing sattu product was preserved. The existing sattu allergen field should be corrected because its ingredients include wheat/dry fruits while allergens say None.
