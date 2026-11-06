import {onlineCouriers} from "@/lib/delivery-availability";
import {courierCovers} from "@/lib/courier-offers";
import {createHash} from "node:crypto";
import {prisma} from "@/lib/prisma";
import {distanceMeters} from "@/lib/marketplace-rules";
import {validProductSlot} from "@/lib/service-windows";
import type {Prisma} from "@/app/generated/prisma/client";
export const PRODUCT_DELIVERY_RADIUS_METERS=25000;
export class MarketError extends Error{constructor(message:string,public status=409){super(message);}}
export const productInclude={meal:{include:{kitchen:{include:{mother:{include:{user:{select:{id:true,status:true}}}}}}}}} satisfies Prisma.FoodProductInclude;
export type LoadedProduct=Prisma.FoodProductGetPayload<{include:typeof productInclude}>;
export function readyKitchen(p:LoadedProduct){const k=p.meal.kitchen;return k.verificationStatus==="APPROVED"&&k.isAcceptingOrders&&k.mother.verificationStatus==="APPROVED"&&k.mother.user.status==="ACTIVE";}
export function availableProduct(p:LoadedProduct,at=new Date()){return p.isActive&&p.meal.isAvailable&&readyKitchen(p)&&p.stockCount>=p.minimumQuantity&&(p.preparationMode!=="READY"||(p.readyUntil!==null&&p.readyUntil>at));}
export function assertProductSlot(p:LoadedProduct,date:Date,now=new Date()){if(!validProductSlot(date,p.preparationMode==="READY"?0:p.preparationMinutes,now))throw new MarketError("Choose delivery 06:00–21:00 IST, at least preparation time plus 30 minutes ahead, within seven days.");if(p.preparationMode==="READY"&&(!p.readyUntil||date>p.readyUntil))throw new MarketError("Choose delivery before this prepared batch expires, or ask the kitchen for another batch.");}
export function assertProductArea(p:LoadedProduct,a:{city:string;latitude:unknown;longitude:unknown}){const k=p.meal.kitchen;if(a.latitude==null||a.longitude==null||k.latitude==null||k.longitude==null)throw new MarketError("Set the customer delivery pin and kitchen pickup pin first.");if(a.city.trim().toLowerCase()!==k.city.trim().toLowerCase()||distanceMeters({latitude:Number(a.latitude),longitude:Number(a.longitude)},{latitude:Number(k.latitude),longitude:Number(k.longitude)})>PRODUCT_DELIVERY_RADIUS_METERS)throw new MarketError("This kitchen does not deliver to your saved address.");}
export function productView(p:LoadedProduct){return {id:p.id,diet:p.meal.category,category:p.category,name:p.meal.name,description:p.meal.description,ingredients:p.meal.ingredients,allergens:p.meal.allergens,price:Number(p.meal.price),unitLabel:p.unitLabel,stock:p.stockCount,minQuantity:p.minimumQuantity,mode:p.preparationMode,prepMinutes:p.preparationMinutes,storage:p.storageInstructions,shelfLifeHours:p.shelfLifeHours,readyUntil:p.readyUntil?.toISOString(),published:availableProduct(p),active:p.isActive,updatedAt:p.updatedAt.toISOString(),kitchen:p.meal.kitchen.name,kitchenId:p.meal.kitchenId,locality:p.meal.kitchen.locality,city:p.meal.kitchen.city};}
export async function getProductCatalog(userId:string){
 const address=await prisma.address.findFirst({where:{userId},orderBy:[{isDefault:"desc"},{createdAt:"asc"}]});
 if(!address?.city.trim())return {products:[],needsPin:true};
 const city=address.city.trim(),needsPin=address.latitude===null||address.longitude===null;
 const [products,agents]=await Promise.all([
  prisma.foodProduct.findMany({where:{isActive:true,meal:{kitchen:{city:{contains:city,mode:"insensitive"}}}},include:productInclude,orderBy:{createdAt:"desc"},take:100}),onlineCouriers()
 ]);
 return {needsPin,deliveryArea:[address.locality,city].filter(Boolean).join(", "),products:products.filter(p=>p.meal.kitchen.city.trim().toLowerCase()===city.toLowerCase()&&availableProduct(p)).map(p=>{
  let serviceable=true;try{assertProductArea(p,address);}catch{serviceable=false;}
  return {...productView(p),serviceable,deliveryAvailable:agents.some(a=>courierCovers(a,p.meal.kitchen))};
 })};
}
export async function productRequests(user:{id:string;role:string}){return prisma.productRequest.findMany({where:user.role==="CUSTOMER"?{customerId:user.id}:user.role==="MOTHER"?{product:{meal:{kitchen:{mother:{userId:user.id}}}}}:{},include:{product:{select:{unitLabel:true,meal:{select:{name:true,kitchen:{select:{name:true}}}}}},customer:{select:{name:true}},order:{select:{orderNumber:true,status:true}}},orderBy:{createdAt:"desc"},take:60});}

export function productTerms(p:LoadedProduct){return createHash("sha256").update(JSON.stringify([p.meal.name,p.meal.category,Number(p.meal.price),p.unitLabel,p.preparationMode,p.preparationMinutes,p.minimumQuantity,p.meal.ingredients,p.meal.allergens,p.storageInstructions,p.shelfLifeHours,p.readyUntil?.toISOString()??null])).digest("hex");}
