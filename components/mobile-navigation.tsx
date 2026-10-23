"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MobileNavigation({ children }: { children: ReactNode }) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const close = () => { menu.open = false; };
    const outside = (event: Event) => {
      if (event.target instanceof Node && !menu.contains(event.target)) close();
    };
    const pointerMove = (event: PointerEvent) => {
      if (!menu.open || event.pointerType !== "mouse") return;
      const trigger = menu.querySelector("summary")?.getBoundingClientRect();
      const panel = menu.querySelector("nav")?.getBoundingClientRect();
      if (!trigger || !panel) return;
      // Include the small gap between the button and panel so links remain reachable.
      const left = Math.min(trigger.left, panel.left);
      const right = Math.max(trigger.right, panel.right);
      const top = Math.min(trigger.top, panel.top);
      const bottom = Math.max(trigger.bottom, panel.bottom);
      if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) close();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.open) {
        close();
        menu.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("keydown", keyDown);
    window.addEventListener("popstate", close);
    window.addEventListener("hashchange", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("keydown", keyDown);
      window.removeEventListener("popstate", close);
      window.removeEventListener("hashchange", close);
      window.removeEventListener("resize", close);
    };
  }, []);

  return <details className="mobile-nav" ref={menuRef} onClick={(event) => {
    if (event.target instanceof Element && event.target.closest("a")) event.currentTarget.open = false;
  }}>{children}</details>;
}
