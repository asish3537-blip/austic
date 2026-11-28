# Customer UI completion — 1.4.2-test5

The website and native Android app retain the seven-step timeline and private preparation/handover images. The handover image explicitly describes the packed parcel. Recorded timestamps, pending steps and cancelled-order behavior remain separate from image evidence. Both customer timeline images were independently observed loading at 640×360 in the private Test order TEST-5481D563 before this release; the earlier upload-permission verification gap is closed for that order.

Meal details now expose portion-selection guidance and a quick allergen summary, alongside existing ingredient details, delivery date/time and stock counts. Exact portion weights are not stored by the current menu model and are not invented. Missing allergen information remains unknown.

Repeat orders reopen the kitchen's current menu. Website links prefill the previous meal name as a search; native repeat ordering fetches fresh kitchen/menu stock and requires the same kitchen identity. Sold-out/paused kitchens fall back to discovery. The user reviews current prices, dates and quantity; no old quote, amount, quantity or payment is reused automatically. Product purchases link to the current product marketplace. Test-order repeats remain in the private Test flow.

Order-specific support offers an email or WhatsApp draft containing the order reference only. Opening the help panel sends nothing. The user adds their question and chooses whether to send in their email/WhatsApp application. No messages are sent by the agent.

Empty kitchens, unavailable menus, zero filter matches and unconfirmed delivery each offer recovery guidance and relevant actions. Delivery can be rechecked without placing an order. No payment, cancellation or refund business rules changed.

The signed QA APK is versionCode 11, 1.4.2-test5, TEST_PAYMENTS_ONLY=true. It is a testing artifact, not a PhonePe submission. PhonePe review and the stable public download remain untouched; no emulator or real transaction is part of this pass. Native automated tests and browser review do not substitute for physical-phone acceptance.
