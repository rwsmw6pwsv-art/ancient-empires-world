/**
 * Headless field sims: city presets × host presets.
 * Usage: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/sim-raids.ts
 */
import { CITY_PRESETS, HOST_PRESETS, openDrillRaid, type DrillSetup } from "../src/lib/game/drill.ts";
import { raidOutcome, raidWinner, runRaid } from "../src/lib/game/raid.ts";
import { hostTotal } from "../src/lib/game/raid.ts";

const CITIES = CITY_PRESETS.map((p) => p.id);
const HOSTS = ["skirmish", "host", "siege", "dragon", "flight", "train"] as const;

function setupFor(cityId: string, hostId: string, seed: number): DrillSetup {
  const city = CITY_PRESETS.find((p) => p.id === cityId)!;
  const host = HOST_PRESETS.find((p) => p.id === hostId)!;
  return {
    empire: "sumer",
    foe: "egypt",
    walls: 2,
    outer: 1,
    keep: 1,
    towers: 2,
    moats: 1,
    scorpions: 1,
    garrison: { levy: 6, bowmen: 4, knights: 2, beasts: 1, dragons: 0 },
    dragonTier: 1,
    ...city.patch,
    force: { ...host.force },
    siege: { ...host.siege },
    // vary rng via unused dragonTier bit — openDrillRaid seed uses walls/moats.
    // We poke raid.rng after open.
    ...(seed ? {} : {}),
  };
}

function row(city: string, host: string, seed: number) {
  const opened = openDrillRaid(setupFor(city, host, seed));
  if (!opened) return { city, host, seed, error: "open failed" };
  const raid = opened.raid;
  raid.rng = (9001 + seed * 9973 + city.length * 17 + host.length * 31) >>> 0 || 1;
  runRaid(raid);
  const win = raidWinner(raid);
  const out = raidOutcome(raid);
  return {
    city,
    host,
    seed,
    winner: win,
    stars: raid.stars,
    destruction: raid.destruction,
    keep: raid.keepDestroyed,
    atkLeft: hostTotal(out.atk.remaining),
    defLeft: hostTotal(out.def.remaining),
    time: Math.round(raid.timeLeft),
  };
}

const results = [];
for (const city of CITIES) {
  for (const host of HOSTS) {
    for (const seed of [1, 2, 3]) {
      results.push(row(city, host, seed));
    }
  }
}

const groups = new Map<string, typeof results>();
for (const r of results) {
  const k = `${r.city} × ${r.host}`;
  const g = groups.get(k) ?? [];
  g.push(r);
  groups.set(k, g);
}

console.log("city × host | atk wins | avg stars | avg dest | avg atk left | avg def left");
for (const [k, g] of groups) {
  const n = g.length;
  const atk = g.filter((r) => r.winner === "atk").length;
  const stars = g.reduce((s, r) => s + (r.stars ?? 0), 0) / n;
  const dest = g.reduce((s, r) => s + (r.destruction ?? 0), 0) / n;
  const atkLeft = g.reduce((s, r) => s + (r.atkLeft ?? 0), 0) / n;
  const defLeft = g.reduce((s, r) => s + (r.defLeft ?? 0), 0) / n;
  console.log(
    `${k.padEnd(22)} | ${atk}/${n} | ${stars.toFixed(2)} | ${dest.toFixed(0)}% | ${atkLeft.toFixed(1)} | ${defLeft.toFixed(1)}`,
  );
}
