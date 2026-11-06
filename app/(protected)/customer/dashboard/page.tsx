import Link from "next/link";
import {requireRole} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {isLocalAuthMode} from "@/lib/local-auth-mode";
import {CustomerDeliveryPin} from "@/components/customer-marketplace-controls";
import {KitchenDiscovery} from "@/components/kitchen-discovery";
import {CustomerHighlights} from "@/components/customer-highlights";
import {loadCustomerKitchenDiscovery,sampleCustomerKitchens} from "@/lib/customer-kitchens";
import {OrdersRefresh} from "@/components/orders-refresh";
import {UiText} from "@/components/ui-language";
export default async function CustomerDashboard({searchParams}:{searchParams:Promise<{mode?:string}>}){
 const user=await requireRole("CUSTOMER"),params=await searchParams;
 const mode=params.mode==="subscription"||params.mode==="once"?params.mode:"all";
 const [discovered,recent]=await Promise.allSettled([loadCustomerKitchenDiscovery(user.id),isLocalAuthMode()?Promise.resolve([]):prisma.order.findMany({where:{customerId:user.id},orderBy:{orderedAt:"desc"},take:3,select:{id:true,orderNumber:true,status:true,scheduledFor:true,kitchen:{select:{name:true}},items:{select:{mealName:true,quantity:true}}}})]);
 const discovery=discovered.status==="fulfilled"?discovered.value:{kitchens:[],hasDeliveryPin:false,deliveryArea:"",available:false};
 const orders=recent.status==="fulfilled"?recent.value:[];
 return <main className="dashboard-shell customer-dashboard customer-discovery-home">
  <div className="customer-welcome"><div><span className="eyebrow"><UiText text="Your neighbourhood"/></span><h1><UiText text="What feels like home today?"/></h1></div><Link href="/customer/wallet" className="home-wallet-link">₹ <UiText text="Wallet"/> →</Link></div>
  <CustomerHighlights kitchens={discovery.kitchens}/>
  <nav className="customer-shop-paths" aria-label="Choose how to order"><Link href="/customer/dashboard?mode=subscription#customer-discover" aria-current={mode==="subscription"?"page":undefined}><span aria-hidden="true">☷</span><strong><UiText text="Meal subscriptions"/></strong><small><UiText text="Plan 3–7 days"/></small></Link><Link href="/customer/dashboard?mode=once#customer-discover" aria-current={mode==="once"?"page":undefined}><span aria-hidden="true">◷</span><strong><UiText text="One-time meals"/></strong><small><UiText text="Just one day"/></small></Link><Link href="/customer/marketplace"><span aria-hidden="true">▧</span><strong><UiText text="Homemade products"/></strong><small><UiText text="Sattu, sweets & more"/></small></Link></nav>
  {discovery.hasDeliveryPin?<div className="customer-location-strip"><span>⌖ {discovery.deliveryArea||"Your saved delivery location"}</span><Link href="/account/settings#delivery-address">Change →</Link></div>:<CustomerDeliveryPin/>}
  <KitchenDiscovery key={mode} initialMode={mode} kitchens={discovery.kitchens} sampleKitchens={sampleCustomerKitchens()} hasDeliveryPin={discovery.hasDeliveryPin} deliveryArea={discovery.deliveryArea} available={discovery.available}/>
  <section className="customer-recent-orders" id="order-history"><div className="kitchen-section-heading"><div><span className="eyebrow"><UiText text="Your activity"/></span><h2><UiText text="Recent orders"/></h2></div><Link className="text-link" href="/customer/orders"><UiText text="All orders & history"/> →</Link><OrdersRefresh active={orders.some(o=>!["DELIVERED","CANCELLED","FAILED"].includes(o.status))}/></div>
   {recent.status==="rejected"?<p role="status">Orders could not load. <Link href="/customer/orders">Open your orders to retry →</Link></p>:orders.length?<ul>{orders.map(o=><li key={o.id}><div><strong>{o.kitchen.name}</strong><p>{o.items.map(i=>i.quantity+" × "+i.mealName).join(", ")}</p><small>{o.orderNumber} · {o.scheduledFor.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short"})}</small></div><div><span className="customer-status">{o.status.toLowerCase().replaceAll("_"," ")}</span><Link className="text-link" href={"/customer/orders#order-"+o.id}><UiText text="Track order"/> →</Link></div></li>)}</ul>:<p><UiText text="Your first order will appear here."/></p>}
  </section>
 </main>;
}
