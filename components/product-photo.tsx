"use client";
/* eslint-disable @next/next/no-img-element -- Product photos use an authenticated no-store endpoint. */
import {kitchenPreviewPhoto} from "@/lib/kitchen-preview-media";
import {useState} from "react";
import {UiText} from "@/components/ui-language";
import {AppIcon} from "@/components/app-icon";
import {productPhotoUrl} from "@/lib/product-photo-url";

export function ProductPhoto({product}:{product:{id:string;name:string;updatedAt:string;hasImage?:boolean;kitchen?:string}}){
 const [failed,setFailed]=useState(false);
 const illustration=!product.hasImage?kitchenPreviewPhoto(product):null;
 return <div className="market-product-photo">{(product.hasImage||illustration)&&!failed?<><img src={illustration||productPhotoUrl(product.id,product.updatedAt)} alt={product.name} width={640} height={420} loading="lazy" onError={()=>setFailed(true)}/>{illustration&&<span className="product-photo-label"><UiText text="Illustrative photo"/></span>}</>:<div className="market-photo-empty"><AppIcon name="shop"/><span><UiText text={failed?"Product photo could not load":"Product photo not added yet"}/></span>{failed&&<button type="button" className="plain-button" onClick={()=>setFailed(false)}><UiText text="Retry photo"/></button>}</div>}</div>;
}

async function resizeProductPhoto(file:File){
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024)throw Error("Choose a JPG, PNG or WebP under 5 MB.");
 const bitmap=await createImageBitmap(file);
 try{for(let size=640;size>=160;size=Math.floor(size*.8)){
  const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext("2d");if(!ctx)throw Error("Photo upload is unavailable on this device.");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const image=canvas.toDataURL("image/png");if(image.length<=260000)return image;
 }throw Error("Choose a smaller photo.");}finally{bitmap.close();}
}
export function ProductPhotoPicker({value,existingSrc,onChange,onBusyChange,disabled}:{value:string|null|undefined;existingSrc?:string;onChange:(value:string|null)=>void;onBusyChange:(busy:boolean)=>void;disabled:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const image=value===undefined?existingSrc:value;
 async function choose(file:File){setBusy(true);onBusyChange(true);setError("");try{onChange(await resizeProductPhoto(file));}catch(e){setError(e instanceof Error?e.message:"Photo could not load.");}finally{setBusy(false);onBusyChange(false);}}
 return <fieldset className="market-photo-picker"><legend><UiText text="Product photo"/></legend>{image&&<img src={image} alt="Selected product photo" width={320} height={210}/>}<label><UiText text={busy?"Preparing photo…":image?"Replace product photo":"Add product photo"}/><input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy} onChange={e=>{const file=e.target.files?.[0];if(file)void choose(file);e.target.value="";}}/></label>{image&&<button type="button" className="plain-button" disabled={disabled||busy} onClick={()=>{setError("");onChange(null);}}><UiText text="Remove product photo"/></button>}<small><UiText text="Show your actual food or packaging. JPG, PNG or WebP up to 5 MB; resized before upload."/></small>{error&&<p role="alert"><UiText text={error}/></p>}</fieldset>;
}
