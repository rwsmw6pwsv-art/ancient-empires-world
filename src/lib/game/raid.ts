import { empireOf } from "./empires";
import { beastOf, landscapeOf, type TerrainId } from "./landscape";
import type { GameState, HostForce, SiegeKind, SiegeStock, TerritoryState, UnitKind } from "./types";
import { EMPTY_HOST, SCORPION_CAP, SIEGE_LABEL, TOWER_CARGO, UNIT_LABEL_PLURAL } from "./types";
import { TERRITORY_BY_ID } from "./world";
import { isBarbarian, worksRank as castleRankOf } from "./engine";

export const RAID_W = 720;
export const RAID_H = 480;
export const RAID_TIME = 75;
export const RAID_CELL = 20;
export const RAID_COLS = RAID_W / RAID_CELL;
export const RAID_ROWS = RAID_H / RAID_CELL;
export const RAID_CX = RAID_W / 2;
export const RAID_CY = RAID_H / 2;
const DEPLOY_R = 170;
const STEP = 1 / 60;

export type RaidPhase = "deploy" | "fight" | "over";
export type RaidKind = UnitKind | SiegeKind;
export type BattleSide = "atk" | "def";

export type RaidTargetPref = "keep" | "def" | "wall" | "air" | "any";

export interface RaidUnit {
  id: string;
  side: BattleSide;
  kind: RaidKind;
  name: string;
  x: number;
  y: number;
  hp: number;
  max: number;
  speed: number;
  range: number;
  dmg: number;
  air: boolean;
  pref: RaidTargetPref;
  cd: number;
  target: string | null;
  path: { x: number; y: number }[];
  planted: boolean;
  dumped: boolean;
  flash: number;
  radius: number;
  onWall: boolean;
  cargo: HostForce | null;
  roam: number;
}

export interface RaidBuilding {
  id: string;
  kind: "keep" | "cannon" | "archer" | "air" | "store" | "scorpion";
  x: number;
  y: number;
  r: number;
  hp: number;
  max: number;
  range: number;
  dmg: number;
  cd: number;
  cdLeft: number;
  hitsAir: boolean;
  hitsGround: boolean;
  flash: number;
}

export interface RaidWall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  max: number;
  climb: boolean;
  gate: boolean;
}

export interface RaidShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  splash: number;
  ttl: number;
  air: boolean;
  ground: boolean;
  side: BattleSide;
  vsDragon: boolean;
}

export interface RaidSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export interface RaidState {
  fromId: string;
  toId: string;
  force: HostForce;
  siege: SiegeStock;
  humanSide: BattleSide;
  stock: HostForce & SiegeStock;
  deployed: HostForce & SiegeStock;
  units: RaidUnit[];
  buildings: RaidBuilding[];
  walls: RaidWall[];
  shots: RaidShot[];
  sparks: RaidSpark[];
  garrison: HostForce;
  keepDestroyed: boolean;
  destruction: number;
  stars: number;
  timeLeft: number;
  phase: RaidPhase;
  selected: RaidKind | null;
  timeScale: number;
  nextId: number;
  seed: number;
  rng: number;
  log: string[];
  trauma: number;
  walk: Uint8Array;
  walkDirty: boolean;
  terrain: TerrainId;
  camp: boolean;
  fort: number;
  atkName: string;
  defName: string;
  fromName: string;
  toName: string;
  beastName: string;
}

export interface RaidOutcome {
  winner: BattleSide;
  atkLeft: HostForce;
  defLeft: HostForce;
  stars: number;
  destruction: number;
  used: SiegeStock;
}

type Stats = {
  hp: number;
  dmg: number;
  speed: number;
  range: number;
  air: boolean;
  pref: RaidTargetPref;
  radius: number;
  cd: number;
};

const STATS: Record<RaidKind, Stats> = {
  levy: { hp: 22, dmg: 6, speed: 56, range: 22, air: false, pref: "def", radius: 9, cd: 0.55 },
  bowman: { hp: 12, dmg: 7, speed: 46, range: 164, air: false, pref: "def", radius: 8, cd: 0.4 },
  knight: { hp: 34, dmg: 9, speed: 86, range: 24, air: false, pref: "def", radius: 10, cd: 0.48 },
  beast: { hp: 58, dmg: 18, speed: 64, range: 26, air: false, pref: "wall", radius: 13, cd: 0.65 },
  dragon: { hp: 96, dmg: 30, speed: 94, range: 108, air: true, pref: "wall", radius: 15, cd: 0.7 },
  ram: { hp: 140, dmg: 90, speed: 32, range: 18, air: false, pref: "wall", radius: 14, cd: 0.9 },
  catapult: { hp: 42, dmg: 24, speed: 28, range: 214, air: false, pref: "def", radius: 12, cd: 1.55 },
  ladder: { hp: 28, dmg: 0, speed: 52, range: 16, air: false, pref: "wall", radius: 9, cd: 0.4 },
  tower: { hp: 110, dmg: 10, speed: 30, range: 18, air: false, pref: "wall", radius: 16, cd: 0.75 },
};

const KNIGHT_VS_LEVY = 2.8;
const BOWMAN_HIT = 1.45;
const WALL_BOW_RANGE = 42;
const WALL_BOW_DMG = 5;

const EMPTY: HostForce = { ...EMPTY_HOST };
const EMPTY_SIEGE: SiegeStock = { rams: 0, catapults: 0, ladders: 0, towers: 0 };

