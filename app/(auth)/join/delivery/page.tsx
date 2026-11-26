import Link from "next/link";
import {AuthPanel} from "@/components/auth-panel";
import {SignUpForm} from "@/components/auth-forms";
import {LocalEmailNotice} from "@/components/local-email-notice";
import {UiText} from "@/components/ui-language";
export default function JoinPage(){return <AuthPanel eyebrow="" title="Become a Delivery Partner" description=""><p><UiText text="Partner accounts require Paustik approval."/></p><LocalEmailNotice/><SignUpForm initialRole="DELIVERY_AGENT"/><p className="partner-entry-links"><Link href="/sign-in"><UiText text="Sign in"/></Link><Link href="/sign-up"><UiText text="Create a Customer account"/></Link></p></AuthPanel>;}
