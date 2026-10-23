type AuthEmailKind = "verify" | "reset";

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from || /[\r\n]/.test(from)) return null;
  const address = from.includes("<") ? from.match(/^[^<>]+<([^<>]+)>$/)?.[1]?.trim() : from;
  if (!address || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) return null;
  return { apiKey, from };
}

// Configuration presence is not proof of sender verification or inbox delivery.
export function isEmailConfigured() {
  return emailConfig() !== null;
}

const siteUrl = () => (process.env.PAUSTIK_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");

function emailOrigin(requestOrigin?: string) {
  const candidates = [process.env.PAUSTIK_PUBLIC_URL, requestOrigin];
  if (process.env.NODE_ENV !== "production") candidates.push(siteUrl());
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";
      const validProtocol = parsed.protocol === "https:" || (process.env.NODE_ENV !== "production" && parsed.protocol === "http:");
      if (validProtocol && !parsed.username && !parsed.password && (process.env.NODE_ENV !== "production" || !isLocal)) return parsed.origin;
    } catch {
      // Try the request origin when the optional configured URL is invalid.
    }
  }
  return null;
}

export function makeAuthLink(kind: AuthEmailKind, token: string, origin = siteUrl()) {
  const route = kind === "verify" ? "/api/auth/verify-email" : "/reset-password";
  const url = new URL(route, `${origin.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendAuthEmail(email: string, kind: AuthEmailKind, token: string, requestOrigin?: string) {
  const config = emailConfig();
  if (!config) return false;
  const { apiKey, from } = config;

  const verification = kind === "verify";
  const subject = verification ? "Verify your Pausstik email" : "Reset your Pausstik password";
  const action = verification ? "Verify email" : "Choose a new password";
  const origin = emailOrigin(requestOrigin);
  if (!origin) return false;
  const link = makeAuthLink(kind, token, origin);
  const text = `${action}: ${link}\n\nIf you did not request this, you can ignore this email.`;
  const safeLink = link.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const html = `<p>${action} for your Pausstik account:</p><p><a href="${safeLink}">${action}</a></p><p>If you did not request this, you can ignore this email.</p>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject, text, html }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
