import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { loadCustomerKitchenDiscovery, sampleCustomerKitchens } from "@/lib/customer-kitchens";
import { kitchenMoney, type CustomerKitchen } from "@/lib/customer-kitchen-types";
import { CustomerDeliveryPin, FavoriteKitchenButton, WeeklyPlanPicker } from "@/components/customer-marketplace-controls";
import { KitchenMenu } from "@/components/kitchen-menu";

export const metadata = { title: "Kitchen menu & subscription" };

export default async function KitchenPage({ params }: { params: Promise<{ kitchenId: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { kitchenId } = await params;
  const sample = kitchenId.startsWith("sample-");
  let kitchen: CustomerKitchen | undefined;
  let hasDeliveryPin = false;
  let available = true;
  if (sample) {
    kitchen = sampleCustomerKitchens().find((item) => item.id === kitchenId);
    if (!kitchen) notFound();
  } else {
    try {
      const discovery = await loadCustomerKitchenDiscovery(user.id);
      kitchen = discovery.kitchens.find((item) => item.id === kitchenId);
      hasDeliveryPin = discovery.hasDeliveryPin;
    } catch (error) {
      available = false;
      console.error("Pausstik kitchen menu could not load.", error instanceof Error ? error.name : "unknown error");
    }
  }

  if (!kitchen) return <main className="dashboard-shell kitchen-detail"><Link className="kitchen-back-link" href="/customer/dashboard#customer-discover">← All kitchens</Link><div className="kitchen-empty"><h1>{available ? "This kitchen’s menu isn’t available" : "We couldn’t load this menu"}</h1><p>{available ? "It may have sold out, paused orders or be outside your delivery area. Choose another kitchen to see available meals." : "Please try again in a moment."}</p><Link className="button" href="/customer/dashboard#customer-discover">Explore kitchens</Link></div></main>;

  const days = new Set(kitchen.meals.map((meal) => meal.serviceDate)).size;
  return <main className="dashboard-shell kitchen-detail">
    <Link className="kitchen-back-link" href="/customer/dashboard#customer-discover">← All kitchens</Link>
    <ol className="kitchen-journey" aria-label="Your meal journey"><li><span>✓</span>Choose a kitchen</li><li className="is-current"><span>2</span>Explore its menu</li><li><span>3</span>Build your subscription</li></ol>
    {sample && <div className="kitchen-sample-notice"><strong>Sample kitchen preview</strong><span>This menu, rating and availability are for demonstration. You can explore a subscription price, but no order or payment will be created.</span></div>}
    <header className="kitchen-detail-header">
      <span className="kitchen-detail-avatar" aria-hidden="true">{kitchen.motherName.slice(0, 1)}</span>
      <div><span className="eyebrow">{sample ? "Meet a sample mother" : "From a mother-led kitchen"}</span><h1>{kitchen.name}</h1><p>Prepared by {kitchen.motherName} · {kitchen.locality}, {kitchen.city}</p><p>{kitchen.cuisine}</p><div className="kitchen-detail-facts"><span>{kitchen.rating > 0 ? `★ ${kitchen.rating.toFixed(1)}${sample ? " sample rating" : ""}` : "New kitchen"}</span><span>From {kitchenMoney(Math.min(...kitchen.meals.map((meal) => meal.price)))} / meal</span><span>{days} menu days</span>{kitchen.distanceKm !== undefined && <span>{kitchen.distanceKm.toFixed(1)} km away</span>}</div></div>
      <div className="kitchen-detail-actions"><a className="button button-warm" href="#kitchen-subscription">Build my subscription</a>{!sample && <FavoriteKitchenButton kitchenId={kitchen.id} initiallySaved={Boolean(kitchen.isFavorite)} />}</div>
    </header>
    {!sample && <CustomerDeliveryPin initialPinned={hasDeliveryPin} />}
    <div className="kitchen-delivery-strip"><span><strong>Neighbourhood delivery</strong>{sample ? "Delivery eligibility is confirmed for real kitchens using your saved pin." : hasDeliveryPin ? `This kitchen serves your pin within its ${kitchen.marketplaceRadiusKm} km area.` : "Add your delivery pin to confirm this kitchen can reach you."}</span><span><strong>Clear daily pricing</strong>Meal price + ₹30 delivery per day</span>{!sample && kitchen.latitude !== undefined && kitchen.longitude !== undefined && <a href={`https://www.openstreetmap.org/?mlat=${kitchen.latitude}&mlon=${kitchen.longitude}#map=15/${kitchen.latitude}/${kitchen.longitude}`} target="_blank" rel="noreferrer">View kitchen on map ↗</a>}</div>
    <KitchenMenu meals={kitchen.meals} sample={sample} canOrder={hasDeliveryPin} />
    <section className="kitchen-subscription-section" id="kitchen-subscription" aria-labelledby="kitchen-subscription-title">
      <div className="kitchen-section-heading"><div><span className="eyebrow">Make it your everyday kitchen</span><h2 id="kitchen-subscription-title">Build your subscription</h2><p>Choose 3–7 days from this mother’s available menu. Your meals, your days, one kitchen.</p></div><span className="kitchen-minimum-tag">3 days minimum</span></div>
      <WeeklyPlanPicker kitchenName={kitchen.name} preview={sample} canReserve={hasDeliveryPin} menus={kitchen.meals.map((meal) => ({ menuId: meal.menuId ?? meal.id, name: meal.name, serviceDate: meal.serviceDate, price: meal.price, servings: meal.servings, category: meal.category, components: meal.components, deliveryTime: meal.deliveryTime }))} />
    </section>
    <aside className="kitchen-policy"><h2>Good to know before you reserve</h2><div><p><strong>A flexible week</strong>Subscriptions cover your selected 3–7 days in one week. Renew manually when you are ready.</p><p><strong>Need to skip a day?</strong>Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, returns to your Pausstik wallet.</p><p><strong>Pilot payments</strong>Existing wallet credit is used first. Online checkout is not connected; any remaining amount is due outside the app.</p></div><Link className="text-link" href="/help#customer-workspace">Need help with your subscription? →</Link></aside>
  </main>;
}
