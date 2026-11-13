"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {isSchoolRoute} from "@/lib/service-brand";
import {BrandWordmark} from "@/components/brand-wordmark";
import {ScoofooWordmark} from "@/components/scoofoo-wordmark";
export function HeaderBrand({homeHref="/",compact=false}:{homeHref?:string;compact?:boolean}){
 const school=isSchoolRoute(usePathname());
 return <Link className={compact?"app-brand-link":"brand"} href={school?"/scoofoo":homeHref} aria-label={school?"ScooFoo by Paustik":"Paustik app home"}>{school?<ScoofooWordmark/>:<BrandWordmark className={compact?"":"brand-wordmark"} width={compact?160:640} height={compact?78:310} priority/>}</Link>;
}
