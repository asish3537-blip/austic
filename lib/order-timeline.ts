export const ORDER_MILESTONES: readonly {status:string;label:string;photo?:"PREPARED"|"HANDOVER"}[] = [
  {status:"ORDER_PLACED",label:"Order placed"},
  {status:"CONFIRMED",label:"Kitchen confirmed"},
  {status:"PREPARING",label:"Preparing your meal",photo:"PREPARED"},
  {status:"READY_FOR_PICKUP",label:"Packed · ready for courier",photo:"HANDOVER"},
  {status:"PICKED_UP",label:"Picked up by courier"},
  {status:"OUT_FOR_DELIVERY",label:"On the way"},
  {status:"DELIVERED",label:"Delivered"},
] as const;
export function orderTimeline(status:string,events:{status:string;at:string}[]){
  const normalize=(s:string)=>s==="DELIVERY_ASSIGNED"?"READY_FOR_PICKUP":s;
  const current=ORDER_MILESTONES.findIndex(m=>m.status===normalize(status));
  return ORDER_MILESTONES.map((m,index)=>{
    const event=events.find(e=>normalize(e.status)===m.status && Number.isFinite(Date.parse(e.at)));
    return {...m,at:event?.at,state:index===current?"current":event?"recorded":current>index?"passed":["CANCELLED","FAILED"].includes(status)?"stopped":"upcoming"};
  });
}
