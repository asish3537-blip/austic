import {test} from "node:test";
import assert from "node:assert/strict";
import {renderToStaticMarkup} from "react-dom/server";
import {MotherShopOverview} from "../components/mother-shop-overview";
import {ProductPhoto} from "../components/product-photo";
import {kitchenPreviewPhoto} from "../lib/kitchen-preview-media";
test("kitchen overview personalizes counts and offers real category controls",()=>{
 const html=renderToStaticMarkup(<MotherShopOverview kitchenName="Sonali home cuisine" listed={5} requests={0} category="SATTU" onCategory={()=>{}}/>);
 assert(html.includes('Sonali home cuisine'));assert.equal((html.match(/aria-pressed=/g)||[]).length,4);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);assert(html.includes('Illustrative photo'));assert(!html.includes('shop-category-chips'));
});
test("illustrations are scoped to this kitchen and uploaded photos take precedence",()=>{
 const p={id:'id',name:'Chhena poda',kitchen:'Sonali home cuisine',updatedAt:'now',hasImage:false};
 assert(kitchenPreviewPhoto(p)?.includes('chhena-poda'));assert.equal(kitchenPreviewPhoto({...p,kitchen:'Other kitchen'}),null);assert.equal(kitchenPreviewPhoto({...p,name:'Mango pickle'}),null);
 assert(kitchenPreviewPhoto({...p,name:'Jaggery sattu mix'})?.includes('sattu'));
 const sample=renderToStaticMarkup(<ProductPhoto product={p}/>);assert(sample.includes('Illustrative photo'));assert(sample.includes('sonali-chhena-poda'));
 const actual=renderToStaticMarkup(<ProductPhoto product={{...p,hasImage:true}}/>);assert(actual.includes('/api/marketplace/product-photo'));assert(!actual.includes('Illustrative photo'));assert(!actual.includes('sonali-chhena-poda'));
});
