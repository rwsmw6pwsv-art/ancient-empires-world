import { OCEAN_LABELS } from "./landscape.ts";
import { TERRITORIES, TERRITORY_BY_ID, WORLD_H, WORLD_W, landNeighbors } from "./world.ts";
import { FLOOD_DIRS } from "./flooded.gen.ts";

export const GLOBE_R = 2;
/** Icosahedral frequency. Cells = 10 F² + 2. */
const HEX_FREQ = 8;

export type Vec3 = [number, number, number];

export type GlobeHex = {
  id: string;
  name: string;
  continent: string;
  coastal: boolean;
  kind: "land" | "ocean";
  cx: number;
  cy: number;
  center: Vec3;
  rim: Vec3[];
  height: number;
};

type DualCell = { center: Vec3; rim: Vec3[]; neighbors: number[] };

export function wrapDx(ax: number, bx: number): number {
  let d = ax - bx;
  const half = WORLD_W / 2;
  if (d > half) d -= WORLD_W;
  if (d < -half) d += WORLD_W;
  return d;
}

export function mapDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(wrapDx(ax, bx), ay - by);
}

export function lonLat(x: number, y: number): { lon: number; lat: number } {
  return {
    lon: (x / WORLD_W) * Math.PI * 2 - Math.PI,
    lat: Math.PI / 2 - (y / WORLD_H) * Math.PI,
  };
}

export function vecFromXy(x: number, y: number, r = GLOBE_R): Vec3 {
  const { lon, lat } = lonLat(x, y);
  const cl = Math.cos(lat);
  return [cl * Math.sin(lon) * r, Math.sin(lat) * r, cl * Math.cos(lon) * r];
}

export function xyFromVec(p: Vec3): { x: number; y: number } {
  const n = norm(p);
  const lon = Math.atan2(n[0], n[2]);
  const lat = Math.asin(Math.min(1, Math.max(-1, n[1])));
  return {
    x: ((lon + Math.PI) / (Math.PI * 2)) * WORLD_W,
    y: (0.5 - lat / Math.PI) * WORLD_H,
  };
}

function uvFromVec(p: Vec3): [number, number] {
  const n = norm(p);
  const lon = Math.atan2(n[0], n[2]);
  const lat = Math.asin(Math.min(1, Math.max(-1, n[1])));
  let u = (lon + Math.PI) / (Math.PI * 2);
  if (u < 0) u += 1;
  if (u >= 1) u -= 1;
  const v = (lat + Math.PI / 2) / Math.PI;
  return [u, v];
}

/** Keep a hex's UVs on one side of the date line so triangles do not streak across the Pacific. */
function unwrapUvs(pts: Vec3[]): [number, number][] {
  const raw = pts.map((p) => uvFromVec(p));
  const u0 = raw[0]![0];
  const out = raw.map(([u, v]) => {
    let uu = u;
    const d = uu - u0;
    if (d > 0.5) uu -= 1;
    else if (d < -0.5) uu += 1;
    return [uu, v] as [number, number];
  });
  const us = out.map((p) => p[0]!);
  if (Math.max(...us) - Math.min(...us) > 0.55) {
    return out.map((p) => [u0, p[1]!] as [number, number]);
  }
  return out;
}

