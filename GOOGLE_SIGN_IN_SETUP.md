# Google sign-in activation

Google Identity Services and Android Credential Manager are implemented, but remain hidden until `GOOGLE_CLIENT_ID` is configured in hosting.

1. Create or select a Web application OAuth client in the owner's Google Cloud project. Register `https://paustik.in` as an authorized JavaScript origin. Use only OpenID, email and profile scopes. No Gmail, Drive or contacts access is requested.
2. Set its public client ID as `GOOGLE_CLIENT_ID` in the existing production hosting project, then redeploy. This ID is not a client secret. No client secret is required for this ID-token flow.
3. Configure an Android OAuth client for package `in.paustik.mobile`, with original signing certificate SHA-1 `86:54:77:60:90:16:95:78:5E:71:DA:77:6C:2C:05:53:F3:C0:8A:EE`.
4. Complete the OAuth branding, consent and publication requirements for the actual owner and domain.
5. Test web and Android account selection, cancellation, existing-account linking, new customer account creation and sign-out with a consented test account before announcing Google availability.

The backend validates Google signatures, issuer, audience, expiry, verified email and the single-use browser/device nonce. Existing non-Google email accounts are not automatically linked through an email claim for which Google is not authoritative. Administrator accounts keep their separate protected sign-in.

Email-code login uses the existing Resend configuration. Codes are stored as keyed hashes, expire after ten minutes, are atomically consumed once and have per-email and per-IP rate limits. It supports existing customer/partner accounts, with partner approval status preserved. New accounts can use the existing email registration form.

No Google OAuth client was found in Git, production environment settings, or the accessible owner's Google Cloud project during this release. Do not substitute a Gemini API key or another application's OAuth client.
