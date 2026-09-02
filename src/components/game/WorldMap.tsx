import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { empireOf } from "@/lib/game/empires";
import { hostDefense, ownedIds, standing } from "@/lib/game/engine";
import {
  CAPITAL_SRC,
  LANDSCAPE,
  OCEAN_LABELS,
  PROP_SRC,
  type ResourceId,
  type WonderId,
} from "@/lib/game/landscape";
import { CAPITOL, type EmpireId, type GameState } from "@/lib/game/types";
import { TERRITORIES, TERRITORY_BY_ID, WORLD_H, WORLD_W, landNeighbors } from "@/lib/game/world";
import { cn } from "@/lib/utils";
import { Hint } from "./Hint";

const MIN_K = 0.7;
const MAX_K = 8;
const CLICK_PX = 8;

type View = { x: number; y: number; k: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function zoomToward(view: View, svgPt: { x: number; y: number }, factor: number): View {
  const worldX = (svgPt.x - view.x) / view.k;
  const worldY = (svgPt.y - view.y) / view.k;
  const k = clamp(view.k * factor, MIN_K, MAX_K);
  return { k, x: svgPt.x - worldX * k, y: svgPt.y - worldY * k };
}

function Marker({
  href,
  x,
  y,
  w,
  h,
  live,
}: {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  live?: boolean;
}) {
  return (
    <image
      href={href}
      x={x - w / 2}
      y={y - h}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMax meet"
      className={cn("map-marker", live && "marker-live")}
    />
  );
}

export function WorldMap({
  state,
  selected,
  targets,
  onSelect,
  onTap,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
  onSelect: (id: string) => void;
  onTap?: (picked: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ id: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number; view: View } | null>(null);
  const fittedKey = useRef<string>("");
  const ownersRef = useRef<Record<string, string>>({});
  const [flashes, setFlashes] = useState<Record<string, number>>({});
  const targetSet = useMemo(() => new Set(targets), [targets]);
  const myIds = useMemo(() => ownedIds(state, 0), [state]);
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

  const fitTo = useCallback((ids: string[]): boolean => {
    const wrap = wrapRef.current;
    if (!wrap || !ids.length) return false;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 24) return false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let fromPath = false;
    for (const id of ids) {
      const el = pathRefs.current.get(id);
      if (el) {
        try {
          const b = el.getBBox();
          if (b.width > 1 && b.height > 1) {
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
            fromPath = true;
            continue;
          }
        } catch {
          /* not in DOM yet */
        }
      }
      const d = TERRITORY_BY_ID[id];
      if (!d) continue;
      minX = Math.min(minX, d.labelX - 28);
      minY = Math.min(minY, d.labelY - 28);
      maxX = Math.max(maxX, d.labelX + 28);
      maxY = Math.max(maxY, d.labelY + 28);
    }
    if (!Number.isFinite(minX)) return false;
    const pad = ids.length <= 1 ? 48 : ids.length <= 3 ? 72 : 96;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const bw = Math.max(36, maxX - minX);
    const bh = Math.max(36, maxY - minY);
    const aspect = rect.width / rect.height;
    const worldA = WORLD_W / WORLD_H;
    const visW = aspect > worldA ? WORLD_W : WORLD_H * aspect;
    const visH = aspect > worldA ? WORLD_W / aspect : WORLD_H;
    const k = clamp(Math.min(visW / bw, visH / bh), 1.6, MAX_K);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ k, x: WORLD_W / 2 - cx * k, y: WORLD_H / 2 - cy * k });
    return fromPath;
  }, []);

  useLayoutEffect(() => {
    const key = `${state.seed}:${state.players[0]?.empire ?? ""}`;
    if (fittedKey.current === key) return;
    const lands = myIds.length
      ? myIds
      : [state.players[0] ? empireOf(state.players[0].empire).capitol : "mesopotamia"];
    let frames = 0;
    let raf = 0;
    const tryFit = () => {
      if (fitTo(lands)) {
        fittedKey.current = key;
        return;
      }
      if (frames++ < 24) raf = requestAnimationFrame(tryFit);
      else fittedKey.current = key;
    };
    tryFit();
    return () => cancelAnimationFrame(raf);
  }, [state.seed, state.players, myIds, fitTo]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      const key = `${state.seed}:${state.players[0]?.empire ?? ""}`;
      if (fittedKey.current !== key) {
        fitTo(myIds.length ? myIds : [empireOf(state.players[0]!.empire).capitol]);
      }
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fitTo, myIds, state.seed, state.players]);

  const pickAt = useCallback(
    (clientX: number, clientY: number): string | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const stack = document.elementsFromPoint(clientX, clientY);
      for (const el of stack) {
        const id = (el as Element).getAttribute?.("data-land");
        if (id) {
          onSelect(id);
          return id;
        }
      }
      const svgPt = clientToSvg(svg, clientX, clientY);
      const v = viewRef.current;
      const world = { x: (svgPt.x - v.x) / v.k, y: (svgPt.y - v.y) / v.k };
      const pt = svg.createSVGPoint();
      pt.x = world.x;
      pt.y = world.y;
      for (const d of TERRITORIES) {
        const el = pathRefs.current.get(d.id);
        try {
          if (el && el.isPointInFill(pt)) {
            onSelect(d.id);
            return d.id;
          }
        } catch {
          /* older browsers */
        }
      }
      let best: string | null = null;
      let bestD = 48 / Math.max(0.6, v.k);
      for (const d of TERRITORIES) {
        const dist = Math.hypot(d.labelX - world.x, d.labelY - world.y);
        if (dist < bestD) {
          bestD = dist;
          best = d.id;
        }
      }
      if (best) onSelect(best);
      return best;
    },
    [onSelect],
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      const svgPt = clientToSvg(svg, e.clientX, e.clientY);
      setView((v) => zoomToward(v, svgPt, factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      pinch.current = { dist: Math.max(1, dist), view: viewRef.current };
      pan.current = null;
      return;
    }
    pan.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const svg = svgRef.current;
    if (!svg) return;
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
      const mid = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      const factor = dist / pinch.current.dist;
      const svgPt = clientToSvg(svg, mid.x, mid.y);
      setView(zoomToward(pinch.current.view, svgPt, factor));
      return;
    }
    const drag = pan.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    if (!drag.moved && Math.hypot(dx, dy) < CLICK_PX) return;
    drag.moved = true;
    const p0 = clientToSvg(svg, drag.lastX, drag.lastY);
    const p1 = clientToSvg(svg, e.clientX, e.clientY);
    setView((v) => ({ ...v, x: v.x + (p1.x - p0.x), y: v.y + (p1.y - p0.y) }));
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = pan.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag && drag.id === e.pointerId) {
      if (!drag.moved) {
        const picked = pickAt(e.clientX, e.clientY);
        onTap?.(picked);
      }
      pan.current = null;
    }
  }

  function zoomButton(factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const svgPt = clientToSvg(svg, box.left + box.width / 2, box.top + box.height / 2);
    setView((v) => zoomToward(v, svgPt, factor));
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full min-h-[240px] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[#0f7484]"
      style={{ touchAction: "none", userSelect: "none" }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="World map"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <image
            href="/map/world.webp"
            width={WORLD_W}
            height={WORLD_H}
            preserveAspectRatio="none"
            className="map-relief"
          />
          <g className="map-weather" opacity={0.9}>
            <ellipse className="map-cloud map-cloud-a" cx={180} cy={70} rx={90} ry={22} />
            <ellipse className="map-cloud map-cloud-b" cx={520} cy={120} rx={110} ry={26} />
            <ellipse className="map-cloud map-cloud-c" cx={860} cy={50} rx={80} ry={18} />
            <ellipse className="map-cloud map-cloud-a" cx={300} cy={240} rx={70} ry={16} />
            <ellipse className="map-cloud map-cloud-b" cx={700} cy={200} rx={95} ry={20} />
          </g>
          {TERRITORIES.map((d) => {
            const t = state.territories[d.id]!;
            const house = t.owner === "barbarian" ? null : empireOf(state.players[t.owner]!.empire);
            return (
              <path
                key={d.id}
                ref={(el) => {
                  if (el) pathRefs.current.set(d.id, el);
                  else pathRefs.current.delete(d.id);
                }}
                data-land={d.id}
                d={d.path}
                className={cn(
                  "map-land",
                  house ? `empire-${house.id}` : "",
                  t.owner === "barbarian" ? "is-barbarian" : "is-owned",
                  selected === d.id && "is-selected",
                  targetSet.has(d.id) && selected !== d.id && "is-target",
                  flashes[d.id] ? "is-captured" : "",
                )}
              >
                <title>{d.name}</title>
              </path>
            );
          })}
          {TERRITORIES.map((d) => {
            const t = state.territories[d.id]!;
            const house = t.owner === "barbarian" ? null : empireOf(state.players[t.owner]!.empire);
            const isSel = selected === d.id;
            return (
              <path
                key={`border-${d.id}`}
                d={d.path}
                className={cn(
                  "map-border",
                  house ? `empire-${house.id}` : "",
                  t.owner === "barbarian" ? "is-barbarian" : "is-owned",
                  isSel && "is-selected",
                  targetSet.has(d.id) && !isSel && "is-target",
                )}
              />
            );
          })}
          {TERRITORIES.flatMap((d) => {
            const t = state.territories[d.id]!;
            if (!t.road || t.owner === "barbarian") return [];
            return landNeighbors(d.id)
              .filter((nb) => nb > d.id)
              .flatMap((nb) => {
                const u = state.territories[nb]!;
                if (!u.road || u.owner !== t.owner) return [];
                const b = TERRITORY_BY_ID[nb]!;
                return [
                  <line
                    key={`road-${d.id}-${nb}`}
                    x1={d.labelX}
                    y1={d.labelY}
                    x2={b.labelX}
                    y2={b.labelY}
                    className="map-road"
                  />,
                ];
              });
          })}
          {selected
            ? targets.map((id) => {
                const from = TERRITORY_BY_ID[selected];
                const to = TERRITORY_BY_ID[id];
                if (!from || !to) return null;
                const dx = to.labelX - from.labelX;
                const dy = to.labelY - from.labelY;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const hx = to.labelX - ux * 10;
                const hy = to.labelY - uy * 10;
                return (
                  <g key={`march-${id}`}>
                    <line
                      x1={from.labelX}
                      y1={from.labelY}
                      x2={hx}
                      y2={hy}
                      className="map-march"
                    />
                    <polygon
                      className="map-march-head"
                      points={`${to.labelX},${to.labelY} ${hx - uy * 4},${hy + ux * 4} ${hx + uy * 4},${hy - ux * 4}`}
                    />
                  </g>
                );
              })
            : null}
          {OCEAN_LABELS.map((o) => (
            <text
              key={`${o.name}-${o.x}`}
              x={o.x}
              y={o.y}
              className="map-ocean"
              textAnchor="middle"
              fontSize={Math.max(7, 12 / view.k)}
            >
              {o.name}
            </text>
          ))}
          {TERRITORIES.map((d) => {
            const t = state.territories[d.id]!;
            const land = LANDSCAPE[d.id];
            const owned = t.owner !== "barbarian";
            const founder = (Object.entries(CAPITOL) as [EmpireId, string][]).find(([, id]) => id === d.id)?.[0];
            const cx = d.labelX;
            const cy = d.labelY;
            const isSel = selected === d.id;
            const wonder = land?.wonder as WonderId | undefined;
            const resource = land?.resource as ResourceId | undefined;
            const house = t.owner === "barbarian" ? null : empireOf(state.players[t.owner]!.empire);
            const walled = Boolean(t.castle);
            const cityW = founder ? 30 : walled ? 26 : owned ? 20 : 16;
            const cityH = cityW;
            const seat = founder
              ? CAPITAL_SRC[founder]
              : !owned
                ? PROP_SRC.camp
                : walled
                  ? PROP_SRC.city
                  : PROP_SRC.town;
            const showWorks = view.k >= 1.15;
            const glow = house?.color ?? "#c4a574";
            return (
              <g key={`m-${d.id}`} className="map-markers">
                <ellipse
                  className="map-seat-glow"
                  cx={cx}
                  cy={cy + 4}
                  rx={cityW * 0.62}
                  ry={cityH * 0.28}
                  fill={glow}
                />
                {walled ? (
                  <Marker href={PROP_SRC.walls} x={cx} y={cy + 12} w={cityW + 18} h={Math.round(cityH * 0.85)} />
                ) : null}
                <Marker href={seat} x={cx} y={cy + 8} w={cityW} h={cityH} live={Boolean(founder) || isSel} />
                {t.port ? (
                  <Marker href={PROP_SRC.port} x={cx + cityW * 0.7} y={cy + 16} w={24} h={18} />
                ) : null}
                {t.dragons > 0 ? (
                  <Marker href={PROP_SRC.dragon} x={cx - 2} y={cy - 10} w={20} h={18} live />
                ) : null}
                {wonder && !founder ? (
                  <Marker href={PROP_SRC[wonder]} x={cx - 22} y={cy - 4} w={22} h={20} />
                ) : null}
                {showWorks && t.mine ? <Marker href={PROP_SRC.mine} x={cx - cityW * 0.7} y={cy + 16} w={18} h={16} /> : null}
                {showWorks && t.farm ? <Marker href={PROP_SRC.farm} x={cx - 8} y={cy + 22} w={16} h={14} /> : null}
                {showWorks && t.market ? <Marker href={PROP_SRC.market} x={cx + 18} y={cy - 4} w={16} h={14} /> : null}
                {showWorks && t.road ? <Marker href={PROP_SRC.road} x={cx - 10} y={cy + 18} w={12} h={10} /> : null}
                {resource ? (
                  <Marker href={PROP_SRC[resource]} x={cx + 10} y={cy - 12} w={14} h={14} />
                ) : null}
              </g>
            );
          })}
          {TERRITORIES.map((d) => {
            const t = state.territories[d.id]!;
            const hp = hostDefense(state, t);
            const host = standing(t);
            const hpClass = hp <= 5 ? "is-weak" : hp >= 10 ? "is-stout" : "is-mid";
            const fs = Math.max(6, 10 / view.k);
            const infoFs = Math.max(4.5, 7.5 / view.k);
            const rich = LANDSCAPE[d.id]?.resource;
            const bits = [
              `${host} host`,
              t.castle ? "walls" : t.owner === "barbarian" ? "tribe" : "city",
              rich ?? null,
            ].filter(Boolean);
            return (
              <g key={`l-${d.id}`} className="map-stat">
                <title>
                  {d.name}: defence {hp}, host {host}
                  {t.castle ? ", walls" : t.owner === "barbarian" ? ", tribe" : ", city"}
                  {rich ? `, ${rich}` : ""}
                </title>
                <text
                  x={d.labelX + 14}
                  y={d.labelY - 4}
                  className={cn("map-hp", hpClass)}
                  textAnchor="middle"
                  fontSize={fs}
                  strokeWidth={Math.max(1.2, 2.4 / view.k)}
                >
                  {hp}
                </text>
                <text
                  x={d.labelX}
                  y={d.labelY + 22 / view.k}
                  className="map-label"
                  textAnchor="middle"
                  fontSize={Math.max(5.5, 11 / view.k)}
                  strokeWidth={Math.max(1.2, 2.6 / view.k)}
                >
                  {d.name.toUpperCase()}
                </text>
                <text
                  x={d.labelX}
                  y={d.labelY + 32 / view.k}
                  className="map-info"
                  textAnchor="middle"
                  fontSize={infoFs}
                  strokeWidth={Math.max(1, 2 / view.k)}
                >
                  {bits.join(" · ")}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-shimmer" />
      <div className="map-vignette" />
      <div className="map-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <Hint
          align="end"
          className="self-end"
          text="Pinch or tap +/− to zoom. Green defence is weak, red is stout. Home fits your lands. Drag to pan."
        />
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomButton(1.22)}>
          +
        </button>
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomButton(0.82)}>
          −
        </button>
        <button type="button" aria-label="Fit my lands" title="Fit the map to your lands" onClick={() => fitTo(myIds)}>
          ⌂
        </button>
      </div>
    </div>
  );
}
