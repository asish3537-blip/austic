import { prisma } from "@/lib/prisma";
import { DEMO_EMAIL_PREFIX, DEMO_MARKET_PREFIX, demoFinance, demoTotals } from "@/lib/demo-economics";
import { reportDays, reportStart } from "@/lib/admin-report";
export function demoFamily(value?:string){const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=10?n:undefined;}
export function demoMoney(paise:number){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2}).format(paise/100);}
export async function loadDemoMarket({days:rawDays,family:rawFamily,fixed}:{days?:string;family?:string;fixed:number}){
  const days=reportDays(rawDays),family=demoFamily(rawFamily),now=new Date(),since=new Date(reportStart(days,now));
  const prefix=DEMO_MARKET_PREFIX+(family?String(family).padStart(2,"0")+"-":"");
  const [people,orders,notificationCount]=await Promise.all([
    prisma.user.findMany({
      where:{email:{startsWith:DEMO_EMAIL_PREFIX,endsWith:family?`.${String(family).padStart(2,"0")}@paustik.invalid`:"@paustik.invalid"}},orderBy:{email:"asc"},
      select:{id:true,name:true,email:true,role:true,status:true,createdAt:true,
        motherProfile:{select:{rating:true,kitchen:{select:{id:true,name:true,locality:true,capacityPerDay:true,menus:{orderBy:{serviceDate:"asc"},select:{serviceDate:true,deliveryTime:true,meal:{select:{name:true,price:true}}}}}}}},
        deliveryAgentProfile:{select:{vehicleType:true,rating:true,completedDeliveries:true}},
      },
    }),
    prisma.order.findMany({where:{orderNumber:{startsWith:prefix},orderedAt:{gte:since,lte:now}},take:100,orderBy:{orderedAt:"desc"},include:{customer:{select:{name:true}},kitchen:{select:{id:true,name:true,locality:true}},delivery:{select:{status:true,agent:{select:{user:{select:{name:true}}}}}},items:{select:{mealName:true,quantity:true}},events:{orderBy:{createdAt:"asc"},include:{actorUser:{select:{name:true}}}},ratings:{select:{mealScore:true,deliveryScore:true,comment:true}},complaints:{select:{status:true,description:true,resolution:true}}}}),
    prisma.notification.count({where:{kind:"DEMO",user:{email:{startsWith:DEMO_EMAIL_PREFIX,...(family?{endsWith:`.${String(family).padStart(2,"0")}@paustik.invalid`}:{})}},createdAt:{gte:since,lte:now}}}),
  ]);
  const rows=orders.map(order=>({order,finance:demoFinance(order.policySnapshot)}));const valid=rows.flatMap(r=>r.finance?[r.finance]:[]);
  const totals=demoTotals(valid,fixed);const statuses=orders.reduce<Record<string,number>>((r,o)=>{r[o.status]=(r[o.status]||0)+1;return r;},{});
  return {days,family,now,people,orders,rows,totals,statuses,notificationCount,invalidRecords:rows.filter(r=>!r.finance).length};
}
