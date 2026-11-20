"use client";
import { AppReview } from "@/components/app-review";
import type { CustomerKitchen } from "@/lib/customer-kitchen-types";
export function AdminAppPreview(props: { kitchens: CustomerKitchen[] }) { void props; return <AppReview initialRole="admin"/>; }
