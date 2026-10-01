# Paustik

**Purity. Hygiene. Delivered.**

Paustik connects customers with nearby mother-led kitchens and local delivery partners. This repository now contains a Next.js application foundation alongside the existing Vercel live-delivery-tracking pilot.

## Current implementation stage

The source implements account registration and sign-in with one-time phone codes, session cookies, email confirmation links and server-side role checks. Production phone codes use Twilio Verify; email links use Resend. Local development without `DATABASE_URL` switches to an isolated SQLite account store and displays development-only phone codes and verification links.

The new Next.js app is the root route after deployment. The previous interactive concept is kept at `/legacy-demo.html`; the delivery operations, courier and tracking pages remain at their prior URLs. The sample concept still uses local browser data and is not connected to the new marketplace accounts.

Marketplace schema also models nearby-kitchen discovery (city, PIN code, coordinates and service radius), kitchen-specific meals and menus, weekly menu cycles, daily/weekly/monthly plans, versioned cancellation and meal-change policies, order/payment ledgers, earnings, payouts and admin audit history. Customer browsing/checkout, mother menu CRUD, approval tools, order operations, real payment processing and analytics are later implementation phases; dashboard copy identifies these as upcoming instead of pretending they are live.

The `paustik_marketplace` schema was applied to Neon in the earlier production setup. This updated local-auth source has not been deployed. The local demo account created during verification is stored only in the ignored `.data` folder; no external email messages or payments were sent.

## Local setup

Requirements: Node.js 20.19 or later and pnpm.

1. In this folder, install dependencies: `pnpm install`.
2. Copy `.env.example` to `.env.local`. Leave `DATABASE_URL` empty to use the local SQLite sign-in demo, or enter a development PostgreSQL URL for the full database-backed app.
3. Generate the Prisma client: `pnpm db:generate`.
4. Validate the data model: `pnpm db:validate`.
5. Apply the new marketplace migration to a **development** database: `pnpm db:migrate:dev`.
6. Start the app: `pnpm dev`.

The local auth database is created automatically at `.data/paustik-local-auth.sqlite`. The app shows the one-time code and local email-confirmation URL on screen. This development fallback is never enabled in production and its SQLite file does not sync to Vercel.

For production, first verify the linked Vercel project and Neon environment values. Apply reviewed migrations with `pnpm db:migrate:deploy` using `DIRECT_URL` (or a direct Neon URL), then deploy the app. The migration creates its own `paustik_marketplace` schema and leaves the existing live-tracking tables in `public` alone. Do not point `db:migrate:dev` at production.

## Environment variables

- `DATABASE_URL`: pooled Neon PostgreSQL URL for the application runtime.
- `DIRECT_URL`: optional direct database URL for Prisma migration commands.
- `AUTH_SECRET`: high-entropy random secret used to bind rate-limit identifiers.
- `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_VERIFY_SERVICE_SID`: required server-side credentials for phone OTP. Create a Verify Service configured for 6-digit SMS codes.
- `RESEND_API_KEY`, `EMAIL_FROM`: Resend credentials and a verified sender address used to send account email-confirmation links in production. Email is not used for phone-code sign-in.
- `PAUSTIK_PUBLIC_URL`: public app origin used to create absolute email-confirmation links.
- `PAUSTIK_ADMIN_EMAIL`, `PAUSTIK_ADMIN_PHONE`, `PAUSTIK_ADMIN_NAME`: one-time admin bootstrap inputs; set in the shell that runs the bootstrap command and do not commit them.
- `PAUSTIK_ADMIN_TOKEN`, `CRON_SECRET`: existing tracking-pilot secrets; keep them server-side.

Generate `AUTH_SECRET` locally without printing or committing it. Add real values to the Vercel project environment through its secure settings. Never put server secrets in a `NEXT_PUBLIC_` variable.

### Create the first administrator

After the marketplace migration is applied, set `PAUSTIK_ADMIN_EMAIL`, `PAUSTIK_ADMIN_PHONE` and optionally `PAUSTIK_ADMIN_NAME` in the current shell, then run `pnpm db:admin:create`. The command refuses to promote an existing non-admin user. Admin is not an option on public sign-up. The administrator signs in with an SMS code.

## Authentication and route protection

