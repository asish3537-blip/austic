CREATE TABLE "paustik_marketplace"."web_push_devices" (
 "id" UUID NOT NULL, "user_id" UUID NOT NULL, "session_id" UUID NOT NULL,
 "endpoint_hash" CHAR(64) NOT NULL, "endpoint" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL,
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "last_event_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "last_attempt_at" TIMESTAMPTZ(6),
 CONSTRAINT "web_push_devices_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "web_push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "web_push_devices_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "paustik_marketplace"."auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "web_push_devices_endpoint_hash_key" ON "paustik_marketplace"."web_push_devices"("endpoint_hash");
CREATE INDEX "web_push_devices_user_id_idx" ON "paustik_marketplace"."web_push_devices"("user_id");