function len(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function norm(v: Vec3): Vec3 {
  const l = len(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const ua = norm(a);
  const ub = norm(b);
  const d = Math.min(1, Math.max(-1, dot(ua, ub)));
  const omega = Math.acos(d);
  if (omega < 1e-5) return ua;
  const so = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / so;
  const wb = Math.sin(t * omega) / so;
  return [ua[0] * wa + ub[0] * wb, ua[1] * wa + ub[1] * wb, ua[2] * wa + ub[2] * wb];
}

function liftRadial(v: Vec3, extra: number): Vec3 {
  return scale(norm(v), len(v) + extra);
}

function tangentBasis(n: Vec3): { east: Vec3; north: Vec3 } {
  const up: Vec3 = Math.abs(n[1]) > 0.94 ? [1, 0, 0] : [0, 1, 0];
  const east = norm(cross(up, n));
  const north = cross(n, east);
  return { east, north };
}

function angleAround(n: Vec3, p: Vec3): number {
  const { east, north } = tangentBasis(n);
  return Math.atan2(dot(p, east), dot(p, north));
}

function vertKey(p: Vec3): string {
  return `${p[0].toFixed(7)},${p[1].toFixed(7)},${p[2].toFixed(7)}`;
}

function icosahedron(): { verts: Vec3[]; faces: number[][] } {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: Vec3[] = (
    [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1],
    ] as Vec3[]
  ).map((p) => norm(p));
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const pole = raw.reduce((b, p) => (p[1] > b[1] ? p : b));
  const axis = norm(cross(pole, [0, 1, 0]));
  const ang = Math.acos(Math.min(1, Math.max(-1, pole[1])));
  const verts = ang < 1e-6 ? raw : raw.map((p) => rotateAxis(p, axis, ang));
  return { verts, faces };
}

function rotateAxis(p: Vec3, axis: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const d = dot(axis, p);
  const cr = cross(axis, p);
  return [
    p[0] * c + cr[0] * s + axis[0] * d * (1 - c),
    p[1] * c + cr[1] * s + axis[1] * d * (1 - c),
    p[2] * c + cr[2] * s + axis[2] * d * (1 - c),
  ];
}

function subdivide(freq: number): { verts: Vec3[]; tris: number[][] } {
  const { verts: ico, faces } = icosahedron();
  const verts: Vec3[] = [];
  const indexOf = new Map<string, number>();
  const intern = (p: Vec3) => {
    const n = norm(p);
    const k = vertKey(n);
    const hit = indexOf.get(k);
    if (hit != null) return hit;
    const i = verts.length;
    verts.push(n);
    indexOf.set(k, i);
    return i;
  };
  ico.forEach((p) => intern(p));
  const tris: number[][] = [];
  for (const [ia, ib, ic] of faces) {
    const a = ico[ia!]!;
    const b = ico[ib!]!;
    const c = ico[ic!]!;
    const grid: number[][] = [];
    for (let i = 0; i <= freq; i++) {
      const row: number[] = [];
      for (let j = 0; j <= i; j++) {
        const pa = scale(a, freq - i);
        const pb = scale(b, i - j);
        const pc = scale(c, j);
        row.push(intern(add(add(pa, pb), pc)));
      }
      grid.push(row);
    }
    for (let i = 0; i < freq; i++) {
      for (let j = 0; j <= i; j++) {
        const v00 = grid[i]![j]!;
        const v10 = grid[i + 1]![j]!;
        const v11 = grid[i + 1]![j + 1]!;
        tris.push([v00, v10, v11]);
        if (j < i) {
          const v01 = grid[i]![j + 1]!;
          tris.push([v00, v11, v01]);
        }
      }
    }
  }
  return { verts, tris };
}

function goldberg(freq: number): DualCell[] {
  const { verts, tris } = subdivide(freq);
  const nbrs = verts.map(() => new Set<number>());
  for (const [a, b, c] of tris) {
    nbrs[a!]!.add(b!);
    nbrs[a!]!.add(c!);
    nbrs[b!]!.add(a!);
    nbrs[b!]!.add(c!);
    nbrs[c!]!.add(a!);
    nbrs[c!]!.add(b!);
  }
  const triSet = new Set(tris.map((t) => [...t].sort((x, y) => x - y).join(":")));
  const hasTri = (a: number, b: number, c: number) => {
    const k = [a, b, c].sort((x, y) => x - y).join(":");
    return triSet.has(k);
  };
  const cells = verts.map((center, vi) => {
    const ordered = [...nbrs[vi]!].sort((a, b) => angleAround(center, verts[a]!) - angleAround(center, verts[b]!));
    const rim: Vec3[] = [];
    const neighbors: number[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const a = ordered[i]!;
      const b = ordered[(i + 1) % ordered.length]!;
      neighbors.push(a);
      if (!hasTri(vi, a, b)) continue;
      const mid = norm(add(add(center, verts[a]!), verts[b]!));
      rim.push(scale(mid, GLOBE_R));
    }
    const c = scale(center, GLOBE_R);
    if (rim.length >= 2) {
      const cr = cross(sub(rim[0]!, c), sub(rim[1]!, c));
      if (dot(cr, c) <= 0) rim.reverse();
    }
    return { center: c, rim, neighbors };
  });
  return cells;
}

function isFloodedCell(c: Vec3): boolean {
  const n = norm(c);
  if (n[1] > 0.951) return true;
  for (const f of FLOOD_DIRS) {
    if (n[0] * f[0] + n[1] * f[1] + n[2] * f[2] > 0.997) return true;
  }
  const lat = (Math.asin(Math.min(1, Math.max(-1, n[1]))) * 180) / Math.PI;
  const lon = (Math.atan2(n[0], n[2]) * 180) / Math.PI;
  // Open North Pacific south of Beringia — leftover Goldberg cells here painted a land streak down the date line.
  if (lat < 53 && lat > 8 && Math.abs(lon) > 150) return true;
  return false;
}

function assignLands(cells: DualCell[]): (string | null)[] {
  const owner: (string | null)[] = cells.map(() => null);
  const pairs: { land: number; cell: number; dot: number }[] = [];
  const dirs = TERRITORIES.map((t) => norm(vecFromXy(t.labelX, t.labelY)));
  const flooded = cells.map((cell) => isFloodedCell(cell.center));
  for (let li = 0; li < dirs.length; li++) {
    const d = dirs[li]!;
    for (let ci = 0; ci < cells.length; ci++) {
      if (flooded[ci]) continue;
      const c = cells[ci]!.center;
      pairs.push({ land: li, cell: ci, dot: d[0] * c[0] + d[1] * c[1] + d[2] * c[2] });
    }
  }
  pairs.sort((a, b) => b.dot - a.dot);
  const landUsed = new Set<number>();
  const cellUsed = new Set<number>();
  for (const p of pairs) {
    if (landUsed.has(p.land) || cellUsed.has(p.cell)) continue;
    landUsed.add(p.land);
    cellUsed.add(p.cell);
    owner[p.cell] = TERRITORIES[p.land]!.id;
    if (landUsed.size === TERRITORIES.length) break;
  }
  return owner;
}

type MeshBuild = {
  hexes: GlobeHex[];
  positions: number[];
  uvs: number[];
  indices: number[];
  vertexHex: number[];
  faceHex: number[];
  borders: Vec3[][];
  neighbors: Record<string, string[]>;
};

function buildAllHexes(): MeshBuild {
  const cells = goldberg(HEX_FREQ);
  const owner = assignLands(cells);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const vertexHex: number[] = [];
  const faceHex: number[] = [];
  const hexes: GlobeHex[] = [];
  const borders: Vec3[][] = [];
  let oceanN = 0;

  const pushVert = (p: Vec3, uv: [number, number], hi: number) => {
    const i = positions.length / 3;
    positions.push(p[0], p[1], p[2]);
    uvs.push(uv[0], uv[1]);
    vertexHex.push(hi);
    return i;
  };

  const pushTri = (ia: number, ib: number, ic: number, hi: number) => {
    const ax = positions[ia * 3]!;
    const ay = positions[ia * 3 + 1]!;
    const az = positions[ia * 3 + 2]!;
    const bx = positions[ib * 3]!;
    const by = positions[ib * 3 + 1]!;
    const bz = positions[ib * 3 + 2]!;
    const cx = positions[ic * 3]!;
    const cy = positions[ic * 3 + 1]!;
    const cz = positions[ic * 3 + 2]!;
    const cr = cross([bx - ax, by - ay, bz - az], [cx - ax, cy - ay, cz - az]);
    const mx = (ax + bx + cx) / 3;
    const my = (ay + by + cy) / 3;
    const mz = (az + bz + cz) / 3;
    const outward = cr[0] * mx + cr[1] * my + cr[2] * mz > 0;
    if (outward) indices.push(ia, ib, ic);
    else indices.push(ia, ic, ib);
    faceHex.push(hi);
  };

  cells.forEach((cell, hi) => {
    const landId = owner[hi];
    const t = landId ? TERRITORY_BY_ID[landId] : undefined;
    const xy = t ? { x: t.labelX, y: t.labelY } : xyFromVec(cell.center);
    const hex: GlobeHex = t
      ? {
          id: t.id,
          name: t.name,
          continent: t.continent,
          coastal: t.coastal,
          kind: "land",
          cx: t.labelX,
          cy: t.labelY,
          center: cell.center,
          rim: cell.rim,
          height: 0,
        }
      : {
          id: `sea-${oceanN++}`,
          name: "",
          continent: "",
          coastal: false,
          kind: "ocean",
          cx: xy.x,
          cy: xy.y,
          center: cell.center,
          rim: cell.rim,
          height: 0,
        };
    const pts = [hex.center, ...hex.rim];
    const seamUv = unwrapUvs(pts);
    const cIdx = pushVert(pts[0]!, seamUv[0]!, hi);
    const vIdx = hex.rim.map((p, i) => pushVert(p, seamUv[i + 1]!, hi));
    const n = hex.rim.length;
    for (let i = 0; i < n; i++) {
      pushTri(cIdx, vIdx[i]!, vIdx[(i + 1) % n]!, hi);
    }
    const loop = hex.rim.map((v) => liftRadial(v, 0.006));
    borders.push([...loop, loop[0]!]);
    hexes.push(hex);
  });

  const neighbors: Record<string, string[]> = {};
  cells.forEach((cell, hi) => {
    const id = hexes[hi]!.id;
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const ni of cell.neighbors) {
      const n = hexes[ni];
      if (!n || n.id === id || seen.has(n.id)) continue;
      seen.add(n.id);
      ids.push(n.id);
    }
    neighbors[id] = ids;
  });

  return { hexes, positions, uvs, indices, vertexHex, faceHex, borders, neighbors };
}

