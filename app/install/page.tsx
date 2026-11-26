import {PhonePeAppstoreOption} from "@/components/phonepe-appstore-option";
import {UiText} from "@/components/ui-language";
import Link from "next/link";
export default function InstallPage(){return <main className="entry-card"><span className="eyebrow"><UiText text="Take Paustik with you"/></span><h1><UiText text="Download the app"/></h1><h2>Android</h2><p><UiText text="Download the installer and open it on your phone. Requires Android 7 or newer."/></p><a className="button" href="/downloads/Paustik-1.3.0.apk" download><UiText text="Download Android app · v1.3"/></a><PhonePeAppstoreOption/><p className="entry-links"><Link href="/sign-in"><UiText text="Sign in"/></Link> · <Link href="/sign-up"><UiText text="Create your account"/></Link></p></main>;}
