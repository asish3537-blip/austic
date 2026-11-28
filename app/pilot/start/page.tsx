import Link from "next/link";
import {UiText} from "@/components/ui-language";
import {publicPilotEnabled} from "@/lib/pilot-catalog";
import {notFound} from "next/navigation";

export const metadata={title:"Start your Paustik pilot",robots:{index:false,follow:true}};
export const dynamic="force-dynamic";
export default function PilotStart(){
 if(!publicPilotEnabled())notFound();
 return <main className="dashboard-shell">
  <header className="pilot-hub-heading"><span className="eyebrow"><UiText text="Pilot testing"/></span><h1><UiText text="Start your Paustik pilot"/></h1><p className="pilot-warning"><UiText text="Test payments only. No real money or food delivery."/></p></header>
  <section className="pilot-panel"><h2><UiText text="Use your own account"/></h2><p><UiText text="Create your personal Paustik account or sign in. Your Test orders stay in your private practice workspace."/></p><div className="pilot-actions"><Link className="button" href="/sign-up"><UiText text="Create your account"/></Link><Link className="button button-secondary" href="/sign-in"><UiText text="Sign in"/></Link></div><p><UiText text="After signing in, return here and open practice kitchens."/></p><Link className="button" href="/pilot"><UiText text="Explore practice kitchens"/></Link></section>
  <section className="pilot-panel"><h2><UiText text="Test on Android"/></h2><p><UiText text="This testing app allows personal sign-in and Test payments. Live payments and real order changes are blocked."/></p><a className="button" href="/downloads/Paustik-1.4.2-test6.apk" download><UiText text="Download Android Test app"/></a><p>1.4.2-test6 · <UiText text="Test payments & refunds"/></p><p><UiText text="Open Test payments & refunds after signing in. The testing build is separate from the stable download and app-store review."/></p></section>
  <section className="pilot-panel"><h2><UiText text="Try a Test payment"/></h2><ol><li><UiText text="Choose a practice kitchen, meal, quantity and date. Review the current total."/></li><li><UiText text="Accept the Test-only acknowledgement and open Razorpay. Confirm its Test Mode label."/></li><li><UiText text="Use only the provider's Test details. Never enter real card or bank details or scan the QR with a payment app."/></li><li><UiText text="Check Test payment if the return screen is interrupted. Check Test refund after cancelling a paid Test order."/></li></ol><a className="text-link" href="https://github.com/razorpay/markdown-docs/blob/master/payments/payments/test-card-details.md" target="_blank" rel="noopener noreferrer"><UiText text="Razorpay official Test card guide"/></a><p><UiText text="Test card"/>: <code>4111 1111 1111 1111</code> · CVV <code>123</code> · <UiText text="Any future expiry date"/></p></section>
 </main>;
}
