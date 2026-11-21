CREATE TABLE "paustik_marketplace"."courier_offer_declines" (
  "agent_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "declined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courier_offer_declines_pkey" PRIMARY KEY ("agent_id", "order_id")
);
CREATE INDEX "courier_offer_declines_order_id_idx" ON "paustik_marketplace"."courier_offer_declines"("order_id");
ALTER TABLE "paustik_marketplace"."courier_offer_declines" ADD CONSTRAINT "courier_offer_declines_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "paustik_marketplace"."delivery_agent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paustik_marketplace"."courier_offer_declines" ADD CONSTRAINT "courier_offer_declines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "paustik_marketplace"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
