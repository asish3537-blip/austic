import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkPhoneOtp, normalizePhoneNumber } from "@/lib/phone-otp";
import { phoneLookupCandidates } from "@/lib/phone-number";
import { isEmailConfigured, makeAuthLink, sendAuthEmail } from "@/lib/email";
import { rejectCrossOrigin } from "@/lib/http";
import { AdminAuthError, reserveAdminAttempt } from "@/lib/admin-authenticator";
import { registrationSchema } from "@/lib/auth-validation";
import { isLocalAuthMode } from "@/lib/local-auth-mode";
import { clearDemoOtpCookie, isDemoAuthEnabled, verifyDemoOtp } from "@/lib/demo-auth";
import { createSession, roleHome } from "@/lib/auth";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json({ error: "Pausstik could not complete account creation. Please try again." }, { status: 503 });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const localAuth = isLocalAuthMode();

  if (!localAuth && (!process.env.DATABASE_URL || !process.env.AUTH_SECRET)) {
    return NextResponse.json({ error: "Account services are not configured yet. Please try again later." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the required account details and phone code." }, { status: 400 }); }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message || "Check the details and try again." }, { status: 400 });
  }

  const input = parsed.data;
  const emailSignup = input.password !== undefined;
  const demoAuth = !emailSignup && !localAuth && isDemoAuthEnabled();
  if ((emailSignup && localAuth) || (!demoAuth && (emailSignup || !localAuth) && !isEmailConfigured())) {
    return NextResponse.json({ error: "Email registration is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const phone = normalizePhoneNumber(input.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid phone number with your country code. Indian numbers can use 10 digits or +91." }, { status: 400 });
  const candidates = phoneLookupCandidates(input.phone, phone);
  const email = input.email.toLowerCase();
  const verificationToken = demoAuth ? null : randomBytes(32).toString("base64url");

  if (localAuth) {
    try {
      const local = await import("@/lib/local-auth-db");
      if (local.findLocalUserByPhone(candidates)) {
        return NextResponse.json({ error: "This phone number already has a local Pausstik account. Request a fresh code to sign in." }, { status: 409 });
      }
      if (local.findLocalUserByEmail(email)) {
        return NextResponse.json({ error: "An account already uses that email address. Sign in with its phone number." }, { status: 409 });
      }
      if (!local.verifyLocalPhoneCode(phone, input.otp!)) {
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
        message: "Your local Pausstik account is saved. No email or SMS was sent; the in-app code was for this local preview.",
      }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ error: "An account already uses that email or phone number. Sign in with its phone number." }, { status: 409 });
      }
      console.error("Pausstik local account creation failed.", error instanceof Error ? error.name : "unknown error");
      return unavailable();
    }
  }

  const identifierHash = createHmac("sha256", process.env.AUTH_SECRET!).update(`phone-otp-check:${phone}`).digest("hex");

  try {
    if (emailSignup) {
      const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      await reserveAdminAttempt("email-signup:ip:" + ip, 15);
      await reserveAdminAttempt("email-signup:" + email, 4);
    }
    const priorAccount = !emailSignup && await prisma.user.findFirst({ where: { phone: { in: candidates } }, select: { id: true } });
    if (priorAccount) {
      return NextResponse.json({ error: "This phone number already has a Pausstik account. Sign in with a phone code instead." }, { status: 409 });
    }
    const priorEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (priorEmail) {
      return NextResponse.json({ error: "An account already uses that email address. Sign in or request a fresh email confirmation link." }, { status: 409 });
    }

    if (!emailSignup) {
      const failedCodes = await prisma.failedLoginAttempt.count({
        where: { identifierHash, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
      });
      if (failedCodes >= 8) return NextResponse.json({ error: "Too many code attempts. Request a new code and try again later." }, { status: 429 });

      const approved = demoAuth
        ? verifyDemoOtp(request, phone, "signup", input.otp!)
        : await checkPhoneOtp(phone, input.otp!);
      if (!approved) {
        await prisma.failedLoginAttempt.create({ data: { identifierHash } });
        return NextResponse.json({ error: "That code is incorrect or expired. Request a new code and try again." }, { status: 401 });
      }

    }
    const passwordHash = await bcrypt.hash(input.password ?? randomBytes(32).toString("base64url"), 12);
    const status = input.role === "CUSTOMER" ? "ACTIVE" : "PENDING";
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: input.name, email, phone: emailSignup ? null : phone, passwordHash, role: input.role, status },
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

    if (!emailSignup) await prisma.failedLoginAttempt.deleteMany({ where: { identifierHash } });
    if (demoAuth) {
      await createSession(user.id);
      const response = NextResponse.json({
        created: true,
        status: user.status,
        destination: roleHome({ role: user.role, status: user.status }),
        message: "Your account is ready. No email or SMS was sent; this temporary code is for the Pausstik preview only.",
      }, { status: 201, headers: { "Cache-Control": "no-store" } });
      clearDemoOtpCookie(response);
      return response;
    }
    const emailSent = verificationToken ? await sendAuthEmail(email, "verify", verificationToken, new URL(request.url).origin) : false;
    const developmentLink = process.env.NODE_ENV !== "production" && !emailSent && verificationToken
      ? makeAuthLink("verify", verificationToken)
      : undefined;
    if (!emailSent && !developmentLink && verificationToken) {
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id, tokenHash: createHash("sha256").update(verificationToken).digest("hex"), usedAt: null },
      });
    }
    return NextResponse.json({
      created: true,
      status: user.status,
      emailSent,
      email,
      ...(developmentLink ? { verificationUrl: developmentLink } : {}),
      message: emailSent ? "Check your inbox and confirm your email to sign in." : "Account saved. Request a fresh confirmation email to finish signing up.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account already uses that email or phone number. Sign in or reset your password." }, { status: 409 });
    }
    console.error("Pausstik account creation failed.", error instanceof Error ? error.name : "unknown error");
    return unavailable();
  }
}
