"use client";
import { createContext, useContext, useEffect, useId, useSyncExternalStore } from "react";
import { translated, type UiLanguage } from "@/lib/ui-translations";
const key = "paustik-ui-language";
const LanguageContext = createContext<UiLanguage>("en");
function snapshot(): UiLanguage { try { const v = localStorage.getItem(key); return v === "hi" || v === "or" ? v : "en"; } catch { return "en"; } }
function subscribe(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener("paustik-language", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("paustik-language", callback); }; }
const hydrationSubscribe = () => () => {};
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribe, snapshot, () => "en" as UiLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}
export function useUiLanguage() { const language = useContext(LanguageContext); return { language, t: (text: string) => translated(text, language) }; }
export function UiText({ text }: { text: string }) { const { t } = useUiLanguage(); return <>{t(text)}</>; }
export function LanguageSelector() {
  const { language } = useUiLanguage(); const id = useId();
  const ready = useSyncExternalStore(hydrationSubscribe, () => true, () => false);
  return <label className="language-selector" htmlFor={id}><span>Language / ଭାଷା</span><select id={id} value={language} disabled={!ready} onChange={e => { try { localStorage.setItem(key, e.target.value); document.cookie = `${key}=${e.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch {} window.dispatchEvent(new Event("paustik-language")); }}><option value="en">English</option><option value="hi">हिन्दी</option><option value="or">ଓଡ଼ିଆ</option></select></label>;
}

export function WebsiteSearchInput(){const {t}=useUiLanguage();return <input id="hero-food-query" name="q" placeholder={t("Search a kitchen, cuisine or dish")} maxLength={100}/>;}
