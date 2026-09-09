/**
 * Scale sims for the raised field caps (100 / 50 / 25 / 25).
 * Usage: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/sim-scale.ts
 */
import { openDrillRaid, type DrillSetup } from "../src/lib/game/drill.ts";
import {
  RAID_CX,
  RAID_CY,
  RAID_TIME,
  autoDeployAll,
  beginAssault,
  raidWinner,
  stepRaid,
  type RaidState,
  type RaidUnit,
} from "../src/lib/game/raid.ts";
import { UNIT_CAP } from "../src/lib/game/types.ts";

const OLD = { levy: 20, bowmen: 12, knights: 8, beasts: 6, dragons: 0 };
const MAX = {
  levy: UNIT_CAP.levy,
  bowmen: UNIT_CAP.bowman,
  knights: UNIT_CAP.knight,
  beasts: UNIT_CAP.beast,
  dragons: 0,
};
const SIEGE = { rams: 1, catapults: 1, ladders: 1, towers: 1 };
const NO_SIEGE = { rams: 0, catapults: 0, ladders: 0, towers: 0 };

type City = { walls: number; outer: number; keep: number; towers: number; moats: number; scorpions: number };

const CAPITAL: City = { walls: 2, outer: 0, keep: 0, towers: 1, moats: 0, scorpions: 0 };
const FORTRESS: City = { walls: 3, outer: 2, keep: 2, towers: 3, moats: 2, scorpions: 3 };
const RING: City = { walls: 5, outer: 5, keep: 5, towers: 5, moats: 3, scorpions: 5 };

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function open(city: City, force: DrillSetup["force"], garrison: DrillSetup["garrison"], siege = SIEGE) {
  return openDrillRaid({
    empire: "sumer",
    foe: "egypt",
    ...city,
    force: { ...force },
    siege: { ...siege },
    garrison: { ...garrison },
    dragonTier: 1,
  });
}

function living(raid: RaidState, side?: "atk" | "def") {
  return raid.units.filter((u) => u.hp > 0 && !u.planted && (!side || u.side === side));
}

function overlapPairs(units: RaidUnit[]) {
  let n = 0;
  for (let i = 0; i < units.length; i++) {
    const a = units[i]!;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j]!;
      if (a.side !== b.side) continue;
      if (dist(a.x, a.y, b.x, b.y) < (a.radius + b.radius) * 0.55) n += 1;
    }
  }
  return n;
}

function uniqueCells(units: RaidUnit[], cell = 12) {
  const s = new Set<string>();
  for (const u of units) s.add(`${Math.round(u.x / cell)}:${Math.round(u.y / cell)}`);
  return s.size;
}

