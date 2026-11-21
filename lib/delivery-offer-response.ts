export function canDeclineDeliveryOffer(job: {orderStatus:string;deliveryStatus:string|null;agentId:string|null;bulk:boolean;offeredHere:boolean}, agentId:string) {
  return !job.bulk && job.offeredHere && ["ORDER_PLACED","CONFIRMED","PREPARING","READY_FOR_PICKUP"].includes(job.orderStatus)
    && (job.deliveryStatus === null || job.deliveryStatus === "ASSIGNED") && (job.agentId === null || job.agentId === agentId);
}
