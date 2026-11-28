export function productPhotoUrl(id:string,updatedAt?:string){return "/api/marketplace/product-photo?productId="+encodeURIComponent(id)+(updatedAt?"&v="+encodeURIComponent(updatedAt):"");}
