import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import evidence from "@/lib/test-evidence.json";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const id = (await params).id; const record = (evidence.screenshots as { id: string; file: string }[]).find(r => r.id === id);
  if (!record || !/^[a-z0-9-]+\.png$/.test(record.file)) return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });
  try { const bytes = await readFile(path.join(process.cwd(), "test-artifacts", "screenshots", record.file)); return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `inline; filename="${record.file}"` } }); } catch { return NextResponse.json({ error: "Screenshot is unavailable in this deployment." }, { status: 404 }); }
}
