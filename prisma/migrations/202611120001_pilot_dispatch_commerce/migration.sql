SET search_path TO "paustik_marketplace";

-- AlterTable
ALTER TABLE "delivery_agent_profiles" ADD COLUMN     "meal_capacity" INTEGER NOT NULL DEFAULT 6;

-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "one_time_only" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "batch_id" UUID,
ADD COLUMN     "handover_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "handover_locked_until" TIMESTAMPTZ(6),
ADD COLUMN     "handover_method" TEXT,
ADD COLUMN     "handover_nonce" TEXT;

-- CreateTable
CREATE TABLE "dispatch_policy" (
    "social_links" JSONB,
    "id" TEXT NOT NULL DEFAULT 'pilot',
    "base_fee" DECIMAL(12,2) NOT NULL DEFAULT 9,
    "included_km" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "per_km" DECIMAL(12,2) NOT NULL DEFAULT 5,
    "maximum_fee" DECIMAL(12,2) NOT NULL DEFAULT 150,
    "handover_radius_meters" INTEGER NOT NULL DEFAULT 100,
    "allow_gps_handover" BOOLEAN NOT NULL DEFAULT true,
    "batch_radius_meters" INTEGER NOT NULL DEFAULT 2000,
    "batch_window_minutes" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "dispatch_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "minimum_spend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maximum_discount" DECIMAL(12,2) NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "first_order_only" BOOLEAN NOT NULL DEFAULT false,
    "usage_limit" INTEGER NOT NULL,
    "per_customer_limit" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_ids" UUID[],
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_receipts" (
    "id" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_quotes" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "input_hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checkout_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_delivery_requests" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'KITCHEN_REVIEW',
    "unit_price" DECIMAL(12,2) NOT NULL,
    "delivery_fee" DECIMAL(12,2),
    "courier_pay" DECIMAL(12,2),
    "agent_id" UUID,
    "vehicle" TEXT,
    "notes" TEXT,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "order_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_delivery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_evidence" (
    "id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "license_number" TEXT,
    "valid_until" DATE,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "review_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_training" (
    "id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',

    CONSTRAINT "kitchen_training_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_id_customer_id_idx" ON "coupon_redemptions"("coupon_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_delivery_requests_order_id_key" ON "bulk_delivery_requests"("order_id");

-- CreateIndex
CREATE INDEX "bulk_delivery_requests_customer_id_created_at_idx" ON "bulk_delivery_requests"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "kitchen_evidence_kitchen_id_created_at_idx" ON "kitchen_evidence"("kitchen_id", "created_at");

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_delivery_requests" ADD CONSTRAINT "bulk_delivery_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX deliveries_batch_agent_status_idx ON deliveries(batch_id,agent_id,status);
ALTER TABLE delivery_agent_profiles ADD CONSTRAINT courier_capacity_positive CHECK (meal_capacity BETWEEN 1 AND 30);
ALTER TABLE orders ADD CONSTRAINT discount_nonnegative CHECK (discount_amount >= 0);
ALTER TABLE coupon_redemptions ADD CONSTRAINT coupon_customer_fk FOREIGN KEY (customer_id) REFERENCES users(id);
ALTER TABLE bulk_delivery_requests ADD CONSTRAINT bulk_customer_fk FOREIGN KEY (customer_id) REFERENCES users(id);
ALTER TABLE bulk_delivery_requests ADD CONSTRAINT bulk_menu_fk FOREIGN KEY (menu_id) REFERENCES menus(id);
ALTER TABLE bulk_delivery_requests ADD CONSTRAINT bulk_kitchen_fk FOREIGN KEY (kitchen_id) REFERENCES kitchens(id);
ALTER TABLE bulk_delivery_requests ADD CONSTRAINT bulk_address_fk FOREIGN KEY (address_id) REFERENCES addresses(id);
ALTER TABLE bulk_delivery_requests ADD CONSTRAINT bulk_agent_fk FOREIGN KEY (agent_id) REFERENCES delivery_agent_profiles(id);
ALTER TABLE kitchen_evidence ADD CONSTRAINT evidence_kitchen_fk FOREIGN KEY (kitchen_id) REFERENCES kitchens(id);
ALTER TABLE kitchen_evidence ADD CONSTRAINT evidence_uploader_fk FOREIGN KEY (uploaded_by) REFERENCES users(id);
ALTER TABLE kitchen_training ADD CONSTRAINT training_kitchen_fk FOREIGN KEY (kitchen_id) REFERENCES kitchens(id);
ALTER TABLE kitchen_training ADD CONSTRAINT training_admin_fk FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE checkout_quotes ADD CONSTRAINT quote_customer_fk FOREIGN KEY (customer_id) REFERENCES users(id);
INSERT INTO dispatch_policy(id) VALUES('pilot');
INSERT INTO coupons(id,code,kind,value,minimum_spend,maximum_discount,starts_at,ends_at,first_order_only,usage_limit,per_customer_limit,is_active)
VALUES('8e464223-c129-48c0-a827-7d880f835de1','WELCOME10','PERCENT',10,69,30,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '30 days',true,100,1,true);
