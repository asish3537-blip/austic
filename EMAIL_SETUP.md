# Pausstik account email setup

Updated 23 October 2026. Domain confirmed by the owner: **paustik.in**.

## Current status

- The app uses Twilio Verify for SMS/WhatsApp and Resend for email.
- The owner reports Twilio is ready. Actual delivery has not been verified in this session.
- Resend domain verification, credentials and production delivery are still pending.
- The current Vercel connector cannot read this project's settings. Browser control also failed to start. No production credentials or DNS records were changed in this update.
- Administrators continue to use their password and enrolled authenticator. Public signup cannot create an administrator.

## Finish the email connection

1. Open [Resend Domains](https://resend.com/domains), sign in, and add `paustik.in` for sending.
2. Choose **Auto Configure** and authorize GoDaddy to add the required sending records. If that option is unavailable, copy the exact records shown by Resend into GoDaddy DNS and select **Verify DNS Records**. Preserve existing website and mailbox records; receiving email is not needed for this app.
3. Wait for the Resend domain to show **Verified**. Create a key at [Resend API Keys](https://resend.com/api-keys) with **Sending access**, limited to this domain.
4. Open [this project's Vercel environment variables](https://vercel.com/paustik/paustik-vercel-upload-99710b4719064e79b771e4c157b1d215/settings/environment-variables). Save these for **Production**:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | The private sending key from Resend. Enter it directly in Vercel, never in chat or source control. |
| `EMAIL_FROM` | `Pausstik <accounts@paustik.in>` |
| `PAUSTIK_PUBLIC_URL` | `https://paustik-vercel-upload-99710b4719064.vercel.app` |

5. Redeploy the latest production deployment so the saved settings take effect. Keep the current public URL until a custom domain is working and attached to this project.

The existing `DATABASE_URL`, `AUTH_SECRET` and Twilio settings must remain configured. Configuration presence alone does not prove sender verification or successful delivery.

Official instructions: [Resend + GoDaddy](https://resend.com/docs/guides/dns/godaddy), [verified domains](https://resend.com/docs/dashboard/domains/introduction), [sending-only API keys](https://resend.com/changelog/new-api-key-permissions).

## How to create an account

1. Open `/sign-up`, select Customer, Mother or Delivery Agent, and fill in your details.
2. Request and enter the real six-digit SMS or WhatsApp code.
3. Submit the form. The app saves the account and sends an email confirmation link valid for 24 hours.
4. Open that link. Then open `/sign-in` and request a **new** phone code.
5. Customers reach their dashboard. Mothers and delivery agents stay pending until an administrator approves them.

If an account is already saved, do not register it again. Use **Need a fresh email verification link?** on sign-in. The signup confirmation screen also offers resend, including when the provider accepted an email but it never arrived.

## Failure handling in this update

- Missing email configuration stops new signup before an SMS/WhatsApp code is sent or consumed.
- Duplicate email is checked before signup verifies the phone code.
- Failed delivery does not invalidate an earlier working link. A failed new token is removed so a retry is possible, subject to request limits.
- Reset and verification-resend requests have persistent per-address and per-connection rate limits. Responses do not reveal whether an account exists.
- A successful password reset invalidates all other unused reset links and existing sessions. Enabled administrator authenticators remain enabled.
- Phone sign-in only reveals email-confirmation status after a correct phone code. If that code is consumed while email is unconfirmed, the message tells the user to confirm email and request a fresh code.

## Real-device acceptance check (pending)

Use consented test phone numbers and inboxes. Check each item after production configuration is complete:

- Customer signup through SMS; confirmation email arrives; link works once; fresh phone code opens the customer dashboard.
- WhatsApp code arrives and a verified customer can sign in.
- Mother and courier signup reach pending approval with their profiles saved.
- Resend works after a missing email; expired/used links are rejected.
- Password reset email arrives; the new password works; old sessions and other reset links stop working.
- An administrator still needs their enrolled authenticator after a password reset.
- Unknown email requests return the same neutral response as eligible accounts.

Provider acceptance is not inbox delivery. Confirm both the provider delivery log and receipt on the actual device before marking real messaging ready.
