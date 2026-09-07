import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { empireOf } from "@/lib/game/empires";
import { fortOf, hostDefense, jobsAt, ownedIds, standing } from "@/lib/game/engine";
import {
  BATTLE_UNIT_SRC,
  LANDSCAPE,
  OCEAN_LABELS,
  PROP_SRC,
  RESOURCE_LABEL,
  SIEGE_SRC,
  fortProp,
  type ResourceId,
  type WonderId,
} from "@/lib/game/landscape";
import { CONTINENT_NAMES, type GameState, type PulseEvent } from "@/lib/game/types";
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
  className,
}: {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  className?: string;
}) {
  return (
    <image
      href={href}
      x={x - w / 2}
      y={y - h}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMax meet"
      className={cn("map-marker", className)}
    />
  );
}

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
            href="/map/world.webp?v=orig-restore"
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
                  t.besiegedFrom && "is-siege",
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
                  t.besiegedFrom && "is-siege",
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
          {(state.marches ?? []).map((m) => {
            const a = TERRITORY_BY_ID[m.from];
            const b = TERRITORY_BY_ID[m.to];
            if (!a || !b) return null;
            const mx = a.labelX + (b.labelX - a.labelX) * 0.42;
            const my = a.labelY + (b.labelY - a.labelY) * 0.42;
            const icon =
              m.dragons > 0
                ? BATTLE_UNIT_SRC.dragon
                : m.beasts > 0
                  ? PROP_SRC.knight
                  : m.knights > 0
                    ? BATTLE_UNIT_SRC.knight
                    : m.bowmen > 0
                      ? BATTLE_UNIT_SRC.bowman
                      : BATTLE_UNIT_SRC.levy;
            return (
              <g key={`col-${m.id}`} className="map-column">
                <line x1={a.labelX} y1={a.labelY} x2={b.labelX} y2={b.labelY} className="map-march" />
                <image href={icon} x={mx - 7} y={my - 12} width={14} height={14} className="map-column-icon" />
              </g>
            );
          })}
          {TERRITORIES.map((d) => {
            const t = state.territories[d.id]!;
            if (!t.besiegedFrom) return null;
            const from = TERRITORY_BY_ID[t.besiegedFrom];
            if (!from) return null;
            const mx = from.labelX + (d.labelX - from.labelX) * 0.55;
            const my = from.labelY + (d.labelY - from.labelY) * 0.55;
            const labelFs = Math.max(5.5, 8 / view.k);
            return (
              <g key={`siege-${d.id}`} className="map-siege">
                <line
                  x1={from.labelX}
                  y1={from.labelY}
                  x2={d.labelX}
                  y2={d.labelY}
                  className="map-siege-line"
                />
                <ellipse cx={d.labelX} cy={d.labelY + 4} rx={24} ry={14} className="map-siege-ring" />
                <image
                  href={SIEGE_SRC.ram}
                  x={mx - 8}
                  y={my - 8}
                  width={16}
                  height={14}
                  className="map-siege-mark"
                />
                <text
                  x={d.labelX}
                  y={d.labelY - 16}
                  className="map-siege-label"
                  textAnchor="middle"
                  fontSize={labelFs}
                  strokeWidth={Math.max(1.1, 2.2 / view.k)}
                >
                  SIEGE
                </text>
              </g>
            );
          })}
          {fx.map((ev, i) => {
            const dest = TERRITORY_BY_ID[ev.toId];
            if (!dest) return null;
            if (ev.type === "march" && ev.fromId) {
              const origin = TERRITORY_BY_ID[ev.fromId];
              if (!origin) return null;
              return (
                <g key={`fx-m-${i}-${ev.toId}`} className="map-fx-march">
                  <line x1={origin.labelX} y1={origin.labelY} x2={dest.labelX} y2={dest.labelY} className="map-march is-live" />
                  <circle className="map-fx-dot" r={4}>
                    <animate attributeName="cx" from={origin.labelX} to={dest.labelX} dur="0.9s" fill="freeze" />
                    <animate attributeName="cy" from={origin.labelY} to={dest.labelY} dur="0.9s" fill="freeze" />
                  </circle>
                </g>
              );
            }
            return (
              <g key={`fx-${i}-${ev.toId}`} className="map-fx-pulse">
                <circle cx={dest.labelX} cy={dest.labelY} r={6} className="map-pulse-ring" />
                <circle cx={dest.labelX} cy={dest.labelY} r={3} className="map-pulse-core" />
              </g>
            );
          })}
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
            const cx = d.labelX;
            const cy = d.labelY;
            const wonder = land?.wonder as WonderId | undefined;
            const resource = land?.resource as ResourceId | undefined;
            const house = t.owner === "barbarian" ? null : empireOf(state.players[t.owner]!.empire);
            const fort = fortOf(t);
            const walled = fort >= 1;
            const keep = fort >= 3;
            const cityW = keep ? 16 : walled ? 15 : owned ? 18 : 14;
            const cityH = cityW;
            const wallW = keep ? 52 : 44;
            const wallH = keep ? 28 : 22;
            const seat = !owned ? PROP_SRC.camp : keep ? PROP_SRC.city : owned ? PROP_SRC.town : PROP_SRC.camp;
            const showWorks = view.k >= 1.15;
            const glow = house?.color ?? "#c4a574";
            const work = jobsAt(state, d.id);
            return (
              <g key={`m-${d.id}`} className="map-markers">
                <ellipse
                  className="map-seat-glow"
                  cx={cx}
                  cy={cy + 4}
                  rx={(walled ? wallW : cityW) * 0.42}
                  ry={(walled ? wallH : cityH) * 0.18}
                  fill={glow}
                />
                {walled ? (
                  <Marker href={fortProp(fort)} x={cx} y={cy + 12} w={wallW} h={wallH} />
                ) : null}
                <Marker href={seat} x={cx} y={cy + (walled ? 10 : 8)} w={cityW} h={cityH} />
                {t.port ? (
                  <Marker href={PROP_SRC.port} x={cx + cityW * 0.7} y={cy + 16} w={24} h={18} />
                ) : null}
                {t.dragons > 0 ? (
                  <Marker href={PROP_SRC.dragon} x={cx - 2} y={cy - 10} w={20} h={18} />
                ) : null}
                {wonder ? (
                  <Marker href={PROP_SRC[wonder]} x={cx - 22} y={cy - 4} w={22} h={20} />
                ) : null}
                {showWorks && t.mine ? <Marker href={PROP_SRC.mine} x={cx - cityW * 0.7} y={cy + 16} w={18} h={16} /> : null}
                {showWorks && t.farm ? <Marker href={PROP_SRC.farm} x={cx - 8} y={cy + 22} w={16} h={14} /> : null}
                {showWorks && t.market ? <Marker href={PROP_SRC.market} x={cx + 18} y={cy - 4} w={16} h={14} /> : null}
                {showWorks && t.road ? <Marker href={PROP_SRC.road} x={cx - 10} y={cy + 18} w={12} h={10} /> : null}
                {resource ? (
                  <Marker href={PROP_SRC[resource]} x={cx + 10} y={cy - 12} w={14} h={14} />
                ) : null}
                {work.length > 0 ? (
                  <g className="map-job-pip" data-jobs={d.id}>
                    <circle cx={cx - 16} cy={cy + 6} r={4.2} className="map-job-pip-disc" />
                    <text
                      x={cx - 16}
                      y={cy + 8.2}
                      textAnchor="middle"
                      className="map-job-pip-count"
                      fontSize={Math.max(4.5, 6.5 / view.k)}
                    >
                      {work.length}
                    </text>
                  </g>
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
            const nameFs = Math.max(5.5, 11 / view.k);
            const infoFs = Math.max(4.5, 7.5 / view.k);
            const nameY = d.labelY + 22 / view.k;
            const regionY = nameY + nameFs * 0.4 + infoFs + Math.max(3.5, 7 / view.k);
            const region = CONTINENT_NAMES[d.continent];
            const rich = LANDSCAPE[d.id]?.resource;
            return (
              <g key={`l-${d.id}`} className="map-stat">
                <title>
                  {d.name}: {region} · defence {hp}, host {host}
                  {t.castle || fortOf(t) > 0
                    ? `, ${fortOf(t) >= 3 ? "keep" : fortOf(t) >= 2 ? "stone walls" : "wooden walls"}`
                    : t.owner === "barbarian"
                      ? ", tribe"
                      : ", city"}
                  {rich ? `, abundance of ${RESOURCE_LABEL[rich]}` : ""}
                  {t.besiegedFrom ? `, under siege from ${TERRITORY_BY_ID[t.besiegedFrom]?.name ?? "a neighbour"}` : ""}
                  {jobsAt(state, d.id).length ? `, ${jobsAt(state, d.id).length} works underway` : ""}
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
                  y={nameY}
                  className="map-label"
                  textAnchor="middle"
                  fontSize={nameFs}
                  strokeWidth={Math.max(1.2, 2.6 / view.k)}
                >
                  {d.name.toUpperCase()}
                </text>
                <text
                  x={d.labelX}
                  y={regionY}
                  className="map-info"
                  textAnchor="middle"
                  fontSize={infoFs}
                  strokeWidth={Math.max(1, 2 / view.k)}
                >
                  {region}
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
