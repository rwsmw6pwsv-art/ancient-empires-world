import { writeFileSync, readFileSync } from "node:fs";
import { GLOBE_HEXES } from "../src/lib/game/globe.ts";
import { TERRITORIES, WORLD_W, landNeighbors, seaNeighbors } from "../src/lib/game/world.ts";
import { landscapeOf } from "../src/lib/game/landscape.ts";

const candidates = JSON.parse(readFileSync("/tmp/tribal-candidates.json", "utf8"));

function rimGap(a, b) {
  let best = Infinity;
  for (const p of a.rim) {
    for (const q of b.rim) {
      const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (d < best) best = d;
    }
  }
  return best;
}

function hexPath(x, y) {
  const rx = 29.1;
  const ry = 16.8;
  const hp = 33.7;
  const pts = [
    [x + rx, y - ry],
    [x + rx, y + ry],
    [x, y + hp],
    [x - rx, y + ry],
    [x - rx, y - ry],
    [x, y - hp],
  ];
  return `M${pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join("L")}Z`;
}

function wrapDx(ax, bx) {
  let d = ax - bx;
  const half = WORLD_W / 2;
  if (d > half) d -= WORLD_W;
  if (d < -half) d += WORLD_W;
  return d;
}

function mapDist(ax, ay, bx, by) {
  return Math.hypot(wrapDx(ax, bx), ay - by);
}

const NAMES = {
  at: [
    "Blue Ice", "Hard Pack", "Ice Horn", "Cold Shelf", "White Rise", "Pale Berg",
    "Frost Horn", "Ice Tongue", "Snow Drift", "Hard Firn", "Cold Dome",
  ],
  nw: [
    "Pine Heath", "Far Timber", "Low Muskeg", "West Copse", "Cold Copse",
    "Stone Pine", "High Copse", "Grey Fen", "Wild Spruce", "Inner Timber",
  ],
  ne: [
    "Oak Vale", "Still Fen", "Red Maple", "Lake Copse", "East Heath",
    "Birch Shore", "Low Marsh", "Cape Vale", "Soft Woods", "River Copse",
  ],
  ca: [
    "Jade Pass", "Wet Canopy", "Palm Coast", "Hot Spring", "Green Pass",
    "Rain Vale", "Cove Jungle", "Low Isthmus", "Fire Copse", "Warm Pass",
  ],
  sa: [
    "Green Vale", "River Copse", "Dry Pampa", "High Copse", "Wet Pampa",
    "Salt Copse", "Far Andes", "Open Vale", "Red Pampa", "Low Canopy",
  ],
  eu: [
    "Low Heath", "Grey Wold", "Old Glen", "West Vale", "Green Holm",
    "Stone Vale", "Far Downs", "Inner Fell", "Moss Bank", "Quiet Heath",
  ],
  an: [
    "Red Erg", "Dry Hamada", "Far Wadi", "Sand Copse", "West Oasis",
    "Pale Erg", "Low Hamada", "Hidden Wadi", "Gold Erg", "Still Oasis",
  ],
  af: [
    "Thorn Copse", "Low Veld", "Red Kopje", "Dry Veld", "Bush Copse",
    "Far Escarp", "Green Veld", "Salt Copse", "High Thorn", "Open Veld",
  ],
  me: [
    "Red Oasis", "Dry Table", "Pale Dune", "Low Plateau", "Cedar Vale",
    "Warm Dune", "Stone Oasis", "Far Table", "Inner Dune", "Gold Table",
  ],
  aw: [
    "Far Taiga", "Low Steppe", "Ice Copse", "West Taiga", "Grey Steppe",
    "Cold Taiga", "Inner Steppe", "Larch Vale", "Frost Copse", "Open Taiga",
  ],
  ae: [
    "Mist Vale", "Red Steppe", "Pine Copse", "East Taiga", "Dry Steppe",
    "Stone Copse", "Cold Coast", "Inner Taiga", "Fire Vale", "Long Steppe",
  ],
  ss: [
    "Wet Ghat", "Palm Vale", "Rain Copse", "Low Ghat", "Green Terrace",
    "Far Delta", "Stone Terrace", "Cloud Ghat", "River Copse", "Isle Vale",
  ],
  oc: [
    "Reef Copse", "Sand Cay", "Warm Atoll", "Coral Copse", "Low Atoll",
    "Green Cay", "Far Reef", "Palm Cay", "Tide Copse", "Open Atoll",
  ],
};

