ALTER TABLE "paustik_marketplace"."kitchens" DROP CONSTRAINT IF EXISTS "kitchens_marketplace_radius_meters_check";
ALTER TABLE "paustik_marketplace"."kitchens" ALTER COLUMN "marketplace_radius_meters" SET DEFAULT 25000;
ALTER TABLE "paustik_marketplace"."kitchens" ADD CONSTRAINT "kitchens_marketplace_radius_meters_check" CHECK ("marketplace_radius_meters" BETWEEN 5000 AND 25000);
