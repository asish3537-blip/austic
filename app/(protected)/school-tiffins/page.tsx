import {UiText} from "@/components/ui-language";
import { requireAuthenticatedUser } from "@/lib/auth";
import { ScoofooWorkspace } from "@/components/scoofoo-workspace";
import Link from "next/link";
export default async function Page(){const user=await requireAuthenticatedUser();return <main className="sf-shell"><div className="sf-workspace-head"><div><Link href="/scoofoo" className="sf-brand"><UiText text="Scoo"/><span><UiText text="Foo"/></span><small><UiText text="by Paustik"/></small></Link><h1><UiText text={user.role==="DELIVERY_AGENT"?"Your school delivery route":"Home to school tiffins"}/></h1><p><UiText text="A separate school service. Track handover to an authorised adult at reception."/></p></div><Link href="/school-desk"><UiText text="School reception desk →"/></Link></div><ScoofooWorkspace role={user.role}/></main>;}
