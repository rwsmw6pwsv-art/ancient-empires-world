import { GLOBE_BY_ID, GLOBE_OCEANS, hexNeighbors, mapDist } from "./globe.ts";
import { OCEAN_LABELS } from "./landscape.ts";
import type { TerritoryState } from "./types.ts";
import { TERRITORY_BY_ID } from "./world.ts";

export type SeaYield = "fish" | "shellfish" | "whale" | "treasure";

export type WaterDef = {
  id: string;
  name: string;
  near: boolean;
  yield: SeaYield;
};

const NEAR_KIND = ["Shoal", "Bank", "Reef", "Sound", "Reach"] as const;
const DEEP_KIND = ["Deep", "Gyre", "Trench", "Basin", "Abyss"] as const;

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function basinShort(h: { cx: number; cy: number }): string {
  let best = OCEAN_LABELS[0]!;
  let bestD = Infinity;
  for (const o of OCEAN_LABELS) {
    const d = mapDist(h.cx, h.cy, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  const word = best.name.replace(/ ocean$/i, "").trim().split(/\s+/)[0] ?? "Sea";
  return word.charAt(0) + word.slice(1).toLowerCase();
}

function isNearLand(id: string): boolean {
  return hexNeighbors(id).some((n) => GLOBE_BY_ID[n]?.kind === "land");
}

function yieldOf(id: string, near: boolean): SeaYield {
  const n = hashId(id) % 100;
  if (near) return n < 20 ? "treasure" : "shellfish";
  return n < 25 ? "whale" : "fish";
}

function buildWaters(): Record<string, WaterDef> {
  const used = new Map<string, number>();
  const out: Record<string, WaterDef> = {};
  for (const h of GLOBE_OCEANS) {
    const near = isNearLand(h.id);
    const kinds = near ? NEAR_KIND : DEEP_KIND;
    const kind = kinds[hashId(h.id) % kinds.length]!;
    const base = `${basinShort(h)} ${kind}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const name = n === 1 ? base : `${base} ${n}`;
    out[h.id] = { id: h.id, name, near, yield: yieldOf(h.id, near) };
  }
  return out;
}

export const WATER_BY_ID: Record<string, WaterDef> = buildWaters();
export const WATER_IDS: readonly string[] = Object.keys(WATER_BY_ID);

export function isWater(id: string): boolean {
  return Boolean(WATER_BY_ID[id]);
}

export function placeName(id: string): string {
  return TERRITORY_BY_ID[id]?.name ?? WATER_BY_ID[id]?.name ?? id;
}

export function seaYieldOf(id: string): SeaYield | null {
  return WATER_BY_ID[id]?.yield ?? null;
}

export const SEA_YIELD_LABEL: Record<SeaYield, string> = {
  fish: "fish",
  shellfish: "shellfish",
  whale: "whales",
  treasure: "lost treasure",
};

export function blankWater(id: string): TerritoryState {
  return {
    id,
    owner: "open",
    levy: 0,
    bowmen: 0,
    knights: 0,
    dragons: 0,
    beasts: 0,
    castle: false,
    mine: false,
    port: false,
    market: false,
    road: false,
    castleRank: 0,
    mineRank: 0,
    portRank: 0,
    marketRank: 0,
    farm: false,
    farmRank: 0,
    ships: 0,
    warships: 0,
    rams: 0,
    catapults: 0,
    ladders: 0,
    towers: 0,
    scorpions: 0,
    wallRank: 0,
    outerWallRank: 0,
    keepRank: 0,
    towerRank: 0,
    moatRank: 0,
    scorpionRank: 0,
    fort: 0,
    dragonTier: 0,
    breach: 0,
    besiegedFrom: null,
    pressure: 0,
    population: 0,
  };
}
