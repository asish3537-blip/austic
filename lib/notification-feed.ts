export function isNewNotification(item:{createdAt:string;readAt:string|null},now=Date.now()){
 const at=Date.parse(item.createdAt);return item.readAt===null&&Number.isFinite(at)&&at>=now-24*60*60*1000&&at<=now+5*60*1000;
}
