# Paustik 1.4.2-test3 — customer order photos

VersionCode 9, original package/signing identity, restricted QA build. PhonePe 1.4.1 remains in review; do not replace or cancel it without a later user instruction.

Customers can open Preparation & handover photos from real-order tracking. The two native image sections show the existing kitchen-uploaded PREPARED and HANDOVER records and upload timestamps. Missing photos are explicitly marked Not uploaded yet; failed downloads can be refreshed. Images are fetched only from the configured Paustik origin with the existing session, without redirects or disk caching, with response-size and decoded-dimension limits. The existing server checks the order relationship before returning photo metadata or pixels.

For this QA APK, Home also offers Real order photos (view only), since the normal Orders tab opens the private Test workspace. Real-order mutations remain blocked. Signed-in Test orders offer the same photo-viewing screen but use the separate owner-scoped pilot photo endpoint and clearly label the photos as practice evidence. Offline device practice does not fabricate photos.

The website already supports the existing upload/view endpoint; no backend or payment-rule change is needed. Photos are supplementary meal/parcel records, not independent food-safety certification or proof of a completed physical handover.

Verification includes native rendering of both photo stages, missing-photo recovery and download-error behavior using synthetic image fixtures. It does not upload customer photos, create live orders or perform a physical handover. No emulator or new store screenshots are used.
