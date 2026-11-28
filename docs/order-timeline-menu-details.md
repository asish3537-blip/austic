# Order timeline and meal details — 1.4.2-test4

Customer tracking now presents seven milestones: order placed, kitchen confirmed, preparing, ready for courier, picked up, on the way and delivered. Recorded event timestamps are displayed only when present. Earlier stages without an event have no invented time; cancellation/failure stops unobserved stages. Photos do not advance status.

PREPARED kitchen evidence appears under preparation; HANDOVER evidence appears under ready-for-courier, when the upload is available in the existing workflow. The customer can view the uploaded images and times, see an explicit missing state and retry photo loading. Authenticated real-order and owner-scoped Test evidence remain separate. Photo downloads on Android retain origin, size, dimension and redirect protections. PhonePe and the stable public APK download are unchanged.

Menus show the existing components even when a description is present, clarify per-serving pricing, and offer ingredients/allergen details. Existing stored ingredients/allergens are included in discovery and public directory payloads. Missing allergen information is explicitly unknown, never treated as allergen-free. Portion size varies by kitchen; no new quantities or safety claims are fabricated. English, Hindi and Odia copy is shared with the native asset generator.

Testing APK: original package/certificate, versionCode 10, versionName 1.4.2-test4, TEST_PAYMENTS_ONLY=true. QA Home permits view-only access to real orders; its normal Orders entry remains the private Test workspace. Test orders now expose Track Test order. The source and signed testing artifact are separate from a store submission.

Validation includes timeline states, missing timestamps, photo placement in Android views, populated/missing allergen information, menu search and existing payment/refund guards. Physical phone visual acceptance remains a user check; no emulator or real payment is authorized for this pass.
