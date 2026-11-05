import { guidedHelp, helpLinks, type HelpRole } from "@/lib/assistant-guides";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rejectCrossOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) })).min(1).max(12),
});

const limits = new Map<string, { count: number; expiresAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 12;

const PAUSSTIK_INSTRUCTIONS = `You are Paustik's in-app helper. Help customers, mother entrepreneurs, couriers, and administrators understand how to use this app. Keep replies clear, concise, kind, and practical. Answer in the language the user used when feasible.

Paustik marketplace facts: families discover nearby mother-led kitchens and their menus; kitchens set a service area from 5–10 km; sample meal prices are Base ₹69, Egg ₹79, Cheese ₹89, Chicken ₹99, with three components per meal; customers can choose 3–7 meal days for one week, then renew manually; cancel a meal at least five hours before delivery, and eligible collected value less a ₹5 processing fee is returned to the wallet; sample delivery fee is ₹30 per order. Couriers accept jobs, confirm kitchen pickup and customer handover, and may share GPS only while an assigned order is active. Admin access is created and managed through the restricted admin area.

Be transparent: online payment checkout and bank payouts are not connected yet; an order or preview must never be described as paid unless the app explicitly confirms a recorded payment. Do not invent nearby availability, order status, account details, live income, delivery ETAs, eligibility, or policy beyond the facts above. You do not have access to the user's private records and cannot place, cancel, or refund orders, publish a menu, or change accounts. Direct users to their signed-in workspace for those actions. Never ask users to send passwords, one-time codes, full payment-card details, or bank credentials.`;

export async function GET() {
  const user = await getCurrentUser();
  const role: HelpRole = user?.status === "ACTIVE" ? user.role : "GUEST";
  return NextResponse.json({ mode: process.env.PAUSTIK_LIVE_AI_ENABLED === "true" && !!process.env.OPENAI_API_KEY ? "ai" : "guided", links: helpLinks(role), role }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;

  const user = await getCurrentUser();
  const role: HelpRole = user?.status === "ACTIVE" ? user.role : "GUEST";
  const key = process.env.OPENAI_API_KEY;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Send a message to Paustik help." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Send a valid message to continue." }, { status: 400 });
  }

  const fallback = guidedHelp(parsed.data.messages.at(-1)!.content, role);
  if (!key || process.env.PAUSTIK_LIVE_AI_ENABLED !== "true" || !user || user.status !== "ACTIVE") return NextResponse.json(fallback);

  const now = Date.now();
  const currentLimit = limits.get(user.id);
  if (currentLimit && currentLimit.expiresAt > now && currentLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    return NextResponse.json({ error: "Please wait a minute before asking another question." }, { status: 429 });
  }
  if (!currentLimit || currentLimit.expiresAt <= now) limits.set(user.id, { count: 1, expiresAt: now + 60_000 });
  else currentLimit.count += 1;

  try {
    const client = new OpenAI({ apiKey: key, timeout: 20_000, maxRetries: 1 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
      instructions: PAUSSTIK_INSTRUCTIONS,
      input: parsed.data.messages.slice(-10).map((message) => ({ role: message.role, content: message.content })),
      max_output_tokens: 260,
      store: false,
    });
    return NextResponse.json({ reply: response.output_text || fallback.reply, links: helpLinks(role), mode: "ai" });
  } catch (error) {
    console.error("Paustik AI helper request failed.", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ ...fallback, notice: "Live AI is unavailable. Showing guided help instead." });
  }
}
