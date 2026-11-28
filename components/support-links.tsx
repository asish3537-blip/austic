"use client";

import {UiText} from "@/components/ui-language";
import {WHATSAPP_SUPPORT_URL} from "@/lib/whatsapp-support";

export function SupportLinks() {
  return <p className="auth-free-contact"><span><UiText text="Need help?"/></span>{" "}<button type="button" aria-controls="paustik-help-panel" onClick={() => window.dispatchEvent(new Event("paustik-open-help"))}><UiText text="Chat with Paustik Help"/></button><span aria-hidden="true"> · </span><a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><UiText text="Chat on WhatsApp"/> ↗</a></p>;
}
