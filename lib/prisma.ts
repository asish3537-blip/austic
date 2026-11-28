import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { paustikPrisma?: PrismaClient };

function createPrismaClient() {
  // Keep static pages buildable before local environment setup without
  // embedding database credentials in source. Runtime access must use the
  // DATABASE_URL configured by the deployment environment.
  const connectionString = process.env.DATABASE_URL ?? "postgresql://user:password@127.0.0.1:5432/paustik?sslmode=disable";
  const local = process.env.NODE_ENV !== "production" && process.env.PAUSTIK_LOCAL_POSTGRES === "true" && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname);
  // Prisma date serialization expects UTC database sessions, including on Windows.
  const adapter = local ? new PrismaPg({ connectionString, options: "-c timezone=UTC" }) : new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.paustikPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.paustikPrisma = prisma;
