import { NextResponse } from "next/server";

export function rejectCrossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }
  return null;
}

export function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serviceUnavailable() {
  return NextResponse.json({ error: "Paustik could not complete that request. Please try again." }, { status: 503 });
}
