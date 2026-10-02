type AuthEmailKind = "verify" | "reset";

const siteUrl = () => (process.env.PAUSTIK_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");

function emailOrigin(requestOrigin?: string) {
  const configured = process.env.PAUSTIK_PUBLIC_URL;
  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (process.env.NODE_ENV !== "production" || (parsed.protocol === "https:" && !isLocal)) return parsed.origin;
    } catch {
      // Use the current request origin when an optional URL setting is invalid.
    }
  }
  return requestOrigin || siteUrl();
}

export function makeAuthLink(kind: AuthEmailKind, token: string, origin = siteUrl()) {
  const route = kind === "verify" ? "/api/auth/verify-email" : "/reset-password";
  const url = new URL(route, `${origin.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendAuthEmail(email: string, kind: AuthEmailKind, token: string, requestOrigin?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const verification = kind === "verify";
  const subject = verification ? "Verify your Paustik email" : "Reset your Paustik password";
  const action = verification ? "Verify email" : "Choose a new password";
  const link = makeAuthLink(kind, token, emailOrigin(requestOrigin));
  const text = `${action}: ${link}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>${action} for your Paustik account:</p><p><a href="${link}">${action}</a></p><p>If you did not request this, you can ignore this email.</p>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject, text, html }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
