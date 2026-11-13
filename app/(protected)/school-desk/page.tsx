import {UiText} from "@/components/ui-language";
import { requireAuthenticatedUser } from "@/lib/auth";
import { ScoofooWorkspace } from "@/components/scoofoo-workspace";
export default async function Page(){const user=await requireAuthenticatedUser();return <main className="sf-shell"><span className="sf-brand"><UiText text="Scoo"/><span><UiText text="Foo"/></span><small><UiText text="School reception"/></small></span><h1><UiText text="Receive school tiffins"/></h1><p><UiText text="Only school-approved receiving accounts can view this desk. Confirm physical handover at reception, not delivery to a child."/></p><ScoofooWorkspace role={user.role} desk/></main>;}
