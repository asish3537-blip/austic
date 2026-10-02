"use client";

import { useEffect, useState } from "react";

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installation remains available without offline support if registration is blocked.
    });
  }, []);

  return null;
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      setHelpOpen((open) => !open);
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return <div className="pwa-install-control">
    <button className="button button-warm" type="button" onClick={install} disabled={installed}>
      {installed ? "App added to this device" : promptEvent ? "Install Pausstik app" : "Add Pausstik to home screen"}
      {!installed && <span aria-hidden="true">↗</span>}
    </button>
    {helpOpen && !installed && <p className="pwa-install-help" role="status">On iPhone or iPad, tap Share in Safari, then “Add to Home Screen”. In Chrome, use the browser menu and choose “Install app” or “Add to Home screen”.</p>}
  </div>;
}
