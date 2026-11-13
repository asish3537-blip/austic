import Link from "next/link";
import {requireAuthenticatedUser,roleHome} from "@/lib/auth";
import {BrandWordmark} from "@/components/brand-wordmark";
import {AccountMenu} from "@/components/account-menu";
import {LanguageSelector} from "@/components/ui-language";
import {AppBottomNavigation} from "@/components/app-bottom-navigation";
import {AppNotificationLink} from "@/components/app-notification-link";
export default async function ProtectedLayout({children}:Readonly<{children:React.ReactNode}>){
 const user=await requireAuthenticatedUser();
 if(user.role==="ADMIN")return <>{children}<AppBottomNavigation role="ADMIN"/></>;
 return <div className={"customer-app-shell role-app-shell role-"+user.role.toLowerCase()}><header className="customer-app-header"><Link href={roleHome(user)} aria-label="Paustik app home"><BrandWordmark width={160} height={78} priority/></Link><div className="app-header-tools"><LanguageSelector/><AppNotificationLink/><AccountMenu name={user.name} role={user.role}/></div></header>{children}<AppBottomNavigation role={user.role}/></div>;
}
