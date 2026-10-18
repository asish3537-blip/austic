# Pausstik administrator authenticator guide

## First administrator

1. Open `/admin-setup` and enter the private owner setup code supplied by the project owner.
2. Choose your name, username, email and a password of at least eight characters, including uppercase, lowercase and a number.
3. After account creation, the app opens **Admin security**.
4. Enter your password, then scan the QR code with your authenticator app. On the same phone, copy the manual key into the app instead.
5. Enter the current six-digit code to confirm. The setup QR expires after ten minutes.
6. Save the ten recovery codes somewhere private. They are displayed once. Each recovery code works once.

The owner setup code is separate from an authenticator code. It works only before owner setup has been completed and before any admin has enabled an authenticator. Replacing a setup code does not reopen a completed setup. Submitting owner recovery suspends previous administrator accounts and revokes their sessions; records remain in the audit trail.

## Later sign-ins

Open `/admin-sign-in`. Enter your administrator username, password and the current six-digit code from your authenticator app. Use a recovery code if your phone is unavailable. If a code was just used, wait for the app to show its next code.

Existing administrators who have not linked an authenticator are directed to **Admin security** after password sign-in. Once enrollment is confirmed, sign-in requires the authenticator or a recovery code. Enrollment is per administrator.

## Lost or changed phone

Sign in with your password and a saved recovery code. Open **Admin security**, disable the old authenticator using your password and another unused recovery code, then link your new phone. Generating a new recovery-code set invalidates all earlier recovery codes.

A password reset does not remove an enrolled authenticator. If you have lost both the authenticator and all recovery codes, contact the project owner for a separately verified recovery process; the public setup form cannot bypass enrolled protection.

## Other roles

Customers, mothers and delivery partners continue using real SMS or WhatsApp verification. Their accounts also require email confirmation. Administrator authenticators do not configure or replace those services.

Production needs `DATABASE_URL`, a stable random `AUTH_SECRET` of at least 32 characters, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_VERIFY_SERVICE_SID`, `RESEND_API_KEY`, `EMAIL_FROM` and the correct `PAUSTIK_PUBLIC_URL`. WhatsApp needs an enabled sender for the Verify service. Keep values server-side.

## Deployment and security notes

- Migration `202610030001_admin_authenticator` adds encrypted authenticator records, hashed recovery codes and session security versions. It does not delete business data.
- The existing production build applies pending Prisma migrations before building the app.
- Authenticator seeds are encrypted with AES-256-GCM using a key derived from `AUTH_SECRET` and bound to the administrator ID. Keep `AUTH_SECRET` stable: changing it makes existing seeds and recovery codes unusable unless they are migrated first.
- QR codes are generated on the server without sending secrets to a QR service. Setup responses are not cached.
- Verification uses 30-second steps, bounded clock tolerance, replay protection and database-backed attempt limits. Database transactions serialize code consumption.
- Enabling or disabling an authenticator revokes old sessions. Session versions prevent an overlapping sign-in from bypassing enrollment. Password resets revoke sessions and preserve enrolled factors.
- Bootstrap codes, raw seeds, recovery codes, passwords and provider credentials must never be committed to GitHub.

## Checks

The crypto tests cover RFC 6238 vectors, clock tolerance, replay rejection, encryption tampering and user binding, recovery-code format, and QR URI parameters. They do not replace live database/concurrency and browser acceptance tests. Use a dedicated test administrator to verify enrollment, sign-out/sign-in, one-use recovery and password reset after deployment.