const GENERIC = [
  "Wild Heath", "Lost Vale", "Old Copse", "Far Ridge", "Low Crag", "Deep Fen",
  "Still Vale", "Grand Heath", "Little Holm", "Hidden Ford", "Pale Ridge",
  "Dark Copse", "Bright Vale", "Quiet Ford", "Upper Heath", "Lower Vale",
  "Mid Copse", "Near Ridge", "Outer Fen", "Inner Vale", "Great Copse",
  "Soft Heath", "Hard Vale", "Long Copse", "Short Ridge", "Wide Fen",
  "Narrow Vale", "Clan Heath", "Free Copse", "Open Ridge", "High Ford",
  "North Copse", "South Vale", "East Copse", "West Ford", "Hill Copse",
  "Dale Heath", "Moor Vale", "Bog Copse", "Fen Ridge", "Tor Vale",
];

const usedNames = new Set(TERRITORIES.map((t) => t.name));
const usedIds = new Set(TERRITORIES.map((t) => t.id));
const namedById = new Map();
for (const h of GLOBE_HEXES) {
  if (h.kind === "land") namedById.set(h.id, h);
}

function nearestNamed(c) {
  let best = null;
  let bestDot = -Infinity;
  for (const t of TERRITORIES) {
    const h = namedById.get(t.id);
    if (!h) continue;
    const d = c[0] * h.center[0] + c[1] * h.center[1] + c[2] * h.center[2];
    if (d > bestDot) {
      bestDot = d;
      best = t;
    }
  }
  return best;
}

function takeName(continent) {
  const banks = [...(NAMES[continent] ?? []), ...GENERIC];
  for (const n of banks) {
    if (!usedNames.has(n) && n.length <= 12 && /^[A-Za-z][A-Za-z ]+$/.test(n)) {
      usedNames.add(n);
      return n;
    }
  }
  let i = 1;
  while (usedNames.has(`Clan ${i}`)) i += 1;
  const n = `Clan ${i}`;
  usedNames.add(n);
  return n;
}

const serial = {};
const tribes = [];
const candByHex = new Map();

for (const cand of candidates) {
  const near = nearestNamed(cand.c);
  const continent = near?.continent ?? "eu";
  serial[continent] = (serial[continent] ?? 0) + 1;
  let id = `clan${continent}${String(serial[continent]).padStart(2, "0")}`;
  while (usedIds.has(id)) {
    serial[continent] += 1;
    id = `clan${continent}${String(serial[continent]).padStart(2, "0")}`;
  }
  usedIds.add(id);
  const ls = near ? landscapeOf(near.id) : { terrain: "grass" };
  const landscape = {
    terrain: ls.terrain ?? "grass",
    ...(ls.resource ? { resource: ls.resource } : {}),
    ...(ls.fauna ? { fauna: ls.fauna } : {}),
  };
  const rec = {
    hex: cand.i,
    id,
    name: takeName(continent),
    continent,
    coastal: false,
    path: hexPath(cand.cx, cand.cy),
    labelX: Math.round(cand.cx * 10) / 10,
    labelY: Math.round(cand.cy * 10) / 10,
    landscape,
    c: cand.c,
    cx: cand.cx,
    cy: cand.cy,
    nbs: [],
  };
  tribes.push(rec);
  candByHex.set(cand.i, rec);
}

const ADJ = 0.002;
const landEdges = [];
const seaEdges = [];
const edgeSet = new Set();
function addEdge(list, a, b) {
  if (a === b) return;
  const [x, y] = a < b ? [a, b] : [b, a];
  const k = `${x}|${y}`;
  if (edgeSet.has(k)) return;
  edgeSet.add(k);
  list.push([x, y]);
}

for (const t of tribes) {
  const ha = GLOBE_HEXES[t.hex];
  let coastal = false;
  const nbs = [];
  for (let j = 0; j < GLOBE_HEXES.length; j++) {
    if (j === t.hex) continue;
    const hb = GLOBE_HEXES[j];
    if (rimGap(ha, hb) >= ADJ) continue;
    const otherTribe = candByHex.get(j);
    if (hb.kind === "land" || otherTribe) {
      const oid = otherTribe ? otherTribe.id : hb.id;
      nbs.push(oid);
      addEdge(landEdges, t.id, oid);
    } else {
      coastal = true;
    }
  }
  t.coastal = coastal;
  t.nbs = nbs;
}

