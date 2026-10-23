import type { Metadata } from "next";
import { DemoSignIn } from "@/components/demo-sign-in";

export const metadata: Metadata = { title: "Demo sign-in", robots: { index: false, follow: false } };

export default function DemoSignInPage() {
  return <DemoSignIn />;
}
