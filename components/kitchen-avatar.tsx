"use client";
import { useState } from "react";
export function KitchenAvatar({ name, image, kind = "photo" }: { name: string; image?: string; kind?: "photo" | "logo" }) {
  const [failed, setFailed] = useState("");
  return <span className={"kitchen-avatar " + kind}>
    {image && image !== failed ?
      // Uploaded PNGs are small, validated and served inline; no remote image provider is contacted.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={kind === "logo" ? `${name} kitchen logo` : `${name} profile`} width={64} height={64} onError={() => setFailed(image)} />
      : <span aria-label={`${name} initials`}>{name.trim().split(/\s+/).slice(0,2).map(n => n[0]).join("").toUpperCase()}</span>}
  </span>;
}
