import { prisma } from "@/lib/prisma";
import { DEFAULT_DISPATCH, type DispatchSettings } from "@/lib/dispatch-rules";

export async function loadDispatchPolicy(): Promise<DispatchSettings> {
  const row = await prisma.dispatchPolicy.findUnique({ where: { id: "pilot" } });
  if (!row) return DEFAULT_DISPATCH;
  return { ...row, baseFee: Number(row.baseFee), includedKm: Number(row.includedKm), perKm: Number(row.perKm), maximumFee: Number(row.maximumFee) };
}
