import { Html, Line, OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import * as THREE from "three";
import { empireOf } from "@/lib/game/empires";
import { hostDefense, isPlayerOwner, jobsAt, standing } from "@/lib/game/engine";
import {
  BATTLE_UNIT_SRC,
  LANDSCAPE,
  PROP_SRC,
  RESOURCE_LABEL,
  SIEGE_SRC,
  WORLD_SRC,
  cityArtSrc,
} from "@/lib/game/landscape";
import {
  BORDER_LOOPS,
  CITY_PAD,
  GLOBE_BY_ID,
  GLOBE_HEXES,
  GLOBE_LANDS,
  GLOBE_OCEANS,
  GLOBE_R,
  LAND_BUFFERS,
  OCEAN_NAME_POINTS,
  arcPoints,
  hexColor,
  hexLoop,
  isGlobeFront,
  meanDir,
  paintLandColors,
  pickHex,
} from "@/lib/game/globe";
import { CONTINENT_NAMES, CAPITOL, type GameState, type PulseEvent } from "@/lib/game/types";
import { landNeighbors } from "@/lib/game/world";
import { isWater, placeName, seaYieldOf } from "@/lib/game/waters";
import { cn } from "@/lib/utils";

const MIN_DIST = GLOBE_R * 1.22;
const MAX_DIST = GLOBE_R * 6.2;
const _chipNdc = new THREE.Vector3();
const _globeNdc = new THREE.Vector3();
const _limbNdc = new THREE.Vector3();
const _limbSide = new THREE.Vector3();

function isFront(cam: THREE.Camera, p: [number, number, number], height: number, padPx: number) {
  const pos = cam.position;
  if (!isGlobeFront([pos.x, pos.y, pos.z], p)) return false;
  const d = pos.length() || 1;
  const r2 = GLOBE_R * GLOBE_R;
  if (d * d <= r2 + 1e-6) return true;
  const k = r2 / (d * d);
  const h = GLOBE_R * Math.sqrt(Math.max(0, 1 - r2 / (d * d)));
  const cx = pos.x / d;
  const cy = pos.y / d;
  const cz = pos.z / d;
  if (Math.abs(cy) < 0.94) _limbSide.set(-cz, 0, cx);
  else _limbSide.set(0, -cz, cy);
  _limbSide.normalize();
  _limbNdc.set(pos.x * k + _limbSide.x * h, pos.y * k + _limbSide.y * h, pos.z * k + _limbSide.z * h).project(cam);
  _globeNdc.set(0, 0, 0).project(cam);
  _chipNdc.set(p[0], p[1], p[2]).project(cam);
  const disk = Math.hypot(_limbNdc.x - _globeNdc.x, _limbNdc.y - _globeNdc.y);
  const rad = Math.hypot(_chipNdc.x - _globeNdc.x, _chipNdc.y - _globeNdc.y);
  return rad + (padPx * 2) / Math.max(height, 1) < disk;
}

export type GlobeApi = {
  zoom: (factor: number) => void;
  focusIds: (ids: string[]) => void;
};

function applyFocus(camera: THREE.Camera, ids: string[], dist?: number) {
  const dir = meanDir(ids);
  const d = dist ?? (ids.length <= 3 ? GLOBE_R * 1.72 : GLOBE_R * 2.18);
  camera.position.set(dir[0] * d, dir[1] * d, dir[2] * d);
  camera.lookAt(0, 0, 0);
}

const SEA_SRC = {
  fish: PROP_SRC.fish,
  shellfish: PROP_SRC.shellfish,
  whale: PROP_SRC.whale,
  treasure: PROP_SRC.treasure,
} as const;

function houseColor(state: GameState, id: string): string {
  const t = state.territories[id];
  if (!t || !isPlayerOwner(t.owner)) return "#c4a574";
  return empireOf(state.players[t.owner]!.empire).color;
}

function Land({
  state,
  selected,
  flashes,
  onPick,
}: {
  state: GameState;
  selected: string | null;
  flashes: Record<string, number>;
  onPick: (id: string | null, client: { x: number; y: number }) => void;
}) {
  const texture = useTexture(WORLD_SRC);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(LAND_BUFFERS.positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(LAND_BUFFERS.uvs, 2));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(LAND_BUFFERS.colors), 3));
    g.setIndex(new THREE.BufferAttribute(LAND_BUFFERS.indices, 1));
    g.computeVertexNormals();
    return g;
  }, []);
  useLayoutEffect(() => {
    const attr = geom.getAttribute("color") as THREE.BufferAttribute;
    paintLandColors(attr.array as Float32Array, (id, kind) => {
      const t = state.territories[id];
      if (kind === "ocean") {
        if (!t || !isPlayerOwner(t.owner)) return [0.18, 0.4, 0.5];
        const tint = hexColor(houseColor(state, id), selected === id ? 0.72 : 0.52);
        return [tint[0] * 0.42 + 0.12, tint[1] * 0.42 + 0.22, tint[2] * 0.42 + 0.38];
      }
      if (!t) return [0.18, 0.4, 0.5];
      if (flashes[id]) return [1.12, 1.02, 0.58];
      const owned = t.owner !== "barbarian";
      const cap = isCapitol(state, id);
      if (selected === id) return hexColor(houseColor(state, id), cap ? 0.98 : 0.9);
      if (!owned) return [0.94, 0.9, 0.82];
      return hexColor(houseColor(state, id), cap ? 1 : 0.94);
    });
    attr.needsUpdate = true;
  }, [geom, state, selected, flashes]);
  useLayoutEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nvarying vec3 vGlobeN;")
        .replace("#include <uv_vertex>", "#include <uv_vertex>\nvGlobeN = normalize(position);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <uv_pars_fragment>", "#include <uv_pars_fragment>\nvarying vec3 vGlobeN;")
        .replace(
          "vec4 sampledDiffuseColor = texture2D( map, vMapUv );",
          [
            "vec3 gn = normalize(vGlobeN);",
            "float gu = atan(gn.x, gn.z) / 6.283185307179586 + 0.5;",
            "float gv = asin(clamp(gn.y, -1.0, 1.0)) / 3.141592653589793 + 0.5;",
            "vec4 sampledDiffuseColor = texture2D( map, vec2(gu, gv) );",
          ].join("\n"),
        );
    };
    m.customProgramCacheKey = () => "globe-equirect";
    m.needsUpdate = true;
  }, [texture]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <mesh
      geometry={geom}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        const start = down.current;
        down.current = null;
        if (!start) return;
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
        e.stopPropagation();
        onPick(pickHex([e.point.x, e.point.y, e.point.z], e.faceIndex ?? undefined), {
          x: e.clientX,
          y: e.clientY,
        });
      }}
    >
      <meshStandardMaterial
        ref={matRef}
        map={texture}
        vertexColors
        roughness={0.82}
        metalness={0.04}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function Borders({
  state,
  selected,
  targets,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
}) {
  const targetSet = useMemo(() => new Set(targets), [targets]);
  const oceanGeom = useMemo(() => {
    const pos: number[] = [];
    const hexOf: number[] = [];
    BORDER_LOOPS.forEach((loop, hi) => {
      if (GLOBE_HEXES[hi]?.kind !== "ocean") return;
      for (let i = 0; i < loop.length - 1; i++) {
        const a = loop[i]!;
        const b = loop[i + 1]!;
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        hexOf.push(hi, hi);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
    g.userData.hexOf = hexOf;
    return g;
  }, []);
  const landGeom = useMemo(() => {
    const pos: number[] = [];
    const hexOf: number[] = [];
    BORDER_LOOPS.forEach((loop, hi) => {
      if (GLOBE_HEXES[hi]?.kind === "ocean") return;
      for (let i = 0; i < loop.length - 1; i++) {
        const a = loop[i]!;
        const b = loop[i + 1]!;
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        hexOf.push(hi, hi);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
    g.userData.hexOf = hexOf;
    return g;
  }, []);
  useLayoutEffect(() => {
    const attr = landGeom.getAttribute("color") as THREE.BufferAttribute;
    const hexOf = landGeom.userData.hexOf as number[];
    for (let i = 0; i < hexOf.length; i++) {
      const cell = GLOBE_HEXES[hexOf[i]!]!;
      const id = cell.id;
      const t = state.territories[id];
      let c: [number, number, number] = [0.42, 0.36, 0.28];
      const owned = Boolean(t && t.owner !== "barbarian");
      const cap = isCapitol(state, id);
      if (selected === id) c = [1, 0.94, 0.62];
      else if (targetSet.has(id)) c = [0.95, 0.82, 0.35];
      else if (t?.besiegedFrom) c = [0.9, 0.45, 0.18];
      else if (owned) c = hexColor(houseColor(state, id), cap ? 1 : 0.95);
      attr.setXYZ(i, c[0], c[1], c[2]);
    }
    attr.needsUpdate = true;
  }, [landGeom, state, selected, targetSet]);
  useLayoutEffect(() => {
    const attr = oceanGeom.getAttribute("color") as THREE.BufferAttribute;
    const hexOf = oceanGeom.userData.hexOf as number[];
    for (let i = 0; i < hexOf.length; i++) {
      const cell = GLOBE_HEXES[hexOf[i]!]!;
      const id = cell.id;
      const t = state.territories[id];
      let c: [number, number, number] = [0.06, 0.18, 0.38];
      if (selected === id) c = [1, 0.94, 0.62];
      else if (targetSet.has(id)) c = [0.95, 0.82, 0.35];
      else if (t && isPlayerOwner(t.owner)) c = hexColor(houseColor(state, id), 0.92);
      attr.setXYZ(i, c[0], c[1], c[2]);
    }
    attr.needsUpdate = true;
  }, [oceanGeom, state, selected, targetSet]);
  useEffect(() => {
    return () => {
      oceanGeom.dispose();
      landGeom.dispose();
    };
  }, [oceanGeom, landGeom]);
  return (
    <>
      <lineSegments geometry={oceanGeom} raycast={() => {}}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} />
      </lineSegments>
      <lineSegments geometry={landGeom} raycast={() => {}}>
        <lineBasicMaterial vertexColors transparent opacity={0.96} />
      </lineSegments>
    </>
  );
}

function EmpireRims({ state }: { state: GameState }) {
  const rims = useMemo(() => {
    const seats = new Set(Object.values(CAPITOL));
    const out: { key: string; pts: ReturnType<typeof hexLoop>; color: string; cap: boolean }[] = [];
    for (const id of Object.keys(state.territories)) {
      const t = state.territories[id];
      if (!t || !isPlayerOwner(t.owner)) continue;
      const pts = hexLoop(id, seats.has(id) ? 0.038 : 0.026);
      if (pts.length < 3) continue;
      out.push({
        key: id,
        pts,
        color: empireOf(state.players[t.owner]!.empire).color,
        cap: seats.has(id),
      });
    }
    return out;
  }, [state]);
  return (
    <>
      {rims.map((r) => (
        <group key={`rim-${r.key}`}>
          <Line points={r.pts} color="#061018" lineWidth={r.cap ? 9.4 : 6.2} transparent opacity={0.88} />
          <Line points={r.pts} color={r.color} lineWidth={r.cap ? 6.8 : 3.8} transparent opacity={1} />
        </group>
      ))}
    </>
  );
}

function Arcs({
  state,
  selected,
  targets,
  fx,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
  fx: PulseEvent[];
}) {
  const lines: { key: string; pts: [number, number, number][]; color: string; dashed?: boolean }[] = [];
  if (selected) {
    const from = GLOBE_BY_ID[selected];
    if (from) {
      for (const id of targets) {
        const to = GLOBE_BY_ID[id];
        if (!to) continue;
        lines.push({
          key: `march-${id}`,
          pts: arcPoints(from.center, to.center),
          color: "#e7d7a8",
          dashed: true,
        });
      }
    }
  }
  for (const m of state.marches ?? []) {
    const a = GLOBE_BY_ID[m.from];
    const b = GLOBE_BY_ID[m.to];
    if (!a || !b) continue;
    lines.push({
      key: `col-${m.id}`,
      pts: arcPoints(a.center, b.center),
      color: "#fff1c2",
      dashed: true,
    });
  }
  for (const d of GLOBE_LANDS) {
    const t = state.territories[d.id];
    if (!t?.besiegedFrom) continue;
    const from = GLOBE_BY_ID[t.besiegedFrom];
    if (!from) continue;
    lines.push({
      key: `siege-${d.id}`,
      pts: arcPoints(from.center, d.center, 16, 1.04),
      color: "#e08a3c",
      dashed: true,
    });
  }
  for (const d of GLOBE_LANDS) {
    const t = state.territories[d.id];
    if (!t?.road || t.owner === "barbarian") continue;
    for (const nb of landNeighbors(d.id)) {
      if (nb <= d.id) continue;
      const u = state.territories[nb];
      if (!u?.road || u.owner !== t.owner) continue;
      const b = GLOBE_BY_ID[nb];
      if (!b) continue;
      lines.push({
        key: `road-${d.id}-${nb}`,
        pts: arcPoints(d.center, b.center, 10, 1.028),
        color: "#d2b48c",
        dashed: true,
      });
    }
  }
  fx.forEach((ev, i) => {
    if (ev.type !== "march" || !ev.fromId) return;
    const a = GLOBE_BY_ID[ev.fromId];
    const b = GLOBE_BY_ID[ev.toId];
    if (!a || !b) return;
    lines.push({
      key: `fx-${i}-${ev.toId}`,
      pts: arcPoints(a.center, b.center, 18, 1.05),
      color: "#fff1c2",
    });
  });
  return (
    <>
      {lines.map((l) => (
        <Line
          key={l.key}
          points={l.pts}
          color={l.color}
          lineWidth={1.6}
          dashed={l.dashed}
          dashSize={0.05}
          gapSize={0.04}
          transparent
          opacity={0.92}
        />
      ))}
    </>
  );
}

function isCapitol(state: GameState, id: string): boolean {
  const t = state.territories[id];
  if (!t || !isPlayerOwner(t.owner)) return false;
  return empireOf(state.players[t.owner]!.empire).capitol === id;
}

function PulseHalo({ id, color }: { id: string; color: string }) {
  const ref = useRef<THREE.Group>(null);
  const pts = useMemo(() => hexLoop(id, 0.028), [id]);
  useFrame(({ clock }) => {
    const o = 0.28 + 0.62 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.35));
    ref.current?.traverse((ch) => {
      const mat = (ch as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      const m = Array.isArray(mat) ? mat[0] : mat;
      if (m && "opacity" in m) {
        m.transparent = true;
        (m as THREE.Material & { opacity: number }).opacity = o;
      }
    });
  });
  if (pts.length < 2) return null;
  return (
    <group ref={ref}>
      <Line points={pts} color={color} lineWidth={3.4} transparent opacity={0.7} />
    </group>
  );
}

function CapitalHalos({ state }: { state: GameState }) {
  const caps = useMemo(() => {
    const out: { id: string; color: string }[] = [];
    for (const p of state.players) {
      if (!p.alive) continue;
      const id = empireOf(p.empire).capitol;
      if (!isCapitol(state, id)) continue;
      out.push({ id, color: empireOf(p.empire).color });
    }
    return out;
  }, [state]);
  return (
    <>
      {caps.map((c) => (
        <PulseHalo key={c.id} id={c.id} color={c.color} />
      ))}
    </>
  );
}

function Overlay({
  state,
  selected,
  targets,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
}) {
  const targetSet = useMemo(() => new Set(targets), [targets]);
  const [show, setShow] = useState<string[]>([]);
  const [oceans, setOceans] = useState<string[]>([]);
  const cam = useThree((s) => s.camera);
  const height = useThree((s) => s.size.height);
  const last = useRef("");
  useFrame(() => {
    const dist = cam.position.length();
    const close = dist < GLOBE_R * 2.4;
    const next: string[] = [];
    for (const h of GLOBE_LANDS) {
      const pad = CITY_PAD[h.id] ?? h.center;
      if (!isFront(cam, h.center, height, 52) || !isFront(cam, pad, height, 52)) continue;
      const t = state.territories[h.id];
      const hot = selected === h.id || targetSet.has(h.id) || Boolean(t?.besiegedFrom);
      if (hot || close) next.push(h.id);
    }
    for (const h of GLOBE_OCEANS) {
      const pad = CITY_PAD[h.id] ?? h.center;
      if (!isFront(cam, h.center, height, 44) || !isFront(cam, pad, height, 44)) continue;
      const t = state.territories[h.id];
      const held = Boolean(t && isPlayerOwner(t.owner));
      const hot = selected === h.id || targetSet.has(h.id);
      if (hot || held || close) next.push(h.id);
    }
    const nextOceans = OCEAN_NAME_POINTS.filter((o) => isFront(cam, o.pos, height, 70)).map((o) => o.name);
    const key = `${next.join("|")}~${nextOceans.join("|")}`;
    if (key !== last.current) {
      last.current = key;
      setShow(next);
      setOceans(nextOceans);
    }
  });
  const oceanSet = useMemo(() => new Set(oceans), [oceans]);
  return (
    <>
      {OCEAN_NAME_POINTS.map((o) =>
        oceanSet.has(o.name) ? (
          <Html key={o.name} position={o.pos} sprite center style={{ pointerEvents: "none" }} zIndexRange={[0, 0]}>
            <div className="globe-ocean">{o.name}</div>
          </Html>
        ) : null,
      )}
      {show.map((id) => {
        const h = GLOBE_BY_ID[id];
        const t = state.territories[id];
        if (!h || !t) return null;
        const pad = CITY_PAD[id] ?? h.center;
        const water = isWater(id);
        const yieldKind = water ? seaYieldOf(id) : null;
        const hp = hostDefense(state, t);
        const host = standing(t);
        const hpClass = hp <= 5 ? "is-weak" : hp >= 10 ? "is-stout" : "is-mid";
        const owned = isPlayerOwner(t.owner);
        const seat = cityArtSrc(t);
        const land = water ? null : LANDSCAPE[id];
        const work = jobsAt(state, id);
        const cap = isCapitol(state, id);
        const detail = selected === id;
        const hot = selected === id || targetSet.has(id);
        if (water && !owned && !hot) {
          return (
            <Html key={id} position={pad} sprite center style={{ pointerEvents: "none" }} zIndexRange={[1, 2]}>
              <div className="globe-chip is-sea">
                <span className="globe-yield">
                  {yieldKind ? <img src={SEA_SRC[yieldKind]} alt="" className="globe-res" /> : null}
                </span>
              </div>
            </Html>
          );
        }
        if (water) {
          const ships = t.ships ?? 0;
          const warships = t.warships ?? 0;
          return (
            <Html key={id} position={pad} sprite center style={{ pointerEvents: "none" }} zIndexRange={[2, 4]}>
              <div className={cn("globe-chip is-sea", selected === id && "is-sel", owned && "is-owned")}>
                <span className="globe-seat globe-fleet">
                  {ships > 0 ? (
                    <span className="globe-fleet-unit">
                      <img src={PROP_SRC.ship} alt="" />
                      {ships > 1 ? <span className="globe-fleet-n">{ships}</span> : null}
                    </span>
                  ) : null}
                  {warships > 0 ? (
                    <span className="globe-fleet-unit">
                      <img src={PROP_SRC.warship} alt="" />
                      {warships > 1 ? <span className="globe-fleet-n">{warships}</span> : null}
                    </span>
                  ) : null}
                  {ships < 1 && warships < 1 ? <img src={PROP_SRC.ship} alt="" className="globe-city" /> : null}
                </span>
                <span className="globe-yield">
                  <span className={cn("globe-hp", hpClass)}>{hp}</span>
                  {yieldKind ? <img src={SEA_SRC[yieldKind]} alt="" className="globe-res" /> : null}
                </span>
                <span className="globe-name">{placeName(id).toUpperCase()}</span>
                {detail ? (
                  <div className="globe-sub">
                    <span>Waters</span>
                    {host ? <span>host {host}</span> : null}
                    {ships ? <span>{ships} ships</span> : null}
                    {warships ? <span>{warships} warships</span> : null}
                  </div>
                ) : null}
              </div>
            </Html>
          );
        }
        return (
          <Html key={id} position={pad} sprite center style={{ pointerEvents: "none" }} zIndexRange={[2, 4]}>
            <div
              className={cn(
                "globe-chip",
                selected === id && "is-sel",
                owned && "is-owned",
                cap && "is-cap",
              )}
            >
              <span className="globe-seat">
                <img src={seat} alt="" className="globe-city" />
              </span>
              {t.dragons > 0 ? <img src={PROP_SRC.dragon} alt="" className="globe-mark is-sm" /> : null}
              {t.besiegedFrom ? <img src={SIEGE_SRC.ram} alt="" className="globe-mark is-sm" /> : null}
              <span className="globe-yield">
                <span className={cn("globe-hp", hpClass)}>{hp}</span>
                {land?.resource ? (
                  <img src={PROP_SRC[land.resource]} alt="" className="globe-res" />
                ) : null}
              </span>
              <span className="globe-name">{h.name.toUpperCase()}</span>
              {detail ? (
                <div className="globe-sub">
                  <span>{CONTINENT_NAMES[h.continent as keyof typeof CONTINENT_NAMES]}</span>
                  {host ? <span>host {host}</span> : null}
                  {land?.resource ? <span>{RESOURCE_LABEL[land.resource]}</span> : null}
                  {work.length ? <span>{work.length} works</span> : null}
                </div>
              ) : null}
            </div>
          </Html>
        );
      })}
      {(state.marches ?? []).map((m) => {
        const a = GLOBE_BY_ID[m.from];
        const b = GLOBE_BY_ID[m.to];
        if (!a || !b) return null;
        const mid = arcPoints(a.center, b.center, 8, 1.06)[4];
        if (!mid) return null;
        if (!isGlobeFront([cam.position.x, cam.position.y, cam.position.z], mid, 0.12)) return null;
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
          <Html key={`col-${m.id}`} position={mid} sprite center style={{ pointerEvents: "none" }}>
            <img src={icon} alt="" className="globe-mark is-sm" />
          </Html>
        );
      })}
    </>
  );
}

function orbitApi(controls: unknown): { target: THREE.Vector3; update: () => void } | undefined {
  if (!controls || typeof controls !== "object") return undefined;
  const c = controls as { target?: THREE.Vector3; update?: () => void };
  if (!c.target || typeof c.update !== "function") return undefined;
  return c as { target: THREE.Vector3; update: () => void };
}

function Rig({ homeIds, apiRef }: { homeIds: string[]; apiRef: Ref<GlobeApi | null> }) {
  const store = useThree();
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (focused.current) return;
    focused.current = true;
    applyFocus(store.camera, homeIds);
    const c = orbitApi(store.controls);
    c?.target.set(0, 0, 0);
    c?.update();
  }, [store, homeIds]);
  useImperativeHandle(
    apiRef,
    () => ({
      zoom(factor: number) {
        const camera = store.camera;
        const c = orbitApi(store.controls);
        const target = c?.target ?? new THREE.Vector3();
        const offset = camera.position.clone().sub(target);
        const next = Math.min(MAX_DIST, Math.max(MIN_DIST, offset.length() / factor));
        offset.setLength(next);
        camera.position.copy(target).add(offset);
        c?.update();
      },
      focusIds(ids: string[]) {
        applyFocus(store.camera, ids.length ? ids : homeIds);
        const c = orbitApi(store.controls);
        c?.target.set(0, 0, 0);
        c?.update();
      },
    }),
    [store, homeIds],
  );
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
      zoomSpeed={0.85}
      rotateSpeed={0.68}
      target={[0, 0, 0]}
    />
  );
}

