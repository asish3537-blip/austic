# Pausstik account email setup

Updated 23 October 2026. Domain confirmed by the owner: **paustik.in**.

## Current status

- The app uses Twilio Verify for SMS/WhatsApp and Resend for email.
- Twilio is signed in. Its managed Verify Services page requires an account upgrade, but the account's **Try out Verify** panel provides an existing trial service. Its service identifier has been saved to Vercel Production as `TWILIO_VERIFY_SERVICE_SID`; the two existing API key settings were preserved. Provider acceptance and handset delivery have not been verified.
- This is a limited SMS trial for verified recipients, not unrestricted public SMS/WhatsApp access. The console showed 40 free verifications and seven trial days remaining. WhatsApp Verify still needs activation.
- `paustik.in` has been added to Resend with sending enabled and receiving disabled. The owner confirmed all three DNS records were added. Resend now shows **Partially Verified**: DKIM and `rsend` are verified; `send` remains pending. Its dashboard says sending is not affected.
- With the owner's explicit approval, a **Sending access** key restricted to `paustik.in` was created and saved privately as Vercel Production `RESEND_API_KEY`. The key is not stored in the repository or this guide. A new deployment is required after this setting.
- Vercel Production `EMAIL_FROM` is `Pausstik <accounts@paustik.in>`. Deployment `6cWBC1voxYZgb32wQqDBzF6Gs2YT` reached Ready with the sender and Twilio service settings, before the email key was added.
- Browser access to Resend, Twilio and Vercel is working. GoDaddy access remains explicitly rejected by a saved browser permission or managed policy. DNS changes were made by the owner, not the agent.
- The owner confirmed their GoDaddy product is **Microsoft 365 Email**. Recommendation: preserve that mailbox service and use Resend for the app's automated emails. Direct Microsoft 365 sending requires a separate authenticated integration; the app currently uses Resend only.
- Administrators continue to use their password and enrolled authenticator. Public signup cannot create an administrator.

## Finish the email connection

1. Open [the prepared Resend domain](https://resend.com/domains/6edc1667-41ea-4901-9ba0-244b99f3310f). The domain is already added and its verification has started.
2. The owner has added the DNS records. Allow propagation; if verification continues to report missing records, compare the exact three records with `output/email-setup/Paustik_GoDaddy_DNS_records.md`. Preserve existing website and Microsoft 365 mailbox records; Resend receiving is disabled.
3. The restricted sending key has been created. Finish the remaining `send` CNAME verification; do not create a duplicate key. Check the domain status and actual email delivery separately.
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
