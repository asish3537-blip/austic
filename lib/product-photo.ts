import {normalizeKitchenImage} from "@/lib/kitchen-branding";
export const PRODUCT_PHOTO_LIMIT=280000;
export function normalizeProductPhoto(value:string|null|undefined){
 if(value==null)return value;
 return normalizeKitchenImage(value,{maxLength:PRODUCT_PHOTO_LIMIT,maxDimension:640,maxChunk:210000});
}
export function hasProductPhoto(value:unknown):value is string{return typeof value==="string"&&value.length<=PRODUCT_PHOTO_LIMIT&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);}
export function canViewProductPhoto(user:{id:string;role:string;status:string},product:{ownerId:string;published:boolean;city:string},customerCity?:string|null){
 if(user.status!=="ACTIVE")return false;
 if(user.role==="ADMIN")return true;
 if(user.role==="MOTHER")return user.id===product.ownerId;
 return user.role==="CUSTOMER"&&product.published&&Boolean(customerCity?.trim())&&customerCity!.trim().toLowerCase()===product.city.trim().toLowerCase();
}
