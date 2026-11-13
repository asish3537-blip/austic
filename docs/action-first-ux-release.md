# Paustik app usability update — 13 November 2026

## What users see first

- Customer home: up to ten active orders, with Pay & track or Track order, before promotions and kitchen discovery. Completed and cancelled orders stay in history.
- Mother kitchen: active orders first; accept/cook/ready actions are prioritised over setup. Pickup OTP is automatic. Menu, product requests and the shop have direct shortcuts. Earnings and branding are expandable below the workspace.
- Courier: accepted deliveries and their next action appear before available offers, service-area settings and earnings. OTP entry precedes optional maps/GPS controls. All prior dispatch, capacity, geofence and role checks remain server-enforced.
- Homemade shop: active requests and agreed delivery times appear before the catalogue and editor. Completed requests are available through a history toggle. Products retain kitchen-authored names and descriptions.

## Languages and accessibility

The main kitchen, courier, order-tracking, product-request and payment actions now use the shared English/Hindi/Odia dictionary. Status codes are normalised before translation. Product names and user-entered content are preserved, not machine-translated. Additional English explanatory text remains in some secondary/help and administrative screens. Native wording should continue to be refined through the neighbourhood pilot.

The chosen language persists on the device. Regional scripts use available system fonts with increased line spacing. Primary controls have touch-friendly heights and wrap on narrow screens. Action feedback appears above the relevant workspace.

## Payments

The existing Razorpay integration creates an order on the server, verifies the checkout signature, and confirms captured amount/currency/order identity against Razorpay before recording payment. Signed payment.captured webhooks and Already paid? Check status reconcile callbacks. Repeated receipts are idempotent; payments after closure are flagged for refund review.

The release shows payment readiness and the pending amount separately from the order total. Checkout is offered only when server keys and the webhook secret are configured. Only the remaining pending balance after wallet credit is charged. Partner bank payouts are a separate function and are not activated by customer checkout.

On 13 November, the owner saved RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET for Production. Their values were not read or put in client source. A production deployment is required to load them. A completed live payment, actual bank settlement and delivery of a real Razorpay webhook are separate acceptance checks; no real charge was authorised during this update.

## Verification

127 unit/regression tests passed, including critical Hindi/Odia actions, API status translation and payment-signature tamper rejection. TypeScript and lint checks passed. Browser checks use synthetic local accounts and phone-size layout; the Odia mother flow accepted an order and exposed Start cooking. Customer, courier and live rollout observations are recorded in the accompanying release evidence.