function worksRankSafe(t: TerritoryState) {
  try {
    return castleRankOf(t, "castle");
  } catch {
    return t.castle ? Math.max(1, t.castleRank ?? 1) : 0;
  }
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function nextRng(raid: RaidState) {
  raid.rng = (Math.imul(raid.rng ^ (raid.rng >>> 16), 0x7feb352d) >>> 0) || 1;
  return (raid.rng >>> 0) / 4294967296;
}

function uid(raid: RaidState, p: string) {
  raid.nextId += 1;
  return `${p}${raid.nextId}`;
}

function stockKind(stock: HostForce & SiegeStock, kind: RaidKind): number {
  if (kind === "levy") return stock.levy;
  if (kind === "bowman") return stock.bowmen ?? 0;
  if (kind === "knight") return stock.knights;
  if (kind === "dragon") return stock.dragons;
  if (kind === "beast") return stock.beasts;
  if (kind === "ram") return stock.rams;
  if (kind === "catapult") return stock.catapults;
  if (kind === "ladder") return stock.ladders;
  return stock.towers;
}

function takeStock(stock: HostForce & SiegeStock, kind: RaidKind, n = 1) {
  if (kind === "levy") stock.levy = Math.max(0, stock.levy - n);
  else if (kind === "bowman") stock.bowmen = Math.max(0, (stock.bowmen ?? 0) - n);
  else if (kind === "knight") stock.knights = Math.max(0, stock.knights - n);
  else if (kind === "dragon") stock.dragons = Math.max(0, stock.dragons - n);
  else if (kind === "beast") stock.beasts = Math.max(0, stock.beasts - n);
  else if (kind === "ram") stock.rams = Math.max(0, stock.rams - n);
  else if (kind === "catapult") stock.catapults = Math.max(0, stock.catapults - n);
  else if (kind === "ladder") stock.ladders = Math.max(0, stock.ladders - n);
  else stock.towers = Math.max(0, stock.towers - n);
}

function addStock(stock: HostForce & SiegeStock, kind: RaidKind, n = 1) {
  takeStock(stock, kind, -n);
}

export function raidKindsLeft(raid: RaidState): RaidKind[] {
  const order: RaidKind[] = ["ram", "tower", "ladder", "catapult", "beast", "knight", "levy", "bowman", "dragon"];
  return order.filter((k) => stockKind(raid.stock, k) > 0);
}

export function cloneRaid(raid: RaidState): RaidState {
  return {
    ...raid,
    force: { ...raid.force },
    siege: { ...raid.siege },
    stock: { ...raid.stock },
    deployed: { ...raid.deployed },
    garrison: { ...raid.garrison },
    units: raid.units.map((u) => ({ ...u, path: u.path.map((p) => ({ ...p })) })),
    buildings: raid.buildings.map((b) => ({ ...b })),
    walls: raid.walls.map((w) => ({ ...w })),
    shots: raid.shots.map((s) => ({ ...s })),
    sparks: raid.sparks.map((s) => ({ ...s })),
    log: [...raid.log],
    walk: raid.walk.slice(),
  };
}

function keepOf(raid: RaidState) {
  return raid.buildings.find((b) => b.kind === "keep") ?? null;
}

function wallBox(raid: RaidState) {
  const live = raid.walls.filter((w) => w.hp > 0);
  if (!live.length) return null;
  let x0 = RAID_W;
  let y0 = RAID_H;
  let x1 = 0;
  let y1 = 0;
  for (const w of live) {
    x0 = Math.min(x0, w.x);
    y0 = Math.min(y0, w.y);
    x1 = Math.max(x1, w.x + w.w);
    y1 = Math.max(y1, w.y + w.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }, pad = 0) {
  return x >= r.x - pad && y >= r.y - pad && x <= r.x + r.w + pad && y <= r.y + r.h + pad;
}

function markCells(walk: Uint8Array, x: number, y: number, w: number, h: number) {
  const c0 = clamp(Math.floor(x / RAID_CELL), 0, RAID_COLS - 1);
  const r0 = clamp(Math.floor(y / RAID_CELL), 0, RAID_ROWS - 1);
  const c1 = clamp(Math.floor((x + w - 0.1) / RAID_CELL), 0, RAID_COLS - 1);
  const r1 = clamp(Math.floor((y + h - 0.1) / RAID_CELL), 0, RAID_ROWS - 1);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) walk[r * RAID_COLS + c] = 0;
  }
}

function rebuildWalk(raid: RaidState) {
  const walk = raid.walk;
  walk.fill(1);
  for (const w of raid.walls) {
    if (w.hp <= 0 || w.climb) continue;
    markCells(walk, w.x, w.y, w.w, w.h);
  }
  for (const b of raid.buildings) {
    if (b.hp <= 0) continue;
    const s = b.kind === "keep" ? b.r * 1.2 : b.r * 0.7;
    markCells(walk, b.x - s, b.y - s, s * 2, s * 2);
  }
  raid.walkDirty = false;
}

function walkableFor(raid: RaidState, x: number, y: number, u: RaidUnit) {
  if (u.air) return true;
  const c = Math.floor(x / RAID_CELL);
  const r = Math.floor(y / RAID_CELL);
  if (c < 0 || r < 0 || c >= RAID_COLS || r >= RAID_ROWS) return false;
  if (raid.walk[r * RAID_COLS + c] === 1) return true;
  if (u.kind !== "beast") return false;
  for (const w of raid.walls) {
    if (w.hp <= 0) continue;
    if (x >= w.x - 4 && y >= w.y - 4 && x <= w.x + w.w + 4 && y <= w.y + w.h + 4) {
      return w.hp / w.max <= 0.45 || w.climb;
    }
  }
  return false;
}

function astar(raid: RaidState, sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
  const sc = clamp(Math.floor(sx / RAID_CELL), 0, RAID_COLS - 1);
  const sr = clamp(Math.floor(sy / RAID_CELL), 0, RAID_ROWS - 1);
  const tc = clamp(Math.floor(tx / RAID_CELL), 0, RAID_COLS - 1);
  const tr = clamp(Math.floor(ty / RAID_CELL), 0, RAID_ROWS - 1);
  if (sc === tc && sr === tr) return [{ x: tx, y: ty }];
  const walk = raid.walk;
  const key = (c: number, r: number) => r * RAID_COLS + c;
  const open: number[] = [key(sc, sr)];
  const came = new Int32Array(RAID_COLS * RAID_ROWS).fill(-1);
  const g = new Float32Array(RAID_COLS * RAID_ROWS).fill(1e9);
  const start = key(sc, sr);
  g[start] = 0;
  const heur = (c: number, r: number) => Math.hypot(c - tc, r - tr);
  let found = -1;
  let guard = 900;
  while (open.length && guard-- > 0) {
    let bestI = 0;
    let best = 1e12;
    for (let i = 0; i < open.length; i++) {
      const k = open[i]!;
      const c = k % RAID_COLS;
      const r = (k / RAID_COLS) | 0;
      const f = g[k]! + heur(c, r);
      if (f < best) {
        best = f;
        bestI = i;
      }
    }
    const cur = open.splice(bestI, 1)[0]!;
    const cc = cur % RAID_COLS;
    const cr = (cur / RAID_COLS) | 0;
    if (cc === tc && cr === tr) {
      found = cur;
      break;
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= RAID_COLS || nr >= RAID_ROWS) continue;
        const nk = key(nc, nr);
        if (walk[nk] === 0 && !(nc === tc && nr === tr)) continue;
        if (dc && dr && (walk[key(cc + dc, cr)] === 0 || walk[key(cc, cr + dr)] === 0)) continue;
        const step = dc && dr ? 1.41 : 1;
        const ng = g[cur]! + step;
        if (ng < g[nk]!) {
          g[nk] = ng;
          came[nk] = cur;
          if (!open.includes(nk)) open.push(nk);
        }
      }
    }
  }
  if (found < 0) return [];
  const pts: { x: number; y: number }[] = [];
  let k = found;
  while (k !== start && k >= 0) {
    const c = k % RAID_COLS;
    const r = (k / RAID_COLS) | 0;
    pts.push({ x: (c + 0.5) * RAID_CELL, y: (r + 0.5) * RAID_CELL });
    k = came[k]!;
  }
  pts.reverse();
  if (pts.length) pts[pts.length - 1] = { x: tx, y: ty };
  return pts;
}

