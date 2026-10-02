import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serviceUnavailable } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { walletBalance } from "@/lib/marketplace-rules";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER" || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "An active customer account is required." }, { status: 403 });
  }
  try {
    const [balance, entries] = await Promise.all([
      walletBalance(prisma, user.id),
      prisma.walletLedgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return NextResponse.json({ currency: "INR", balance, entries: entries.map((entry) => ({
      id: entry.id, direction: entry.direction, amount: Number(entry.amount), description: entry.description,
      createdAt: entry.createdAt.toISOString(), orderId: entry.orderId,
    })) });
  } catch (error) {
    console.error("Pausstik customer wallet could not load.", error instanceof Error ? error.name : "unknown error");
    return serviceUnavailable();
  }
}
