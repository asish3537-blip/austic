import { upiReceiver } from "@/lib/upi";
import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function PaymentSetupPage() {
  await requireRole("ADMIN");
  return <main className="dashboard-shell"><span className="eyebrow">Payment readiness</span><h1>Payments</h1>
    {upiReceiver() ? <p className="dashboard-banner"><strong>UPI enabled</strong> · Receiver {upiReceiver()!.id}. Customers can scan a QR for the saved order balance. Verify the credit in your receiving account before recording the receipt below.</p> : <p className="dashboard-banner">UPI receiver setup is pending.</p>}
    <section className="dashboard-card"><h2>Merchant account setup</h2><ol><li>Choose a payment provider that supports your Indian business and marketplace model.</li><li>Complete the provider’s business verification and settlement bank setup in its own dashboard.</li><li>Prepare refund, cancellation, privacy and contact pages for merchant review.</li><li>Connect test credentials privately to the server. Never paste secrets into chat or place them in browser code.</li><li>Integrate server-priced orders, signed payment confirmation and verified webhooks. Duplicate callbacks must not charge or credit an order twice.</li><li>Verify successful, failed, cancelled, refunded and duplicate payment flows before enabling live credentials.</li></ol><p>Customer collections and payouts to mothers or couriers are separate capabilities. Provider approval for collections does not automatically enable marketplace payouts.</p></section>
    <section className="dashboard-card"><h2>During the pilot</h2><p>Collect payment through your agreed external method, then confirm the receipt before recording it. An order or customer-submitted reference alone is not proof of payment.</p><Link className="button" href="/admin/dashboard#pilot-collection-title">Record confirmed cash / UPI receipt</Link></section>
  </main>;
}
