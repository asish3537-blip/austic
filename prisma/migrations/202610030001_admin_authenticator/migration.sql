ALTER TABLE "paustik_marketplace"."users" ADD COLUMN "admin_auth_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "paustik_marketplace"."auth_sessions" ADD COLUMN "admin_auth_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "paustik_marketplace"."admin_authenticators" (
  "user_id" UUID NOT NULL PRIMARY KEY,
  "encrypted_secret" TEXT NOT NULL,
  "enabled_at" TIMESTAMPTZ(6),
  "pending_expires_at" TIMESTAMPTZ(6),
  "last_used_step" BIGINT,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "admin_authenticators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "paustik_marketplace"."admin_recovery_codes" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "code_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "paustik_marketplace"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "admin_recovery_codes_code_hash_key" ON "paustik_marketplace"."admin_recovery_codes"("code_hash");
CREATE INDEX "admin_recovery_codes_user_id_idx" ON "paustik_marketplace"."admin_recovery_codes"("user_id");
