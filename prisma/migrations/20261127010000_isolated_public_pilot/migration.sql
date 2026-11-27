CREATE TABLE "paustik_marketplace"."pilot_workspaces" (
 "id" UUID NOT NULL, "owner_id" UUID NOT NULL, "menus" JSONB NOT NULL DEFAULT '{}',
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "pilot_workspaces_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "pilot_workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "pilot_workspaces_owner_id_key" ON "paustik_marketplace"."pilot_workspaces"("owner_id");
CREATE TABLE "paustik_marketplace"."pilot_orders" (
 "id" UUID NOT NULL, "workspace_id" UUID NOT NULL, "request_key" UUID NOT NULL, "snapshot" JSONB NOT NULL,
 "quantity" INTEGER NOT NULL, "amount_paise" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR',
 "status" TEXT NOT NULL DEFAULT 'PAYMENT_PENDING', "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
 "provider_order_id" TEXT, "provider_payment_id" TEXT, "pickup_code" TEXT NOT NULL, "delivery_code" TEXT NOT NULL,
 "failed_attempts" INTEGER NOT NULL DEFAULT 0, "locked_until" TIMESTAMPTZ(6), "events" JSONB NOT NULL DEFAULT '[]',
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
 CONSTRAINT "pilot_orders_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "pilot_orders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "paustik_marketplace"."pilot_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "pilot_order_positive_amount" CHECK ("amount_paise">0 AND "quantity">0 AND "quantity"<=3 AND "currency"='INR')
);
CREATE UNIQUE INDEX "pilot_orders_provider_order_id_key" ON "paustik_marketplace"."pilot_orders"("provider_order_id");
CREATE UNIQUE INDEX "pilot_orders_provider_payment_id_key" ON "paustik_marketplace"."pilot_orders"("provider_payment_id");
CREATE UNIQUE INDEX "pilot_orders_workspace_id_request_key_key" ON "paustik_marketplace"."pilot_orders"("workspace_id","request_key");
CREATE INDEX "pilot_orders_workspace_id_created_at_idx" ON "paustik_marketplace"."pilot_orders"("workspace_id","created_at");
