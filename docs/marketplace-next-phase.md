# Paustik — next marketplace phase

This is a planned phase, not a claim that a product shop is live. Current meal ordering already supports a single scheduled lunch from a kitchen; a subscription still requires three different days.

## Products from mother entrepreneurs

Support sattu mixes, homemade sweets, pickles and other packaged foods. Each listing needs a seller, food category, description, photos, ingredients, allergens, vegetarian/non-vegetarian category, pack weight, unit (grams/kilograms/pieces), price, available quantity, production date, best-before date, storage requirements and seller food-safety information. Variants such as 250 g, 500 g and 1 kg must have separate stock and prices. Batch and expiry data must be retained on the purchased order.

## Bulk and event orders

Customers choose quantity, delivery date, location and instructions. Each product or meal has a minimum quantity, daily capacity, preparation lead time and cutoff. The seller can accept a priced order or provide a quote with an expiry. A quote becomes an order only after customer acceptance. Show item total, packaging, delivery, discounts and any applicable taxes before confirmation.

## Separate order types

Keep SINGLE_MEAL, MEAL_SUBSCRIPTION, PRODUCT and BULK_QUOTE distinct. Subscription cancellation and wallet-credit rules must not automatically apply to shelf-stable products or a custom event order. Product returns and damaged-goods policies need their own consent and audit record.

## Data and fulfilment

Add product listings, variants, batches, inventory reservations, product order lines, bulk quote lines and fulfilment records. Snapshot the purchased product, price, batch, weight, promised delivery and accepted cancellation policy. Reserve inventory atomically; release it once on cancellation or failed payment. Split orders by seller when a basket contains multiple kitchens. Track pickup, handover, delivery, proof of delivery and exceptions for each shipment.

## Payment and rollout

Keep pilot test credit identifiable and separate from actual bank deposits, captured payments and withdrawable earnings. Enable real purchases only after the payment-provider webhook, refund handling and merchant settlement checks pass. Test overselling, expired food, quote expiry, partial fulfilment, refunds, seller permissions and bulk delivery capacity before launch.
