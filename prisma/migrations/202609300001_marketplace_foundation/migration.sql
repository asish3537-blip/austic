-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "paustik_marketplace";

-- CreateEnum
CREATE TYPE "paustik_marketplace"."UserRole" AS ENUM ('CUSTOMER', 'MOTHER', 'DELIVERY_AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."MealCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."MealCategory" AS ENUM ('VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."OrderStatus" AS ENUM ('ORDER_PLACED', 'CONFIRMED', 'ASSIGNED_TO_MOTHER', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERY_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."DeliveryStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'GOING_TO_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."LedgerStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."ComplaintStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."QualityCheckStatus" AS ENUM ('PASS', 'NEEDS_ACTION', 'FAIL');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."MenuCycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "paustik_marketplace"."PaymentCategory" AS ENUM ('CUSTOMER_CHARGE', 'MOTHER_EARNING', 'DELIVERY_EARNING', 'PLATFORM_FEE', 'DELIVERY_FEE', 'TAX', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "paustik_marketplace"."users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "paustik_marketplace"."UserRole" NOT NULL,
    "status" "paustik_marketplace"."AccountStatus" NOT NULL DEFAULT 'PENDING',
    "email_verified_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."customer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dietary_notes" TEXT,
    "notification_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."mother_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cuisine" TEXT NOT NULL,
    "food_safety_notes" TEXT,
    "fssai_number" TEXT,
    "verification_status" "paustik_marketplace"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "quality_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mother_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."delivery_agent_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "verification_status" "paustik_marketplace"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "completed_deliveries" INTEGER NOT NULL DEFAULT 0,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."kitchens" (
    "id" UUID NOT NULL,
    "mother_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pin_code" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "service_radius_meters" INTEGER,
    "cuisine" TEXT NOT NULL,
    "capacity_per_day" INTEGER NOT NULL DEFAULT 0,
    "available_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operating_hours" JSONB,
    "verification_status" "paustik_marketplace"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "is_accepting_orders" BOOLEAN NOT NULL DEFAULT false,
    "last_inspection_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "kitchens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."meal_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cadence" "paustik_marketplace"."MealCadence" NOT NULL,
    "meal_count" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "policy_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."meals" (
    "id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "paustik_marketplace"."MealCategory" NOT NULL,
    "cuisine" TEXT NOT NULL,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DECIMAL(12,2) NOT NULL,
    "image_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."menus" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "meal_period" TEXT NOT NULL DEFAULT 'LUNCH',
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."menu_cycles" (
    "id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "status" "paustik_marketplace"."MenuCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."subscriptions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "status" "paustik_marketplace"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6),
    "next_renewal_at" TIMESTAMPTZ(6),
    "preferences" JSONB,
    "policy_snapshot" JSONB,
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "mother_id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "subscription_id" UUID,
    "status" "paustik_marketplace"."OrderStatus" NOT NULL DEFAULT 'ORDER_PLACED',
    "payment_status" "paustik_marketplace"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "ordered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "notes" TEXT,
    "policy_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "meal_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "dietary_snapshot" JSONB,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "provider_payment_id" TEXT,
    "status" "paustik_marketplace"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "idempotency_key" TEXT,
    "captured_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."payment_ledger_entries" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "order_id" UUID NOT NULL,
    "category" "paustik_marketplace"."PaymentCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "reference" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."deliveries" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "agent_id" UUID,
    "status" "paustik_marketplace"."DeliveryStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "pickup_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "tracking_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."earnings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "mother_id" UUID,
    "agent_id" UUID,
    "beneficiary_role" "paustik_marketplace"."UserRole" NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "paustik_marketplace"."LedgerStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."payouts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "status" "paustik_marketplace"."PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "provider_payout_id" TEXT,
    "idempotency_key" TEXT,
    "failure_reason" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."commission_settings" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mother_basis_points" INTEGER NOT NULL,
    "delivery_basis_points" INTEGER NOT NULL,
    "platform_basis_points" INTEGER NOT NULL,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "commission_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."marketplace_policies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cancellation_cutoff_hours" INTEGER,
    "meal_change_cutoff_hours" INTEGER,
    "cancellation_rule" JSONB,
    "meal_change_rule" JSONB,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marketplace_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."ratings" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "meal_id" UUID,
    "meal_score" INTEGER,
    "delivery_score" INTEGER,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."complaints" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "paustik_marketplace"."ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."cancellation_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "order_id" UUID,
    "reason" TEXT,
    "status" "paustik_marketplace"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "refund_amount" DECIMAL(12,2),
    "rule_snapshot" JSONB,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."meal_change_requests" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "from_meal_id" UUID NOT NULL,
    "to_meal_id" UUID NOT NULL,
    "status" "paustik_marketplace"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "rule_snapshot" JSONB,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entity_id" UUID,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."quality_checks" (
    "id" UUID NOT NULL,
    "mother_id" UUID NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "inspector_user_id" UUID,
    "status" "paustik_marketplace"."QualityCheckStatus" NOT NULL,
    "score" DECIMAL(5,2),
    "notes" TEXT,
    "corrective_action" TEXT,
    "inspected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."admin_activity_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."failed_login_attempts" (
    "id" UUID NOT NULL,
    "identifier_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paustik_marketplace"."order_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "status" "paustik_marketplace"."OrderStatus" NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "paustik_marketplace"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "paustik_marketplace"."users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "paustik_marketplace"."users"("role", "status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "paustik_marketplace"."users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_user_id_key" ON "paustik_marketplace"."customer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mother_profiles_user_id_key" ON "paustik_marketplace"."mother_profiles"("user_id");

-- CreateIndex
CREATE INDEX "mother_profiles_verification_status_idx" ON "paustik_marketplace"."mother_profiles"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_agent_profiles_user_id_key" ON "paustik_marketplace"."delivery_agent_profiles"("user_id");

-- CreateIndex
CREATE INDEX "delivery_agent_profiles_verification_status_idx" ON "paustik_marketplace"."delivery_agent_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "addresses_user_id_is_default_idx" ON "paustik_marketplace"."addresses"("user_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "kitchens_mother_id_key" ON "paustik_marketplace"."kitchens"("mother_id");

-- CreateIndex
CREATE INDEX "kitchens_city_pin_code_verification_status_idx" ON "paustik_marketplace"."kitchens"("city", "pin_code", "verification_status");

-- CreateIndex
CREATE INDEX "meals_kitchen_id_is_available_category_idx" ON "paustik_marketplace"."meals"("kitchen_id", "is_available", "category");

-- CreateIndex
CREATE INDEX "menus_service_date_is_available_idx" ON "paustik_marketplace"."menus"("service_date", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "menus_kitchen_id_meal_id_service_date_meal_period_key" ON "paustik_marketplace"."menus"("kitchen_id", "meal_id", "service_date", "meal_period");

-- CreateIndex
CREATE INDEX "menu_cycles_kitchen_id_status_starts_on_idx" ON "paustik_marketplace"."menu_cycles"("kitchen_id", "status", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "menu_cycles_kitchen_id_starts_on_ends_on_key" ON "paustik_marketplace"."menu_cycles"("kitchen_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_status_idx" ON "paustik_marketplace"."subscriptions"("customer_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_next_renewal_at_idx" ON "paustik_marketplace"."subscriptions"("status", "next_renewal_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "paustik_marketplace"."orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_ordered_at_idx" ON "paustik_marketplace"."orders"("customer_id", "ordered_at" DESC);

-- CreateIndex
CREATE INDEX "orders_mother_id_scheduled_for_idx" ON "paustik_marketplace"."orders"("mother_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "orders_kitchen_id_scheduled_for_idx" ON "paustik_marketplace"."orders"("kitchen_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "orders_status_scheduled_for_idx" ON "paustik_marketplace"."orders"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "paustik_marketplace"."payments"("provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "paustik_marketplace"."payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_order_id_created_at_idx" ON "paustik_marketplace"."payments"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_ledger_entries_order_id_category_created_at_idx" ON "paustik_marketplace"."payment_ledger_entries"("order_id", "category", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "paustik_marketplace"."deliveries"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_tracking_reference_key" ON "paustik_marketplace"."deliveries"("tracking_reference");

-- CreateIndex
CREATE INDEX "deliveries_agent_id_status_assigned_at_idx" ON "paustik_marketplace"."deliveries"("agent_id", "status", "assigned_at");

-- CreateIndex
CREATE INDEX "deliveries_status_assigned_at_idx" ON "paustik_marketplace"."deliveries"("status", "assigned_at");

-- CreateIndex
CREATE INDEX "earnings_user_id_status_created_at_idx" ON "paustik_marketplace"."earnings"("user_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_order_id_user_id_beneficiary_role_key" ON "paustik_marketplace"."earnings"("order_id", "user_id", "beneficiary_role");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_provider_payout_id_key" ON "paustik_marketplace"."payouts"("provider_payout_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_idempotency_key_key" ON "paustik_marketplace"."payouts"("idempotency_key");

-- CreateIndex
CREATE INDEX "payouts_user_id_status_requested_at_idx" ON "paustik_marketplace"."payouts"("user_id", "status", "requested_at");

-- CreateIndex
CREATE INDEX "commission_settings_is_active_effective_from_idx" ON "paustik_marketplace"."commission_settings"("is_active", "effective_from");

-- CreateIndex
CREATE INDEX "marketplace_policies_is_active_effective_from_idx" ON "paustik_marketplace"."marketplace_policies"("is_active", "effective_from");

-- CreateIndex
CREATE INDEX "ratings_subject_id_created_at_idx" ON "paustik_marketplace"."ratings"("subject_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_order_id_author_id_subject_id_key" ON "paustik_marketplace"."ratings"("order_id", "author_id", "subject_id");

-- CreateIndex
CREATE INDEX "complaints_status_created_at_idx" ON "paustik_marketplace"."complaints"("status", "created_at");

-- CreateIndex
CREATE INDEX "cancellation_requests_user_id_status_created_at_idx" ON "paustik_marketplace"."cancellation_requests"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "meal_change_requests_order_id_status_created_at_idx" ON "paustik_marketplace"."meal_change_requests"("order_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "paustik_marketplace"."notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quality_checks_kitchen_id_inspected_at_idx" ON "paustik_marketplace"."quality_checks"("kitchen_id", "inspected_at" DESC);

-- CreateIndex
CREATE INDEX "admin_activity_logs_entity_type_entity_id_created_at_idx" ON "paustik_marketplace"."admin_activity_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_activity_logs_admin_id_created_at_idx" ON "paustik_marketplace"."admin_activity_logs"("admin_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "paustik_marketplace"."auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "paustik_marketplace"."auth_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "paustik_marketplace"."auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "paustik_marketplace"."email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_expires_at_idx" ON "paustik_marketplace"."email_verification_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "paustik_marketplace"."password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "paustik_marketplace"."password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "failed_login_attempts_identifier_hash_created_at_idx" ON "paustik_marketplace"."failed_login_attempts"("identifier_hash", "created_at");

-- CreateIndex
CREATE INDEX "order_events_order_id_created_at_idx" ON "paustik_marketplace"."order_events"("order_id", "created_at");

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."mother_profiles" ADD CONSTRAINT "mother_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."delivery_agent_profiles" ADD CONSTRAINT "delivery_agent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."kitchens" ADD CONSTRAINT "kitchens_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "paustik_marketplace"."mother_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."meal_plans" ADD CONSTRAINT "meal_plans_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "paustik_marketplace"."marketplace_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."meals" ADD CONSTRAINT "meals_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."menus" ADD CONSTRAINT "menus_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."menus" ADD CONSTRAINT "menus_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "paustik_marketplace"."menu_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."menus" ADD CONSTRAINT "menus_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "paustik_marketplace"."meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."menu_cycles" ADD CONSTRAINT "menu_cycles_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."subscriptions" ADD CONSTRAINT "subscriptions_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "paustik_marketplace"."meal_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."orders" ADD CONSTRAINT "orders_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "paustik_marketplace"."mother_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."orders" ADD CONSTRAINT "orders_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "paustik_marketplace"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."orders" ADD CONSTRAINT "orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "paustik_marketplace"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."order_items" ADD CONSTRAINT "order_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "paustik_marketplace"."meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "paustik_marketplace"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."deliveries" ADD CONSTRAINT "deliveries_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "paustik_marketplace"."delivery_agent_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."earnings" ADD CONSTRAINT "earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."earnings" ADD CONSTRAINT "earnings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."earnings" ADD CONSTRAINT "earnings_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "paustik_marketplace"."mother_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."earnings" ADD CONSTRAINT "earnings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "paustik_marketplace"."delivery_agent_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."ratings" ADD CONSTRAINT "ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."ratings" ADD CONSTRAINT "ratings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."ratings" ADD CONSTRAINT "ratings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."ratings" ADD CONSTRAINT "ratings_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "paustik_marketplace"."meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."complaints" ADD CONSTRAINT "complaints_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."cancellation_requests" ADD CONSTRAINT "cancellation_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."cancellation_requests" ADD CONSTRAINT "cancellation_requests_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "paustik_marketplace"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."cancellation_requests" ADD CONSTRAINT "cancellation_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."meal_change_requests" ADD CONSTRAINT "meal_change_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."meal_change_requests" ADD CONSTRAINT "meal_change_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."meal_change_requests" ADD CONSTRAINT "meal_change_requests_from_meal_id_fkey" FOREIGN KEY ("from_meal_id") REFERENCES "paustik_marketplace"."meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."meal_change_requests" ADD CONSTRAINT "meal_change_requests_to_meal_id_fkey" FOREIGN KEY ("to_meal_id") REFERENCES "paustik_marketplace"."meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."quality_checks" ADD CONSTRAINT "quality_checks_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "paustik_marketplace"."mother_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."quality_checks" ADD CONSTRAINT "quality_checks_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "paustik_marketplace"."kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."quality_checks" ADD CONSTRAINT "quality_checks_inspector_user_id_fkey" FOREIGN KEY ("inspector_user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paustik_marketplace"."order_events" ADD CONSTRAINT "order_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
