import {requireAuthenticatedUser,roleHome} from "@/lib/auth";
import {HeaderBrand} from "@/components/header-brand";
import {AccountMenu} from "@/components/account-menu";
import {LanguageSelector} from "@/components/ui-language";
import {AppBottomNavigation} from "@/components/app-bottom-navigation";
import {AppNotificationLink} from "@/components/app-notification-link";
export default async function ProtectedLayout({children}:Readonly<{children:React.ReactNode}>){
 const user=await requireAuthenticatedUser();
 if(user.role==="ADMIN")return <>{children}<AppBottomNavigation role="ADMIN"/></>;
 return <div className={"customer-app-shell role-app-shell role-"+user.role.toLowerCase()}><header className="customer-app-header"><HeaderBrand homeHref={roleHome(user)} compact/><div className="app-header-tools"><LanguageSelector/><AppNotificationLink/><AccountMenu name={user.name} role={user.role}/></div></header>{children}<AppBottomNavigation role={user.role}/></div>;
}
