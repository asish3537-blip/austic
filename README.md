# Paustik

**Purity. Hygiene. Delivered.**

Paustik connects customers with nearby mother-led kitchens and local delivery partners. This repository now contains a Next.js application foundation alongside the existing Vercel live-delivery-tracking pilot.

## Current implementation stage

The source implements role-based account registration, temporary preview codes, admin username/password sign-in, session cookies and server-side role checks. Preview codes are displayed in the app and do not verify phone ownership. Set `PAUSTIK_DEMO_AUTH=true` only for a controlled preview; production SMS and email verification use Twilio Verify and Resend when demo mode is off. Local development without `DATABASE_URL` uses an isolated SQLite account store.

The new Next.js app is the root route after deployment. The previous interactive concept is kept at `/legacy-demo.html`; the delivery operations, courier and tracking pages remain at their prior URLs. The sample concept still uses local browser data and is not connected to the new marketplace accounts.

Marketplace schema also models nearby-kitchen discovery (city, PIN code, coordinates and service radius), kitchen-specific meals and menus, weekly menu cycles, daily/weekly/monthly plans, versioned cancellation and meal-change policies, order/payment ledgers, earnings, payouts and admin audit history. Customer browsing/checkout, mother menu CRUD, approval tools, order operations, real payment processing and analytics are later implementation phases; dashboard copy identifies these as upcoming instead of pretending they are live.

The `paustik_marketplace` schema is managed through the versioned Prisma migrations. The local demo account store remains isolated in the ignored `.data` folder; no external email messages or payments are sent by preview auth.

## Local setup

Requirements: Node.js 20.19 or later and pnpm.

1. In this folder, install dependencies: `pnpm install`.
2. Copy `.env.example` to `.env.local`. Leave `DATABASE_URL` empty to use the local SQLite sign-in demo, or enter a development PostgreSQL URL for the full database-backed app.
3. Generate the Prisma client: `pnpm db:generate`.
4. Validate the data model: `pnpm db:validate`.
5. Apply the new marketplace migration to a **development** database: `pnpm db:migrate:dev`.
6. Start the app: `pnpm dev`.

The local auth database is created automatically at `.data/paustik-local-auth.sqlite`. The app shows a temporary one-time code on screen. This SQLite database is not available on Vercel and does not sync to production.

For production, first verify the linked Vercel project and Neon environment values. Apply reviewed migrations with `pnpm db:migrate:deploy` using `DIRECT_URL` (or a direct Neon URL), then deploy the app. The migration creates its own `paustik_marketplace` schema and leaves the existing live-tracking tables in `public` alone. Do not point `db:migrate:dev` at production.

## Environment variables

- `DATABASE_URL`: pooled Neon PostgreSQL URL for the application runtime.
- `DIRECT_URL`: optional direct database URL for Prisma migration commands.
- `AUTH_SECRET`: high-entropy random secret used to bind rate-limit identifiers.
- `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_VERIFY_SERVICE_SID`: required server-side credentials for phone OTP. Create a Verify Service configured for 6-digit SMS codes.
- `RESEND_API_KEY`, `EMAIL_FROM`: Resend credentials and a verified sender address used to send account email-confirmation links in production. Email is not used for phone-code sign-in.
- `PAUSTIK_PUBLIC_URL`: public app origin used to create absolute email-confirmation links.
- `PAUSTIK_ADMIN_PASSWORD`, optional `PAUSTIK_ADMIN_USERNAME`, `PAUSTIK_ADMIN_EMAIL`, `PAUSTIK_ADMIN_NAME`: one-time first-admin bootstrap inputs; set in the shell that runs the bootstrap command and do not commit them. The username defaults to `Asish11`; use a fresh password with at least 8 characters.
- `PAUSTIK_DEMO_AUTH`: temporary preview switch for on-page codes. It bypasses phone ownership verification and must be off before taking real sign-ups.
- `PAUSTIK_ADMIN_TOKEN`, `CRON_SECRET`: existing tracking-pilot secrets; keep them server-side.

Generate `AUTH_SECRET` locally without printing or committing it. Add real values to the Vercel project environment through its secure settings. Never put server secrets in a `NEXT_PUBLIC_` variable.

### Create the first administrator

After the marketplace and admin-username migrations are applied, set a fresh `PAUSTIK_ADMIN_PASSWORD` (at least 8 characters) and `DATABASE_URL` in the shell that runs `pnpm db:admin:create`. The username defaults to `Asish11` (or can be overridden with `PAUSTIK_ADMIN_USERNAME`); `PAUSTIK_ADMIN_EMAIL` is optional and defaults to a non-deliverable `@paustik.local` address. This is only for bootstrapping the first admin; additional admins are created in the protected `/admin/accounts` panel. Admin is never an option on public sign-up. Admins sign in at `/admin-sign-in` with username and password.

## Authentication and route protection

- Preview sign-up and sign-in display a short-lived code in the app and use a signed, HttpOnly challenge cookie. This does not prove phone ownership; disable preview mode before real customer onboarding.
- With preview mode off, phone sign-up and sign-in use Twilio Verify. Email confirmation uses a one-time link when Resend is configured.
- Admin usernames are case-insensitive and unique. Admin passwords are bcrypt-hashed and must be at least 8 characters; admins are created through the protected admin panel after first-admin bootstrap.
- Sessions use random opaque tokens. Only SHA-256 token hashes are stored in PostgreSQL; the browser cookie is HttpOnly, SameSite=Lax and Secure in production.
- Server layouts load the current user and enforce their database role. Role and account state are not accepted from the browser as authorization.
- Public registration accepts only Customer, Mother and Delivery Agent. Mother and delivery applications start pending; only an active approved account may open that role dashboard.
- Admin accounts can only be created through the protected admin panel. The one-time CLI bootstrap creates the first owner account.
- Email remains an account contact for customer, mother and delivery accounts. Admins sign in with a username and password.
- Mother and delivery accounts can sign in after the preview code succeeds, but remain pending until an administrator approves them.
- Public sign-up accepts only Customer, Mother and Delivery Agent. The ADMIN role is never accepted from public form input.

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

