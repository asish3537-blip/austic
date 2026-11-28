import {test} from "node:test";
import assert from "node:assert/strict";
import {deflateSync} from "node:zlib";
import {renderToStaticMarkup} from "react-dom/server";
import {canViewProductPhoto,normalizeProductPhoto,hasProductPhoto} from "../lib/product-photo";
import {productPhotoUrl} from "../lib/product-photo-url";
import {ProductPhoto,ProductPhotoPicker} from "../components/product-photo";
function crc(bytes:Buffer){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;}
function chunk(type:string,data:Buffer){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b;}
function png(width=640,metadata=false){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(1,4);h[8]=8;h[9]=6;return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),...(metadata?[chunk('tEXt',Buffer.from('location=private'))]:[]),chunk('IDAT',deflateSync(Buffer.alloc(width*4+1))),chunk('IEND',Buffer.alloc(0))]).toString('base64');}
test("product photos accept bounded PNGs, strip metadata and preserve explicit remove semantics",()=>{
 assert.equal(normalizeProductPhoto(png(640,true)),png(640));assert.equal(normalizeProductPhoto(undefined),undefined);assert.equal(normalizeProductPhoto(null),null);
 for(const value of [png(641),'https://tracker.example/a','data:image/svg+xml;base64,AAAA',png().slice(0,-4)+'AAAA'])assert.throws(()=>normalizeProductPhoto(value));
 assert(hasProductPhoto(png()));assert(!hasProductPhoto('https://tracker.example/a'));assert(!hasProductPhoto(null));
});
test("photos enforce active role, ownership and published customer city",()=>{
 const p={ownerId:'owner',published:true,city:'Bhubaneswar'},customer={id:'c',role:'CUSTOMER',status:'ACTIVE'};
 assert(canViewProductPhoto(customer,p,' bhubaneswar '));assert(!canViewProductPhoto(customer,p,'Cuttack'));assert(!canViewProductPhoto(customer,{...p,published:false},'Bhubaneswar'));assert(!canViewProductPhoto({...customer,status:'SUSPENDED'},p,'Bhubaneswar'));
 assert(canViewProductPhoto({id:'owner',role:'MOTHER',status:'ACTIVE'},{...p,published:false}));assert(!canViewProductPhoto({id:'other',role:'MOTHER',status:'ACTIVE'},p));assert(!canViewProductPhoto({id:'other',role:'DELIVERY_AGENT',status:'ACTIVE'},p));
});
test("catalog images use the private endpoint and missing photos remain explicit",()=>{
 const product={id:'product-id',name:'My sattu',updatedAt:'2026-11-28T00:00:00Z',hasImage:true};
 const html=renderToStaticMarkup(<ProductPhoto product={product}/>);assert(html.includes('/api/marketplace/product-photo?productId=product-id'));assert(html.includes('alt="My sattu"'));assert(!html.includes('data:image'));
 assert(renderToStaticMarkup(<ProductPhoto product={{...product,hasImage:false}}/>).includes('Product photo not added yet'));
 const url=new URL(productPhotoUrl('id&other=1'),'https://paustik.in');assert.equal(url.searchParams.get('productId'),'id&other=1');
});
test("photo picker accepts supported formats and removal does not submit the product form",()=>{
 const html=renderToStaticMarkup(<ProductPhotoPicker value={png(1)} onChange={()=>{}} onBusyChange={()=>{}} disabled={false}/>);assert(html.includes('accept="image/jpeg,image/png,image/webp"'));assert(html.includes('Remove product photo'));assert(html.includes('type="button"'));
});
