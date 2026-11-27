import type {MealTierName} from "@/lib/marketplace-rules";
export type PilotMeal = {tier:MealTierName;description:string;id:string;name:string;price:number;components:string[];ingredients:string;allergens:string;servings:number;oneTimeOnly:boolean};
export type PilotKitchen = {id:string;name:string;area:string;city:string;image:string;latitude:number;longitude:number;meals:PilotMeal[]};
const areas = [
 ["kesura","Kesura",20.26,85.88],["patia","Patia",20.35,85.82],
 ["rasulgarh","Rasulgarh",20.29,85.86],["jayadev-vihar","Jayadev Vihar",20.30,85.82],
 ["saheed-nagar","Saheed Nagar",20.29,85.85],["nayapalli","Nayapalli",20.30,85.81],
 ["khandagiri","Khandagiri",20.26,85.78],["old-town","Old Town",20.23,85.83],
 ["chandrasekharpur","Chandrasekharpur",20.33,85.82],["baramunda","Baramunda",20.28,85.80],
] as const;
const regular = [
 {tier:"BASE" as const,name:"Dalma lunch",price:69,components:["Rice","Dalma","Seasonal vegetables"],ingredients:"Rice, lentils, vegetables",allergens:""},
 {tier:"EGG" as const,name:"Egg curry lunch",price:79,components:["Rice","Egg curry","Seasonal vegetables"],ingredients:"Rice, egg, vegetables",allergens:"Egg"},
 {tier:"CHEESE" as const,name:"Paneer lunch",price:89,components:["Roti","Paneer curry","Dal"],ingredients:"Wheat, milk, lentils",allergens:"Milk, wheat"},
 {tier:"CHICKEN" as const,name:"Chicken lunch",price:99,components:["Rice","Chicken curry","Dal"],ingredients:"Rice, chicken, lentils",allergens:""},
 {tier:"DESI_CHICKEN" as const,name:"Desi chicken lunch",price:120,components:["Rice","Desi chicken curry","Dal"],ingredients:"Rice, desi chicken, lentils",allergens:""},
 {tier:"MUTTON" as const,name:"Mutton lunch",price:150,components:["Rice","Mutton curry","Dal"],ingredients:"Rice, mutton, lentils",allergens:""},
 {tier:"MUSHROOM" as const,name:"Mushroom lunch",price:69,components:["Rice","Mushroom curry","Dal"],ingredients:"Rice, mushroom, lentils",allergens:""},
];
/** Fictional catalogue. Its IDs are never real kitchen or meal IDs. */
export const PILOT_KITCHENS:PilotKitchen[] = areas.map(([id,area,latitude,longitude],index)=>({
 id:"pilot-"+id,name:area+" Practice Kitchen",area,city:"Bhubaneswar",latitude,longitude,
 image:index%2?"/assets/home-regional.avif":"/assets/home-thali.avif",
 meals:[{...regular[index%regular.length],description:regular[index%regular.length].components.join(", ")+". Ingredients: "+regular[index%regular.length].ingredients+(regular[index%regular.length].allergens?". Allergens: "+regular[index%regular.length].allergens:""),id:"regular",servings:20,oneTimeOnly:false},
 {id:"special",tier:index%2?"BASE":"CHICKEN",description:"Biryani with raita. Ingredients include rice and milk; contains dairy.",name:index%2?"Vegetable biryani special":"Chicken biryani special",price:index%2?120:150,
 components:[index%2?"Vegetable biryani":"Chicken biryani","Raita"],ingredients:index%2?"Rice, vegetables, milk":"Rice, chicken, milk",allergens:"Milk",servings:10,oneTimeOnly:true}],
}));
export type PilotOverrides = Record<string,PilotMeal[]>;
export function pilotMenus(overrides:unknown):PilotKitchen[]{
 const saved=overrides&&typeof overrides==="object"&&!Array.isArray(overrides)?overrides as PilotOverrides:{};
 return PILOT_KITCHENS.map(k=>({...k,meals:(Array.isArray(saved[k.id])?saved[k.id]:k.meals).map(m=>({...m,tier:m.tier??"BASE",description:m.description??m.components.join(", ")}))}));
}
export function publicPilotEnabled(){return process.env.PAUSTIK_PUBLIC_PILOT_ENABLED!=="false";}
