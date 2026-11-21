"use client";
import Link from "next/link";
import {useUiLanguage} from "@/components/ui-language";
export function HeroPlatformLinks(){const {language}=useUiLanguage();return <nav className="hero-platform-note hero-platform-links" aria-label={language==="hi"?"ऐप इंस्टॉल करें":language==="or"?"ଆପ୍ ଇନଷ୍ଟଲ୍ କରନ୍ତୁ":"App installation options"}><Link href="/downloads/Paustik-1.3.0.apk" download>{language==="hi"?"Android डाउनलोड":language==="or"?"Android ଡାଉନଲୋଡ୍":"Android download"}</Link><span aria-hidden="true">·</span><Link href="/install">{language==="hi"?"iPhone और वेब ऐप":language==="or"?"iPhone ଓ ୱେବ୍ ଆପ୍":"iPhone & web app"}</Link></nav>;}
