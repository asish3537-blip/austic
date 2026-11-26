export function paymentBlocksPreparation(nextStatus:string,paymentStatus:string){
 return ["PREPARING","READY_FOR_PICKUP"].includes(nextStatus)&&paymentStatus!=="CAPTURED";
}
