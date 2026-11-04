import { NextResponse } from "next/server";
export function GET(request: Request) { return NextResponse.redirect(new URL("/icons/pausstik-app-192.png?v=4", request.url), { status: 307, headers: { "Cache-Control": "no-cache" } }); }
