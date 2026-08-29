import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const TIP_W = 224;

export function Hint({
  text,
  className,
}: {
  text: string;
  className?: string;
  align?: "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [box, setBox] = useState({ top: 0, left: 0, below: false });

  function place() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(TIP_W, window.innerWidth - 16);
    const pad = 8;
    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    const tipH = tipRef.current?.offsetHeight ?? 72;
    const below = r.top < tipH + 16;
    const top = below ? r.bottom + 8 : r.top - tipH - 8;
    setBox({ top, left, below });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || tipRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onReposition() {
      place();
    }
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-label="What this does"
        aria-expanded={open}
        aria-controls={id}
        title={text}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="grid size-5 place-items-center rounded-full border border-border bg-raised text-[11px] font-medium leading-none text-muted"
      >
        ?
      </button>
      {open
        ? createPortal(
            <span
              ref={tipRef}
              id={id}
              role="tooltip"
              style={{ position: "fixed", top: box.top, left: box.left, width: Math.min(TIP_W, window.innerWidth - 16), zIndex: 80 }}
              className="pointer-events-auto rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-2 text-left text-xs leading-snug text-fg shadow-lg"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
