"use client";
import {UiText} from "@/components/ui-language";
export function MealDetails({meal}:{meal:{ingredients?:string[]|string;allergens?:string[]|string}}){
 const value=(input?:string[]|string)=>Array.isArray(input)?input.filter(Boolean).join(", "):input?.trim();
 return <details className="meal-details"><summary><UiText text="Ingredients & allergens"/></summary><h4><UiText text="Ingredients"/></h4><p>{value(meal.ingredients)||<UiText text="Ingredients not provided by this kitchen."/>}</p><h4><UiText text="Allergens"/></h4><p>{value(meal.allergens)||<UiText text="Allergen information not provided. This does not mean allergen-free."/>}</p><p><UiText text="Portion size varies by kitchen. Ask about portions and food allergies before ordering."/></p></details>;
}
