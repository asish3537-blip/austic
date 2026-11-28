# Paustik 1.4.2-test1 — native checkout and refunds

This testing APK uses the existing `in.paustik.mobile` application identity and signing key. Version code is 7. It is for phone testing; it is not a PhonePe submission.

## What changed

- Added native **Test payments & refunds** screens, connected to the same private `/api/pilot` workspace used by the website.
- Added Test kitchen/menu selection, portions, one-day or multi-day plans, serving date, total and explicit Test-only acknowledgement before payment review.
- Razorpay opens only after checking the Test key, provider order, INR currency and positive server amount. The Test flow sends no account email/phone as payment prefill.
- Payment failures offer server reconciliation before retrying. Repeated attempts reuse the request key for the same selection; cancellation or confirmed payment clears it.
- Pending order identity and payment flow survive recreation/restart. Server order and refund status remain authoritative.
- Paid Test cancellations request the verified, idempotent server refund. Pending and completed refunds are distinct, with a status check and provider reference.
- Existing offline practice remains separate and requires no gateway or food delivery.
- New copy is available in English, Hindi and Odia.

## Testing-build boundaries

The `qa` build type sets `TEST_PAYMENTS_ONLY=true` and has version suffix `-test1`. Live order/account writes are blocked by the native API client; authentication and the private Test workspace remain available. No Live payment can launch from this APK. The standard release configuration remains separate.

The APK does not contain provider secrets. Razorpay Test order creation, signature verification, reconciliation and refunds use Paustik's existing server.

## Phone checks to complete

1. Install the testing APK on Android 7 or newer and sign into an existing customer account.
2. Open **Test payments & refunds** from Home, or **Orders** in this testing build. Existing website Test refunds should appear after refresh.
3. Select a Test kitchen/meal, change portions/days, and verify the total. Confirm that acknowledgement is required.
4. Open Razorpay and verify its **Test Mode** label. Use only documented provider Test details. Never enter real card/bank information or scan with a real payment app.
5. Check failure/cancel recovery and use **Check Test payment** before retrying uncertain results.
6. Cancel a paid Test order. Verify pending then completed refund status and that repeated checks retain the same refund reference.
7. Recreate/reopen the app during a pending payment, then check its server status. Check large text and keyboard layouts on the phone.

Local JVM/Android-view checks and APK verification are recorded with the delivered APK. These do not replace physical-phone payment SDK testing. No emulator or PhonePe update is part of this release preparation.

## Build

Use `scripts/build-android-native.ps1 -Mode qa` with the existing original signing setup. `-ToolsRoot` can point to an existing Android tools installation. `-RunTests` runs JVM Android-view tests, without an emulator.
