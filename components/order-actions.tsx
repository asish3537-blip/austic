"use client";

import {UiText} from "@/components/ui-language";
import {orderSupportMessage,repeatMealLink} from "@/lib/order-actions";
export function OrderActions({orderNumber,kitchenId,mealName,productsOnly=false,repeatHref}:{orderNumber:string;kitchenId:string;mealName:string;productsOnly?:boolean;repeatHref?:string}){
 const message=orderSupportMessage(orderNumber);
 return <div className="order-next-actions"><a className="button button-small button-secondary" href={repeatHref??(productsOnly?"/customer/marketplace":repeatMealLink(kitchenId,mealName))}><UiText text={productsOnly?"Browse current products":"Order again"}/></a><p><UiText text="Review current price, menu dates and availability before confirming. Your previous order will not be copied automatically."/></p><details><summary><UiText text="Get help with this order"/></summary><p>{orderNumber}</p><p><UiText text="Your order number is included. Add your question before sending."/></p><a href={"mailto:paustikdelivery@gmail.com?subject="+encodeURIComponent("Help with "+orderNumber)+"&body="+encodeURIComponent(message)}><UiText text="Email support"/></a><span aria-hidden="true"> · </span><a href={"https://wa.me/918310219023?text="+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><UiText text="Chat on WhatsApp"/> ↗</a></details></div>;
}
