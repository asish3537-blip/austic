import Link from "next/link";
import {requireRole} from "@/lib/auth";
import {FoodMarketplace} from "@/components/food-marketplace";
import {UiText} from "@/components/ui-language";
export const dynamic="force-dynamic";
export default async function Page(){await requireRole("CUSTOMER");return <main className="dashboard-shell market-shop-page"><header className="market-shop-heading"><h1><UiText text="Homemade products"/></h1><Link href="/customer/dashboard"><UiText text="Back to app"/> →</Link></header><FoodMarketplace role="CUSTOMER"/></main>;}
