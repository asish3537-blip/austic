import {prisma} from "@/lib/prisma";
import {emailConfig} from "@/lib/email";

export function orderEmailContent(notification:{title:string;body:string},role:string){
 const product=/product|\bPP-/i.test(notification.title+" "+notification.body);
 const path=role==="MOTHER"?(product?"/mother/marketplace":"/mother/dashboard#incoming-orders"):(product?"/customer/purchases":"/customer/orders");
 return {subject:"Paustik · "+notification.title.replace(/[\r\n]/g," ").slice(0,150),text:notification.title+"\n\n"+notification.body+"\n\nOpen your Paustik account: https://paustik.in"+path+"\n\nThis is an order update, not a payment receipt."};
}

// New notifications are the outbox. Older records explicitly remain email_pending=false.
// Provider idempotency plus a bounded lease prevents duplicate mail across retries.
export async function sendPendingOrderEmails(userIds:string[],sender:typeof fetch=fetch){
 const config=emailConfig();if(!config||!userIds.length)return;
 const now=new Date(),since=new Date(now.getTime()-23*3600000),retryBefore=new Date(now.getTime()-60000);
 const pending=await prisma.notification.findMany({where:{userId:{in:[...new Set(userIds)]},emailPending:true,emailSentAt:null,emailAttempts:{lt:3},createdAt:{gte:since},kind:{in:["ORDER","DELIVERY"]},OR:[{emailAttemptAt:null},{emailAttemptAt:{lt:retryBefore}}],user:{status:"ACTIVE",role:{in:["CUSTOMER","MOTHER"]},emailVerifiedAt:{not:null},email:{not:{endsWith:"@paustik.invalid"}}}},include:{user:{select:{email:true,role:true,customerProfile:{select:{notificationOptIn:true}}}}},orderBy:{createdAt:"asc"},take:10});
 await Promise.allSettled(pending.map(async n=>{
  if(n.user.customerProfile?.notificationOptIn===false)return;
  const claimed=await prisma.notification.updateMany({where:{id:n.id,emailPending:true,emailSentAt:null,emailAttempts:{lt:3},OR:[{emailAttemptAt:null},{emailAttemptAt:{lt:retryBefore}}]},data:{emailAttemptAt:now,emailAttempts:{increment:1}}});
  if(!claimed.count)return;
  try{
   const response=await sender("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+config.apiKey,"Content-Type":"application/json","Idempotency-Key":"paustik-notification/"+n.id},body:JSON.stringify({from:config.from,to:[n.user.email],...orderEmailContent(n,n.user.role)}),cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(response.ok)await prisma.notification.update({where:{id:n.id},data:{emailPending:false,emailSentAt:new Date()}});
   else console.error("Paustik order email not accepted",response.status);
  }catch{console.error("Paustik order email deferred");}
 }));
}
