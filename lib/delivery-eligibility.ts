export function canAcceptReadyDelivery(job:{agentId:string|null;status:string;orderStatus:string;bulk:boolean;orderNumber:string;inArea:boolean},agentId:string){
 return (job.agentId===null||job.agentId===agentId)&&job.status==="ASSIGNED"&&job.orderStatus==="READY_FOR_PICKUP"&&!job.bulk&&!job.orderNumber.startsWith("TEST-LIFE-")&&job.inArea;
}
