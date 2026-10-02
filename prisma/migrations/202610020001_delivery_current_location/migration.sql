ALTER TABLE "paustik_marketplace"."deliveries"
  ADD COLUMN "current_latitude" DECIMAL(10,7),
  ADD COLUMN "current_longitude" DECIMAL(10,7),
  ADD COLUMN "current_accuracy_meters" DECIMAL(7,2),
  ADD COLUMN "location_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN "location_consent_at" TIMESTAMPTZ(6);