const BUILT = buildAllHexes();

export const GLOBE_HEXES: GlobeHex[] = BUILT.hexes;
export const GLOBE_LANDS: GlobeHex[] = GLOBE_HEXES.filter((h) => h.kind === "land");
export const GLOBE_OCEANS: GlobeHex[] = GLOBE_HEXES.filter((h) => h.kind === "ocean");
export const GLOBE_BY_ID: Record<string, GlobeHex> = Object.fromEntries(GLOBE_HEXES.map((h) => [h.id, h]));
export const HEX_NEIGHBORS: Record<string, string[]> = BUILT.neighbors;

export function hexNeighbors(id: string): string[] {
  return HEX_NEIGHBORS[id] ?? [];
}

export const LAND_BUFFERS = {
  positions: new Float32Array(BUILT.positions),
  uvs: new Float32Array(BUILT.uvs),
  colors: new Float32Array(BUILT.positions.length),
  indices: new Uint32Array(BUILT.indices),
  vertexHex: new Uint16Array(BUILT.vertexHex),
  faceHex: new Uint16Array(BUILT.faceHex),
};

LAND_BUFFERS.colors.fill(1);

export const BORDER_LOOPS: Vec3[][] = BUILT.borders;

export const CITY_PAD: Record<string, Vec3> = Object.fromEntries(
  GLOBE_HEXES.map((h) => [h.id, liftRadial(h.center, 0.035)]),
);

