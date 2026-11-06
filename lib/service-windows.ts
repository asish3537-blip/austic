export const MEAL_PERIODS = ["BREAKFAST", "LUNCH", "DINNER"] as const;
export type MealPeriod = typeof MEAL_PERIODS[number];
export function indiaDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit" }).format(now); }
export function indiaMinutes(now = new Date()) { const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(now).split(":").map(Number);return p[0]*60+p[1]; }
export function slotAllowed(period:string,time:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return false;const [h,m]=time.split(":").map(Number),n=h*60+m;return period==="BREAKFAST"?n>=360&&n<660:period==="LUNCH"?n>=660&&n<1020:period==="DINNER"?n>=1020&&n<=1260:false;}
export function componentsAllowed(period:string,items:string[]){return (MEAL_PERIODS as readonly string[]).includes(period)&&items.length>0&&items.length<=3&&(period!=="LUNCH"||items.length===3);}
export function validProductSlot(date:Date,prepMinutes:number,now=new Date()){if(!Number.isFinite(date.getTime()))return false;const n=indiaMinutes(date);return n>=360&&n<=1260&&date.getTime()>=now.getTime()+(Math.max(0,prepMinutes)+30)*60000&&date.getTime()<=now.getTime()+7*86400000;}
export function canStartLocalDelivery(now=new Date()){const n=indiaMinutes(now);return n>=360&&n<1230;}
export const DELIVERY_WINDOW_POLICY={deliveryEndIST:"21:00",lastPickupIST:"20:30",travelBufferMinutes:30};
