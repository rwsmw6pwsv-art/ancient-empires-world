/**
 * Movement traces for dragon / ram / levy after Place the rest + Charge.
 * Usage: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/trace-raid.ts
 */
import { CITY_PRESETS, HOST_PRESETS, openDrillRaid, type DrillSetup } from "../src/lib/game/drill.ts";
import { autoDeployAll, beginAssault, RAID_CX, RAID_CY, RAID_H, RAID_W, stepRaid } from "../src/lib/game/raid.ts";

function setup(cityId: string, hostId: string): DrillSetup {
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
  };
}

function ringOf(x: number, y: number) {
  return Math.hypot(x - RAID_CX, (y - RAID_CY) / 0.78);
}

function faceErr(facing: number, x: number, y: number) {
  const inward = Math.atan2(RAID_CY - y, RAID_CX - x);
  return Math.abs(Math.atan2(Math.sin(facing - inward), Math.cos(facing - inward)));
}

function targetLabel(
  raid: { units: { id: string; kind: string }[]; buildings: { id: string; kind: string }[]; walls: { id: string; gate: boolean }[] },
  id: string | null,
) {
  if (!id) return "-";
  const u = raid.units.find((o) => o.id === id);
  if (u) return u.kind;
  const b = raid.buildings.find((o) => o.id === id);
  if (b) return b.kind;
  const w = raid.walls.find((o) => o.id === id);
  if (w) return w.gate ? "gate" : "wall";
  return id;
}

function trace(cityId: string, hostId: string) {
  const opened = openDrillRaid(setup(cityId, hostId));
  if (!opened) {
    console.log(`open failed ${cityId} × ${hostId}`);
    return;
  }
  const raid = opened.raid;
  autoDeployAll(raid);
  beginAssault(raid);
  raid.timeScale = 1;
  const stamps = [0, 0.5, 1, 2, 3, 5, 8, 12];
  console.log(`\n=== ${cityId} × ${hostId} ===`);
  console.log("t  kind     x    y   ring  face  target     hp");
  let t = 0;
  const logRow = (kind: string) => {
    const u = raid.units.find((o) => o.kind === kind && o.side === "atk" && o.hp > 0);
    if (!u) return;
    const row = [
      t.toFixed(1).padStart(4),
      kind.padEnd(8),
      u.x.toFixed(0).padStart(4),
      u.y.toFixed(0).padStart(4),
      ringOf(u.x, u.y).toFixed(0).padStart(5),
      faceErr(u.facing, u.x, u.y).toFixed(2).padStart(5),
      targetLabel(raid, u.target).padEnd(10),
      u.hp.toFixed(0),
    ].join(" ");
    console.log(row);
  };
  for (const stamp of stamps) {
    while (t + 1e-9 < stamp && raid.phase !== "over") {
      stepRaid(raid, 1 / 60);
      t += 1 / 60;
    }
    t = stamp;
    logRow("dragon");
    logRow("ram");
    logRow("levy");
    if (raid.phase === "over") break;
  }
  const drake = raid.units.find((u) => u.kind === "dragon" && u.side === "atk");
  const scorpLeft = raid.buildings.filter((b) => b.kind === "scorpion" && b.hp > 0).length;
  const towersHit = raid.buildings.filter((b) => b.kind === "archer" && b.hp < b.max).length;
  const gate = raid.walls.find((w) => w.gate);
  const defHurt = raid.units.filter((u) => u.side === "def" && u.hp < u.max).map((u) => u.kind);
  console.log(
    `end: dragon y=${drake ? drake.y.toFixed(0) : "-"} hp=${drake ? drake.hp.toFixed(0) : 0} edge=${drake && drake.y > RAID_H - 28 ? "YES" : "no"} scorpLeft=${scorpLeft} towersHurt=${towersHit} gateHp=${gate ? gate.hp.toFixed(0) : "-"}/${gate ? gate.max : "-"} defHurt=${[...new Set(defHurt)].join(",") || "none"} field=${RAID_W}x${RAID_H}`,
  );
}

for (const city of ["fortress", "ring", "capital"]) {
  for (const host of ["flight", "siege", "train"]) {
    trace(city, host);
  }
}
