import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMenus({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const parsed = Number(params.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100000) : 1;
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { kitchen: { name: { contains: q, mode: "insensitive" as const } } }] } : {};
  const [total, meals] = await Promise.all([
    prisma.meal.count({ where }),
    prisma.meal.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * 25, take: 25,
      include: { kitchen: { select: { name: true, locality: true, verificationStatus: true } }, menus: { orderBy: { serviceDate: "desc" }, include: { cycle: { select: { name: true, status: true } } } } },
    }),
  ]);
  const pageLink = (value: number) => `/admin/menus?${new URLSearchParams({ q, page: String(value) })}`;
  return <main className="dashboard-page"><span className="eyebrow">Admin catalogue</span><h1>All kitchen menus</h1><p>Every saved dish, including unavailable meals and draft menu cycles. Sample-only meals are available in the <Link href="/app-demo">role previews</Link>.</p>
    <form className="admin-menu-search" method="get"><label htmlFor="menu-search">Search meal or kitchen</label><input id="menu-search" name="q" defaultValue={q} maxLength={100} placeholder="Kitchen name or dish"/><button className="button" type="submit">Search</button><Link href="/admin/menus">Clear</Link></form>
    <p>{total} saved meals · Page {page} of {Math.max(1, Math.ceil(total / 25))}</p>
    <div className="admin-menu-grid">{meals.map((meal) => <article className="admin-panel" key={meal.id}><h2>{meal.name}</h2><p><strong>{meal.kitchen.name}</strong> · {meal.kitchen.locality}</p><p>Kitchen: {meal.kitchen.verificationStatus} · Dish: {meal.isAvailable ? "Available" : "Unavailable"}</p><p>{meal.category} · ₹{Number(meal.price).toFixed(2)}</p><p>{meal.components.join(" · ") || meal.description || "No meal description added."}</p><p>Allergens: {meal.allergens.join(", ") || "Not specified"}</p><details><summary>Scheduled menus ({meal.menus.length})</summary>{meal.menus.length ? meal.menus.map((menu) => <p key={menu.id}><strong>{menu.serviceDate.toISOString().slice(0, 10)}</strong> · {menu.mealPeriod} · {menu.deliveryTime}<br/>{menu.cycle.name} ({menu.cycle.status}) · Stock: {menu.stockCount} · {menu.isAvailable ? "Available" : "Unavailable"}</p>) : <p>This dish has not been scheduled yet.</p>}</details></article>)}</div>
    {!meals.length && <p className="dashboard-banner">No saved meals match this search. Mothers can add dishes and publish their menus from their workspace.</p>}
    <nav className="admin-workspace-nav" aria-label="Menu catalogue pages">{page > 1 && <Link href={pageLink(page - 1)}>← Previous</Link>}{page * 25 < total && <Link href={pageLink(page + 1)}>Next →</Link>}</nav>
  </main>;
}