for (const t of tribes) {
  if (t.nbs.length > 0) continue;
  let best = null;
  let bestD = Infinity;
  for (const land of TERRITORIES) {
    const d = mapDist(t.cx, t.cy, land.labelX, land.labelY);
    if (d < bestD) {
      bestD = d;
      best = land.id;
    }
  }
  for (const u of tribes) {
    if (u.id === t.id) continue;
    const d = mapDist(t.cx, t.cy, u.cx, u.cy);
    if (d < bestD) {
      bestD = d;
      best = u.id;
    }
  }
  if (best) {
    t.coastal = true;
    addEdge(seaEdges, t.id, best);
  }
}

const parent = new Map();
function find(x) {
  if (!parent.has(x)) parent.set(x, x);
  const p = parent.get(x);
  if (p !== x) parent.set(x, find(p));
  return parent.get(x);
}
function union(a, b) {
  const pa = find(a);
  const pb = find(b);
  if (pa !== pb) parent.set(pa, pb);
}

const allIds = [...TERRITORIES.map((t) => t.id), ...tribes.map((t) => t.id)];
for (const id of allIds) parent.set(id, id);

for (const t of TERRITORIES) {
  for (const n of landNeighbors(t.id)) union(t.id, n);
  for (const n of seaNeighbors(t.id)) union(t.id, n);
}
for (const [a, b] of landEdges) union(a, b);
for (const [a, b] of seaEdges) union(a, b);

const roots = new Map();
for (const id of allIds) {
  const r = find(id);
  roots.set(r, (roots.get(r) ?? 0) + 1);
}
const mainRoot = [...roots.entries()].sort((a, b) => b[1] - a[1])[0][0];

for (const t of tribes) {
  if (find(t.id) === mainRoot) continue;
  let best = null;
  let bestD = Infinity;
  for (const land of TERRITORIES) {
    if (find(land.id) !== mainRoot) continue;
    const d = mapDist(t.cx, t.cy, land.labelX, land.labelY);
    if (d < bestD) {
      bestD = d;
      best = land.id;
    }
  }
  if (best) {
    t.coastal = true;
    addEdge(seaEdges, t.id, best);
    union(t.id, best);
  }
}

const byCont = {};
for (const t of [...TERRITORIES, ...tribes]) {
  byCont[t.continent] = (byCont[t.continent] ?? 0) + 1;
}

function ser(v) {
  return JSON.stringify(v);
}

const landsSrc = tribes
  .map(
    (t) => `  {
    id: ${ser(t.id)},
    name: ${ser(t.name)},
    continent: ${ser(t.continent)},
    coastal: ${t.coastal},
    path: ${ser(t.path)},
    labelX: ${t.labelX},
    labelY: ${t.labelY},
  }`,
  )
  .join(",\n");

const lsSrc = tribes.map((t) => `  ${t.id}: ${ser(t.landscape)}`).join(",\n");

const out = `import type { ContinentId, TerritoryDef } from "./types";

/** Goldberg cells that sit on painted land but had no named seat. */
export const TRIBAL_LANDS: TerritoryDef[] = [
${landsSrc},
];

export const TRIBAL_LAND_EDGES: [string, string][] = ${ser(landEdges)};

export const TRIBAL_SEA_EDGES: [string, string][] = ${ser(seaEdges)};

export const TRIBAL_LANDSCAPE: Record<string, { terrain: string; resource?: string; fauna?: string }> = {
${lsSrc},
};

export const TRIBAL_IDS: readonly string[] = TRIBAL_LANDS.map((t) => t.id);

export const TRIBAL_REGION_COUNTS: Record<ContinentId, number> = ${ser(byCont)} as Record<ContinentId, number>;
`;

writeFileSync(new URL("../src/lib/game/tribes.gen.ts", import.meta.url), out);
console.log("tribes", tribes.length);
console.log("land edges", landEdges.length, "sea edges", seaEdges.length);
console.log("region totals", byCont);
console.log(
  "sample",
  tribes.slice(0, 10).map((t) => `${t.id}/${t.name}/${t.continent}/nb${t.nbs.length}/c${t.coastal}`),
);
console.log("isolated", tribes.filter((t) => find(t.id) !== mainRoot).length);
console.log("no land nbs", tribes.filter((t) => t.nbs.length === 0).length);
