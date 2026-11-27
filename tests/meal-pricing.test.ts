import test from "node:test";
import assert from "node:assert/strict";
import {MEAL_PRICE_TIERS,mealPriceAllowed} from "../lib/marketplace-rules";
test("meal types retain their starting prices without the former business caps",()=>{
 assert.equal(MEAL_PRICE_TIERS.DESI_CHICKEN.startingPrice,120);
 assert.equal(MEAL_PRICE_TIERS.MUTTON.startingPrice,150);
 assert(mealPriceAllowed("CHICKEN",180));assert(mealPriceAllowed("MUTTON",250));
 assert(mealPriceAllowed("DESI_CHICKEN",120));assert(!mealPriceAllowed("DESI_CHICKEN",119));
 assert(mealPriceAllowed("MUTTON",150));assert(!mealPriceAllowed("MUTTON",149));
 assert(mealPriceAllowed("MUSHROOM",69));assert(mealPriceAllowed("CHEESE",89));
 assert(!mealPriceAllowed("UNKNOWN",100));assert(!mealPriceAllowed("BASE",NaN));assert(!mealPriceAllowed("BASE",Infinity));
});
