import { config as loadDotEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";

loadDotEnv({ path: ".env.local" });
loadDotEnv();

const connectionString = process.env.DATABASE_URL;
const usernameInput = process.env.PAUSTIK_ADMIN_USERNAME?.trim() || "Asish11";
const username = usernameInput?.toLowerCase();
const emailInput = process.env.PAUSTIK_ADMIN_EMAIL?.trim();
const email = (emailInput || (username ? `${username}@paustik.local` : "")).toLowerCase();
const password = process.env.PAUSTIK_ADMIN_PASSWORD;
const nameInput = process.env.PAUSTIK_ADMIN_NAME?.trim();
const name = nameInput || "Paustik Operations";

if (!connectionString || !username || !password) {
  throw new Error("Set DATABASE_URL, PAUSTIK_ADMIN_USERNAME and PAUSTIK_ADMIN_PASSWORD in the local shell first.");
}
if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
  throw new Error("PAUSTIK_ADMIN_USERNAME must be 3–32 letters, numbers, dots, underscores or hyphens.");
}
if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
  throw new Error("PAUSTIK_ADMIN_PASSWORD must be at least 8 characters and at most 72 bytes. Use a fresh password.");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

try {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("That username already exists. No account or password was changed.");
  const emailOwner = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);
  if (emailOwner) {
    if (emailOwner.role !== "ADMIN") throw new Error("That email belongs to a non-admin account. No role or password was changed.");
    if (emailOwner.username) throw new Error("That admin already has a username. No account or password was changed.");
    await prisma.user.update({ where: { id: emailOwner.id }, data: { name: nameInput || emailOwner.name, username, passwordHash, status: "ACTIVE" } });
    console.log(`Configured username sign-in for the existing administrator '${username}'.`);
  } else {
    const existingAdmins = await prisma.user.findMany({ where: { role: "ADMIN", username: null }, take: 2, select: { id: true } });
    if (existingAdmins.length === 1) {
      await prisma.user.update({ where: { id: existingAdmins[0].id }, data: { ...(nameInput ? { name: nameInput } : {}), email, username, passwordHash, status: "ACTIVE" } });
      console.log(`Configured username sign-in for the existing administrator '${username}'.`);
    } else if (existingAdmins.length > 1) {
      throw new Error("More than one admin has no username. Set PAUSTIK_ADMIN_EMAIL to the specific admin's current email.");
    } else {
      await prisma.user.create({
        data: { name, email, username, passwordHash, role: "ADMIN", status: "ACTIVE" },
      });
      console.log(`Created the initial Paustik administrator '${username}'. Sign in at /admin-sign-in.`);
    }
  }
} finally {
  await prisma.$disconnect();
}