function Scene({
  state,
  selected,
  targets,
  fx,
  flashes,
  homeIds,
  apiRef,
  onPick,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
  fx: PulseEvent[];
  flashes: Record<string, number>;
  homeIds: string[];
  apiRef: Ref<GlobeApi | null>;
  onPick: (id: string | null, client: { x: number; y: number }) => void;
}) {
  const selLoop = selected ? hexLoop(selected, 0.02) : [];
  return (
    <>
      <color attach="background" args={["#061018"]} />
      <ambientLight intensity={0.52} />
      <hemisphereLight args={["#d7ecff", "#14241c", 0.62]} />
      <directionalLight position={[5, 3.2, 2.4]} intensity={1.2} />
      <directionalLight position={[-3, -1.4, -4]} intensity={0.22} />
      <Stars radius={48} depth={24} count={3200} factor={2.2} fade speed={0.4} />
      <mesh scale={1.14} raycast={() => {}}>
        <sphereGeometry args={[GLOBE_R, 48, 32]} />
        <meshBasicMaterial color="#7ec8e3" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>
      <mesh raycast={() => {}}>
        <sphereGeometry args={[GLOBE_R * 0.997, 64, 48]} />
        <meshStandardMaterial color="#0b3d52" roughness={0.42} metalness={0.12} />
      </mesh>
      <Land state={state} selected={selected} flashes={flashes} onPick={onPick} />
      <Borders state={state} selected={selected} targets={targets} />
      <EmpireRims state={state} />
      <CapitalHalos state={state} />
      {selLoop.length > 1 ? (
        <Line points={selLoop} color="#fff4c8" lineWidth={2.4} transparent opacity={0.95} />
      ) : null}
      <Arcs state={state} selected={selected} targets={targets} fx={fx} />
      <Overlay state={state} selected={selected} targets={targets} />
      <Rig homeIds={homeIds} apiRef={apiRef} />
    </>
  );
}

export function GlobeCanvas({
  state,
  selected,
  targets,
  fx,
  flashes,
  homeIds,
  apiRef,
  onSelect,
  onTap,
}: {
  state: GameState;
  selected: string | null;
  targets: string[];
  fx: PulseEvent[];
  flashes: Record<string, number>;
  homeIds: string[];
  apiRef: Ref<GlobeApi | null>;
  onSelect: (id: string) => void;
  onTap?: (picked: string | null) => void;
}) {
  const miss = useRef<{ x: number; y: number } | null>(null);
  return (
    <Canvas
      camera={{ fov: 42, near: 0.08, far: 90, position: [0, 0.35, GLOBE_R * 2.35] }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false }}
      style={{ width: "100%", height: "100%", background: "#061018" }}
      onPointerDown={(e) => {
        miss.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMissed={(e) => {
        const start = miss.current;
        miss.current = null;
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
        onTap?.(null);
      }}
    >
      <Scene
        state={state}
        selected={selected}
        targets={targets}
        fx={fx}
        flashes={flashes}
        homeIds={homeIds}
        apiRef={apiRef}
        onPick={(id, _c) => {
          if (id) onSelect(id);
          onTap?.(id);
        }}
      />
    </Canvas>
  );
}
