import {UiText} from "@/components/ui-language";
import Link from "next/link";
import { requireAuthenticatedUser, roleHome } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";
export default async function NotificationsPage() {
  const user = await requireAuthenticatedUser();
  return <main className="dashboard-shell"><Link href={roleHome(user)}><UiText text={"← Back to workspace"}/></Link><h1><UiText text={"Notifications"}/></h1><NotificationCenter full/></main>;
}
