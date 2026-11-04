import Link from "next/link";
import { AppDemo } from "@/components/app-demo";

export default function AppDemoPage() {
  return <main className="app-demo-page"><div className="app-demo-hero"><div><span className="eyebrow">Sample data</span><h1>Try Paustik</h1></div><Link className="button" href="/app">Open my account</Link></div><AppDemo /></main>;
}