- Sign-up and sign-in verify phone ownership through Twilio Verify. Phone numbers are sent to the SMS provider in E.164 format; 10-digit Indian numbers are normalized to `+91`.
- Sign-up can create an account after the phone code succeeds. Email confirmation uses a one-time, 24-hour link; email delivery does not block phone-code sign-in.
- OTP codes are not stored in Paustik. Twilio Verify manages code expiry and one-time approval; the application limits code requests and failed checks.
- Sessions use random opaque tokens. Only SHA-256 token hashes are stored in PostgreSQL; the browser cookie is HttpOnly, SameSite=Lax and Secure in production.
- Server layouts load the current user and enforce their database role. Role and account state are not accepted from the browser as authorization.
- Public registration accepts only Customer, Mother and Delivery Agent. Mother and delivery applications start pending; only an active approved account may open that role dashboard.
- Admin accounts are created through the backend bootstrap script.
- Email remains an account contact; it is not used to authenticate the account. Production confirmation emails require valid Resend settings and a verified sender domain.
- Mother and delivery accounts can sign in after phone verification, but remain pending until an administrator approves them.
- Public sign-up cannot create admins. Administrator bootstrap requires a phone number that can receive SMS.

## Marketplace model and money handling

The Prisma schema covers users and role profiles; customer addresses; kitchens; meals, dated menus and menu cycles; plans and subscriptions; orders/items; deliveries; payments and categorized ledger entries; earnings, payouts, ratings, complaints, quality checks, notifications, commission settings, cancellation/meal-change requests, policy snapshots and audit logs.

Nearby discovery can filter by locality/city/PIN and, when a geocoding or customer-coordinate source is configured, calculate distance against the kitchen service radius. Kitchen coordinates are optional until an approved geocoding workflow is added.

Payment categories are separate ledger entries: customer charge, mother earning, delivery earning, platform fee, delivery fee, tax, refund and adjustment. Commission basis points are configurable records; the application does not assume a commission split. Razorpay credentials, checkout, verified webhooks, refunds, payouts and bank-account onboarding are not connected yet. No card or bank account information is stored in this application.

Menu cycles support date ranges and draft/published/closed states. Cancellation cutoffs, meal-change cutoffs and refund/change rules are configurable policy data. No cut-off values or refund terms are assumed; Paustik must decide and publish those terms before customer checkout is activated. Orders and subscriptions retain a policy snapshot so later policy changes do not silently alter an existing purchase.

## Existing live delivery tracking pilot

The original Vercel functions and Neon tracking tables remain separate from marketplace accounts and order data. Its existing features include one-time courier/customer tracking links, opt-in courier GPS, delivery geofencing, handover confirmation and data-retention cleanup.

- Operations console: `/delivery-admin.html`
- Courier sample page: `/courier.html`
- Customer tracking page: `/track.html`
- Health check: `/api/health`

Create/list live pilot deliveries through the operations console using the owner-only token stored in `.secrets/operations-key.txt` on the project owner's machine. Never copy that token into the website, source control or a `NEXT_PUBLIC_` variable. The tracking API accepts destination coordinates and does not geocode street addresses.

Tracking behavior: courier GPS starts only after explicit consent and browser permission. The service keeps only the latest point, uses accuracy-aware geofencing, removes location on stop/handover/cancellation, and expires old delivery data. This pilot does not share marketplace logins, orders or courier assignments.

## Project structure

```text
app/                 Next.js pages, layouts and authentication APIs
components/          Auth forms, branded panels and controls
lib/                 Prisma client, session, validation and email adapters
prisma/schema.prisma Marketplace relational schema
prisma/migrations/   Versioned PostgreSQL migrations
api/                 Existing Vercel live-tracking functions
public/              Brand assets and preserved legacy/tracking pages
```

## Remaining implementation phases

1. Deploy and verify the new schema and authentication with test accounts.
2. Add customer nearby-kitchen/menu browsing, subscriptions, checkout and order history.
3. Add mother verification, menu CRUD and weekly-cycle publication.
4. Add admin review/approval, order control, courier assignment and audit interfaces.
5. Add delivery-agent accept/pickup/drop-off flows linked to marketplace orders.
6. Add policy enforcement, payment adapter/webhooks, configurable ledger calculations and payout provider.
7. Add notifications, quality/reviews/complaints, analytics and operations reporting.
8. Run end-to-end security, role-boundary, mobile and database checks before public launch.

## Existing deployment

The current public URL is `https://paustik-vercel-upload-99710b4719064.vercel.app`. It continues serving the earlier deployment until this source is published. The Vercel project is not connected to a Git repository.
