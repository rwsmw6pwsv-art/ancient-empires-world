import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

export function SfxMount() {
  useEffect(() => {
    function onDown(e: PointerEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("button");
      if (!(el instanceof HTMLButtonElement) || el.disabled) return;
      sfx("tap");
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);
  return null;
}
