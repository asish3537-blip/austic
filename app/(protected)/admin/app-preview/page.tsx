import "@/app/customer-kitchens.css";
import { requireRole } from "@/lib/auth";
import { sampleCustomerKitchens } from "@/lib/customer-kitchens";
import { AdminAppPreview } from "@/components/admin-app-preview";
export default async function AppPreviewPage() {
  await requireRole("ADMIN");
  return <main className="console-page"><div className="console-page-head"><div><span className="eyebrow">App experience</span><h1>Preview every workspace</h1><p>Customer, mother and delivery screens with connected sample tracking.</p></div></div><AdminAppPreview kitchens={sampleCustomerKitchens()}/></main>;
}
