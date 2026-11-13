"use client";
import { useEffect, useState } from "react";
import {UiText} from "@/components/ui-language";
export function SocialLinks() {
  const [links, setLinks] = useState<Record<string, string>>({});
  useEffect(() => { fetch("/api/site-links").then(response => response.json()).then(setLinks).catch(() => {}); }, []);
  return <div className="paustik-social-links">{[["youtube", "YouTube", "▶"], ["facebook", "Facebook", "f"], ["instagram", "Instagram", "◎"]].map(([key, name, icon]) => links[key] && /^https:\/\/(www\.)?(youtube\.com|facebook\.com|instagram\.com)\//.test(links[key]) ? <a key={key} href={links[key]} aria-label={"Paustik on " + name} title={name} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">{icon}</span></a> : null)}{!Object.values(links).some(Boolean) && <small><UiText text="Our social channels are being set up."/></small>}</div>;
}
