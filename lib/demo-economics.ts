import { z } from "zod";
export const DEMO_MARKET_PREFIX = "TEST-LIFE-DEMO-";
export const DEMO_EMAIL_PREFIX = "demo.market.v1.";
export const DEMO_BATCH = "MARKETPLACE_V1";
export const demoFinanceSchema = z.object({
  listPrice: z.number().int().nonnegative(), discount: z.number().int().nonnegative(), collected: z.number().int().nonnegative(), refund: z.number().int().nonnegative(),
  mother: z.number().int().nonnegative(), courier: z.number().int().nonnegative(), packaging: z.number().int().nonnegative(), processing: z.number().int().nonnegative(), operations: z.number().int().nonnegative(),
  motherSettlement: z.enum(["SIMULATED_PAID", "SIMULATED_DUE", "NOT_DUE"]), courierSettlement: z.enum(["SIMULATED_PAID", "SIMULATED_DUE", "NOT_DUE"]),
}).refine(v => v.discount <= v.listPrice && v.collected <= v.listPrice - v.discount && v.refund <= v.collected, "Invalid simulated receipt");
export type DemoFinance = z.infer<typeof demoFinanceSchema>;
export function demoFinance(snapshot: unknown): DemoFinance | null {
  if (!snapshot || typeof snapshot !== "object" || !("demoBatch" in snapshot) || snapshot.demoBatch !== DEMO_BATCH || !("demoFinance" in snapshot)) return null;
  const parsed = demoFinanceSchema.safeParse(snapshot.demoFinance); return parsed.success ? parsed.data : null;
}
export function contribution(f: DemoFinance) { return f.collected - f.refund - f.mother - f.courier - f.packaging - f.processing - f.operations; }
export function demoTotals(rows: DemoFinance[], fixedOverhead: number) {
  const sum = (key: keyof Pick<DemoFinance,"listPrice"|"discount"|"collected"|"refund"|"mother"|"courier"|"packaging"|"processing"|"operations">) => rows.reduce((n,r) => n+r[key],0);
  const collected=sum("collected"),refund=sum("refund"),mother=sum("mother"),courier=sum("courier"),packaging=sum("packaging"),processing=sum("processing"),operations=sum("operations");
  const netReceipts=collected-refund, costs=mother+courier+packaging+processing+operations, margin=netReceipts-costs;
  return { listPrice:sum("listPrice"),discount:sum("discount"),collected,refund,netReceipts,mother,courier,packaging,processing,operations,costs,contribution:margin,fixedOverhead,operatingResult:margin-fixedOverhead,profitableOrders:rows.filter(r=>contribution(r)>0).length,lossOrders:rows.filter(r=>contribution(r)<0).length };
}
export function demoOverhead(value?: string) { const n=Number(value ?? 500); return Number.isFinite(n)&&n>=0&&n<=100000?Math.round(n*100):50000; }
