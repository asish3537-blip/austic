import {WHATSAPP_SUPPORT_URL} from "@/lib/whatsapp-support";
import {UiText} from "@/components/ui-language";
export function AuthPanel({ children, title }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="simple-auth"><h1 className="visually-hidden"><UiText text={title}/></h1><section className="auth-panel">{children}<p className="auth-free-contact"><UiText text="Need help?"/> <a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><UiText text="Chat on WhatsApp"/> ↗</a></p></section></main>;
}
