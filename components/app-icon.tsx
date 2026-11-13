import type {AppIcon as IconName} from "@/lib/app-navigation";
export function AppIcon({name}:{name:IconName}){
 const paths={
  home:<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></>,
  orders:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></>,
  pay:<><path d="M20 7H5a2 2 0 0 1 0-4h13v4M4 5v14a2 2 0 0 0 2 2h14V7M20 11h-6v6h6"/><circle cx="16.5" cy="14" r=".6"/></>,
  shop:<><path d="M3 9 5 3h14l2 6M4 11v10h16V11M9 21v-7h6v7M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
  globe:<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  menu:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  jobs:<><path d="M3 7h11v12H3ZM14 11h4l3 4v4h-7M6 7V4h5v3"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
  route:<><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 7v7a4 4 0 0 0 4 4h1M18 17V7a4 4 0 0 0-4-4h-1"/></>,
  help:<><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/></>,
  people:<><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/></>,
  bell:<><path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3ZM10 21h4"/></>,
  school:<><path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-6h4v6M8 11h1m6 0h1M12 3V1h5"/></>
 };
 return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
