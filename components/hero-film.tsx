"use client";
import { UiText } from "@/components/ui-language";
import { useEffect, useRef, useState } from "react";

export function HeroFilm({compact=false}:{compact?:boolean}) {
  const [allowMotion, setAllowMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const film = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => setAllowMotion(!motion.matches && !connection?.saveData);
    update(); motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);
  function toggle() {
    if (paused) { void film.current?.play().catch(() => {}); } else { film.current?.pause(); }
    setPaused(!paused);
  }
  return <><div className="hero-film" aria-hidden="true">{allowMotion && <video ref={film} autoPlay loop muted playsInline preload="none" poster="/assets/home-thali.avif"><source src="/media/paustik-story.mp4" type="video/mp4" /></video>}</div><div className="hero-film-actions"><button type="button" onClick={() => dialog.current?.showModal()} aria-label="Watch the Paustik story"><UiText text={compact?"▶ Watch story":"▶ Watch the Paustik story"}/></button>{allowMotion && <button type="button" onClick={toggle}>{compact?(paused?"Play video":"Pause video"):(paused ? "Play background" : "Pause background")}</button>}</div><dialog className="story-dialog" ref={dialog} onClose={() => { const video = dialog.current?.querySelector("video"); video?.pause(); }}><button type="button" className="story-close" onClick={() => dialog.current?.close()} aria-label="Close video">×</button><video controls playsInline preload="none" poster="/assets/home-thali.avif"><source src="/media/paustik-story.mp4" type="video/mp4" /><a href="/media/paustik-story.mp4"><UiText text="Watch the Paustik story"/></a></video><p><UiText text="Paustik’s illustrated introduction. App scenes include sample data."/></p></dialog></>;
}
