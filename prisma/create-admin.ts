import { config as loadDotEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";
import { normalizePhoneNumber } from "../lib/phone-number";

loadDotEnv({ path: ".env.local" });
loadDotEnv();

const connectionString = process.env.DATABASE_URL;
const email = process.env.PAUSTIK_ADMIN_EMAIL?.trim().toLowerCase();
const phoneInput = process.env.PAUSTIK_ADMIN_PHONE?.trim();
const phone = phoneInput ? normalizePhoneNumber(phoneInput) : null;
const name = process.env.PAUSTIK_ADMIN_NAME?.trim() || "Paustik Operations";

if (!connectionString || !email || !phone) {
  throw new Error("Set DATABASE_URL, PAUSTIK_ADMIN_EMAIL and a valid PAUSTIK_ADMIN_PHONE in the local shell first.");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") throw new Error("That email already belongs to a non-admin account. No role was changed.");
    if (existing.phone && normalizePhoneNumber(existing.phone) !== phone) {
      throw new Error("That admin account already has a different phone number. No changes were made.");
    }
    if (!existing.phone) {
      await prisma.user.update({ where: { id: existing.id }, data: { phone } });
      console.log("Added the administrator phone number. Sign in with its SMS code.");
    } else {
      console.log("The administrator account already exists; no changes were made.");
    }
  } else {
    const phoneOwner = await prisma.user.findUnique({ where: { phone } });
    if (phoneOwner) throw new Error("That phone number already belongs to another Paustik account. No account was changed.");
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    await prisma.user.create({
      data: { name, email, phone, passwordHash, role: "ADMIN", status: "ACTIVE" },
    });
    console.log("Created the initial administrator account. Sign in with its SMS code at /sign-in.");
  }
} finally {
  await prisma.$disconnect();
}
