import { empireOf } from "./empires";
import { setDefenseRank, type DefenseKind } from "./defense";
import { createNewGame } from "./engine";
import { openRaid, type RaidState } from "./raid";
import type { EmpireId, GameState, HostForce, SiegeStock } from "./types";
import { TERRITORY_BY_ID } from "./world";
import type { BattleSide } from "./raid";

export interface DrillSetup {
  empire: EmpireId;
  foe?: EmpireId;
  side?: BattleSide;
  walls: number;
  outer: number;
  keep: number;
  towers: number;
  moats: number;
  scorpions: number;
  force: HostForce;
  siege: SiegeStock;
  garrison: HostForce;
  dragonTier: 1 | 2 | 3;
}

export const DRILL_DEFAULT: DrillSetup = {
  empire: "sumer",
  foe: "egypt",
  side: "atk",
  walls: 2,
  outer: 1,
  keep: 1,
  towers: 2,
  moats: 1,
  scorpions: 1,
  force: { levy: 10, bowmen: 6, knights: 4, beasts: 2, dragons: 0 },
  siege: { rams: 1, catapults: 1, ladders: 1, towers: 1 },
  garrison: { levy: 6, bowmen: 4, knights: 2, beasts: 1, dragons: 0 },
  dragonTier: 1,
};

export const CITY_PRESETS: { id: string; label: string; hint: string; patch: Partial<DrillSetup> }[] = [
  {
    id: "camp",
    label: "Open camp",
    hint: "No walls. A tribal village.",
    patch: { walls: 0, outer: 0, keep: 0, towers: 0, moats: 0, scorpions: 0 },
  },
  {
    id: "palisade",
    label: "Palisade",
    hint: "Wooden walls and two wooden towers.",
    patch: { walls: 1, outer: 0, keep: 0, towers: 1, moats: 0, scorpions: 0 },
  },
  {
    id: "capital",
    label: "Capital",
    hint: "Stone walls and two wooden towers — how a seat wakes.",
    patch: { walls: 2, outer: 0, keep: 0, towers: 1, moats: 0, scorpions: 0 },
  },
  {
    id: "fortress",
    label: "Fortress",
    hint: "High stone, outer ring, keep, towers, a moat and scorpions.",
    patch: { walls: 3, outer: 2, keep: 2, towers: 3, moats: 2, scorpions: 3 },
  },
  {
    id: "ring",
    label: "Ring city",
    hint: "Colossal stone, triple moats, inner and outer towers, full scorpion batteries.",
    patch: { walls: 5, outer: 5, keep: 5, towers: 5, moats: 3, scorpions: 5 },
  },
];

export const HOST_PRESETS: { id: string; label: string; force: HostForce; siege: SiegeStock }[] = [
  {
    id: "skirmish",
    label: "Skirmish",
    force: { levy: 8, bowmen: 4, knights: 2, beasts: 0, dragons: 0 },
    siege: { rams: 0, catapults: 0, ladders: 1, towers: 0 },
  },
  {
    id: "host",
    label: "Host",
    force: { levy: 12, bowmen: 6, knights: 4, beasts: 2, dragons: 0 },
    siege: { rams: 1, catapults: 1, ladders: 1, towers: 1 },
  },
  {
    id: "beasts",
    label: "Beast column",
    force: { levy: 6, bowmen: 2, knights: 2, beasts: 4, dragons: 0 },
    siege: { rams: 0, catapults: 0, ladders: 0, towers: 1 },
  },
  {
    id: "dragon",
    label: "Dragon flight",
    force: { levy: 4, bowmen: 2, knights: 1, beasts: 0, dragons: 1 },
    siege: { rams: 0, catapults: 1, ladders: 0, towers: 0 },
  },
  {
    id: "siege",
    label: "Full siege",
    force: { levy: 16, bowmen: 8, knights: 6, beasts: 3, dragons: 1 },
    siege: { rams: 1, catapults: 1, ladders: 1, towers: 1 },
  },
  {
    id: "flight",
    label: "Lone dragon",
    force: { levy: 0, bowmen: 0, knights: 0, beasts: 0, dragons: 1 },
    siege: { rams: 0, catapults: 0, ladders: 0, towers: 0 },
  },
  {
    id: "train",
    label: "Siege train",
    force: { levy: 12, bowmen: 6, knights: 4, beasts: 2, dragons: 1 },
    siege: { rams: 3, catapults: 3, ladders: 2, towers: 2 },
  },
];

