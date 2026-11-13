import { requireAuthenticatedUser } from "@/lib/auth";
import { ScoofooWorkspace } from "@/components/scoofoo-workspace";
export default async function Page(){const user=await requireAuthenticatedUser();return <main className="sf-shell"><span className="sf-brand">Scoo<span>Foo</span><small>School reception</small></span><h1>Receive school tiffins</h1><p>Only school-approved receiving accounts can view this desk. Confirm physical handover at reception, not delivery to a child.</p><ScoofooWorkspace role={user.role} desk/></main>;}
