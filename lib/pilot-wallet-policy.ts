export function livePaymentKey(keyId:string|undefined){return /^rzp_live_[A-Za-z0-9]+$/.test(keyId?.trim()||"");}
export function allowPilotCredit(flag:string|undefined,keyId:string|undefined){return flag==="true"&&!livePaymentKey(keyId);}
export function needsLiveWalletReview(live:boolean,pilotCredit:boolean,capturedTestPayment:boolean){return live&&(pilotCredit||capturedTestPayment);}
