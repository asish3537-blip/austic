export const SCHOOL_STATES = ["REQUESTED", "CONFIRMED", "READY", "PICKED_UP", "AT_SCHOOL", "RECEIVED"] as const;
export const schoolTimeMinutes = (time: string) => Number(time.slice(0,2))*60 + Number(time.slice(3));
export const schoolDateTime = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
export function indiaSchoolDate(now = new Date()) { return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now); }
export function schoolWindowValid(s: {bookingCutoff:string;pickupBy:string;arriveBy:string;lunchAt:string}) {
  const [cutoff,pickup,arrival,lunch] = [s.bookingCutoff,s.pickupBy,s.arriveBy,s.lunchAt].map(schoolTimeMinutes);
  return cutoff >= 360 && cutoff < pickup && pickup < arrival && arrival <= lunch-15 && lunch<=900;
}
export function schoolBookingProblem(date:string,s:{weekdays:number[];holidays:string[];bookingCutoff:string},now=new Date()) {
  const day=schoolDateTime(date,"12:00");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(day.getTime())||indiaSchoolDate(day)!==date)return "Choose a valid school day.";
  const today=indiaSchoolDate(now);
  if(date<today||day.getTime()>now.getTime()+30*86400000)return "Choose a school day within the next 30 days.";
  if(!s.weekdays.includes(day.getUTCDay())||s.holidays.includes(date))return "This school is closed on the selected date.";
  if(now>=schoolDateTime(date,s.bookingCutoff))return "Booking has closed for that school day. Choose another date.";
  return null;
}
export function schoolTransitionAllowed(status:string,action:string) {
  return ({confirm:["REQUESTED"],ready:["CONFIRMED"],pickup:["READY"],arrive:["PICKED_UP"],receive:["AT_SCHOOL","EXCEPTION"],returned:["EXCEPTION"],cancel:["REQUESTED","CONFIRMED","READY"],exception:["CONFIRMED","READY","PICKED_UP","AT_SCHOOL"]} as Record<string,string[]>)[action]?.includes(status)??false;
}
