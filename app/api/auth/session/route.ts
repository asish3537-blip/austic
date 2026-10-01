import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serviceUnavailable } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) return serviceUnavailable();
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
  } catch {
    return serviceUnavailable();
  }
}
