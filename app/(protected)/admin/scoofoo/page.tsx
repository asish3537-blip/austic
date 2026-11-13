import { requireRole } from "@/lib/auth";
import { ScoofooWorkspace } from "@/components/scoofoo-workspace";
export default async function Page(){await requireRole("ADMIN");return <main className="console-page sf-admin"><span className="sf-brand">Scoo<span>Foo</span><small>School operations</small></span><h1>School tiffin control</h1><p>Approve the school and receiving desk, confirm daily requests and assign a dedicated courier. School bookings do not enter the Paustik meal queue or wallet checkout.</p><ScoofooWorkspace role="ADMIN"/></main>;}
