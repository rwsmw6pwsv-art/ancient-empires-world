import { useRef, type PointerEvent } from "react";
import { beastOf, KING_SRC } from "@/lib/game/landscape";
import { CONTINENT_NAMES, type EmpireId } from "@/lib/game/types";
import type { EmpireDef } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx";

const TAP_SLOP = 14;

export function KingPick({
  empire,
  selected = false,
  onPick,
}: {
  empire: EmpireDef;
  selected?: boolean;
  onPick?: (id: EmpireId) => void;
}) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const region = CONTINENT_NAMES[empire.region];
  const beast = beastOf(empire.id);
  const className = cn(
    "empire-" + empire.id,
    "empire-pick relative z-10 min-h-11 touch-manipulation rounded-[var(--radius-sm)] border border-border bg-raised/80 p-1 text-center transition-colors sm:rounded-[var(--radius-md)] sm:p-2",
    selected ? "border-accent bg-surface ring-2 ring-accent" : onPick && "hover:border-fg/60",
  );
  const body = (
    <>
      <span className="empire-king">
        <img
          src={KING_SRC[empire.id]}
          alt=""
          width={540}
          height={720}
          decoding="async"
          className="empire-king-art"
        />
      </span>
      <span className="mt-0.5 block font-display text-xs leading-tight sm:mt-1 sm:truncate sm:text-sm">
        {empire.name}
      </span>
      <span className="mt-0.5 hidden truncate text-xs leading-tight text-muted sm:block">
        {region} · {beast.name}
      </span>
      <span className="house-swatch mx-auto mt-1 block h-0.5 w-4 rounded-full sm:mt-2 sm:h-1.5 sm:w-8" />
    </>
  );

  if (!onPick) {
    return (
      <div className={className} aria-current="true">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={className}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        origin.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const o = origin.current;
        origin.current = null;
        if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > TAP_SLOP) return;
        sfx("king", { beast: beast.id });
        onPick(empire.id);
      }}
    >
      {body}
    </button>
  );
}
