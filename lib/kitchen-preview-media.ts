/** Explicitly illustrative media for the owner's requested kitchen preview. */
export function kitchenPreviewPhoto(product:{name:string;kitchen?:string}){
 if(product.kitchen?.trim().toLowerCase()!=="sonali home cuisine")return null;
 const name=product.name.trim().toLowerCase();
 if(/^(chhena|chenna|chena)\s+(poda|podo)$/.test(name))return "/assets/sonali-chhena-poda-illustration-v1.webp";
 if(/\bsattu\b/.test(name))return "/assets/sonali-sattu-illustration-v1.webp";
 return null;
}
