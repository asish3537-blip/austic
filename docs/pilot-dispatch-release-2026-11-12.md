# Paustik neighbourhood pilot release

Prepared 12 November 2026. This report distinguishes isolated software tests from live provider or physical-device checks.

## Ordering and delivery

- Customers can choose a regular subscription of 3–7 days or buy a published one-time meal. Occasional Mother Kitchens can publish a selected-date special, with its own price and 1–3 meal components. Specials are excluded from subscription plans.
- Homemade products retain preparation-time agreement and customer confirmation before checkout. New purchases and subscriptions require an eligible online delivery partner; existing booked deliveries remain visible.
- Checkout reviews food, distance-based delivery, coupon savings, wallet credit and remaining balance. Quotes expire after 15 minutes; repeat submission of the same quote returns the original checkout without a second debit.
- Default delivery pricing is ₹9 for the first kilometre, then ₹5 per additional kilometre, capped at ₹150. It uses straight-line pin distance, not road distance. Admin can change it in Dispatch & offers. This is separate from courier-pay estimates.
- WELCOME10 gives eligible first customers 10% off food, minimum food ₹69, maximum discount ₹30. It is valid for 30 days from migration, limited to 100 redemptions and once per customer. Admin can pause it or create other offers. Cancelled orders retain their coupon usage record.
- Couriers review nearby offers and can claim up to three orders in one atomic batch. Pickup and drop-off clusters must fit 2 km and a 30-minute scheduled-delivery window, within the courier’s meal-unit capacity. All batch collections must finish before departing for delivery.
- Pickup uses a kitchen-only code or nearby GPS. Customer handover uses a customer-only six-digit order code or optional 50/100-metre GPS verification. Five incorrect attempts lock code entry for 15 minutes. Codes are not visible to couriers. Operations exceptions require an admin reason and audit entry.
- Customer order history shows tracking, receipt breakdown, and food/delivery ratings after completion. GPS is shown only with courier consent and a sufficiently recent fix. Codes work when GPS is unavailable.
- Active orders one hour past scheduled delivery are cancelled by server checks. Paid value returns once to the wallet without the voluntary-cancellation ₹5 fee. Courier assignment/location is cleared and pending/available earnings reversed. Prepared stock is not put back for sale. A wallet credit is not a bank refund.
- Vercel schedule `overdue-orders` calls the protected cleanup route every 15 minutes. Hosting jitter can delay the background check; customer tracking and courier/admin refresh also enforce the same rule. This is not an exact-to-the-minute timer.
- Group bookings of 9–100 meals use a separate flow: customer request, kitchen acceptance, operations vehicle/courier quote, customer confirmation, preparation and dispatch. They do not enter normal three-order batching. Availability and stock are rechecked at confirmation.

## Kitchen quality and income

- Mother dashboard links to Quality & evidence and Bulk bookings. Photos and FSSAI documents remain private to the owning kitchen and admins. FSSAI review records an operations decision; it does not independently validate the licence with a regulator.
- Admin can record inspections, training assignments, evidence reviews and follow-ups. Mother completion is submitted for admin confirmation.
- Kitchen and courier dashboards distinguish recorded earnings, available payouts, booked estimates and future open work. Calendar-month figures use India time. Estimates do not transfer money to bank accounts.
- Admin Dispatch & offers shows delivery settings, vouchers, social-channel links, batches, partner estimates and order contribution. Cancelled/failed deliveries are excluded from estimated contribution. Contribution excludes ingredients, processing fees and other operating costs; it is not audited profit.

## Website and app

The public website has a muted illustrated-video hero, optional watch-with-sound dialog, search entry, published Mother Kitchen/dish cards, real completed-order rating aggregates, app feature cards, installation QR and organised footer. Reduced-motion/data-saving users get a static background. App screens retain role-specific navigation and a compact footer. Social links appear only after the owner saves actual YouTube/Facebook/Instagram URLs in admin. No social accounts were created in this release.

The Android wrapper continues to load the live app; this release does not create a new APK or Play Store listing. QR opens https://paustik.in/install. No application secret is included in the public release files.

## How to use

1. Customer: sign in, save delivery pin, discover a kitchen, open its menu and choose a one-time meal or subscription. Review the quote and voucher before ordering. Open Orders to track it; share the handover code only when the courier arrives.
2. Mother: sign in, publish menus or selected-date specials, prepare accepted orders, upload evidence and use the pickup-code button when handing food to the assigned courier.
3. Courier: sign in with an approved delivery account, choose a service neighbourhood or GPS area, set meal capacity, review/accept a suitable batch, collect all orders, then deliver each using the customer code or enabled GPS option.
4. Admin: open /admin/dispatch for pricing/offers/contribution; /admin/bulk for arranged group deliveries; /admin/quality for evidence/training; /admin/test-evidence for screenshots. Existing password/authenticator protection is preserved.

## Verification results

- Prisma schema validation, TypeScript and scoped lint: passed.
- Unit/regression suite: 110 tests passed.
- Optimised release build: passed, including all new protected pages.
- Thirteen isolated API/database scenarios passed: role boundaries; quoted checkout/concurrent replay; subscription allocations; one-time special visibility/subscription exclusion; product agreement/checkout; competing last coupon; three-order courier claims/capacity; OTP lockouts/privacy/ordered pickup; GPS alternative; bulk approval/quote/dispatch; private evidence/inspection/training; overdue cancellation with exactly one wallet credit; admin reconciliation/secret exclusion.
- Cleanup authorization separately verified: unauthenticated 401, correct fixture authorization 200.
- Browser checks: customer, mother, courier and admin sign-in; customer discovery/orders; kitchen evidence; incoming courier offer; admin dispatch. Mobile 390 px and desktop 1440 px checked. Screenshots use synthetic local accounts and a controlled daytime clock.

## Pilot limits and owner actions

No physical-phone GPS, real push receipt, SMS/WhatsApp delivery, bank payout or live financial charge was tested in this run. Keep payment-provider setup and real-device UAT separate. Existing no-courier notices remain intentional. The production deployment and schedule must report success before considering background cancellation live. Add actual social profile URLs after creating channels. Inspect preparation evidence and verify partner licence details before real fulfilment.

## Production verification

Release 85bc0d7 deployed successfully on paustik.in. Vercel reported the overdue-orders Production schedule Active, every 15 minutes. Its manual execution completed successfully in 1.4 seconds with 0% errors. The signed-in customer history showed the 8 November order cancelled; the wallet displayed full paid-value delivery-delay credits. Protected cleanup rejected unauthenticated access (401); admin dispatch and kitchen evidence rejected unauthenticated access (403). The video, installation QR and existing APK returned 200. No live purchase, SMS or bank payout was made during these checks.
