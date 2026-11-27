export const ORDER_PHOTO_STAGES=["PREPARED","HANDOVER"] as const;
export type OrderPhotoStage=typeof ORDER_PHOTO_STAGES[number];
export function canUploadOrderPhoto(stage:OrderPhotoStage,status:string,paid:boolean){return paid&&(stage==="PREPARED"?["PREPARING","READY_FOR_PICKUP","DELIVERY_ASSIGNED"]:["READY_FOR_PICKUP","DELIVERY_ASSIGNED"]).includes(status);}
export function orderPhotoCaption(orderNumber:string,stage:OrderPhotoStage){return "Order "+orderNumber+" · "+(stage==="PREPARED"?"Prepared meal":"Courier handover");}
export function publicPilotSnapshot(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))return{};const snapshot={...value as Record<string,unknown>};delete snapshot.photoEvidence;return snapshot;}
