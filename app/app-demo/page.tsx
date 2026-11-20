import Link from "next/link";
import { AppDemo } from "@/components/app-demo";
import type { Metadata } from "next";
import { UiText } from "@/components/ui-language";

export const metadata: Metadata = { title: "Interactive app review", robots: { index: false, follow: true } };

export default function AppDemoPage() {
  return <main className="app-demo-page"><div className="app-demo-hero"><h1>Paustik · ScooFoo</h1><Link className="button" href="/app"><UiText text="Open app"/></Link></div><AppDemo /></main>;
}
