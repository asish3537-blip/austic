import {UiText} from "@/components/ui-language";
import {BrandWordmark} from "@/components/brand-wordmark";
import {ScoofooWordmark} from "@/components/scoofoo-wordmark";
import Link from "next/link";
export function SiteFooter(){return <footer className="paustik-footer"><div className="paustik-footer-inner">
 <div className="paustik-footer-heading footer-brand-pair"><Link className="footer-paustik-logo" href="/" aria-label="Paustik home"><BrandWordmark original={false}/></Link><Link className="footer-school-logo" href="/scoofoo" aria-label="ScooFoo by Paustik"><ScoofooWordmark/></Link></div>
 <div className="paustik-footer-columns footer-columns-simple">
 <nav aria-label="Paustik"><h2><UiText text="Paustik"/></h2><Link href="/app"><UiText text="Find Mother Kitchens"/></Link><Link href="/customer/marketplace"><UiText text="Homemade products"/></Link><Link href="/scoofoo"><UiText text="ScooFoo school tiffins"/></Link><Link href="/help"><UiText text="Help & support"/></Link></nav>
 <nav aria-label="Partners"><h2><UiText text="Join Paustik"/></h2><Link href="/join/mother"><UiText text="Become a Mother Kitchen Partner"/></Link><Link href="/join/delivery"><UiText text="Become a Delivery Partner"/></Link><Link href="/partners"><UiText text="Community partners"/></Link></nav>
 <div className="footer-downloads"><h2><UiText text="Get the app"/></h2><div className="footer-download-actions"><Link className="footer-app-link" href="/downloads/Paustik-1.3.0.apk"><UiText text="↓ Download for Android"/><small><UiText text="Direct APK · v1.3"/></small></Link></div></div></div>
 <div className="paustik-footer-bottom"><details className="footer-disclaimers"><summary><UiText text="Disclaimers & information"/></summary><p><UiText text="Availability and delivery slots depend on service-area coverage. School tiffins require confirmed school reception."/></p><div><Link href="/privacy"><UiText text="Privacy notice"/></Link><Link href="/help#ordering-policies"><UiText text="Ordering policies"/></Link><Link href="/app-demo"><UiText text="App preview"/></Link></div></details><small><UiText text="© 2026 Paustik. All rights reserved. ScooFoo is a service by Paustik."/></small></div>
 </div></footer>;}
