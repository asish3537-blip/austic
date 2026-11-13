export const HERO_VIDEOS = [
 "/media/paustik-food-hero.mp4",
 "/media/hero-preparation.mp4",
 "/media/hero-vegetables.mp4",
 "/media/hero-rice.mp4",
] as const;
export function nextHeroVideo(current:number,failed:ReadonlySet<number>,count=HERO_VIDEOS.length):number|null{
 for(let step=1;step<=count;step++){const index=(current+step)%count;if(!failed.has(index))return index;}
 return null;
}

export const SCHOOL_HERO_VIDEOS=["/media/scoofoo-scene-1.mp4","/media/scoofoo-scene-2.mp4","/media/scoofoo-scene-3.mp4","/media/scoofoo-scene-4.mp4"] as const;
