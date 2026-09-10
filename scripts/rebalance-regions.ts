/**
 * Reassign every playable hex to a geographic region, even the counts,
 * and pick a capital near each region's centre.
 *
 * Writes src/lib/game/regions.gen.ts
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CAPITOL, type ContinentId, type EmpireId } from "../src/lib/game/types.ts";
import { TERRITORIES, TERRITORY_BY_ID, CORE_NAMES } from "../src/lib/game/world.ts";
import { GLOBE_BY_ID, type Vec3 } from "../src/lib/game/globe.ts";

const REGIONS: ContinentId[] = [
  "at",
  "nw",
  "ne",
  "ca",
  "sa",
  "eu",
  "an",
  "af",
  "me",
  "aw",
  "ae",
  "ss",
  "oc",
];

const EMPIRE_REGION: Record<EmpireId, ContinentId> = {
  asgard: "at",
  eldorado: "sa",
  aztec: "ca",
  tartaria: "ae",
  siberia: "aw",
  lumuria: "ss",
  egypt: "an",
  sumer: "me",
  cape: "af",
  gondwana: "oc",
  thule: "ne",
  alaska: "nw",
  atlantis: "eu",
};

const TITLE_NAME: Partial<Record<EmpireId, string>> = {
  asgard: "Asgard",
  siberia: "Siberia",
  sumer: "Sumer",
  cape: "Karoo",
  gondwana: "Sahul",
  thule: "Nord",
  atlantis: "Atlantis",
  egypt: "Egypt",
  lumuria: "Shangri La",
  aztec: "Mayan",
  tartaria: "Kunlun",
};

const SEEDS: Record<ContinentId, { lon: number; lat: number }> = {
  at: { lon: 0, lat: -78 },
  nw: { lon: -130, lat: 56 },
  ne: { lon: -68, lat: 54 },
  ca: { lon: -92, lat: 18 },
  sa: { lon: -62, lat: -12 },
  eu: { lon: 14, lat: 54 },
  an: { lon: 8, lat: 18 },
  af: { lon: 24, lat: -14 },
  me: { lon: 44, lat: 28 },
  aw: { lon: 82, lat: 58 },
  ae: { lon: 126, lat: 42 },
  ss: { lon: 96, lat: 14 },
  oc: { lon: 142, lat: -20 },
};

const TARGET: Record<ContinentId, number> = {
  at: 26,
  nw: 26,
  ne: 26,
  ca: 26,
  sa: 26,
  eu: 26,
  an: 26,
  af: 26,
  me: 26,
  aw: 26,
  ae: 26,
  ss: 26,
  oc: 27,
};

function nrm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function ang(a: Vec3, b: Vec3): number {
  return (Math.acos(Math.min(1, Math.max(-1, dot(nrm(a), nrm(b))))) * 180) / Math.PI;
}
function vecFromLonLat(lon: number, lat: number): Vec3 {
  const lo = (lon * Math.PI) / 180;
  const la = (lat * Math.PI) / 180;
  const cl = Math.cos(la);
  return [cl * Math.sin(lo), Math.sin(la), cl * Math.cos(lo)];
}
function lonLatOf(v: Vec3): { lon: number; lat: number } {
  const n = nrm(v);
  return {
    lon: (Math.atan2(n[0], n[2]) * 180) / Math.PI,
    lat: (Math.asin(Math.min(1, Math.max(-1, n[1]))) * 180) / Math.PI,
  };
}

const LAND_IDS = TERRITORIES.map((t) => t.id);
const POS: Record<string, Vec3> = {};
for (const id of LAND_IDS) {
  const h = GLOBE_BY_ID[id];
  if (!h) throw new Error(`no globe hex ${id}`);
  POS[id] = nrm(h.center);
}

const SEED_VEC: Record<ContinentId, Vec3> = Object.fromEntries(
  REGIONS.map((r) => [r, vecFromLonLat(SEEDS[r].lon, SEEDS[r].lat)]),
) as Record<ContinentId, Vec3>;

function rankedRegions(p: Vec3, cents: Record<ContinentId, Vec3>): { r: ContinentId; a: number }[] {
  return REGIONS.map((r) => ({ r, a: ang(p, cents[r]!) })).sort((x, y) => x.a - y.a);
}

function nearestRegion(p: Vec3, cents: Record<ContinentId, Vec3>): ContinentId {
  return rankedRegions(p, cents)[0]!.r;
}

function centroidOf(ids: string[], seed: Vec3, seedWeight: number): Vec3 {
  let acc: Vec3 = scale(seed, seedWeight);
  for (const id of ids) acc = add(acc, POS[id]!);
  return nrm(acc);
}

function countsOf(assign: Record<string, ContinentId>): Record<ContinentId, number> {
  const c = Object.fromEntries(REGIONS.map((r) => [r, 0])) as Record<ContinentId, number>;
  for (const id of LAND_IDS) c[assign[id]!] += 1;
  return c;
}

function membersOf(assign: Record<string, ContinentId>, r: ContinentId): string[] {
  return LAND_IDS.filter((id) => assign[id] === r);
}

function voronoi(iters = 20): Record<string, ContinentId> {
  const cents = { ...SEED_VEC };
  const assign: Record<string, ContinentId> = {};
  for (let i = 0; i < iters; i++) {
    for (const id of LAND_IDS) assign[id] = nearestRegion(POS[id]!, cents);
    for (const r of REGIONS) {
      const mem = membersOf(assign, r);
      cents[r] = mem.length ? centroidOf(mem, SEED_VEC[r]!, 8) : SEED_VEC[r]!;
    }
  }
  return assign;
}

function refreshCents(assign: Record<string, ContinentId>): Record<ContinentId, Vec3> {
  const cents = { ...SEED_VEC };
  for (const r of REGIONS) {
    const mem = membersOf(assign, r);
    cents[r] = mem.length ? centroidOf(mem, SEED_VEC[r]!, 5) : SEED_VEC[r]!;
  }
  return cents;
}

function hardGate(id: string, dst: ContinentId): boolean {
  const { lat, lon } = lonLatOf(POS[id]!);
  if (dst === "at" && lat > -48) return false;
  if (dst === "af" && (lon < -20 || lat < -50)) return false;
  if (dst === "sa" && lon > 25 && lon < 140) return false;
  if (dst === "eu" && lat < 32) return false;
  if (dst === "oc" && lat > 8) return false;
  if (dst === "ae" && lat < 0) return false;
  return true;
}

const BORDERS: Record<ContinentId, ContinentId[]> = {
  at: ["sa", "af", "oc"],
  nw: ["ne", "ca", "aw"],
  ne: ["nw", "ca", "eu"],
  ca: ["nw", "ne", "sa"],
  sa: ["ca", "at"],
  eu: ["ne", "an", "me", "aw"],
  an: ["eu", "af", "me"],
  af: ["an", "me", "at"],
  me: ["eu", "an", "af", "ss", "aw"],
  aw: ["eu", "me", "ae", "nw"],
  ae: ["aw", "ss", "oc"],
  ss: ["me", "ae", "oc"],
  oc: ["ss", "ae", "at"],
};

function variance(counts: Record<ContinentId, number>): number {
  let s = 0;
  for (const r of REGIONS) {
    const d = counts[r] - TARGET[r];
    s += d * d;
  }
  return s;
}

function canHop(id: string, src: ContinentId, hop: ContinentId, cents: Record<ContinentId, Vec3>): boolean {
  if (!BORDERS[src]!.includes(hop)) return false;
  if (!hardGate(id, hop)) return false;
  const rank = rankedRegions(POS[id]!, cents);
  if (rank[0]!.r !== src) return false;
  if (rank[1]!.r !== hop) return false;
  if (rank[1]!.a - rank[0]!.a > 16) return false;
  return true;
}

function balance(assign: Record<string, ContinentId>) {
  for (let pass = 0; pass < 500; pass++) {
    const cents = refreshCents(assign);
    const counts = countsOf(assign);
    const current = variance(counts);
    if (current === 0) return;

    let best1: { id: string; dst: ContinentId; score: number } | null = null;
    let best2: { a: string; aDst: ContinentId; b: string; bDst: ContinentId; score: number } | null = null;

    for (const src of REGIONS) {
      if (counts[src] <= TARGET[src]) continue;
      for (const id of membersOf(assign, src)) {
        for (const hop of BORDERS[src]!) {
          if (!canHop(id, src, hop, cents)) continue;
          const next1 = { ...counts, [src]: counts[src] - 1, [hop]: counts[hop] + 1 };
          const v1 = variance(next1);
          if (v1 < current) {
            const score = v1 * 50 + ang(POS[id]!, cents[hop]!);
            if (!best1 || score < best1.score) best1 = { id, dst: hop, score };
          }
          if (counts[hop] >= TARGET[hop]) {
            for (const hid of membersOf(assign, hop)) {
              for (const dest of BORDERS[hop]!) {
                if (dest === src) continue;
                if (counts[dest] >= TARGET[dest]) continue;
                if (!canHop(hid, hop, dest, cents)) continue;
                const next2 = { ...counts, [src]: counts[src] - 1, [dest]: counts[dest] + 1 };
                const v2 = variance(next2);
                if (v2 >= current) continue;
                const score = v2 * 50 + ang(POS[id]!, cents[hop]!) + ang(POS[hid]!, cents[dest]!);
                if (!best2 || score < best2.score) best2 = { a: id, aDst: hop, b: hid, bDst: dest, score };
              }
            }
          }
        }
      }
    }

    if (best1 && (!best2 || best1.score <= best2.score)) {
      assign[best1.id] = best1.dst;
      continue;
    }
    if (best2) {
      assign[best2.a] = best2.aDst;
      assign[best2.b] = best2.bDst;
      continue;
    }
    console.warn("balanced-as-far-as-geography-allows", counts, "var", current);
    return;
  }
}

function snapStrays(assign: Record<string, ContinentId>) {
  const cents = refreshCents(assign);
  for (const id of LAND_IDS) {
    const rank = rankedRegions(POS[id]!, cents);
    const have = assign[id]!;
    const near = rank[0]!.r;
    if (near === have) continue;
    const gap = ang(POS[id]!, cents[have]!) - rank[0]!.a;
    if (gap >= 10) assign[id] = near;
  }
}

function pickCapitals(assign: Record<string, ContinentId>, cents: Record<ContinentId, Vec3>) {
  const capitol: Record<EmpireId, string> = { ...CAPITOL };
  const names: Record<string, string> = {};
  for (const t of TERRITORIES) names[t.id] = t.name;

  for (const [empire, region] of Object.entries(EMPIRE_REGION) as [EmpireId, ContinentId][]) {
    const mem = membersOf(assign, region);
    const named = mem.filter((id) => !id.startsWith("clan"));
    const pool = named.length ? named : mem;
    const cur = CAPITOL[empire];
    const curIn = assign[cur] === region;
    const curOff = curIn ? ang(POS[cur]!, cents[region]!) : 999;
    let pick = pool[0]!;
    let pickA = ang(POS[pick]!, cents[region]!);
    for (const id of pool) {
      const a = ang(POS[id]!, cents[region]!);
      if (a < pickA) {
        pick = id;
        pickA = a;
      }
    }
    if (curIn && curOff <= 11 && curOff <= pickA + 3) pick = cur;
    capitol[empire] = pick;

    const title = TITLE_NAME[empire];
    if (title) {
      const oldName = names[pick]!;
      names[pick] = title;
      for (const id of LAND_IDS) {
        if (id === pick || names[id] !== title) continue;
        names[id] = oldName === title
          ? CORE_NAMES[id] === title
            ? CORE_NAMES[pick]!
            : CORE_NAMES[id]!
          : oldName;
      }
    }
  }
  uniquifyNames(names, capitol);
  return { capitol, names };
}

function uniquifyNames(names: Record<string, string>, capitol: Record<EmpireId, string>) {
  const capSet = new Set(Object.values(capitol));
  const used = new Set<string>();
  for (const id of capSet) used.add(names[id]!);
  const extras = ["Bend", "Reach", "Bank", "Rise", "Vale", "Ford", "Moor", "Fell"];
  for (const id of LAND_IDS) {
    if (capSet.has(id)) continue;
    if (!used.has(names[id]!)) {
      used.add(names[id]!);
      continue;
    }
    let candidate = CORE_NAMES[id]!;
    if (used.has(candidate) || candidate === names[id]) {
      const base = (CORE_NAMES[id] ?? names[id]!).split(" ")[0]!;
      candidate =
        extras.map((b) => `${base} ${b}`).find((c) => c.length <= 12 && !used.has(c)) ?? `${base} Rim`;
    }
    names[id] = candidate;
    used.add(candidate);
  }
}

function report(assign: Record<string, ContinentId>, cents: Record<ContinentId, Vec3>, capitol: Record<EmpireId, string>) {
  const counts = countsOf(assign);
  console.log("counts", counts, "sum", LAND_IDS.length);
  console.log("\ncentroids:");
  for (const r of REGIONS) {
    const ll = lonLatOf(cents[r]!);
    const mem = membersOf(assign, r);
    let maxOff = 0;
    let far = "";
    for (const id of mem) {
      const a = ang(POS[id]!, cents[r]!);
      if (a > maxOff) {
        maxOff = a;
        far = id;
      }
    }
    console.log(`  ${r} ${ll.lon.toFixed(1)},${ll.lat.toFixed(1)} n=${counts[r]} farthest ${far} ${maxOff.toFixed(1)}°`);
  }
  console.log("\ncapitals:");
  for (const [e, r] of Object.entries(EMPIRE_REGION) as [EmpireId, ContinentId][]) {
    const id = capitol[e]!;
    const off = ang(POS[id]!, cents[r]!);
    const ll = lonLatOf(POS[id]!);
    const old = CAPITOL[e];
    console.log(
      `  ${e.padEnd(9)} ${id.padEnd(12)} ${(TERRITORY_BY_ID[id]?.name ?? "").padEnd(14)} ${off.toFixed(1).padStart(4)}° ${id === old ? "keep" : "was " + old} coastal=${TERRITORY_BY_ID[id]?.coastal} ${ll.lat.toFixed(1)}N`,
    );
  }
  const outliers: { id: string; have: ContinentId; near: ContinentId; gap: number }[] = [];
  for (const id of LAND_IDS) {
    const have = assign[id]!;
    const rank = rankedRegions(POS[id]!, cents);
    const near = rank[0]!.r;
    if (near === have) continue;
    const gap = ang(POS[id]!, cents[have]!) - rank[0]!.a;
    if (gap > 5) outliers.push({ id, have, near, gap });
  }
  outliers.sort((a, b) => b.gap - a.gap);
  console.log(`\noutliers gap>5: ${outliers.length}`);
  for (const o of outliers.slice(0, 20)) {
    console.log(`  ${o.id} ${o.have}>${o.near} ${o.gap.toFixed(1)}`);
  }
}

function writeGen(assign: Record<string, ContinentId>, capitol: Record<EmpireId, string>, names: Record<string, string>) {
  const regionLines = LAND_IDS.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(assign[id])},`).join("\n");
  const nameLines = LAND_IDS.filter((id) => names[id] !== CORE_NAMES[id])
    .map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(names[id])},`)
    .join("\n");
  const capLines = (Object.entries(capitol) as [EmpireId, string][])
    .map(([e, id]) => `  ${e}: ${JSON.stringify(id)},`)
    .join("\n");
  const counts = countsOf(assign);
  const countLines = REGIONS.map((r) => `  ${r}: ${counts[r]},`).join("\n");

  const body = `import type { ContinentId, EmpireId } from "./types";

/** Geographic region overlay. Generated by scripts/rebalance-regions.ts */
export const REGION_OF: Record<string, ContinentId> = {
${regionLines}
};

export const NAME_OF: Record<string, string> = {
${nameLines}
};

export const REGION_CAPITOL: Record<EmpireId, string> = {
${capLines}
};

export const REGION_COUNTS: Record<ContinentId, number> = {
${countLines}
};
`;
  writeFileSync(fileURLToPath(new URL("../src/lib/game/regions.gen.ts", import.meta.url)), body);
  console.log("wrote src/lib/game/regions.gen.ts");
}

console.log("voronoi-only", countsOf(voronoi()));
const assign = voronoi();
balance(assign);
snapStrays(assign);
balance(assign);
snapStrays(assign);
const cents = refreshCents(assign);
const { capitol, names } = pickCapitals(assign, cents);
report(assign, cents, capitol);
writeGen(assign, capitol, names);

const counts = countsOf(assign);
const vals = REGIONS.map((r) => counts[r]);
console.log("min/max", Math.min(...vals), Math.max(...vals));
const bad = REGIONS.filter((r) => counts[r] !== TARGET[r]);
if (bad.length) {
  console.warn("UNEVEN", Object.fromEntries(bad.map((r) => [r, counts[r]])));
  if (Math.max(...vals) - Math.min(...vals) > 8) process.exitCode = 1;
}
