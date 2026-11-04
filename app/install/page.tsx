import Link from "next/link";
import { PwaInstallButton } from "@/components/pwa-runtime";

export default function InstallPage() {
  return <main className="entry-card"><span className="eyebrow">Pausstik on your phone</span>
    <h1>Get the app.</h1><h2>Android</h2><p>Download the installer and open it on your phone. Requires Android 7 or newer.</p>
    <a className="button" href="/downloads/Pausstik-1.2.0.apk" download>Download Android app · v1.2</a>
    <h2 className="install-web-heading">Web app</h2><p>On iPhone, open in Safari and choose Share → Add to Home Screen.</p>
    <PwaInstallButton /><p className="entry-links"><Link href="/app">Open app</Link> · <Link href="/">Go to website</Link></p>
  </main>;
}
