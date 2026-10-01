ALTER TABLE "paustik_marketplace"."users"
ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "users_username_key"
ON "paustik_marketplace"."users"("username");