export function drillFoeOf(setup: Pick<DrillSetup, "empire" | "foe">): EmpireId {
  if (setup.foe && setup.foe !== setup.empire) return setup.foe;
  return setup.empire === "egypt" ? "sumer" : "egypt";
}

export function openDrillRaid(setup: DrillSetup): { state: GameState; raid: RaidState } | null {
  const side: BattleSide = setup.side ?? "atk";
  const state = createNewGame({ empire: setup.empire, difficulty: "easy", seed: 9001 + setup.walls * 17 + setup.moats * 31 });
  const foe = drillFoeOf(setup);
  const youCap = empireOf(setup.empire).capitol;
  const foeCap = empireOf(foe).capitol;
  const fromId = side === "atk" ? youCap : foeCap;
  const destId = side === "atk" ? foeCap : youCap;
  if (!destId || destId === fromId) return null;
  const to = state.territories[destId]!;
  to.castle = setup.walls > 0 || setup.keep > 0;
  to.castleRank = Math.max(setup.walls, setup.keep);
  to.fort = setup.keep >= 2 ? 4 : setup.keep >= 1 ? 3 : setup.walls >= 2 ? 2 : setup.walls >= 1 ? 1 : 0;
  to.farm = true;
  to.market = true;
  to.mine = !(TERRITORY_BY_ID[destId]?.coastal ?? false);
  to.port = TERRITORY_BY_ID[destId]?.coastal ?? false;
  to.road = true;
  to.levy = setup.garrison.levy;
  to.bowmen = setup.garrison.bowmen ?? 0;
  to.knights = setup.garrison.knights;
  to.beasts = setup.garrison.beasts;
  to.dragons = setup.garrison.dragons;
  to.dragonTier = setup.garrison.dragons > 0 ? setup.dragonTier : 0;
  const ranks: [DefenseKind, number][] = [
    ["walls", setup.walls],
    ["outer-walls", setup.outer],
    ["keep-works", setup.keep],
    ["towers", setup.towers],
    ["moats", setup.moats],
    ["scorpion", setup.scorpions],
  ];
  for (const [kind, rank] of ranks) setDefenseRank(to, kind, rank);

  const from = state.territories[fromId]!;
  from.levy = Math.max(from.levy, setup.force.levy);
  from.bowmen = Math.max(from.bowmen ?? 0, setup.force.bowmen ?? 0);
  from.knights = Math.max(from.knights, setup.force.knights);
  from.beasts = Math.max(from.beasts ?? 0, setup.force.beasts);
  from.dragons = Math.max(from.dragons, setup.force.dragons);
  from.rams = setup.siege.rams;
  from.catapults = setup.siege.catapults;
  from.ladders = setup.siege.ladders;
  from.towers = setup.siege.towers;
  from.dragonTier = setup.force.dragons > 0 ? setup.dragonTier : from.dragonTier;
  if (setup.dragonTier >= 3) state.players[0]!.rareDragons = 1;
  else if (setup.dragonTier >= 2) state.players[0]!.specialDragons = 1;

  const raid = openRaid(state, fromId, destId, { ...setup.force }, { ...setup.siege }, side);
  if (!raid) return null;
  raid.camp = setup.walls <= 0 && setup.outer <= 0 && setup.keep <= 0;
  return { state, raid };
}