export const OCEAN_NAME_POINTS: { name: string; pos: Vec3 }[] = (() => {
  const seen = new Set<string>();
  const out: { name: string; pos: Vec3 }[] = [];
  for (const o of OCEAN_LABELS) {
    if (seen.has(o.name)) continue;
    seen.add(o.name);
    const x = o.name === "PACIFIC OCEAN" ? 0 : o.x;
    out.push({ name: o.name, pos: vecFromXy(x, o.y, GLOBE_R * 1.03) });
  }
  return out;
})();

export function radialDome(h: GlobeHex): number {
  const rc = len(h.center);
  let max = 0;
  for (const p of h.rim) max = Math.max(max, Math.abs(len(p) - rc));
  return max;
}

export function topFacesOut(h: GlobeHex): boolean {
  if (h.rim.length < 2) return false;
  const c = h.center;
  const cr = cross(sub(h.rim[0]!, c), sub(h.rim[1]!, c));
  return dot(cr, c) > 0;
}

export function rimGap(a: GlobeHex, b: GlobeHex): number {
  let best = Infinity;
  for (const p of a.rim) {
    for (const q of b.rim) {
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (d < best) best = d;
    }
  }
  return best;
}

export function hexSpan(h: GlobeHex): number {
  if (!h.rim.length) return 0;
  let s = 0;
  for (const p of h.rim) s += Math.hypot(p[0] - h.center[0], p[1] - h.center[1], p[2] - h.center[2]);
  return s / h.rim.length;
}

