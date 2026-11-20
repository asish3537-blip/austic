import {UiText} from "@/components/ui-language";
import { GoogleMapActions } from "@/components/google-map-actions";
import { KitchenAvatar } from "@/components/kitchen-avatar";
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
      console.error("Paustik kitchen menu could not load.", error instanceof Error ? error.name : "unknown error");
    }
  }

  if (!kitchen) return <main className="dashboard-shell kitchen-detail"><Link className="kitchen-back-link" href="/customer/dashboard#customer-discover"><UiText text={"← All kitchens"}/></Link><div className="kitchen-empty"><h1><UiText text={available ? "This kitchen’s menu isn’t available" : "We couldn’t load this menu"}/></h1><p><UiText text={available ? "It may have sold out, paused orders or be outside your delivery area. Choose another kitchen to see available meals." : "Please try again in a moment."}/></p><Link className="button" href="/customer/dashboard#customer-discover"><UiText text={"Explore kitchens"}/></Link></div></main>;

  const days = new Set(kitchen.meals.map((meal) => meal.serviceDate)).size;
  return <main className="dashboard-shell kitchen-detail">
    <Link className="kitchen-back-link" href="/customer/dashboard#customer-discover"><UiText text={"← All kitchens"}/></Link>
    <ol className="kitchen-journey" aria-label="Your meal journey"><li><span>✓</span><UiText text={"Choose a kitchen"}/></li><li className="is-current"><span>2</span><UiText text={"Explore its menu"}/></li><li><span>3</span><UiText text={"Build your subscription"}/></li></ol>
    {sample && <div className="kitchen-sample-notice"><strong><UiText text={"Sample kitchen preview"}/></strong><span><UiText text={"This menu, rating and availability are for demonstration. You can explore a subscription price, but no order or payment will be created."}/></span></div>}
    <header className="kitchen-detail-header">
      <KitchenAvatar name={kitchen.motherName} image={kitchen.profileImage} kind={kitchen.imageKind}/>
      <div><span className="eyebrow"><UiText text={sample ? "Meet a sample mother" : "From a mother-led kitchen"}/></span><h1>{kitchen.name}</h1><p><UiText text={"Prepared by"}/>{" "}{kitchen.motherName} · {kitchen.locality}, {kitchen.city}</p><p>{kitchen.cuisine}</p><div className="kitchen-detail-facts"><span><UiText text={kitchen.rating > 0 ? `★ ${kitchen.rating.toFixed(1)}${sample ? " sample rating" : ""}` : "New kitchen"}/></span><span><UiText text={"From"}/>{" "}{kitchenMoney(Math.min(...kitchen.meals.map((meal) => meal.price)))}{" "}<UiText text={"/ meal"}/></span><span>{days}{" "}<UiText text={"menu days"}/></span>{kitchen.distanceKm !== undefined && <span>{kitchen.distanceKm.toFixed(1)}{" "}<UiText text={"km away"}/></span>}</div></div>
      <div className="kitchen-detail-actions"><a className="button button-warm" href="#kitchen-menu"><UiText text={"Order one meal"}/></a><a className="text-link" href="#kitchen-subscription"><UiText text={"Meal subscription →"}/></a>{!sample && <FavoriteKitchenButton kitchenId={kitchen.id} initiallySaved={Boolean(kitchen.isFavorite)} />}</div>
    </header>
    {!sample && <CustomerDeliveryPin initialPinned={hasDeliveryPin} />}
    <div className="kitchen-delivery-strip"><span><strong><UiText text={"Neighbourhood delivery"}/></strong><UiText text={sample ? "Delivery eligibility is confirmed for real kitchens using your saved pin." : hasDeliveryPin ? kitchen.canDeliver===false ? "Your saved pin is outside the 25 km delivery area. You can browse; update your location before booking." : `This kitchen serves your pin within its ${kitchen.marketplaceRadiusKm} km area.` : "Add your delivery pin to confirm this kitchen can reach you."}/></span><span><strong><UiText text={"Clear daily pricing"}/></strong><UiText text={"Meal price + distance-based delivery, shown before booking"}/></span>{!sample && kitchen.latitude !== undefined && kitchen.longitude !== undefined && <GoogleMapActions point={{ latitude: kitchen.latitude, longitude: kitchen.longitude }} label="Kitchen"/>}</div>
    <KitchenMenu meals={kitchen.meals} sample={sample} canOrder={hasDeliveryPin&&kitchen.canDeliver!==false} />
    <section className="kitchen-subscription-section" id="kitchen-subscription" aria-labelledby="kitchen-subscription-title">
      <div className="kitchen-section-heading"><div><span className="eyebrow"><UiText text={"Make it your everyday kitchen"}/></span><h2 id="kitchen-subscription-title"><UiText text={"Build your subscription"}/></h2><p><UiText text={"Choose 3–7 days from this mother’s available menu. Your meals, your days, one kitchen."}/></p></div><span className="kitchen-minimum-tag"><UiText text={"3 days minimum"}/></span></div>
      <WeeklyPlanPicker kitchenName={kitchen.name} preview={sample} canReserve={hasDeliveryPin&&kitchen.canDeliver!==false} menus={kitchen.meals.filter(meal=>!meal.oneTimeOnly).map((meal) => ({ menuId: meal.menuId ?? meal.id,mealPeriod:meal.mealPeriod, name: meal.name, serviceDate: meal.serviceDate, price: meal.price, servings: meal.servings, category: meal.category, components: meal.components, deliveryTime: meal.deliveryTime }))} />
    </section>
    <aside className="kitchen-policy"><h2><UiText text={"Good to know before you reserve"}/></h2><div><p><strong><UiText text={"A flexible week"}/></strong><UiText text={"Subscriptions cover your selected 3–7 days in one week. Renew manually when you are ready."}/></p><p><strong><UiText text={"Need to skip a day?"}/></strong><UiText text={"Cancel at least five hours before delivery. Eligible paid value, less the ₹5 processing fee, returns to your Paustik wallet."}/></p><p><strong><UiText text={"Pilot payments"}/></strong><UiText text={"Wallet credit is used first. Any remaining amount appears in checkout."}/></p></div><Link className="text-link" href="/help#customer-workspace"><UiText text={"Need help with your subscription? →"}/></Link></aside>
  </main>;
}
