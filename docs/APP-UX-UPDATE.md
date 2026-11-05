# App usability update — 5 November 2026

Customer orders appear above kitchen discovery when the account has saved orders. Accounts without orders continue to see discovery first. History includes pagination with 20 orders per page. The latest active order opens its timeline automatically. Active order lists refresh every 30 seconds while visible; expanded tracking refreshes every 15 seconds. Fresh courier GPS remains subject to consent, order ownership, accuracy and freshness rules.

Both one-day ordering and weekly reservations navigate to the customer's order list after success. No payment or delivery policy was changed.

Kitchen discovery now offers compact list and grid layouts with name, mother identity, cuisine, locality, rating and starting price. Mothers can upload a profile photo or kitchen logo from Your kitchen identity. PNG, JPG and WebP files are resized on the device; the server validates a bounded PNG, strips ancillary metadata and saves it alongside existing kitchen display settings. Hours are preserved. No new database table or migration is required. Only the owning active mother can edit the image. Initials are shown when no image is saved.

Administrators can open /admin/app-preview from the sidebar or overview. Customer, mother and courier views share a sample order stage in browser state. No backend write, account impersonation, reservation, wallet change or physical dispatch occurs in this preview. Green denotes progress and availability; red remains the brand and exception accent.

Validation: 80 existing email/authenticator/meal-selection checks passed, along with image validation tests. Isolated browser checks covered three role previews, zero preview writes, compact list/grid on mobile, mother upload and service-hours preservation, malformed-image and role rejection, customer order-first and empty states, one-day order navigation, uploaded-image display, pagination and desktop layout. These checks do not establish physical-phone GPS or real provider delivery.

Eight additional synthetic screenshots are available in Admin > Test evidence > App UX. The fictional Odisha order batch remains local and is not part of this release. No Production authorization token, account reset or live order seeding is included.
