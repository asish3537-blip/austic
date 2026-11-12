import type {CustomerKitchen} from "./customer-kitchen-types";
export type DiscoveryFilters={query:string;diet:string;savedOnly:boolean;period:string;cuisine:string;maxPrice:number;sort:string;mode:string};
export function filterCustomerKitchens(kitchens:CustomerKitchen[],f:DiscoveryFilters){
 const query=f.query.trim().toLocaleLowerCase("en-IN");
 const result=kitchens.flatMap(k=>{
  if((f.savedOnly&&!k.isFavorite)||(f.cuisine&&k.cuisine!==f.cuisine))return [];
  const meals=k.meals.filter(m=>(f.mode!=="subscription"||!m.oneTimeOnly)&&(f.diet==="all"||(f.diet==="vegetarian"?m.category!=="NON_VEGETARIAN":m.category==="NON_VEGETARIAN"))&&(f.period==="ALL"||(m.mealPeriod??"LUNCH")===f.period)&&m.price<=f.maxPrice&&[k.name,k.motherName,k.cuisine,k.locality,m.name,...m.components].join(" ").toLocaleLowerCase("en-IN").includes(query));
  if(!meals.length)return [];
  if(f.mode==="subscription"&&!['BREAKFAST','LUNCH','DINNER'].some(period=>new Set(meals.filter(m=>(m.mealPeriod??"LUNCH")===period).map(m=>m.serviceDate)).size>=3))return [];
  return [{...k,meals}];
 });
 return result.sort((a,b)=>f.sort==="price"?Math.min(...a.meals.map(m=>m.price))-Math.min(...b.meals.map(m=>m.price)):f.sort==="rating"?b.rating-a.rating:(a.distanceKm??Infinity)-(b.distanceKm??Infinity)||b.rating-a.rating);
}
