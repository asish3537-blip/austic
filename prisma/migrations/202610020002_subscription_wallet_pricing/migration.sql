CREATE TYPE "paustik_marketplace"."MealTier" AS ENUM ('BASE', 'EGG', 'CHEESE', 'CHICKEN');
CREATE TYPE "paustik_marketplace"."WalletEntryDirection" AS ENUM ('CREDIT', 'DEBIT');

ALTER TABLE "paustik_marketplace"."meals"
  ADD COLUMN "tier" "paustik_marketplace"."MealTier" NOT NULL DEFAULT 'BASE',
  ADD COLUMN "components" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "paustik_marketplace"."menus"
  ADD COLUMN "delivery_time" VARCHAR(5) NOT NULL DEFAULT '12:30';

ALTER TABLE "paustik_marketplace"."menus"
  ADD CONSTRAINT "menus_delivery_time_format_check"
  CHECK ("delivery_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "paustik_marketplace"."subscriptions"
  ADD COLUMN "kitchen_id" UUID,
  ADD COLUMN "weekly_days" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "cancellation_cutoff_hours" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "cancellation_operation_fee" DECIMAL(12,2) NOT NULL DEFAULT 5.00;

CREATE INDEX "subscriptions_kitchen_id_status_idx"
  ON "paustik_marketplace"."subscriptions"("kitchen_id", "status");

ALTER TABLE "paustik_marketplace"."subscriptions"
  ADD CONSTRAINT "subscriptions_kitchen_id_fkey"
  FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "paustik_marketplace"."wallet_ledger_entries" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "order_id" UUID,
  "subscription_id" UUID,
  "direction" "paustik_marketplace"."WalletEntryDirection" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'INR',
  "reference" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ledger_entries_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_ledger_entries_reference_key"
  ON "paustik_marketplace"."wallet_ledger_entries"("reference");
CREATE INDEX "wallet_ledger_entries_user_id_created_at_idx"
  ON "paustik_marketplace"."wallet_ledger_entries"("user_id", "created_at" DESC);
CREATE INDEX "wallet_ledger_entries_order_id_created_at_idx"
  ON "paustik_marketplace"."wallet_ledger_entries"("order_id", "created_at");

ALTER TABLE "paustik_marketplace"."wallet_ledger_entries"
  ADD CONSTRAINT "wallet_ledger_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "wallet_ledger_entries_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "wallet_ledger_entries_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "paustik_marketplace"."subscriptions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "paustik_marketplace"."kitchens"
  ADD COLUMN "marketplace_radius_meters" INTEGER NOT NULL DEFAULT 8000
  CHECK ("marketplace_radius_meters" BETWEEN 5000 AND 10000);

CREATE TABLE "paustik_marketplace"."favorite_kitchens" (
  "id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "kitchen_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favorite_kitchens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "favorite_kitchens_customer_kitchen_key" UNIQUE ("customer_id", "kitchen_id"),
  CONSTRAINT "favorite_kitchens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "favorite_kitchens_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "favorite_kitchens_customer_id_created_at_idx"
  ON "paustik_marketplace"."favorite_kitchens"("customer_id", "created_at" DESC);
