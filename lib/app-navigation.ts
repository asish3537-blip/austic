export type AppRole="CUSTOMER"|"MOTHER"|"DELIVERY_AGENT"|"ADMIN";
export const appNavigation={
 CUSTOMER:[{label:"Home",icon:"home",href:"/customer/dashboard"},{label:"Orders",icon:"orders",href:"/customer/orders"},{label:"Paustik Pay",icon:"pay",href:"/customer/wallet"},{label:"Food shop",icon:"shop",href:"/customer/marketplace"},{label:"ScooFoo",icon:"school",href:"/school-tiffins"}],
 MOTHER:[{label:"Kitchen",icon:"home",href:"/mother/dashboard"},{label:"Menu",icon:"menu",href:"/mother/dashboard#weekly-menu"},{label:"Orders",icon:"orders",href:"/mother/dashboard#incoming-orders"},{label:"Food shop",icon:"shop",href:"/mother/marketplace"},{label:"ScooFoo",icon:"school",href:"/school-tiffins"}],
 DELIVERY_AGENT:[{label:"Jobs",icon:"jobs",href:"/delivery/dashboard#available-jobs"},{label:"Route",icon:"route",href:"/delivery/dashboard#delivery-route"},{label:"Help",icon:"help",href:"/help#courier-onboarding"},{label:"ScooFoo",icon:"school",href:"/school-tiffins"}],
 ADMIN:[{label:"Overview",icon:"menu",href:"/admin/paustik-admin"},{label:"Income",icon:"pay",href:"/admin/analytics"},{label:"Activity",icon:"orders",href:"/admin/orders"},{label:"People",icon:"people",href:"/admin/accounts"},{label:"Website",icon:"globe",href:"/"}]
} as const;
export type AppIcon=typeof appNavigation[AppRole][number]["icon"]|"bell";
export function activeNavigationIndex(role:AppRole,path:string,hash=""){
 const items=appNavigation[role];
 const exact=items.findIndex(item=>item.href===path+hash);if(exact>=0)return exact;
 if(role==="CUSTOMER"&&path.startsWith("/customer/purchases"))return 1;
 if(role==="CUSTOMER"&&path.startsWith("/customer/kitchens/"))return 0;
 return items.findIndex(item=>{const target=item.href.split("#")[0];return path===target||(target!=="/"&&path.startsWith(target+"/"));});
}
