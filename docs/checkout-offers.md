# Checkout coupons and offers

The web checkout lists active admin-configured fixed, percentage and delivery
coupons with current savings, minimum food spend, cap, expiry and first-order
terms. Exhausted and personally used-up codes are omitted. Codes below their
minimum spend remain visible but cannot be selected. A delivery coupon cannot
be selected when there is no delivery charge to reduce. One coupon applies at
a time; the existing pricing and redemption transaction revalidates it at
confirmation. The list does not reserve a redemption.

Wallet coverage and the existing automatic first-delivery-free benefit are
displayed. No real coupon, bank promotion, provider offer or cashback commitment
was created in this release. Payment-method-specific bank/card/UPI promotions
are not integrated: verified provider terms are needed before those can be
advertised. Checkout explicitly states that none is confirmed in the quote.

The private practice web checkout has two explicitly Test-only codes: TEST10
reduces food by 10%, capped at INR 100 per checkout; TESTDELIVERY removes the
sample INR 9 per selected day. Shared integer-paise pricing is used by client
and server, saved in the practice order snapshot and sent as the exact Test
provider order amount. Invalid codes are rejected. A checkout request key
cannot be reused with a different coupon. These codes do not apply to real
orders, do not move real money and do not award real cashback. The existing
Android Test6 build continues without coupon controls; this is a web release.

Validation: six focused tests cover savings/caps/minimums, exhausted/personal/
first-order visibility, rendered terms and empty states, practice totals,
unknown-code rejection and Hindi/Odia offer-copy coverage. Full website suite:
207 tests passed. Production account-based redemption remains a separate
integration check; no real transaction was performed.