function addWalls(raid: RaidState, x: number, y: number, w: number, h: number, hp: number, thick: number) {
  const nH = Math.max(3, Math.round(w / 40));
  const nV = Math.max(2, Math.round(h / 40));
  const sw = w / nH;
  const sh = h / nV;
  const push = (wx: number, wy: number, ww: number, wh: number, gate = false) => {
    raid.walls.push({
      id: uid(raid, "w"),
      x: wx,
      y: wy,
      w: ww,
      h: wh,
      hp: gate ? hp + 18 : hp,
      max: gate ? hp + 18 : hp,
      climb: false,
      gate,
    });
  };
  const gateI = Math.floor(nH / 2);
  for (let i = 0; i < nH; i++) {
    push(x + i * sw, y, sw, thick, false);
    push(x + i * sw, y + h - thick, sw, thick, i === gateI);
  }
  for (let i = 0; i < nV; i++) {
    push(x, y + i * sh, thick, sh);
    push(x + w - thick, y + i * sh, thick, sh);
  }
}

function addBuilding(
  raid: RaidState,
  kind: RaidBuilding["kind"],
  x: number,
  y: number,
  spec: Partial<RaidBuilding> & { r: number; hp: number },
) {
  raid.buildings.push({
    id: uid(raid, "b"),
    kind,
    x,
    y,
    r: spec.r,
    hp: spec.hp,
    max: spec.hp,
    range: spec.range ?? 0,
    dmg: spec.dmg ?? 0,
    cd: spec.cd ?? 1,
    cdLeft: 0.2 + nextRng(raid) * 0.4,
    hitsAir: spec.hitsAir ?? false,
    hitsGround: spec.hitsGround ?? true,
    flash: 0,
  });
}

function spark(raid: RaidState, x: number, y: number, n: number) {
  for (let i = 0; i < n && raid.sparks.length < 90; i++) {
    const a = nextRng(raid) * Math.PI * 2;
    const s = 18 + nextRng(raid) * 40;
    raid.sparks.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.28 + nextRng(raid) * 0.25,
      max: 0.5,
    });
  }
}

function makeUnit(raid: RaidState, side: BattleSide, kind: RaidKind, x: number, y: number, name?: string): RaidUnit {
  const s = STATS[kind];
  const label =
    name ??
    (kind === "beast"
      ? raid.beastName
      : kind === "ram" || kind === "catapult" || kind === "ladder" || kind === "tower"
        ? SIEGE_LABEL[kind]
        : UNIT_LABEL_PLURAL[kind]);
  const onWall = side === "def" && kind === "bowman";
  return {
    id: uid(raid, "u"),
    side,
    kind,
    name: label,
    x,
    y,
    hp: onWall ? Math.max(6, Math.round(s.hp * 0.7)) : s.hp,
    max: onWall ? Math.max(6, Math.round(s.hp * 0.7)) : s.hp,
    speed: onWall ? 0 : s.speed,
    range: onWall ? s.range + WALL_BOW_RANGE : s.range,
    dmg: onWall ? s.dmg + WALL_BOW_DMG : s.dmg,
    air: s.air,
    pref: s.pref,
    cd: 0,
    target: null,
    path: [],
    planted: false,
    dumped: false,
    flash: 0,
    radius: s.radius,
    onWall,
    cargo: null,
    roam: 0,
  };
}

export function openRaid(
  state: GameState,
  fromId: string,
  toId: string,
  force: HostForce,
  siege: SiegeStock,
  humanSide: BattleSide,
): RaidState | null {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  if (!from || !to) return null;
  if (from.owner === to.owner) return null;
  const send: HostForce = {
    levy: Math.max(0, force.levy | 0),
    bowmen: Math.max(0, (force.bowmen ?? 0) | 0),
    knights: Math.max(0, force.knights | 0),
    dragons: Math.max(0, force.dragons | 0),
    beasts: Math.max(0, force.beasts | 0),
  };
  const gear: SiegeStock = {
    rams: Math.min(1, Math.max(0, siege.rams | 0)),
    catapults: Math.min(1, Math.max(0, siege.catapults | 0)),
    ladders: Math.min(1, Math.max(0, siege.ladders | 0)),
    towers: Math.min(1, Math.max(0, siege.towers | 0)),
  };
  if (send.levy + (send.bowmen ?? 0) + send.knights + send.dragons + send.beasts < 1) return null;
  const fromName = TERRITORY_BY_ID[fromId]!.name;
  const toName = TERRITORY_BY_ID[toId]!.name;
  const atkName = from.owner === "barbarian" ? "Tribes" : empireOf(state.players[from.owner]!.empire).name;
  const defName = to.owner === "barbarian" ? "Independent tribes" : empireOf(state.players[to.owner]!.empire).name;
  const atkBeast = from.owner === "barbarian" ? null : beastOf(state.players[from.owner]!.empire);
  const seed = (state.seed + state.clock.turn * 997 + toId.length * 13) >>> 0;
  const raid: RaidState = {
    fromId,
    toId,
    force: send,
    siege: gear,
    humanSide,
    stock: { ...send, ...gear },
    deployed: { ...EMPTY, ...EMPTY_SIEGE },
    units: [],
    buildings: [],
    walls: [],
    shots: [],
    sparks: [],
    garrison: {
      levy: to.levy,
      bowmen: to.bowmen ?? 0,
      knights: to.knights,
      dragons: to.dragons,
      beasts: to.beasts ?? 0,
    },
    keepDestroyed: false,
    destruction: 0,
    stars: 0,
    timeLeft: RAID_TIME,
    phase: "deploy",
    selected: null,
    timeScale: 1,
    nextId: 1,
    seed,
    rng: seed || 1,
    log: [`${atkName} fall on ${toName} from ${fromName}. ${defName} hold the ground.`],
    trauma: 0,
    walk: new Uint8Array(RAID_COLS * RAID_ROWS),
    walkDirty: true,
    terrain: landscapeOf(toId).terrain,
    camp: isBarbarian(to.owner),
    fort: worksRankSafe(to),
    atkName,
    defName,
    fromName,
    toName,
    beastName: atkBeast?.name ?? "Beasts",
  };
  layoutVillage(raid, to);
  rebuildWalk(raid);
  spawnGarrison(raid, to, state);
  raid.selected = raidKindsLeft(raid)[0] ?? null;
  const rank = worksRankSafe(to);
  if (rank > 0) raid.log.push(`${rank >= 3 ? "A keep" : rank >= 2 ? "Stone walls" : "Wooden walls"} stand over the village.`);
  if ((to.breach ?? 0) > 0) raid.log.push(`Catapults have already chewed the walls (${to.breach} hits).`);
  if ((to.scorpions ?? 0) > 0) raid.log.push("Scorpions watch the sky.");
  if (gear.rams + gear.catapults + gear.ladders + gear.towers > 0) {
    const names = (["ram", "catapult", "ladder", "tower"] as SiegeKind[])
      .filter((k) => stockKind(gear as HostForce & SiegeStock, k) > 0)
      .map((k) => SIEGE_LABEL[k].toLowerCase());
    raid.log.push(`Siege in the column: ${names.join(", ")}.`);
  }
  return raid;
}