export function hexLoop(id: string, extra = 0.014): Vec3[] {
  const h = GLOBE_BY_ID[id];
  if (!h) return [];
  const loop = h.rim.map((p) => liftRadial(p, extra));
  loop.push(loop[0]!);
  return loop;
}

export function meanDir(ids: string[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const id of ids) {
    const h = GLOBE_BY_ID[id];
    if (!h) continue;
    x += h.center[0];
    y += h.center[1];
    z += h.center[2];
  }
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** True when `p` sits on the camera-facing side, inset from the silhouette. */
export function isGlobeFront(cam: Vec3, p: Vec3, extra = 0.22): boolean {
  const pl = Math.hypot(p[0], p[1], p[2]) || 1;
  const cl = Math.hypot(cam[0], cam[1], cam[2]) || 1;
  const cos = (cam[0] * p[0] + cam[1] * p[1] + cam[2] * p[2]) / (cl * pl);
  const limb = Math.min(0.93, pl / cl);
  return cos > Math.min(0.88, limb + extra);
}

export function arcPoints(a: Vec3, b: Vec3, n = 18, lift = 1.02): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const p = slerp(a, b, i / n);
    pts.push(scale(p, GLOBE_R * lift));
  }
  return pts;
}

export function pickHex(p: Vec3, faceIndex?: number): string | null {
  if (faceIndex != null) {
    const hi = LAND_BUFFERS.faceHex[faceIndex];
    if (hi != null) {
      const h = GLOBE_HEXES[hi];
      if (!h) return null;
      return h.id;
    }
  }
  const n = norm(p);
  let best = -1;
  let bestDot = -1;
  for (let i = 0; i < GLOBE_HEXES.length; i++) {
    const h = GLOBE_HEXES[i]!;
    const d = dot(n, norm(h.center));
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  }
  if (best < 0 || bestDot < 0.9) return null;
  return GLOBE_HEXES[best]!.id;
}

export function hexColor(css: string, mix: number): Vec3 {
  const hex = css.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const k = 1 - mix;
  return [k + r * mix, k + g * mix, k + b * mix];
}

export function paintLandColors(colors: Float32Array, colorFor: (id: string, kind: "land" | "ocean") => Vec3) {
  const verts = LAND_BUFFERS.vertexHex;
  for (let i = 0; i < verts.length; i++) {
    const h = GLOBE_HEXES[verts[i]!]!;
    const c = colorFor(h.id, h.kind);
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
}

export function neighborLandPairs(): [GlobeHex, GlobeHex][] {
  const out: [GlobeHex, GlobeHex][] = [];
  for (const h of GLOBE_LANDS) {
    for (const nb of landNeighbors(h.id)) {
      if (nb <= h.id) continue;
      const b = GLOBE_BY_ID[nb];
      if (b) out.push([h, b]);
    }
  }
  return out;
}

export function adjacentCellPairs(): [GlobeHex, GlobeHex][] {
  const out: [GlobeHex, GlobeHex][] = [];
  for (let i = 0; i < GLOBE_HEXES.length; i++) {
    const a = GLOBE_HEXES[i]!;
    for (let j = i + 1; j < GLOBE_HEXES.length; j++) {
      const b = GLOBE_HEXES[j]!;
      if (rimGap(a, b) < 0.002) out.push([a, b]);
    }
  }
  return out;
}
