"use client";
import { AppReview } from "@/components/app-review";
export function AppDemo({ demoRole }: { demoRole?: "customer" | "mother" | "courier" } = {}) { return <AppReview initialRole={demoRole}/>; }
