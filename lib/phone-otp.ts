import { normalizePhoneNumber } from "@/lib/phone-number";

type TwilioResponse = { status?: string; code?: number; message?: string };

export type PhoneOtpChannel = "sms" | "whatsapp";

function config() {
  const keySid = process.env.TWILIO_API_KEY_SID;
  const keySecret = process.env.TWILIO_API_KEY_SECRET;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!keySid || !keySecret || !serviceSid) return null;
  return { keySid, keySecret, serviceSid };
}

async function callVerify(path: "Verifications" | "VerificationCheck", values: Record<string, string>) {
  const settings = config();
  if (!settings) throw new Error("Phone verification is not configured.");

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${settings.serviceSid}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.keySid}:${settings.keySecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(values),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  const payload = await response.json().catch(() => null) as TwilioResponse | null;
  return { response, payload };
}

export function isPhoneOtpConfigured() {
  return config() !== null;
}

export async function sendPhoneOtp(phone: string, channel: PhoneOtpChannel = "sms") {
  const { response, payload } = await callVerify("Verifications", { To: phone, Channel: channel });
  if (!response.ok || payload?.status !== "pending") {
    const error = new Error("Phone verification could not send a code.") as Error & { twilioCode?: number };
    error.twilioCode = payload?.code;
    throw error;
  }
}

export async function checkPhoneOtp(phone: string, code: string) {
  const { response, payload } = await callVerify("VerificationCheck", { To: phone, Code: code });
  // Twilio removes expired verifications and those that hit the attempt limit.
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("Phone verification could not check the code.");
  return payload?.status === "approved";
}

export { normalizePhoneNumber };
