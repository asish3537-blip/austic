import { config as loadDotEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadDotEnv({ path: ".env.local" });
loadDotEnv();

const rawConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("Database commands require DATABASE_URL or a direct database URL in the environment.");
}
const connectionUrl = new URL(rawConnectionString);
connectionUrl.searchParams.set("schema", "paustik_marketplace");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: connectionUrl.toString(),
  },
});
