import { requireRole } from "@/lib/auth";
import { DispatchConsole } from "@/components/dispatch-console";
export default async function Page() {
  await requireRole("ADMIN");
  return <main className="console-page"><span className="eyebrow">Neighbourhood delivery operations</span><h1>Dispatch & offers</h1><DispatchConsole /></main>;
}
