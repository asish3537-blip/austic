-- CreateTable
CREATE TABLE "paustik_marketplace"."food_products" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "unit_label" TEXT NOT NULL,
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "minimum_quantity" INTEGER NOT NULL DEFAULT 1,
    "preparation_mode" TEXT NOT NULL,
    "preparation_minutes" INTEGER NOT NULL,
    "storage_instructions" TEXT NOT NULL,
    "shelf_life_hours" INTEGER NOT NULL,
    "ready_until" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."product_requests" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'KITCHEN_REVIEW',
    "version" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "delivery_fee" DECIMAL(12,2) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "history" JSONB NOT NULL DEFAULT '[]',
    "order_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_products_meal_id_key" ON "paustik_marketplace"."food_products"("meal_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_requests_order_id_key" ON "paustik_marketplace"."product_requests"("order_id");

-- CreateIndex
CREATE INDEX "product_requests_customer_id_status_created_at_idx" ON "paustik_marketplace"."product_requests"("customer_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "product_requests_product_id_status_idx" ON "paustik_marketplace"."product_requests"("product_id", "status");

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."food_products" ADD CONSTRAINT "food_products_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "paustik_marketplace"."meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."product_requests" ADD CONSTRAINT "product_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."product_requests" ADD CONSTRAINT "product_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "paustik_marketplace"."food_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."product_requests" ADD CONSTRAINT "product_requests_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "paustik_marketplace"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."product_requests" ADD CONSTRAINT "product_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "paustik_marketplace"."food_products" ADD CONSTRAINT "product_inventory_valid" CHECK (stock_count >= 0 AND minimum_quantity > 0 AND preparation_minutes >= 0 AND shelf_life_hours > 0);
ALTER TABLE "paustik_marketplace"."product_requests" ADD CONSTRAINT "request_quantity_valid" CHECK (quantity > 0 AND unit_price > 0 AND delivery_fee >= 0 AND version >= 0);
