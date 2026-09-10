import { useEffect } from "react";
import { sfx, unlockAudio } from "@/lib/sfx";

export function SfxMount() {
  useEffect(() => {
    function unlock() {
      unlockAudio();
    }
    function onDown(e: PointerEvent) {
      unlock();
      const el = (e.target as HTMLElement | null)?.closest?.("button");
      if (!(el instanceof HTMLButtonElement) || el.disabled) return;
      if (el.classList.contains("empire-pick") || el.dataset.sfx === "skip") return;
      sfx("tap");
    }
    function onVis() {
      if (document.visibilityState === "visible") unlockAudio();
    }
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
}