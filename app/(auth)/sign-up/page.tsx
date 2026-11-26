import { redirect } from "next/navigation";
import Link from "next/link";
import { LocalEmailNotice } from "@/components/local-email-notice";
import { AuthPanel } from "@/components/auth-panel";
import { SignUpForm } from "@/components/auth-forms";
import { UiText } from "@/components/ui-language";
export default async function SignUpPage({searchParams}:{searchParams:Promise<{role?:string}>}) {
 const {role}=await searchParams;
 if(role==="MOTHER") redirect("/join/mother");
 if(role==="DELIVERY_AGENT") redirect("/join/delivery");
 return <AuthPanel eyebrow="" title="Create an account" description=""><LocalEmailNotice/><SignUpForm/><p className="partner-entry-links"><Link href="/join/mother"><UiText text="Become a Mother Kitchen Partner"/></Link><Link href="/join/delivery"><UiText text="Become a Delivery Partner"/></Link></p></AuthPanel>;
}
