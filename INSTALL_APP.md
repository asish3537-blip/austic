# Install Pausstik from the website

The `/install` page lets customers install the existing Pausstik web app on a supported device. It adds a home-screen icon and opens in an app window. This release does not include an Android APK, an iOS package or an app-store listing.

## For users

1. Open `/install` on the published Pausstik website.
2. **Android:** use Chrome, tap **Install Pausstik app**, and confirm. If the prompt is unavailable, use the browser menu's **Install app** or **Add to Home screen** option.
3. **iPhone/iPad:** use Safari, choose **Share → Add to Home Screen → Add**. Enable **Open as Web App** when offered.
4. **Computer:** use Chrome or Edge's install option. A browser without installation support can use **Open app**.
5. Open the Pausstik icon and sign in. Existing active accounts reach their customer, mother, delivery or admin workspace. Accounts awaiting approval reach the pending page. Administrators use the existing separate admin sign-in.

Installation is free. Meals and delivery use the current plan terms. Signing in, ordering, payments and tracking require the internet. The current pilot does not have an online payment gateway connected. The sample `/app-demo` remains available separately and does not create real orders.

The install page and role dashboards include a link back to the website. Uninstalling the app does not cancel an account, meal subscription or order.

## Implementation

- `/app` validates the existing session and routes through the established account-role rules.
- The manifest starts at `/app`. Its explicit `id` preserves the implicit identity of previous preview installations so a start-page change does not intentionally create another app identity.
- PNG app icons support 192, 512, maskable 512 and Apple touch 180 sizes.
- The globally mounted install runtime retains the browser install event across page navigation. Dismissing an install prompt is handled as a dismissal; an accepted request alone is not reported as completed installation.
- The service worker caches only the public offline page and four public icons. It does not cache account HTML or API responses. Cleanup is limited to Pausstik's own cache prefix.
- `/sw.js` uses no-cache headers; the manifest revalidates. Existing users should close and reopen the app online to receive updates.

## Checks completed before release

- Local installation page, manifest, icons and worker responded successfully.
- PNG signatures and dimensions matched the manifest.
- An unauthenticated visit to `/app` redirected to `/sign-in`.
- Thirteen isolated worker checks covered cache boundaries, private routes, API bypass and offline fallback.
- The local browser install-button fallback displayed device instructions.

Actual Android/iPhone installation and real-device messaging still need acceptance checks. A successful deployment or provider configuration is not evidence that a message reached a phone or inbox. SMS currently uses a restricted Twilio trial; WhatsApp Verify requires activation. See `EMAIL_SETUP.md` for provider status.
