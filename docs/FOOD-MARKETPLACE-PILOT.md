# Paustik food marketplace - pilot operating guide

Release date: 6 November 2026. This adds product requests and expands meal periods; it preserves existing sign-in, wallet, order tracking, feedback and admin access.

## Start here

- Customer: /customer/marketplace. Set the default delivery address and location pin first.
- Mother Kitchen: /mother/marketplace. Kitchen and mother approval, an active account and an open kitchen are required to publish sellable products.
- Admin: /admin/marketplace. Inspect the latest 100 products and 60 delivery-time requests. Completed purchases also use /admin/orders and /admin/earnings.
- Meals: /mother/dashboard to publish; customers open a nearby kitchen from /customer/dashboard.

## Dated meals

Breakfast runs 06:00-10:59 IST, lunch 11:00-16:59 and light dinner 17:00-21:00. Lunch has three components; breakfast/dinner may have one to three. Existing tier price rules remain; homemade product prices are separately set by the mother.

Customers can order a meal for one date directly from its menu card. A subscription requires 3-7 distinct dates in one meal period. Breakfast and lunch require separate plans. Multiple portions on one date still count as one day. The existing one-week manual-renewal rule remains. Every reservation must be at least 30 minutes ahead.

## Mother product listing

Add a product name, description, category (sattu, sweets, pickles or other), diet, unit/pack label, price per unit, units available and minimum units. For half-kilo purchases use a 500 g unit; for bulk by kilo use a 1 kg unit and a suitable minimum quantity. Quantities are whole units, up to 100 per request.

Choose ready batch or made to order. Ready batches require an expiry and must be delivered before it. Made-to-order items declare minimum preparation minutes; a further 30-minute travel buffer applies. Record ingredients, allergens, storage instructions and shelf-life hours. These are seller declarations, not a Paustik food-safety certification. After approval/opening, save draft products again to publish.

## Delivery-time agreement

1. Customer requests quantity and a preferred IST date/time, within seven days. The product must serve the saved address. No stock or money is taken.
2. Mother accepts the requested time or proposes another valid time.
3. Customer may counter-propose; the request returns to the mother.
4. When the kitchen agrees, customer confirmation expires after 30 minutes. Pending kitchen review expires after 48 hours.
5. The customer presses Confirm time & place order. This reserves stock, applies available wallet credit once and creates an ordinary confirmed order. Any uncovered amount remains due; this request flow does not initiate a bank charge.
6. The mother prepares, marks ready, and hands over to the courier through the existing order workflow. Tracking, notifications and separate food/delivery feedback remain available.

Stock is not held during negotiation. A product selling out or changing ingredients, allergens, price or other terms requires a new request. Stale versions and repeated checkout attempts cannot create a second order or debit.

## Evening operations

All new slots end by 21:00 IST. New courier claims, pickup and departure steps run 06:00-20:29, allowing a nominal 30-minute travel buffer. This is a scheduling policy, not a traffic-based arrival guarantee. Do not accept an operational promise that your route cannot fulfil.

An already travelling courier must still record a real late handover; the system allows delivery completion and flags the late event for operations. It does not hide the event or pretend the service was on time.

## Cancellations and spare capacity

Customer cancellation remains available before preparation and at least five hours ahead. Eligible paid value minus the existing Rs 5 processing fee returns to wallet. Released unprepared stock can then be bought as a one-time meal. A paused menu remains paused.

A kitchen cancellation returns collected wallet spend in full without a customer fee. Unprepared capacity returns; food already in preparation is not automatically relisted. Prepared/returned food is never automatically advertised as fresh. Gateway payment/refund cases requiring review continue to go through operations.

## Shared records

FoodProduct links to the kitchen's meal/product identity. ProductRequest stores the customer, address, quantity, quoted terms, versioned delivery-time history, expiry and final order link. Final checkout uses the existing Order, OrderItem, WalletLedgerEntry, Notification and OrderEvent. Delivery, ratings and earnings reporting use that same order ID. Stock reservation and wallet spending are transactional.

## Neighbour pilot checklist

Use a real approved kitchen, a customer account with a correct address/pin and an approved courier with an online service area. Begin with a small consenting group and one service slot. Confirm seller identity, actual food-safety/licensing readiness, packing, storage and handover procedures before real fulfilment. Do not treat synthetic listings, test wallets or screenshots as actual supply or money.

Try breakfast, lunch and light dinner separately; a single meal; a three-day plan; a ready sweet before expiry; a made-to-order product; a bulk quantity; a counter-proposed time; and one eligible cancellation. Record expected versus actual times, food condition, partner effort and cost. Real phone GPS, real notification receipt, external payments/payouts and actual kitchen operations remain field UAT, not proven by local software tests.
