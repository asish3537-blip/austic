import {PhonePeAppstoreOption} from "@/components/phonepe-appstore-option";
import {UiText} from "@/components/ui-language";
import {BrandWordmark} from "@/components/brand-wordmark";
import {ScoofooWordmark} from "@/components/scoofoo-wordmark";
import Link from "next/link";
export function SiteFooter(){return <footer className="paustik-footer"><div className="paustik-footer-inner">
 <div className="paustik-footer-heading footer-brand-pair"><Link className="footer-paustik-logo" href="/" aria-label="Paustik home"><BrandWordmark original={false}/></Link><Link className="footer-school-logo" href="/scoofoo" aria-label="ScooFoo by Paustik"><ScoofooWordmark/></Link></div>
 <div className="paustik-footer-columns footer-columns-simple">
 <nav aria-label="Paustik"><h2><UiText text="Paustik"/></h2><Link href="/app"><UiText text="Find Mother Kitchens"/></Link><Link href="/customer/marketplace"><UiText text="Homemade products"/></Link><Link href="/scoofoo"><UiText text="ScooFoo school tiffins"/></Link><Link href="/help"><UiText text="Help & support"/></Link></nav>
 <nav aria-label="Partners"><h2><UiText text="Join Paustik"/></h2><Link href="/join/mother"><UiText text="Become a Mother Kitchen Partner"/></Link><Link href="/join/delivery"><UiText text="Become a Delivery Partner"/></Link><Link href="/partners"><UiText text="Community partners"/></Link></nav>
 <div className="footer-downloads footer-downloads-text"><h2><UiText text="Get the app"/></h2><a className="footer-android-text" href="/downloads/Paustik-1.3.0.apk" download><UiText text="Download Android app"/> ↓</a><PhonePeAppstoreOption/></div></div>
 <div className="paustik-footer-bottom"><nav className="footer-visible-legal" aria-label="Privacy and support"><Link href="/privacy"><UiText text="Privacy Policy"/></Link><a href="mailto:paustikdelivery@gmail.com">paustikdelivery@gmail.com</a><Link href="/help#ordering-policies"><UiText text="Ordering policies"/></Link></nav><p className="footer-visible-disclaimer"><span aria-hidden="true">*</span> <UiText text="Disclaimer: sample kitchens and Test orders are for practice only. No food is delivered for those orders. Real kitchen availability and delivery depend on local coverage. School tiffins require confirmed school reception."/></p><small><UiText text="© 2026 Paustik. All rights reserved. ScooFoo is a service by Paustik."/></small></div>
 </div></footer>;}