function layoutVillage(raid: RaidState, to: TerritoryState) {
  const rank = worksRankSafe(to);
  const keepHp = raid.camp ? 80 : 130 + rank * 45;
  addBuilding(raid, "keep", RAID_CX, RAID_CY, {
    r: raid.camp ? 22 : 28,
    hp: keepHp,
    range: 90,
    dmg: raid.camp ? 3 : 5,
    cd: 1.15,
    hitsAir: true,
    hitsGround: true,
  });
  const innerW = 220 + rank * 12;
  const innerH = 156 + rank * 8;
  const ix = RAID_CX - innerW / 2;
  const iy = RAID_CY - innerH / 2;
  if (rank > 0) {
    addWalls(raid, ix, iy, innerW, innerH, 38 + rank * 18, 10);
  }
  if (rank >= 2) {
    addWalls(raid, ix - 46, iy - 36, innerW + 92, innerH + 72, 24 + rank * 10, 8);
  }
  const breach = to.breach ?? 0;
  if (breach > 0) {
    for (const w of raid.walls) {
      const chip = Math.round(w.max * Math.min(0.7, 0.18 * breach));
      w.hp = Math.max(1, w.hp - chip);
    }
  }

  const cannons = Math.min(3, rank);
  const scorpions = Math.min(SCORPION_CAP, to.scorpions ?? 0);
  const ring = rank > 0 ? 62 : 78;
  const spots = [
    { x: RAID_CX + ring, y: RAID_CY - 8 },
    { x: RAID_CX - ring, y: RAID_CY + 10 },
    { x: RAID_CX + 8, y: RAID_CY + ring * 0.72 },
    { x: RAID_CX - 18, y: RAID_CY - ring * 0.7 },
    { x: RAID_CX + ring * 0.7, y: RAID_CY + ring * 0.55 },
    { x: RAID_CX - ring * 0.75, y: RAID_CY - ring * 0.5 },
  ];
  let si = 0;
  for (let i = 0; i < cannons; i++) {
    const p = spots[si++ % spots.length]!;
    addBuilding(raid, "cannon", p.x, p.y, { r: 16, hp: 72, range: 128, dmg: 7, cd: 0.85, hitsGround: true, hitsAir: false });
  }
  for (let i = 0; i < scorpions; i++) {
    const p = spots[si++ % spots.length]!;
    addBuilding(raid, "scorpion", p.x, p.y, {
      r: 15,
      hp: 70,
      range: 210,
      dmg: 28,
      cd: 1.05,
      hitsGround: false,
      hitsAir: true,
    });
  }
  const stores: { on: boolean; dx: number; dy: number }[] = [
    { on: to.farm, dx: -86, dy: 78 },
    { on: to.market, dx: 92, dy: 70 },
    { on: to.mine, dx: -96, dy: -74 },
    { on: to.port, dx: 100, dy: -68 },
  ];
  for (const s of stores) {
    if (!s.on) continue;
    addBuilding(raid, "store", RAID_CX + s.dx, RAID_CY + s.dy, { r: 13, hp: 48 });
  }
}

function spawnGarrison(raid: RaidState, to: TerritoryState, state: GameState) {
  const walls = raid.walls.filter((w) => w.hp > 0);
  const keep = keepOf(raid);
  const onKeep = Boolean(keep);
  const keepBonus = (to.fort ?? to.castleRank ?? 0) >= 3;
  const bowmen = Math.min(8, to.bowmen ?? 0);
  for (let i = 0; i < bowmen; i++) {
    let x: number;
    let y: number;
    if (onKeep && keep) {
      const a = (i / Math.max(1, bowmen)) * Math.PI * 2;
      x = keep.x + Math.cos(a) * (keep.r + 10);
      y = keep.y + Math.sin(a) * (keep.r + 8);
    } else {
      const w = walls[i % Math.max(1, walls.length)];
      const c = w ? { x: w.x + w.w / 2, y: w.y + w.h / 2 } : { x: RAID_CX + 40, y: RAID_CY - 50 };
      x = c.x;
      y = c.y;
    }
    const u = makeUnit(raid, "def", "bowman", x, y);
    if (keepBonus) {
      u.range += 28;
      u.dmg += 2;
    }
    raid.units.push(u);
  }
  const swords = Math.min(10, to.levy);
  for (let i = 0; i < swords; i++) {
    const a = (i / Math.max(1, swords)) * Math.PI * 2;
    raid.units.push(makeUnit(raid, "def", "levy", RAID_CX + Math.cos(a) * 28, RAID_CY + Math.sin(a) * 22));
  }
  const knights = Math.min(6, to.knights);
  for (let i = 0; i < knights; i++) {
    const a = (i / Math.max(1, knights)) * Math.PI * 2 + 0.7;
    raid.units.push(makeUnit(raid, "def", "knight", RAID_CX + Math.cos(a) * 48, RAID_CY + Math.sin(a) * 36));
  }
  const beasts = to.beasts ?? 0;
  const beastName = to.owner === "barbarian" ? "Beasts" : beastOf(state.players[to.owner]!.empire).name;
  for (let i = 0; i < beasts; i++) {
    const a = (i / Math.max(1, beasts)) * Math.PI * 2 + 0.4;
    raid.units.push(makeUnit(raid, "def", "beast", RAID_CX + Math.cos(a) * 36, RAID_CY + Math.sin(a) * 28, beastName));
  }
  for (let i = 0; i < to.dragons; i++) {
    raid.units.push(makeUnit(raid, "def", "dragon", RAID_CX + 70, RAID_CY - 90));
  }
}

function villageInner(x: number, y: number, raid: RaidState) {
  if (dist(x, y, RAID_CX, RAID_CY) < DEPLOY_R) return true;
  const box = wallBox(raid);
  if (box && inRect(x, y, box, 12)) return true;
  return false;
}

export function canDeployAt(raid: RaidState, x: number, y: number) {
  if (raid.phase === "over") return false;
  if (x < 18 || y < 18 || x > RAID_W - 18 || y > RAID_H - 18) return false;
  if (villageInner(x, y, raid)) return false;
  for (const b of raid.buildings) {
    if (b.hp > 0 && dist(x, y, b.x, b.y) < b.r + 10) return false;
  }
  return true;
}

export function deployTroop(raid: RaidState, kind: RaidKind, x: number, y: number): boolean {
  if (raid.phase === "over") return false;
  if (stockKind(raid.stock, kind) < 1) return false;
  if (!canDeployAt(raid, x, y)) return false;
  const jitter = () => (nextRng(raid) - 0.5) * 10;
  const u = makeUnit(raid, "atk", kind, clamp(x + jitter(), 16, RAID_W - 16), clamp(y + jitter(), 16, RAID_H - 16));
  if (kind === "tower") u.cargo = loadTowerCargo(raid);
  raid.units.push(u);
  takeStock(raid.stock, kind);
  addStock(raid.deployed, kind);
  if (raid.phase === "deploy") {
    raid.phase = "fight";
    raid.log.push("The host is on the field.");
  }
  const left = raidKindsLeft(raid);
  if (raid.selected && stockKind(raid.stock, raid.selected) < 1) raid.selected = left[0] ?? null;
  return true;
}

