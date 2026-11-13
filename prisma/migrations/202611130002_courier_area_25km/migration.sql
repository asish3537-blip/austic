-- Preserve existing service areas; new couriers start with a 25 km search radius.
ALTER TABLE "paustik_marketplace"."delivery_agent_profiles" ALTER COLUMN "service_radius_meters" SET DEFAULT 25000;
