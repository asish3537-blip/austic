export function orderSupportMessage(orderNumber:string){
 const reference=orderNumber.replace(/[\r\n\u0000-\u001f]/g," ").trim().slice(0,80);
 return `Hi Paustik, I need help with order ${reference}. Please help me with: `;
}
export function repeatMealLink(kitchenId:string,mealName:string){
 return "/customer/kitchens/"+encodeURIComponent(kitchenId)+"?q="+encodeURIComponent(mealName.slice(0,100))+"#kitchen-menu";
}
