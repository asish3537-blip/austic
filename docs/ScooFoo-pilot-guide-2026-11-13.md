# ScooFoo by Paustik — school-tiffin pilot

## Purpose

ScooFoo is a separate home-to-school delivery section inside the Paustik website and existing Android/web app. A parent or authorised guardian prepares and labels food at home. A dedicated courier collects it and hands it to an authorised receiving adult at school reception. It is not a Mother Kitchen meal purchase, and reception receipt does not confirm that the child has eaten.

The first proposed campus is Sri Chaitanya Techno School, Kesura/Keshorea, near PJ College, Bankual, Bhubaneswar. The organiser reported school permission and a 12:30 pm lunch time. Default planning targets are: booking before 09:00, home pickup by 11:00, school reception by 12:00 noon. Operations can change these after confirming the actual route and school calendar.

The campus is initially SETTING_UP. Requests can be recorded, but dispatch requires its exact reception point, receiving contact, active school-desk account, verified permission and APPROVED status. The public directory listing supports campus identification; it is not verification of the reception gate or a commercial affiliation.

## Links

- Introduction: https://paustik.in/scoofoo
- Parent/preparer and assigned courier workspace: https://paustik.in/school-tiffins
- Authorised school reception: https://paustik.in/school-desk
- Administrator: https://paustik.in/admin/scoofoo
- Help: https://paustik.in/help#scoofoo

Use the existing Paustik sign-in. Parents use customer accounts; mothers can also request collection for their own home-prepared tiffin. Couriers need an approved delivery account. School receiving adults first create an active, email-verified customer/mother account, then operations explicitly links their email to the school. School desk access is scoped to that school and is revoked if the account is no longer active or linked.

## Parent / preparer

1. Save your home pickup address in Settings. It must be in the school’s pilot city; operations checks the practical route.
2. Open ScooFoo from the homepage, app highlights, dedicated entry card or profile menu.
3. Choose school, home address, a tiffin label using initials/student code, class/section and 1–3 boxes. Full child names, dates of birth and photographs are not required.
4. Select one day, or add up to seven school days within the next 30 days. Weekends configured as closed, holidays, past dates and the booking cutoff are enforced.
5. Give guardian consent and submit. Each day has its own request; retrying the same label/school/date does not create another booking. No payment is collected.
6. Wait for route confirmation and courier assignment. On the booked school day, pack and label the tiffin and select “Packed, labelled & ready” before the pickup deadline.
7. Share the private six-digit pickup code only when physically handing food to the assigned courier. It is not the account login code and is not a code for the child.
8. Follow the journey and reception receipt. Before collection you can cancel; after collection contact operations for an exception/return arrangement.

## School operations and dispatch

In Admin → ScooFoo schools, open School & reception setup. Record the exact campus address and gate, receiving adult/office and phone, school-approved account emails, permission evidence, school days, holidays, daily box capacity and lunch window. Arrival must be at least 15 minutes before lunch. Approve only after checking those details.

Review requests, confirm the route and assign an approved courier. ScooFoo assignments are separate from Paustik meal jobs. A school batch serves one school on one day, allows at most three home pickups and must fit the courier’s meal-unit capacity. Operations manually checks addresses and route feasibility; automatic road optimisation and traffic ETA are not included. Larger school routes need separate arrangements before increasing these limits.

Couriers must explicitly accept an assigned school pickup before home collection. They can decline before pickup; operations is notified and must reassign it. Private home pickup details and the parent’s pickup code become available only after acceptance.

Couriers with active ordinary Paustik deliveries cannot be assigned a school batch. A courier with an active school route cannot accept competing ordinary deliveries. All home collections must finish before reporting school arrival. In-transit exceptions remain assigned until school receipt or an operations-recorded safe return/closure resolves them.

## Courier

Open the profile’s ScooFoo link to see assigned pickups. The home contact/address is visible only for assigned work, the guardian and operations. Use the navigation links as needed; opening them passes the chosen destination to Google Maps.

