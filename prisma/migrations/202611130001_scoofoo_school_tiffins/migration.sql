SET search_path TO "paustik_marketplace";

-- CreateTable
CREATE TABLE "scoofoo_schools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "reception_point" TEXT NOT NULL DEFAULT 'Reception — confirm exact gate',
    "contact_name" TEXT NOT NULL DEFAULT '',
    "contact_phone" TEXT NOT NULL DEFAULT '',
    "staff_user_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "status" TEXT NOT NULL DEFAULT 'SETTING_UP',
    "lunch_at" TEXT NOT NULL DEFAULT '12:30',
    "arrive_by" TEXT NOT NULL DEFAULT '12:00',
    "pickup_by" TEXT NOT NULL DEFAULT '11:00',
    "booking_cutoff" TEXT NOT NULL DEFAULT '09:00',
    "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "daily_capacity" INTEGER NOT NULL DEFAULT 30,
    "agreement_note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scoofoo_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoofoo_bookings" (
    "courier_accepted_at" TIMESTAMPTZ(6),
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "guardian_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "courier_id" UUID,
    "service_date" TEXT NOT NULL,
    "tiffin_label" TEXT NOT NULL,
    "class_section" TEXT NOT NULL,
    "box_count" INTEGER NOT NULL DEFAULT 1,
    "pickup_snapshot" JSONB NOT NULL,
    "school_snapshot" JSONB NOT NULL,
    "pickup_deadline" TIMESTAMPTZ(6) NOT NULL,
    "arrival_deadline" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "consent_at" TIMESTAMPTZ(6) NOT NULL,
    "pickup_nonce" TEXT NOT NULL,
    "pickup_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "picked_up_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "received_by" TEXT,
    "receipt_method" TEXT,
    "late_alert_at" TIMESTAMPTZ(6),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "accuracy_meters" INTEGER,
    "location_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scoofoo_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoofoo_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "actor_id" UUID,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoofoo_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scoofoo_bookings_reference_key" ON "scoofoo_bookings"("reference");

-- CreateIndex
CREATE INDEX "scoofoo_bookings_guardian_id_service_date_idx" ON "scoofoo_bookings"("guardian_id", "service_date");

-- CreateIndex
CREATE INDEX "scoofoo_bookings_courier_id_status_idx" ON "scoofoo_bookings"("courier_id", "status");

-- CreateIndex
CREATE INDEX "scoofoo_bookings_school_id_service_date_status_idx" ON "scoofoo_bookings"("school_id", "service_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scoofoo_bookings_guardian_id_school_id_service_date_tiffin__key" ON "scoofoo_bookings"("guardian_id", "school_id", "service_date", "tiffin_label");

-- CreateIndex
CREATE INDEX "scoofoo_events_booking_id_created_at_idx" ON "scoofoo_events"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "scoofoo_bookings" ADD CONSTRAINT "scoofoo_bookings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "scoofoo_schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoofoo_events" ADD CONSTRAINT "scoofoo_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "scoofoo_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scoofoo_bookings" ADD CONSTRAINT "scoofoo_guardian_fk" FOREIGN KEY ("guardian_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "scoofoo_bookings" ADD CONSTRAINT "scoofoo_courier_fk" FOREIGN KEY ("courier_id") REFERENCES "delivery_agent_profiles"("id") ON DELETE RESTRICT;
ALTER TABLE "scoofoo_events" ADD CONSTRAINT "scoofoo_actor_fk" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "scoofoo_bookings" ADD CONSTRAINT "scoofoo_box_count_check" CHECK (box_count BETWEEN 1 AND 3);
ALTER TABLE "scoofoo_schools" ADD CONSTRAINT "scoofoo_capacity_check" CHECK (daily_capacity BETWEEN 1 AND 200);
INSERT INTO "scoofoo_schools" (id,name,city,address,reception_point,status,lunch_at,arrive_by,pickup_by,booking_cutoff,weekdays,holidays,daily_capacity,agreement_note,updated_at)
VALUES ('00000000-0000-4000-8000-00000000f001','Sri Chaitanya Techno School — Kesura','Bhubaneswar','Kesura / Keshorea, near PJ College, Bankual, Bhubaneswar, Odisha 751002','School reception — exact gate and receiving adult to be confirmed','SETTING_UP','12:30','12:00','11:00','09:00',ARRAY[1,2,3,4,5],ARRAY[]::TEXT[],30,'Pilot organiser reported school permission on 13 November 2026. Reception contact, receiving account and exact gate require operations confirmation.',CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
