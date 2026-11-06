# Customer discovery and profile refresh - 6 November 2026

## What changed

Customer home now shows a controllable highlights carousel, subscriptions / one-time meals / homemade products, the saved delivery area and nearby kitchens before recent orders. The carousel uses actual published menu and kitchen data when available, plus wallet/product navigation. It does not invent active vouchers or discounts.

Discovery combines search, diet, meal period, cuisine, food budget, saved kitchens and nearest/rating/price sorting. Filters must match the same meal. A subscription kitchen must have at least three different dates in a single meal period. Food prices exclude the separately shown delivery charge.

Full order history, plans, tracking, feedback, cancellation and payment controls live at /customer/orders. The wallet lives at /customer/wallet. Checkout destinations and assistant shortcuts now use these pages. Home keeps a three-order summary after discovery; old home anchors still lead to that summary.

The profile menu shows the name and personal photo, profile/settings, Orders & history, wallet, notification inbox, push settings, language and sign-out. /account/settings saves a name and personal photo, shows read-only email/phone, links to password recovery, and reuses the existing language and real push-subscription controls. No notification permission is requested automatically. Kitchen branding remains separate.

The database change adds one nullable avatar_image text column to users. No records or existing profile data are removed. Uploads are resized in the browser and validated as small PNGs on the server using the existing image validator, which strips ancillary metadata. Profile GET/POST are authenticated, owner-scoped and active-account only; POST rejects cross-origin requests and unknown fields, including role changes.

## QA results

- 97 unit tests passed, including new combined-filter, pricing, sorting and subscription-date checks.
- TypeScript and targeted ESLint passed.
- Eight customer browser/API scenario groups passed in the isolated preview: discovery ordering and carousel, filters and destinations, saved name/photo, language persistence and push settings reachability, reservation/history/tracking/cancellation/wallet access, actual three-day subscription checkout redirect, profile security rejection cases, and 390 px / 1440 px layout without overflow or browser page errors.
- The focused product browser regression verifies mother publishing, customer time request, mother acceptance and final checkout into the dedicated Orders page.
- Five populated synthetic screenshots were added to the protected admin test-evidence gallery.

Test findings corrected: manual carousel pause is independent of hover; clear-filters remains available with matching results; filters have explicit accessible names. Screenshot capture now keeps the caret unchanged to avoid test-induced DOM attributes during hydration. Language persistence is checked after hydration.

No real customer account, charge, order fulfilment, phone GPS, bank payout or real notification receipt was tested. Push permission and device delivery still require physical-device UAT. Production publication and anonymous access checks are verified separately after release.
