import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    const policy = await prisma.dispatchPolicy.findUnique({ where: { id: "pilot" }, select: { socialLinks: true } });
    return NextResponse.json(policy?.socialLinks ?? {}, { headers: { "Cache-Control": "public,max-age=60" } });
  } catch { return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } }); }
}
