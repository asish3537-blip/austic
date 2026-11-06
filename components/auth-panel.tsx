import {WHATSAPP_SUPPORT_URL} from "@/lib/whatsapp-support";
export function AuthPanel({ children, title }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="simple-auth"><h1 className="visually-hidden">{title}</h1><section className="auth-panel">{children}<p className="auth-free-contact">Need help? <a href={WHATSAPP_SUPPORT_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Chat on WhatsApp ↗</a></p></section></main>;
}
