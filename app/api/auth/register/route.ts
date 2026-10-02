import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkPhoneOtp, isPhoneOtpConfigured, normalizePhoneNumber } from "@/lib/phone-otp";
import { phoneLookupCandidates } from "@/lib/phone-number";
import { makeAuthLink, sendAuthEmail } from "@/lib/email";
import { rejectCrossOrigin } from "@/lib/http";
import { registrationSchema } from "@/lib/auth-validation";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { clearDemoOtpCookie, isDemoAuthEnabled, verifyDemoOtp } from "@/lib/demo-auth";
import { createSession, roleHome } from "@/lib/auth";

export const runtime = "nodejs";

function unavailable() {
  if (!isPhoneOtpConfigured() && !isDemoAuthEnabled()) {
    return NextResponse.json({ error: "Phone sign-up is not connected yet. Configure Paustik's Twilio Verify service before creating accounts with SMS or WhatsApp." }, { status: 503 });
  }
  return NextResponse.json({ error: "Paustik could not complete account creation. Please try again." }, { status: 503 });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const localAuth = isLocalAuthMode();
  const demoAuth = !localAuth && isDemoAuthEnabled();
  if (!localAuth && (!process.env.DATABASE_URL || !process.env.AUTH_SECRET)) return unavailable();

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the required account details and phone code." }, { status: 400 }); }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message || "Check the details and try again." }, { status: 400 });
  }

  const input = parsed.data;
  const phone = normalizePhoneNumber(input.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number with your country code. Indian numbers can use 10 digits or +91." }, { status: 400 });
  const candidates = phoneLookupCandidates(input.phone, phone);
  const email = input.email.toLowerCase();
  const verificationToken = demoAuth ? null : randomBytes(32).toString("base64url");

  if (localAuth) {
    try {
      const local = await import("@/lib/local-auth-db");
      if (local.findLocalUserByPhone(candidates)) {
        return NextResponse.json({ error: "This phone number already has a local Paustik account. Request a fresh code to sign in." }, { status: 409 });
      }
      if (local.findLocalUserByEmail(email)) {
        return NextResponse.json({ error: "An account already uses that email address. Sign in with its phone number." }, { status: 409 });
      }
      if (!local.verifyLocalPhoneCode(phone, input.otp)) {
        return NextResponse.json({ error: "That local code is incorrect or expired. Request a new code and try again." }, { status: 401 });
      }

      const status = input.role === "CUSTOMER" ? "ACTIVE" : "PENDING";
      const user = local.createLocalUser({
        name: input.name,
        email,
        phone,
        role: input.role,
        status,
        profile: {
          addressLine1: input.addressLine1,
          locality: input.locality,
          city: input.city,
          pinCode: input.pinCode,
          cuisine: input.cuisine || "",
          kitchenName: input.kitchenName || "",
          capacityPerDay: String(input.capacityPerDay || 0),
          availableDays: input.availableDays || "",
          lunchWindow: input.lunchWindow || "",
          vehicleType: input.vehicleType || "",
        },
      });
      await createSession(user.id);
      return NextResponse.json({
        created: true,
        status: user.status,
        destination: "/account/local-demo",
        message: "Your local Paustik account is saved. No email or SMS was sent; the in-app code was for this local preview.",
      }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ error: "An account already uses that email or phone number. Sign in with its phone number." }, { status: 409 });
      }
      console.error("Paustik local account creation failed.", error instanceof Error ? error.name : "unknown error");
      return unavailable();
    }
  }

  const identifierHash = createHmac("sha256", process.env.AUTH_SECRET!).update(`phone-otp-check:${phone}`).digest("hex");

  try {
    const priorAccount = await prisma.user.findFirst({ where: { phone: { in: candidates } }, select: { id: true } });
    if (priorAccount) {
      return NextResponse.json({ error: "This phone number already has a Paustik account. Sign in with a phone code instead." }, { status: 409 });
    }

    const failedCodes = await prisma.failedLoginAttempt.count({
      where: { identifierHash, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    if (failedCodes >= 8) return NextResponse.json({ error: "Too many code attempts. Request a new code and try again later." }, { status: 429 });

    const approved = demoAuth
      ? verifyDemoOtp(request, phone, "signup", input.otp)
      : await checkPhoneOtp(phone, input.otp);
    if (!approved) {
      await prisma.failedLoginAttempt.create({ data: { identifierHash } });
      return NextResponse.json({ error: "That code is incorrect or expired. Request a new code and try again." }, { status: 401 });
    }

    // Passwords are no longer used for sign-in. Keep a random, unrecoverable hash
    // for compatibility with existing records until the schema is migrated.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    const status = input.role === "CUSTOMER" ? "ACTIVE" : "PENDING";
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: input.name, email, phone, passwordHash, role: input.role, status },
      });
      await tx.address.create({
        data: {
          userId: created.id,
          recipientName: input.name,
          phone,
          addressLine1: input.addressLine1,
          locality: input.locality,
          city: input.city,
          pinCode: input.pinCode,
          isDefault: true,
        },
      });
      if (input.role === "CUSTOMER") {
        await tx.customerProfile.create({ data: { userId: created.id } });
      } else if (input.role === "MOTHER") {
        const mother = await tx.motherProfile.create({
          data: { userId: created.id, cuisine: input.cuisine!, verificationStatus: "PENDING" },
        });
        await tx.kitchen.create({
          data: {
            motherId: mother.id,
            name: input.kitchenName!,
            addressLine1: input.addressLine1,
            locality: input.locality,
            city: input.city,
            pinCode: input.pinCode,
            cuisine: input.cuisine!,
            capacityPerDay: input.capacityPerDay!,
            availableDays: input.availableDays!.split(",").map((day) => day.trim()).filter(Boolean),
            operatingHours: { lunch: input.lunchWindow! },
            verificationStatus: "PENDING",
          },
        });
      } else {
        await tx.deliveryAgentProfile.create({
          data: { userId: created.id, vehicleType: input.vehicleType!, verificationStatus: "PENDING" },
        });
      }
      if (!demoAuth && verificationToken) {
        await tx.emailVerificationToken.create({
          data: { userId: created.id, tokenHash: createHash("sha256").update(verificationToken).digest("hex"), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        });
      }
      return created;
    });

    await prisma.failedLoginAttempt.deleteMany({ where: { identifierHash } });
    if (demoAuth) {
      await createSession(user.id);
      const response = NextResponse.json({
        created: true,
        status: user.status,
        destination: roleHome({ role: user.role, status: user.status }),
        message: "Your account is ready. No email or SMS was sent; this temporary code is for the Paustik preview only.",
      }, { status: 201, headers: { "Cache-Control": "no-store" } });
      clearDemoOtpCookie(response);
      return response;
    }
    const emailSent = verificationToken ? await sendAuthEmail(email, "verify", verificationToken) : false;
    const developmentLink = process.env.NODE_ENV !== "production" && !emailSent && verificationToken
      ? makeAuthLink("verify", verificationToken)
      : undefined;
    return NextResponse.json({
      created: true,
      status: user.status,
      emailSent,
      email,
      ...(developmentLink ? { verificationUrl: developmentLink } : {}),
      message: emailSent
        ? input.role === "CUSTOMER"
          ? "Your account is created and your phone is verified. Check your email to confirm your contact address; you can sign in with your phone code."
          : "Your application is saved and your phone is verified. Check your email to confirm your contact address; sign in with your phone code while Paustik reviews your application."
        : "Your account is created and your phone is verified. Paustik could not send the email confirmation yet, but you can sign in with your phone code. Email delivery needs to be configured.",
    }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account already uses that email or phone number. Sign in with your phone code." }, { status: 409 });
    }
    console.error("Paustik account creation failed.", error instanceof Error ? error.name : "unknown error");
    return unavailable();
  }
}