function bbox(units: RaidUnit[]) {
  if (!units.length) return { w: 0, h: 0 };
  let x0 = 1e9,
    y0 = 1e9,
    x1 = 0,
    y1 = 0;
  for (const u of units) {
    x0 = Math.min(x0, u.x);
    y0 = Math.min(y0, u.y);
    x1 = Math.max(x1, u.x);
    y1 = Math.max(y1, u.y);
  }
  return { w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

function gateOf(raid: RaidState) {
  return raid.walls.find((w) => w.gate) ?? null;
}

function nearGate(raid: RaidState, units: RaidUnit[], r = 36) {
  const g = gateOf(raid);
  if (!g) return 0;
  const gx = g.x + g.w / 2;
  const gy = g.y + g.h / 2;
  return units.filter((u) => dist(u.x, u.y, gx, gy) < r).length;
}

function innerCount(raid: RaidState, units: RaidUnit[]) {
  const r = 80;
  return units.filter((u) => dist(u.x, u.y, RAID_CX, RAID_CY) < r).length;
}

function kindCount(units: RaidUnit[], kind: string) {
  return units.filter((u) => u.kind === kind).length;
}

function bowmanPosts(raid: RaidState) {
  const bows = living(raid, "def").filter((u) => u.kind === "bowman");
  const posts = new Set(bows.map((u) => u.postId ?? `${Math.round(u.x)}:${Math.round(u.y)}`));
  return { bows: bows.length, posts: posts.size };
}

function snapshot(raid: RaidState, t: number, extra: Record<string, number | string> = {}) {
  const atk = living(raid, "atk");
  const def = living(raid, "def");
  const ram = atk.find((u) => u.kind === "ram");
  const trail = ram ? atk.filter((u) => u.kind === "levy" && dist(u.x, u.y, ram.x, ram.y) < 28).length : 0;
  const g = gateOf(raid);
  return {
    t,
    atk: atk.length,
    def: def.length,
    overlap: overlapPairs(raid.units.filter((u) => u.hp > 0)),
    cells: uniqueCells(atk),
    atkBox: bbox(atk),
    gateJam: nearGate(raid, atk),
    inside: innerCount(raid, atk),
    trail,
    shots: raid.shots.length,
    gateHp: g ? Math.max(0, Math.round(g.hp)) : 0,
    keep: raid.keepDestroyed ? 1 : 0,
    ...extra,
  };
}

type Result = {
  name: string;
  deployMs: number;
  fightMs: number;
  msPerGameSec: number;
  winner: string | null;
  timeLeft: number;
  keep: boolean;
  destruction: number;
  logTail: string;
  start: ReturnType<typeof snapshot>;
  t3: ReturnType<typeof snapshot> | null;
  t10: ReturnType<typeof snapshot> | null;
  end: ReturnType<typeof snapshot>;
  idleAtk: number;
  stuckOutside: number;
  bows: { bows: number; posts: number };
  peakShots: number;
  peakUnits: number;
};

function runCase(name: string, city: City, force: DrillSetup["force"], garrison: DrillSetup["garrison"], siege = SIEGE): Result {
  const opened = open(city, force, garrison, siege);
  if (!opened) throw new Error(`open failed ${name}`);
  const raid = opened.raid;
  const t0 = performance.now();
  autoDeployAll(raid);
  const deployMs = performance.now() - t0;
  const start = snapshot(raid, 0);
  const bows = bowmanPosts(raid);
  const home = new Map(living(raid, "atk").map((u) => [u.id, { x: u.x, y: u.y }]));
  beginAssault(raid);
  raid.timeScale = 1;

  let t = 0;
  let t3: ReturnType<typeof snapshot> | null = null;
  let t10: ReturnType<typeof snapshot> | null = null;
  let peakShots = 0;
  let peakUnits = raid.units.filter((u) => u.hp > 0).length;
  const fight0 = performance.now();
  while (raid.phase !== "over" && t < RAID_TIME + 1) {
    stepRaid(raid, 1 / 60);
    t += 1 / 60;
    peakShots = Math.max(peakShots, raid.shots.length);
    peakUnits = Math.max(peakUnits, raid.units.filter((u) => u.hp > 0).length);
    if (!t3 && t >= 3) t3 = snapshot(raid, 3);
    if (!t10 && t >= 10) t10 = snapshot(raid, 10);
  }
  const fightMs = performance.now() - fight0;
  const gameSec = Math.max(0.001, t);
  const atk = living(raid, "atk");
  let idleAtk = 0;
  let stuckOutside = 0;
  for (const u of atk) {
    const h = home.get(u.id);
    if (h && dist(u.x, u.y, h.x, h.y) < 10) idleAtk += 1;
    if (dist(u.x, u.y, RAID_CX, RAID_CY) > 140) stuckOutside += 1;
  }
  return {
    name,
    deployMs,
    fightMs,
    msPerGameSec: fightMs / gameSec,
    winner: raidWinner(raid),
    timeLeft: Math.round(raid.timeLeft * 10) / 10,
    keep: raid.keepDestroyed,
    destruction: raid.destruction,
    logTail: raid.log.slice(-3).join(" | "),
    start,
    t3,
    t10,
    end: snapshot(raid, Math.round(t * 10) / 10),
    idleAtk,
    stuckOutside,
    bows,
    peakShots,
    peakUnits,
  };
}

function print(r: Result) {
  const box = (s: { atkBox: { w: number; h: number } }) => `${s.atkBox.w}x${s.atkBox.h}`;
  console.log(`\n== ${r.name} ==`);
  console.log(
    `  deploy ${r.deployMs.toFixed(1)}ms  fight ${r.fightMs.toFixed(0)}ms  (${r.msPerGameSec.toFixed(1)} ms / game-s)  peak units ${r.peakUnits} shots ${r.peakShots}`,
  );
  console.log(
    `  winner=${r.winner} keep=${r.keep} dest=${r.destruction}% timeLeft=${r.timeLeft}s idleAtk=${r.idleAtk} stuckOut=${r.stuckOutside} bows ${r.bows.bows} on ${r.bows.posts} posts`,
  );
  const row = (label: string, s: ReturnType<typeof snapshot> | null) => {
    if (!s) return;
    console.log(
      `  t=${String(s.t).padStart(4)} atk=${String(s.atk).padStart(3)} def=${String(s.def).padStart(3)} overlap=${String(s.overlap).padStart(4)} cells=${String(s.cells).padStart(3)} box=${box(s).padEnd(9)} jam=${s.gateJam} in=${s.inside} trail=${s.trail} gateHp=${s.gateHp} shots=${s.shots}`,
    );
  };
  row("0", r.start);
  row("3", r.t3);
  row("10", r.t10);
  row("end", r.end);
  console.log(`  log: ${r.logTail}`);
}

const cases: [string, City, DrillSetup["force"], DrillSetup["garrison"], typeof SIEGE][] = [
  ["old host vs old garrison / capital", CAPITAL, OLD, { ...OLD, levy: 12, bowmen: 10, knights: 6, beasts: 4, dragons: 0 }, SIEGE],
  ["max host vs old garrison / capital", CAPITAL, MAX, { levy: 12, bowmen: 10, knights: 6, beasts: 4, dragons: 0 }, SIEGE],
  ["max vs max / capital", CAPITAL, MAX, MAX, SIEGE],
  ["max vs max / fortress", FORTRESS, MAX, MAX, SIEGE],
  ["max vs max / ring", RING, MAX, MAX, SIEGE],
  ["max, no siege / fortress", FORTRESS, MAX, MAX, NO_SIEGE],
  ["old host vs max garrison / fortress", FORTRESS, OLD, MAX, SIEGE],
  ["warriors only 100 vs 100 / capital", CAPITAL, { levy: 100, bowmen: 0, knights: 0, beasts: 0, dragons: 0 }, { levy: 100, bowmen: 0, knights: 0, beasts: 0, dragons: 0 }, NO_SIEGE],
  ["archers 50 vs 50 / capital", CAPITAL, { levy: 0, bowmen: 50, knights: 0, beasts: 0, dragons: 0 }, { levy: 0, bowmen: 50, knights: 0, beasts: 0, dragons: 0 }, NO_SIEGE],
];

const results: Result[] = [];
for (const c of cases) {
  const r = runCase(...c);
  results.push(r);
  print(r);
}

console.log("\n== summary ==");
console.log("case | winner | dest | timeLeft | ms/s | overlap@0 | trail@3 | jam@3 | idle");
for (const r of results) {
  console.log(
    `${r.name.padEnd(40)} | ${String(r.winner).padEnd(4)} | ${String(r.destruction).padStart(3)}% | ${String(r.timeLeft).padStart(5)} | ${r.msPerGameSec.toFixed(1).padStart(6)} | ${String(r.start.overlap).padStart(4)} | ${String(r.t3?.trail ?? "-").padStart(4)} | ${String(r.t3?.gateJam ?? "-").padStart(4)} | ${r.idleAtk}`,
  );
}
