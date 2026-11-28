import {SupportLinks} from "@/components/support-links";
import Link from "next/link";
import {UiText} from "@/components/ui-language";
export function AuthPanel({ children, title }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="simple-auth"><h1 className="visually-hidden"><UiText text={title}/></h1><section className="auth-panel"><Link href="/browse" className="browse-sign-in-back"><span aria-hidden="true">←</span><UiText text="Browse kitchens first"/></Link>{children}<SupportLinks/></section></main>;
}
