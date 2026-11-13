import "server-only";
import { razorpayConfig } from "@/lib/razorpay";
import { UiText } from "@/components/ui-language";

export function PaymentMethods() {
  const config=razorpayConfig();
  const ready=Boolean(config&&process.env.RAZORPAY_WEBHOOK_SECRET);
  return <details className="payment-methods"><summary><UiText text="Payment methods"/></summary>
    {ready?<><strong><UiText text={config!.id.startsWith("rzp_test_")?"Test checkout":"UPI, cards & net banking"}/></strong><p><UiText text="Use Pay securely on an unpaid order. Only the remaining balance after wallet credit is charged. Available methods are shown by Razorpay."/></p></>:<><strong><UiText text="Online payment needs setup"/></strong><p><UiText text="Online payment is not active yet. Your order shows any balance due; do not assume it is paid. Contact Paustik support before paying outside the app."/></p></>}
    <p><UiText text="Wallet credit and order payments are separate from bank payouts to kitchens and couriers."/></p>
  </details>;
}
