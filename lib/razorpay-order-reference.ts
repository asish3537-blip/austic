export type RazorpayMode="test"|"live";
export function razorpayMode(keyId:string):RazorpayMode {
  if(/^rzp_test_[A-Za-z0-9]+$/.test(keyId))return "test";
  if(/^rzp_live_[A-Za-z0-9]+$/.test(keyId))return "live";
  throw new Error("Invalid Razorpay key mode.");
}
export function razorpayOrderReference(mode:RazorpayMode,orderId:string){
  if(!/^order_[A-Za-z0-9]+$/.test(orderId))throw new Error("Invalid provider order.");
  return `razorpay:${mode}:${orderId}`;
}
export function readRazorpayOrderReference(reference:string|null|undefined,mode:RazorpayMode){
  if(!reference)return null;
  const current=reference.match(/^razorpay:(test|live):(order_[A-Za-z0-9]+)$/);
  if(current)return current[1]===mode?current[2]:null;
  // The legacy deployment was confirmed to use Test Mode. Do not reuse its
  // unlabelled references when the merchant switches to real collections.
  const legacy=reference.match(/^razorpay:(order_[A-Za-z0-9]+)$/);
  return mode==="test"&&legacy?legacy[1]:null;
}
