export function isSchoolRoute(path:string){return ["/scoofoo","/school-tiffins","/school-desk"].some(base=>path===base||path.startsWith(base+"/"));}