At each home, enter the parent’s pickup code. Five wrong attempts lock entry for 15 minutes. Collection is restricted to the booked school day and must precede its pickup deadline. After collecting the full batch, deliver to the designated school reception and select “At school reception.” The courier cannot mark their own delivery received.

Optional “Share current GPS pin” asks for device permission and sends one accurate fix to ScooFoo; it is not continuous background GPS. Fresh pins expire from display after five minutes and are cleared at terminal receipt/cancellation/return. Physical-phone GPS has not been field-tested in this release.

## School reception

Sign in with the account operations linked to the school, then open School reception desk. The manifest defaults to the current India school day, with a date selector for other manifests. It shows tiffin labels, class/section, box count and delivery history. It does not disclose the home pickup address, phone or private pickup code to reception accounts.

After physically receiving the correct labelled tiffin, confirm “Received at reception.” The app records the receiving account, timestamp and school-desk receipt method. Children are not the receiving party and couriers do not enter classrooms through this flow. When staff cannot use the app, an administrator can record a receipt with the actual receiving adult’s name and evidence; it is visibly labelled OPERATIONS_RECORDED, not SCHOOL_DESK.

## Delay and school closure

Missed reception deadlines create a single alert to the guardian, courier and operations. Active app refresh and the existing protected 15-minute background cleanup check enforce it; hosting jitter can delay an idle-app alert. A school tiffin in transit is not subject to ordinary Paustik’s automatic one-hour cancellation/wallet refund because food custody still needs resolution and no ScooFoo payment was taken.

For school closure/refusal or a delivery problem, operations records the exception and safe return arrangement. It must then record receipt at school or an adult-confirmed return/closure. This is manual operations evidence, not automated proof of a physical return. Scheduled empty-tiffin-box return pickup is not included.

## Architecture and safeguards

Public introduction / role workspaces → authenticated same-origin /api/scoofoo → separate PostgreSQL tables: scoofoo_schools, scoofoo_bookings, scoofoo_events. Existing account sessions, courier profiles, address book and notification outbox are reused; the ordinary meal-order, subscription and wallet records are kept separate.

School/day booking locks prevent over-capacity and duplicate requests. Booking/courier locks serialize dispatch and handover updates. Private pickup codes are derived on the server using AUTH_SECRET and a random nonce; code values/nonces are excluded from courier and school responses. Passwords, provider keys and signing keys remain server-only. Code-attempt counters and account/role checks are enforced server-side.

In-app notifications are generated for the relevant participants; existing opt-in push/email infrastructure processes them. Lock-screen alerts remain generic. Email delivery depends on existing provider configuration and recipient settings; no live inbox, SMS/WhatsApp, school phone, bank charge or payout was tested here. Guided Paustik Help recognises ScooFoo questions without requiring paid AI access.

## QA evidence

117 unit/regression tests passed, including India date boundaries, school calendar/cutoff, lunch buffer, state transitions and school-specific help. Fourteen isolated API/database scenarios passed: authentication; pending-campus dispatch protection; calendar/consent/address ownership; concurrent booking deduplication; school/guardian/courier privacy; route confirmation/readiness; competing ordinary delivery prevention; pickup-code lockout/replay; GPS and independent reception receipt; courier release; three-pickup batch ordering/capacity; future-day preparation rejection; one-time late alert and safe-return resolution; explicit courier acceptance, decline and reassignment.

TypeScript, scoped lint and the optimised release build passed. Local testing uses synthetic accounts, fake GPS and a controlled school-morning server clock. It does not certify actual school permission, food safety, physical handover, travel feasibility, inbox delivery or a real-device notification. Run a supervised neighbourhood pilot before relying on the service for a child’s lunch.

## Mobile carousel correction

Video controls and carousel navigation now occupy separate layout rows, with explicit Play/Pause labels and larger arrow controls. Browser measurements found zero button overlaps at 320 px and 390 px. A narrow-header overflow was also fixed. Video dialog open/close and slide navigation remain working. The full migration history, including courier acceptance, was applied successfully in a fresh isolated database.