function loadTowerCargo(raid: RaidState): HostForce {
  const cargo: HostForce = { ...EMPTY_HOST };
  const beasts = Math.min(TOWER_CARGO.beasts, raid.stock.beasts);
  if (beasts > 0) {
    cargo.beasts = beasts;
    takeStock(raid.stock, "beast", beasts);
    addStock(raid.deployed, "beast", beasts);
    return cargo;
  }
  const kn = Math.min(TOWER_CARGO.knights, raid.stock.knights);
  if (kn > 0) {
    cargo.knights = kn;
    takeStock(raid.stock, "knight", kn);
    addStock(raid.deployed, "knight", kn);
    return cargo;
  }
  const men = Math.min(TOWER_CARGO.levy, raid.stock.levy);
  if (men > 0) {
    cargo.levy = men;
    takeStock(raid.stock, "levy", men);
    addStock(raid.deployed, "levy", men);
  }
  return cargo;
}

export function pickRaidKind(raid: RaidState, kind: RaidKind) {
  if (stockKind(raid.stock, kind) > 0) raid.selected = kind;
}

function placeOnRing(raid: RaidState, angle: number, distR: number) {
  for (let i = 0; i < 8; i++) {
    const a = angle + i * 0.17 * (i % 2 ? -1 : 1);
    const x = RAID_CX + Math.cos(a) * distR;
    const y = RAID_CY + Math.sin(a) * distR * 0.78;
    if (canDeployAt(raid, x, y)) return { x, y };
  }
  return { x: clamp(RAID_CX + Math.cos(angle) * 210, 24, RAID_W - 24), y: clamp(RAID_CY + Math.sin(angle) * 160, 24, RAID_H - 24) };
}

export function autoDeployAll(raid: RaidState) {
  const order: RaidKind[] = ["ram", "tower", "ladder", "catapult", "beast", "knight", "levy", "bowman", "dragon"];
  let n = 0;
  for (const kind of order) {
    while (stockKind(raid.stock, kind) > 0) {
      const base = kind === "catapult" || kind === "dragon" ? 1.05 : 0.12;
      const angle = Math.PI * 0.5 + base + n * 0.11;
      const reach = kind === "catapult" ? 205 : kind === "dragon" ? 198 : 186;
      const p = placeOnRing(raid, angle, reach);
      if (!deployTroop(raid, kind, p.x, p.y)) break;
      n += 1;
      if (n > 80) return;
    }
  }
}

function livingAtk(raid: RaidState) {
  return raid.units.filter((u) => u.side === "atk" && u.hp > 0 && !u.planted);
}

function livingDefBeasts(raid: RaidState) {
  return raid.units.filter((u) => u.side === "def" && u.hp > 0);
}

function liveBuildings(raid: RaidState) {
  return raid.buildings.filter((b) => b.hp > 0);
}

function liveWalls(raid: RaidState) {
  return raid.walls.filter((w) => w.hp > 0);
}

function buildingHp(raid: RaidState) {
  let cur = 0;
  let max = 0;
  for (const b of raid.buildings) {
    cur += Math.max(0, b.hp);
    max += b.max;
  }
  return { cur, max };
}

function updateStars(raid: RaidState) {
  const { cur, max } = buildingHp(raid);
  raid.destruction = max > 0 ? Math.round((100 * (max - cur)) / max) : 100;
  const keep = keepOf(raid);
  raid.keepDestroyed = !keep || keep.hp <= 0;
  let stars = 0;
  if (raid.destruction >= 50 || raid.keepDestroyed) stars = 1;
  if (raid.destruction >= 50 && raid.keepDestroyed) stars = 2;
  if (raid.destruction >= 100) stars = 3;
  raid.stars = stars;
}

function hurtBuilding(raid: RaidState, b: RaidBuilding, dmg: number) {
  if (b.hp <= 0) return;
  b.hp = Math.max(0, b.hp - dmg);
  b.flash = 0.12;
  spark(raid, b.x, b.y, b.kind === "keep" ? 6 : 3);
  raid.trauma = Math.min(1, raid.trauma + (b.kind === "keep" ? 0.22 : 0.08));
  if (b.hp <= 0) {
    raid.walkDirty = true;
    if (b.kind === "keep") raid.log.push("The keep falls.");
  }
}

function wallCenter(w: RaidWall) {
  return { x: w.x + w.w / 2, y: w.y + w.h / 2 };
}

function hurtWall(raid: RaidState, w: RaidWall, dmg: number) {
  if (w.hp <= 0) return;
  w.hp = Math.max(0, w.hp - dmg);
  spark(raid, w.x + w.w / 2, w.y + w.h / 2, 4);
  raid.trauma = Math.min(1, raid.trauma + 0.1);
  if (w.hp <= 0) raid.walkDirty = true;
}

function hurtUnit(raid: RaidState, u: RaidUnit, dmg: number, vsDragon = false) {
  if (u.hp <= 0) return;
  if (u.kind === "dragon" && !vsDragon) return;
  const hit = u.kind === "bowman" ? Math.max(1, Math.round(dmg * BOWMAN_HIT)) : dmg;
  u.hp = Math.max(0, u.hp - hit);
  u.flash = 0.1;
  if (u.hp <= 0) spark(raid, u.x, u.y, 3);
}

