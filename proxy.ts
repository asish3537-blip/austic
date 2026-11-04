import { NextRequest, NextResponse } from "next/server";
import { kitchenId } from "@/lib/kitchen-handoff";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const id = kitchenId(request.nextUrl.pathname.split("/")[3]);
  headers.set("x-pausstik-kitchen", id ?? "");
  headers.set("x-pausstik-admin", request.nextUrl.pathname.startsWith("/admin/") || request.nextUrl.pathname === "/admin" ? "true" : "false");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/customer/kitchens/:id", "/admin/:path*"] };
