export function validPilotKey(id:string|undefined){return /^rzp_test_[A-Za-z0-9]+$/.test(id?.trim()||"");}
export function pilotPaymentReady(id:string|undefined,secret:string|undefined,webhook:string|undefined){return validPilotKey(id)&&Boolean(secret?.trim()&&webhook?.trim());}
export const PILOT_STEPS = ["ORDER_PLACED","CONFIRMED","PREPARING","READY_FOR_PICKUP","DELIVERY_ASSIGNED","PICKED_UP","OUT_FOR_DELIVERY","DELIVERED"] as const;
export function pilotTransition(role:string,current:string,next:string,paid:boolean){
 if(!paid)return false;
 if(next==="CANCELLED")return role==="customer"&&["ORDER_PLACED","CONFIRMED"].includes(current);
 const i=PILOT_STEPS.indexOf(current as typeof PILOT_STEPS[number]);
 return i>=0&&PILOT_STEPS[i+1]===next&&(i<3?role==="mother":role==="courier");
}