function nearestWall(raid: RaidState, x: number, y: number, needSolid = false, preferGate = false) {
  let best: RaidWall | null = null;
  let bestD = 1e9;
  for (const w of raid.walls) {
    if (w.hp <= 0) continue;
    if (needSolid && w.climb) continue;
    const c = wallCenter(w);
    let d = dist(x, y, c.x, c.y);
    if (preferGate && w.gate) d -= 80;
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

function nearestGate(raid: RaidState, x: number, y: number) {
  let best: RaidWall | null = null;
  let bestD = 1e9;
  for (const w of raid.walls) {
    if (w.hp <= 0 || !w.gate) continue;
    const c = wallCenter(w);
    const d = dist(x, y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

function nearestWeakWall(raid: RaidState, x: number, y: number) {
  let best: RaidWall | null = null;
  let bestS = 1e9;
  for (const w of raid.walls) {
    if (w.hp <= 0 || w.climb) continue;
    const c = wallCenter(w);
    const frac = w.hp / w.max;
    const s = dist(x, y, c.x, c.y) + frac * 80;
    if (s < bestS) {
      bestS = s;
      best = w;
    }
  }
  return best;
}

function pickBuilding(raid: RaidState, u: RaidUnit): RaidBuilding | null {
  const live = liveBuildings(raid);
  if (!live.length) return null;
  const score = (b: RaidBuilding) => {
    const d = dist(u.x, u.y, b.x, b.y);
    if (u.pref === "keep") return (b.kind === "keep" ? 0 : 80) + d;
    if (u.pref === "air") return (b.kind === "air" ? 0 : b.kind === "keep" ? 30 : 90) + d;
    if (u.pref === "def") return (b.kind === "cannon" || b.kind === "archer" || b.kind === "air" ? 0 : b.kind === "keep" ? 40 : 70) + d;
    if (u.pref === "wall") return (b.kind === "keep" ? 20 : 60) + d;
    return d;
  };
  return [...live].sort((a, b) => score(a) - score(b))[0] ?? null;
}

function inRangeB(u: RaidUnit, b: RaidBuilding) {
  return dist(u.x, u.y, b.x, b.y) <= u.range + b.r;
}

function inRangeW(u: RaidUnit, w: RaidWall) {
  const c = wallCenter(w);
  return dist(u.x, u.y, c.x, c.y) <= u.range + Math.max(w.w, w.h) * 0.35;
}

function fireShot(raid: RaidState, x: number, y: number, tx: number, ty: number, dmg: number, splash: number, air: boolean, ground: boolean, side: BattleSide, vsDragon = false) {
  const d = dist(x, y, tx, ty) || 1;
  const sp = 220;
  raid.shots.push({
    x,
    y,
    vx: ((tx - x) / d) * sp,
    vy: ((ty - y) / d) * sp,
    dmg,
    splash,
    ttl: d / sp + 0.05,
    air,
    ground,
    side,
    vsDragon,
  });
}

function strikeTarget(raid: RaidState, u: RaidUnit) {
  const s = STATS[u.kind];
  u.cd = s.cd;
  if (u.kind === "ladder") {
    const w = nearestWall(raid, u.x, u.y, true);
    if (w && inRangeW(u, w)) {
      w.climb = true;
      u.planted = true;
      raid.walkDirty = true;
      raid.log.push("Ladders bite the wall — the host can scale without breaking it.");
      raid.trauma = Math.min(1, raid.trauma + 0.12);
    }
    return;
  }
  if (u.kind === "tower" && !u.dumped) {
    const w = nearestWall(raid, u.x, u.y);
    if (w && inRangeW(u, w)) {
      u.dumped = true;
      const keep = keepOf(raid);
      const inward = keep ? Math.atan2(keep.y - u.y, keep.x - u.x) : 0;
      const cargo = u.cargo ?? { ...EMPTY_HOST, levy: 4 };
      const dump = (kind: RaidKind, n: number) => {
        for (let i = 0; i < n; i++) {
          const lx = clamp(u.x + Math.cos(inward) * (26 + (i % 5) * 6) + (i - n / 2) * 3, 16, RAID_W - 16);
          const ly = clamp(u.y + Math.sin(inward) * (20 + (i % 4) * 5), 16, RAID_H - 16);
          raid.units.push(makeUnit(raid, "atk", kind, lx, ly));
        }
      };
      dump("levy", cargo.levy);
      dump("knight", cargo.knights);
      dump("beast", cargo.beasts);
      const n = cargo.levy + cargo.knights + cargo.beasts;
      raid.log.push(n > 0 ? `The tower spills ${n} over the wall.` : "The tower leans on the wall empty.");
      u.pref = "keep";
      u.cargo = null;
      return;
    }
  }
  if (u.kind === "ram") {
    const gate = raid.walls.find((g) => g.hp > 0 && g.gate) ?? null;
    if (gate && inRangeW(u, gate)) {
      hurtWall(raid, gate, u.dmg);
      if (gate.hp <= 0) raid.log.push("The ram knocks the gate down.");
    }
    return;
  }
  if (u.kind === "knight") {
    const men = raid.units.filter((o) => o.side !== u.side && o.hp > 0 && o.kind === "levy" && !o.air);
    if (men.length) {
      const mark = [...men].sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0]!;
      if (dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius + 8) {
        hurtUnit(raid, mark, u.dmg * KNIGHT_VS_LEVY, false);
        return;
      }
    }
  }
  const w =
    u.kind === "beast"
      ? nearestWeakWall(raid, u.x, u.y)
      : u.kind === "dragon" || u.kind === "catapult"
        ? nearestWall(raid, u.x, u.y)
        : u.pref === "wall"
          ? nearestWall(raid, u.x, u.y)
          : null;
  if (w && w.hp > 0 && inRangeW(u, w) && (u.kind === "beast" || u.kind === "dragon" || u.kind === "catapult" || u.kind === "tower")) {
    const frac = w.hp / w.max;
    let wallDmg = u.dmg;
    if (u.kind === "beast") wallDmg = frac <= 0.45 ? u.dmg * 2.6 : u.dmg * 0.75;
    if (u.kind === "dragon") wallDmg = u.dmg * 1.4;
    if (u.kind === "catapult") {
      const c = wallCenter(w);
      fireShot(raid, u.x, u.y, c.x, c.y, wallDmg, 28, false, true, "atk", false);
    } else {
      hurtWall(raid, w, wallDmg);
    }
    if (u.kind === "beast") {
      const now = w.max > 0 ? w.hp / w.max : 0;
      if (now <= 0.5 && !w.climb) {
        w.climb = true;
        raid.walkDirty = true;
        raid.log.push("Beasts punch through the weak wall.");
      }
      if (now <= 0.45) u.pref = "keep";
    }
    return;
  }
  const b = pickBuilding(raid, u);
  if (b && inRangeB(u, b)) {
    const dmg = u.dmg;
    if (u.kind === "dragon" || u.kind === "catapult" || u.kind === "bowman") {
      fireShot(raid, u.x, u.y, b.x, b.y, dmg, u.kind === "catapult" ? 30 : 0, u.kind === "dragon", true, "atk", u.kind === "dragon");
    } else {
      hurtBuilding(raid, b, dmg);
    }
  }
}

function moveToward(u: RaidUnit, x: number, y: number, dt: number, raid: RaidState) {
  const d = dist(u.x, u.y, x, y);
  if (d < 2) return;
  const sp = u.speed * dt;
  let nx = u.x + ((x - u.x) / d) * Math.min(sp, d);
  let ny = u.y + ((y - u.y) / d) * Math.min(sp, d);
  if (!u.air && !walkableFor(raid, nx, ny, u)) {
    if (u.path.length < 1) u.path = astar(raid, u.x, u.y, x, y);
    if (u.path.length) {
      const p = u.path[0]!;
      const pd = dist(u.x, u.y, p.x, p.y);
      if (pd < 8) {
        u.path.shift();
        return;
      }
      nx = u.x + ((p.x - u.x) / pd) * Math.min(sp, pd);
      ny = u.y + ((p.y - u.y) / pd) * Math.min(sp, pd);
      if (!walkableFor(raid, nx, ny, u)) {
        u.path = astar(raid, u.x, u.y, x, y);
        return;
      }
    } else {
      const w = nearestWall(raid, u.x, u.y);
      if (w) {
        const c = wallCenter(w);
        const wd = dist(u.x, u.y, c.x, c.y) || 1;
        nx = u.x + ((c.x - u.x) / wd) * Math.min(sp, wd);
        ny = u.y + ((c.y - u.y) / wd) * Math.min(sp, wd);
      }
    }
  } else if (!u.air) {
    u.path = [];
  }
  u.x = clamp(nx, 12, RAID_W - 12);
  u.y = clamp(ny, 12, RAID_H - 12);
}

function steerUnit(raid: RaidState, u: RaidUnit, dt: number) {
  if (u.hp <= 0 || u.planted) return;
  u.cd = Math.max(0, u.cd - dt);
  u.flash = Math.max(0, u.flash - dt);
  u.roam = Math.max(0, u.roam - dt);
  if (u.side === "def") {
    const foes = livingAtk(raid);
    if (!foes.length) return;
    const huntMen = u.kind === "knight" ? foes.filter((f) => f.kind === "levy") : [];
    const pool = huntMen.length ? huntMen : foes;
    const mark = [...pool].sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0]!;
    const reach = u.range + mark.radius;
    if (dist(u.x, u.y, mark.x, mark.y) <= reach) {
      if (u.cd <= 0) {
        u.cd = STATS[u.kind]?.cd ?? 0.55;
        const dmg = u.kind === "knight" && mark.kind === "levy" ? u.dmg * KNIGHT_VS_LEVY : u.dmg;
        if (u.kind === "bowman" || u.kind === "dragon") {
          fireShot(raid, u.x, u.y, mark.x, mark.y, dmg, 0, u.kind === "dragon" || mark.air, !mark.air, "def", u.kind === "dragon");
        } else {
          hurtUnit(raid, mark, dmg, false);
        }
      }
    } else if (!u.onWall) {
      if (u.kind === "dragon") {
        u.roam = u.roam || 2.4;
        if (u.roam <= 0) u.roam = 2.4;
        const a = Math.atan2(mark.y - RAID_CY, mark.x - RAID_CX) + 0.4;
        moveToward(u, mark.x + Math.cos(a) * 40, mark.y + Math.sin(a) * 30, dt, raid);
      } else {
        moveToward(u, mark.x, mark.y, dt, raid);
      }
    }
    return;
  }
  if (u.kind === "bowman" || u.kind === "catapult") {
    if (u.kind === "bowman" && !u.onWall) {
      const climb = raid.walls.find((w) => w.hp > 0 && w.climb);
      if (climb) {
        const c = wallCenter(climb);
        if (dist(u.x, u.y, c.x, c.y) <= 22) {
          u.onWall = true;
          u.speed = 0;
          u.range = STATS.bowman.range + WALL_BOW_RANGE;
          u.dmg = STATS.bowman.dmg + WALL_BOW_DMG;
          u.x = c.x;
          u.y = c.y;
          raid.log.push("Bowmen take the wall and rain arrows.");
        } else {
          moveToward(u, c.x, c.y, dt, raid);
        }
        if (u.cd <= 0) strikeTarget(raid, u);
        return;
      }
    }
    const reach = u.kind === "bowman" ? 168 : 188;
    const dKeep = dist(u.x, u.y, RAID_CX, RAID_CY);
    if (dKeep < reach - 10) {
      const a = Math.atan2(u.y - RAID_CY, u.x - RAID_CX);
      moveToward(u, RAID_CX + Math.cos(a) * reach, RAID_CY + Math.sin(a) * reach * 0.78, dt, raid);
    } else if (u.cd <= 0) {
      strikeTarget(raid, u);
    }
    return;
  }
  if (u.kind === "knight") {
    const men = raid.units.filter((o) => o.side === "def" && o.hp > 0 && o.kind === "levy");
    if (men.length) {
      const mark = [...men].sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0]!;
      if (dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius) {
        if (u.cd <= 0) strikeTarget(raid, u);
        return;
      }
      moveToward(u, mark.x, mark.y, dt, raid);
      return;
    }
  }
  if (u.kind === "dragon") {
    if (u.roam <= 0) {
      const walls = liveWalls(raid);
      const defs = liveBuildings(raid).filter((b) => b.kind !== "store");
      const pick = walls.length && nextRng(raid) < 0.55 ? walls[Math.floor(nextRng(raid) * walls.length)]! : defs[Math.floor(nextRng(raid) * Math.max(1, defs.length))];
      if (pick && "kind" in pick) {
        u.target = pick.id;
      } else if (pick) {
        u.target = (pick as RaidWall).id;
      }
      u.roam = 1.6 + nextRng(raid);
    }
    const wall = raid.walls.find((w) => w.id === u.target && w.hp > 0);
    const bld = raid.buildings.find((b) => b.id === u.target && b.hp > 0);
    if (wall) {
      const c = wallCenter(wall);
      if (inRangeW(u, wall)) {
        if (u.cd <= 0) strikeTarget(raid, u);
      } else moveToward(u, c.x, c.y, dt, raid);
      return;
    }
    if (bld) {
      if (inRangeB(u, bld)) {
        if (u.cd <= 0) strikeTarget(raid, u);
      } else moveToward(u, bld.x, bld.y, dt, raid);
      return;
    }
    const b = pickBuilding(raid, u);
    if (b) {
      u.target = b.id;
      if (inRangeB(u, b)) {
        if (u.cd <= 0) strikeTarget(raid, u);
      } else moveToward(u, b.x, b.y, dt, raid);
    }
    return;
  }
  if (u.kind === "beast") {
    const w = nearestWeakWall(raid, u.x, u.y);
    if (w && w.hp / w.max <= 0.55) {
      if (inRangeW(u, w)) {
        if (u.cd <= 0) strikeTarget(raid, u);
        return;
      }
      const c = wallCenter(w);
      moveToward(u, c.x, c.y, dt, raid);
      return;
    }
  }
  const wallFirst = u.kind === "ram" || u.kind === "ladder" || u.kind === "tower" || (u.pref === "wall" && liveWalls(raid).length > 0);
  if (wallFirst) {
    const w = u.kind === "ram" ? nearestGate(raid, u.x, u.y) : nearestWall(raid, u.x, u.y, u.kind === "ladder", false);
    if (w) {
      if (inRangeW(u, w)) {
        if (u.cd <= 0) strikeTarget(raid, u);
        return;
      }
      const c = wallCenter(w);
      moveToward(u, c.x, c.y, dt, raid);
      return;
    }
    u.pref = "keep";
  }
  const b = pickBuilding(raid, u);
  if (!b) return;
  if (inRangeB(u, b)) {
    if (u.cd <= 0) strikeTarget(raid, u);
  } else {
    moveToward(u, b.x, b.y, dt, raid);
  }
}

function closestAtk(raid: RaidState, x: number, y: number, air: boolean, ground: boolean, vsDragon = false) {
  let best: RaidUnit | null = null;
  let bestD = 1e9;
  for (const u of raid.units) {
    if (u.side !== "atk" || u.hp <= 0 || u.planted) continue;
    if (u.air && !air) continue;
    if (!u.air && !ground) continue;
    if (u.kind === "dragon" && !vsDragon) continue;
    const d = dist(x, y, u.x, u.y);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

function tickDefenses(raid: RaidState, dt: number) {
  for (const b of raid.buildings) {
    if (b.hp <= 0 || b.dmg <= 0) continue;
    b.flash = Math.max(0, b.flash - dt);
    b.cdLeft -= dt;
    if (b.cdLeft > 0) continue;
    const mark = closestAtk(raid, b.x, b.y, b.hitsAir, b.hitsGround, b.kind === "scorpion");
    if (!mark) continue;
    if (dist(b.x, b.y, mark.x, mark.y) > b.range + mark.radius) continue;
    b.cdLeft = b.cd;
    fireShot(raid, b.x, b.y, mark.x, mark.y, b.dmg, 0, b.hitsAir, b.hitsGround, "def", b.kind === "scorpion");
  }
}

function tickShots(raid: RaidState, dt: number) {
  const next: RaidShot[] = [];
  for (const s of raid.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.ttl -= dt;
    let hit = false;
    const foe: BattleSide = s.side === "atk" ? "def" : "atk";
    if (s.ground) {
      for (const u of raid.units) {
        if (u.side !== foe || u.hp <= 0 || u.air) continue;
        if (dist(s.x, s.y, u.x, u.y) <= u.radius + 4) {
          hurtUnit(raid, u, s.dmg, s.vsDragon);
          if (s.splash > 0) {
            for (const o of raid.units) {
              if (o.side !== foe || o.hp <= 0 || o === u) continue;
              if (dist(s.x, s.y, o.x, o.y) <= s.splash) hurtUnit(raid, o, s.dmg * 0.45, s.vsDragon);
            }
            if (s.side === "atk") {
              for (const w of raid.walls) {
                if (w.hp <= 0) continue;
                const c = wallCenter(w);
                if (dist(s.x, s.y, c.x, c.y) <= s.splash) hurtWall(raid, w, s.dmg * 0.7);
              }
              for (const b of raid.buildings) {
                if (b.hp <= 0) continue;
                if (dist(s.x, s.y, b.x, b.y) <= s.splash + b.r * 0.4) hurtBuilding(raid, b, s.dmg * 0.5);
              }
            }
          }
          hit = true;
          break;
        }
      }
    }
    if (!hit && s.air) {
      for (const u of raid.units) {
        if (u.side !== foe || u.hp <= 0 || !u.air) continue;
        if (dist(s.x, s.y, u.x, u.y) <= u.radius + 6) {
          hurtUnit(raid, u, s.dmg, s.vsDragon);
          hit = true;
          break;
        }
      }
    }
    if (!hit && s.side === "atk" && s.ground) {
      for (const b of raid.buildings) {
        if (b.hp <= 0) continue;
        if (dist(s.x, s.y, b.x, b.y) <= b.r + 6) {
          hurtBuilding(raid, b, s.dmg);
          hit = true;
          break;
        }
      }
    }
    if (!hit && s.side === "atk" && s.ground) {
      for (const w of raid.walls) {
        if (w.hp <= 0) continue;
        if (s.x >= w.x - 3 && s.y >= w.y - 3 && s.x <= w.x + w.w + 3 && s.y <= w.y + w.h + 3) {
          hurtWall(raid, w, s.dmg);
          hit = true;
          break;
        }
      }
    }
    if (!hit && s.ttl > 0) next.push(s);
  }
  raid.shots = next;
}

function tickSparks(raid: RaidState, dt: number) {
  const next: RaidSpark[] = [];
  for (const s of raid.sparks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 40 * dt;
    s.life -= dt;
    if (s.life > 0) next.push(s);
  }
  raid.sparks = next;
}

function maybeEnd(raid: RaidState) {
  if (raid.phase === "over") return;
  updateStars(raid);
  const attackers = raid.units.filter((u) => u.side === "atk" && u.hp > 0 && !u.planted);
  const stockLeft = raidKindsLeft(raid).length > 0;
  if (raid.destruction >= 100) {
    raid.phase = "over";
    raid.log.push("The village is razed.");
    return;
  }
  if (raid.phase === "fight" && raid.timeLeft <= 0) {
    raid.phase = "over";
    raid.log.push(raid.keepDestroyed ? "The keep is down — time." : "The assault runs out of time.");
    return;
  }
  if (raid.phase === "fight" && attackers.length < 1 && !stockLeft) {
    raid.phase = "over";
    raid.log.push(raid.keepDestroyed ? "The keep is down." : "The host is spent.");
  }
}

function raidOver(r: RaidState) {
  return r.phase === "over";
}

export function stepRaid(raid: RaidState, dt: number) {
  if (raidOver(raid)) return raid;
  const t = Math.min(0.1, Math.max(0, dt)) * (raid.timeScale || 1);
  if (t <= 0) return raid;
  if (raid.walkDirty) rebuildWalk(raid);
  if (raid.phase === "fight") raid.timeLeft = Math.max(0, raid.timeLeft - t);
  let acc = t;
  while (acc > 0 && !raidOver(raid)) {
    const s = Math.min(STEP, acc);
    acc -= s;
    tickDefenses(raid, s);
    for (const u of raid.units) steerUnit(raid, u, s);
    tickShots(raid, s);
    tickSparks(raid, s);
    raid.trauma = Math.max(0, raid.trauma - s * 1.8);
    maybeEnd(raid);
  }
  updateStars(raid);
  return raid;
}

export function runRaid(raid: RaidState, maxSeconds = RAID_TIME + 8) {
  if (raid.phase === "deploy") autoDeployAll(raid);
  raid.timeScale = 1;
  let left = maxSeconds;
  while (raid.phase !== "over" && left > 0) {
    stepRaid(raid, STEP);
    left -= STEP;
  }
  if (raid.phase !== "over") {
    raid.phase = "over";
    raid.log.push("The field is decided.");
  }
  updateStars(raid);
  return raid;
}

export function raidWinner(raid: RaidState): BattleSide | null {
  if (raid.phase !== "over") return null;
  return raid.keepDestroyed ? "atk" : "def";
}

function countKind(raid: RaidState, side: BattleSide, kind: RaidKind) {
  return raid.units.filter((u) => u.side === side && u.kind === kind && u.hp > 0 && !u.planted).length;
}

export function raidOutcome(raid: RaidState): RaidOutcome {
  updateStars(raid);
  const winner = raidWinner(raid) ?? "def";
  const atkLeft: HostForce = {
    levy: countKind(raid, "atk", "levy") + (raid.stock.levy || 0),
    bowmen: countKind(raid, "atk", "bowman") + (raid.stock.bowmen || 0),
    knights: countKind(raid, "atk", "knight") + (raid.stock.knights || 0),
    dragons: countKind(raid, "atk", "dragon") + (raid.stock.dragons || 0),
    beasts: countKind(raid, "atk", "beast") + (raid.stock.beasts || 0),
  };
  const keep = keepOf(raid);
  const keepFrac = keep && keep.max > 0 ? Math.max(0, keep.hp / keep.max) : 0;
  const used: SiegeStock = {
    rams: raid.deployed.rams,
    catapults: raid.deployed.catapults,
    ladders: raid.deployed.ladders,
    towers: raid.deployed.towers,
  };
  const atkN = atkLeft.levy + (atkLeft.bowmen ?? 0) + atkLeft.knights + atkLeft.dragons + atkLeft.beasts;
  if (winner === "atk" && atkN > 0) {
    return { winner: "atk", atkLeft, defLeft: { ...EMPTY }, stars: raid.stars, destruction: raid.destruction, used };
  }
  const defLeft: HostForce = {
    levy: keepFrac > 0 ? Math.max(raid.garrison.levy > 0 ? 1 : 0, Math.ceil(raid.garrison.levy * keepFrac)) : 0,
    bowmen: countKind(raid, "def", "bowman"),
    knights: countKind(raid, "def", "knight"),
    dragons: countKind(raid, "def", "dragon"),
    beasts: livingDefBeasts(raid).length,
  };
  return {
    winner: "def",
    atkLeft,
    defLeft,
    stars: raid.stars,
    destruction: raid.destruction,
    used,
  };
}

export function raidBusy(raid: RaidState) {
  return raid.phase !== "over";
}
