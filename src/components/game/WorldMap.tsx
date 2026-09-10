import { useEffect, useMemo, useRef, useState } from "react";
import { empireOf } from "@/lib/game/empires";
import { ownedIds } from "@/lib/game/engine";
import type { GameState, PulseEvent } from "@/lib/game/types";
import { GlobeCanvas, type GlobeApi } from "./GlobeView";
import { Hint } from "./Hint";

export function WorldMap({
  state,
  selected,
  targets,
  fx = [],
  onSelect,
  onTap,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
  fx?: PulseEvent[];
  onSelect: (id: string) => void;
  onTap?: (picked: string | null) => void;
}) {
  const apiRef = useRef<GlobeApi | null>(null);
  const ownersRef = useRef<Record<string, string>>({});
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const myIds = useMemo(() => ownedIds(state, 0), [state]);
  const homeIds = myIds.length
    ? myIds
    : [state.players[0] ? empireOf(state.players[0].empire).capitol : "sumer"];

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const prev = ownersRef.current;
    const next: Record<string, string> = {};
    const hit: Record<string, number> = {};
    for (const t of Object.values(state.territories)) {
      const key = String(t.owner);
      next[t.id] = key;
      if (prev[t.id] && prev[t.id] !== key) hit[t.id] = state.clock.turn;
    }
    ownersRef.current = next;
    if (Object.keys(hit).length) setFlashes((f) => ({ ...f, ...hit }));
  }, [state.territories, state.clock.turn]);

  useEffect(() => {
    if (!Object.keys(flashes).length) return;
    const t = window.setTimeout(() => setFlashes({}), 800);
    return () => window.clearTimeout(t);
  }, [flashes]);

  return (
    <div
      className="relative h-full min-h-[240px] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[#061018]"
      style={{ touchAction: "none", userSelect: "none" }}
    >
      {ready ? (
        <GlobeCanvas
          state={state}
          selected={selected}
          targets={targets}
          fx={fx}
          flashes={flashes}
          homeIds={homeIds}
          apiRef={apiRef}
          onSelect={onSelect}
          onTap={onTap}
        />
      ) : (
        <div className="flex h-full items-center justify-center font-display text-sm tracking-[0.18em] text-muted uppercase">
          Raising the world
        </div>
      )}
      <div className="map-vignette" />
      <div className="map-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <Hint
          align="end"
          className="self-end"
          text="Drag to turn the globe. Pinch or scroll to zoom. Hex lands wrap so East Asia meets West America across the Pacific. Home faces your lands."
        />
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => apiRef.current?.zoom(1.22)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => apiRef.current?.zoom(0.82)}>
          −
        </button>
        <button
          type="button"
          aria-label="Face my lands"
          title="Turn the globe to your lands"
          onClick={() => apiRef.current?.focusIds(myIds.length ? myIds : homeIds)}
        >
          ⌂
        </button>
      </div>
    </div>
  );
}
