type AuthEmailKind = "verify" | "reset";

const siteUrl = () => (process.env.PAUSTIK_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");

export function makeAuthLink(kind: AuthEmailKind, token: string, origin = siteUrl()) {
  const route = kind === "verify" ? "/api/auth/verify-email" : "/reset-password";
  const url = new URL(route, `${origin.replace(/\/$/, "")}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendAuthEmail(email: string, kind: AuthEmailKind, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const verification = kind === "verify";
  const subject = verification ? "Verify your Paustik email" : "Reset your Paustik password";
  const action = verification ? "Verify email" : "Choose a new password";
  const link = makeAuthLink(kind, token);
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
