import {indiaDate} from "./service-windows";
export function repeatMenuDates(start:string,days:number,now=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(days)||days<1||days>7)throw new Error("Choose a start date and between one and seven days.");
 const date=new Date(start+"T00:00:00Z");
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==start||start<indiaDate(now))throw new Error("Choose today or a future date for this menu item.");
 return Array.from({length:days},(_,i)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()+i);return d;});
}
