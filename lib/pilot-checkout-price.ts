export function pilotCheckoutPrice(price:number,quantity:number,days:number,couponCode=""){
 const code=couponCode.trim().toUpperCase();
 if(code&&!['TEST10','TESTDELIVERY'].includes(code))throw new Error("This practice code is unavailable. Use TEST10 or TESTDELIVERY.");
 const foodPaise=Math.round(price*100)*quantity*days,deliveryPaise=900*days;
 const discountPaise=code==='TEST10'?Math.min(10000,Math.floor(foodPaise*.1)):code==='TESTDELIVERY'?deliveryPaise:0;
 return {couponCode:code,foodPaise,deliveryPaise,discountPaise,totalPaise:foodPaise+deliveryPaise-discountPaise};
}
