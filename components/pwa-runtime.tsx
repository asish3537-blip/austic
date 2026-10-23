"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallState = {
  available: boolean;
  installed: boolean;
  prompting: boolean;
  message: string;
};

const initialState: InstallState = { available: false, installed: false, prompting: false, message: "" };
let state = initialState;
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function updateState(change: Partial<InstallState>) {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => state;
const getServerSnapshot = () => initialState;

// Mounted in the root layout, so install eligibility survives page navigation.
export function PwaRuntime() {
  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () => displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as InstallPromptEvent;
      updateState({ available: true, message: "" });
    };
    const onInstalled = () => {
      deferredPrompt = null;
      updateState({ installed: true, available: false, prompting: false, message: "Pausstik has been added to this device." });
    };
    const onDisplayModeChange = () => { if (isStandalone()) onInstalled(); };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener("change", onDisplayModeChange);
    if (isStandalone()) onInstalled();

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Browser installation can still work when offline support is unavailable.
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  return null;
}

export function PwaInstallButton() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();

  async function install() {
    if (current.installed || state.prompting) return;
    if (!deferredPrompt) {
      setHelpOpen((open) => !open);
      return;
    }

    const prompt = deferredPrompt;
    deferredPrompt = null;
    updateState({ available: false, prompting: true, message: "" });
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (!state.installed) {
        updateState({ message: choice.outcome === "accepted"
          ? "Installation requested. Finish any steps shown by your browser, then open Pausstik from your device."
          : "Installation was dismissed. You can install later from your browser menu." });
      }
    } catch {
      updateState({ message: "The browser could not open installation. Use the instructions below, or continue in your browser." });
      setHelpOpen(true);
    } finally {
      updateState({ prompting: false });
    }
  }

  return <div className="pwa-install-control">
    <button className="button button-warm" type="button" onClick={install}
      disabled={current.installed || current.prompting}
      aria-busy={current.prompting}
      aria-describedby={helpOpen || current.message ? helpId : undefined}>
      {current.installed ? "App added to this device" : current.prompting ? "Opening installation…" : "Install Pausstik app"}
      {!current.installed && !current.prompting && <span aria-hidden="true">↗</span>}
    </button>
    {(helpOpen || current.message) && <div className="pwa-install-help" id={helpId} role="status" aria-live="polite">
      {current.message && <p>{current.message}</p>}
      {helpOpen && !current.installed && <p>On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen. On Android, use Chrome’s menu and choose Install app or Add to Home screen. On a computer, use Chrome or Edge’s install button in the address bar. If installation is unavailable, you can still use every online feature in your browser. <Link href="/install">View installation help</Link>.</p>}
    </div>}
  </div>;
}
