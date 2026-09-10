import type { ContinentId, EmpireId, TerritoryState } from "./types";
import { CAPITOL } from "./types";
import { LANDSCAPE_GEN, OCEAN_LABELS as OCEAN_LABELS_GEN } from "./lands.gen";
import { TRIBAL_LANDSCAPE } from "./tribes.gen";

export type TerrainId =
  | "desert"
  | "grass"
  | "ice"
  | "mountain"
  | "jungle"
  | "forest"
  | "steppe"
  | "tundra"
  | "savanna"
  | "mediterranean";

export type ResourceId = "gold" | "silver" | "wood" | "stone" | "metal" | "food";

export type FaunaId =
  | "camel"
  | "elephant"
  | "lion"
  | "giraffe"
  | "bison"
  | "polar-bear"
  | "kangaroo"
  | "tiger"
  | "llama"
  | "moose"
  | "panda"
  | "macaw"
  | "whale"
  | "penguin"
  | "gorilla"
  | "dolphin"
  | "jaguar"
  | "boar"
  | "wild-dog"
  | "direwolf"
  | "rhino"
  | "caiman"
  | "buffalo"
  | "crocodile"
  | "siberian-tiger"
  | "grizzly"
  | "hippo"
  | "mastodon"
  | "sabertooth"
  | "mammoth"
  | "giant";

export type WonderId =
  | "pyramids"
  | "teocalli"
  | "gardens"
  | "pantheon"
  | "stupa"
  | "eldorado"
  | "meadhall"
  | "pagoda"
  | "lighthouse"
  | "megalith"
  | "reefshrine"
  | "icewall";

export interface LandscapeDef {
  terrain: TerrainId;
  resource?: ResourceId;
  wonder?: WonderId;
  fauna?: FaunaId;
}

export const TERRAIN_LABEL: Record<TerrainId, string> = {
  desert: "sandy desert",
  grass: "grassy meadows",
  ice: "ice sheet",
  mountain: "high mountains",
  jungle: "jungle canopy",
  forest: "temperate forest",
  steppe: "open steppe",
  tundra: "frozen tundra",
  savanna: "savanna",
  mediterranean: "olive hills",
};

export const RESOURCE_TINT: Record<ResourceId, string> = {
  gold: "#f0c14a",
  silver: "#d5e2ee",
  wood: "#5cbf4a",
  stone: "#d2b48c",
  metal: "#7eb8d0",
  food: "#e2d15a",
};

export const RESOURCE_LABEL: Record<ResourceId, string> = {
  gold: "gold",
  silver: "silver",
  wood: "timber",
  stone: "stone",
  metal: "metal",
  food: "grain",
};

export const FAUNA_LABEL: Record<FaunaId, string> = {
  camel: "camels",
  elephant: "elephants",
  lion: "lions",
  giraffe: "giraffes",
  bison: "bison",
  "polar-bear": "polar bears",
  kangaroo: "kangaroos",
  tiger: "tigers",
  llama: "llamas",
  moose: "moose",
  panda: "pandas",
  macaw: "macaws",
  whale: "whales",
  penguin: "penguins",
  gorilla: "gorillas",
  dolphin: "dolphins",
  jaguar: "jaguars",
  boar: "wild boars",
  "wild-dog": "wild dogs",
  direwolf: "direwolves",
  rhino: "rhinos",
  caiman: "black caiman",
  buffalo: "buffalo",
  crocodile: "crocodiles",
  "siberian-tiger": "Siberian tigers",
  grizzly: "grizzly bears",
  hippo: "hippos",
  mastodon: "mastodons",
  sabertooth: "sabertooths",
  mammoth: "mammoths",
  giant: "giants",
};

export const WONDER_LABEL: Record<WonderId, string> = {
  pyramids: "The Pyramids",
  teocalli: "The Sun Pyramid",
  gardens: "The Hanging Gardens",
  pantheon: "The Inner-Sea Temple",
  stupa: "The Monsoon Stupa",
  eldorado: "The Gilded City",
  meadhall: "The Dawn Hall",
  pagoda: "The Eastern Empire",
  lighthouse: "The Cape Light",
  megalith: "The Southern Stones",
  reefshrine: "The Coral Shrine",
  icewall: "The Ice Citadel",
};

/** Files actually on disk — savanna/mediterranean reuse a neighbour texture. */
export const TERRAIN_FILES = [
  "desert",
  "grass",
  "ice",
  "mountain",
  "jungle",
  "forest",
  "steppe",
  "tundra",
] as const;

export const TERRAIN_TEXTURE: Record<TerrainId, string> = {
  desert: "/map/terrain/desert.jpg",
  grass: "/map/terrain/grass.jpg",
  ice: "/map/terrain/ice.jpg",
  mountain: "/map/terrain/mountain.jpg",
  jungle: "/map/terrain/jungle.jpg",
  forest: "/map/terrain/forest.jpg",
  steppe: "/map/terrain/steppe.jpg",
  tundra: "/map/terrain/tundra.jpg",
  savanna: "/map/terrain/steppe.jpg",
  mediterranean: "/map/terrain/grass.jpg",
};

export const WORLD_SRC = "/map/world-v136.webp";

export const BATTLE_UNIT_SRC: Record<"levy" | "bowman" | "knight" | "dragon", string> = {
  levy: "/map/battle/levy.jpg",
  bowman: "/map/battle/bowman.jpg",
  knight: "/map/battle/knight.jpg",
  dragon: "/map/battle/dragon.jpg",
};

export const UNIT_SHEET_SRC: Record<"levy" | "bowman" | "knight" | "dragon" | "beast" | "ram" | "catapult", string> = {
  levy: "/map/battle/units/levy.png?v=4",
  bowman: "/map/battle/units/bowman.png?v=4",
  knight: "/map/battle/units/knight.png?v=4",
  dragon: "/map/battle/units/dragon.png?v=4",
  beast: "/map/battle/units/beast.png?v=4",
  ram: "/map/battle/units/ram.png?v=4",
  catapult: "/map/battle/units/catapult.png?v=4",
};

export const CITY_ART_SRC: Record<"camp" | "wood" | "stone" | "high" | "outer" | "moat1" | "moat2" | "ring", string> = {
  camp: "/map/battle/cities/camp.png?v=5",
  wood: "/map/battle/cities/wood.png?v=5",
  stone: "/map/battle/cities/stone.png?v=5",
  high: "/map/battle/cities/high.png?v=5",
  outer: "/map/battle/cities/outer.png?v=5",
  moat1: "/map/battle/cities/moat1.png?v=5",
  moat2: "/map/battle/cities/moat2.png?v=5",
  ring: "/map/battle/cities/ring.png?v=5",
};

export type CityArtId = keyof typeof CITY_ART_SRC;

/** Same pick battle mode uses: camp, palisade, stone, keep, outer ring, moats. */
export function cityArtForRanks(wallRank: number, outerWallRank: number, moatRank: number, camp = false): CityArtId {
  if (camp || (wallRank <= 0 && outerWallRank <= 0)) return "camp";
  if (moatRank >= 3) return "ring";
  if (moatRank >= 2) return "moat2";
  if (moatRank >= 1) return outerWallRank > 0 ? "moat2" : "moat1";
  if (outerWallRank >= 1) return "outer";
  if (wallRank >= 3) return "high";
  if (wallRank >= 2) return "stone";
  return "wood";
}

export function cityArtForTerritory(t: {
  owner: TerritoryState["owner"];
  wallRank?: number;
  outerWallRank?: number;
  moatRank?: number;
}): CityArtId {
  return cityArtForRanks(t.wallRank ?? 0, t.outerWallRank ?? 0, t.moatRank ?? 0, t.owner === "barbarian");
}

export function cityArtSrc(t: {
  owner: TerritoryState["owner"];
  wallRank?: number;
  outerWallRank?: number;
  moatRank?: number;
}): string {
  return CITY_ART_SRC[cityArtForTerritory(t)];
}


export const SCORPION_ART_SRC = "/map/battle/units/scorpion.png?v=4";
export const TOWER_WOOD_SRC = "/map/battle/units/tower-wood.png?v=4";
export const TOWER_STONE_SRC = "/map/battle/units/tower-stone.png?v=4";

export const DEFENSE_SRC = {
  walls: "/map/props/defense-walls.svg",
  "outer-walls": "/map/props/defense-outer.svg",
  "keep-works": "/map/props/defense-keep.svg",
  towers: "/map/props/defense-towers.svg",
  moats: "/map/props/defense-moats.svg",
  scorpion: "/map/props/defense-scorpion.svg",
} as const;

export const BATTLE_SLASH_SRC = "/map/battle/slash.jpg";

export const PROP_SRC = {
  city: "/map/props/city.png",
  town: "/map/props/town.png",
  castle: "/map/props/castle.png",
  camp: "/map/props/camp.png",
  walls: "/map/props/walls.png",
  woodwalls: "/map/props/woodwalls.png?v=ring",
  woodkeep: "/map/props/woodkeep.png",
  port: "/map/props/port.png",
  mine: "/map/props/mine.png",
  market: "/map/props/market.png",
  road: "/map/props/road.svg",
  farm: "/map/props/farm.png",
  dragon: "/map/props/dragon.png",
  knight: "/map/props/knight.png",
  scorpion: "/map/props/scorpion.jpg",
  gold: "/map/props/gold.svg?v=ingot",
  silver: "/map/props/silver.svg?v=coins",
  wood: "/map/props/wood.png",
  stone: "/map/props/stone.png",
  metal: "/map/props/metal.svg",
  food: "/map/props/food.svg",
  ship: "/map/props/ship.svg",
  warship: "/map/props/warship.svg",
  fish: "/map/props/fish.svg",
  shellfish: "/map/props/shellfish.svg",
  whale: "/map/props/whale.svg",
  treasure: "/map/props/treasure.svg",
  pyramids: "/map/props/pyramids.png",
  teocalli: "/map/props/teocalli.png",
  gardens: "/map/props/gardens.png",
  pantheon: "/map/props/pantheon.png",
  stupa: "/map/props/stupa.png",
  eldorado: "/map/props/eldorado.png",
  meadhall: "/map/props/meadhall.png",
  pagoda: "/map/props/pagoda.png",
  lighthouse: "/map/props/lighthouse.png",
  megalith: "/map/props/megalith.png",
  reefshrine: "/map/props/reefshrine.png",
  icewall: "/map/props/icewall.png",
} as const;

/** Map seat art for a fort rank: palisade, stone walls, timber keep, stone keep. */
export function fortProp(fort: number): string {
  if (fort <= 1) return PROP_SRC.woodwalls;
  if (fort === 2) return PROP_SRC.walls;
  if (fort === 3) return PROP_SRC.woodkeep;
  return PROP_SRC.castle;
}

export const SIEGE_SRC = {
  ram: "/map/props/siege/ram.jpg",
  catapult: "/map/props/siege/catapult.jpg",
  ladder: "/map/props/siege/ladder.jpg",
  tower: "/map/props/siege/tower.jpg",
} as const;

export const CAPITAL_SRC: Record<EmpireId, string> = {
  atlantis: "/map/props/capitals/atlantis.svg",
  lumuria: "/map/props/capitals/lumuria.svg",
  eldorado: "/map/props/capitals/eldorado.svg",
  aztec: "/map/props/capitals/aztec.svg",
  asgard: "/map/props/capitals/asgard.svg",
  tartaria: "/map/props/capitals/tartaria.svg",
  egypt: "/map/props/capitals/egypt.svg",
  sumer: "/map/props/capitals/sumer.svg",
  siberia: "/map/props/capitals/siberia.svg",
  cape: "/map/props/capitals/cape.svg",
  gondwana: "/map/props/capitals/gondwana.svg",
  thule: "/map/props/capitals/thule.svg",
  alaska: "/map/props/capitals/alaska.svg",
};

export const CONTINENT_TOWN_SRC: Record<ContinentId, string> = {
  at: "/map/props/cities/na-town.svg",
  nw: "/map/props/cities/na-town.svg",
  ne: "/map/props/cities/na-town.svg",
  ca: "/map/props/cities/ca-town.svg",
  sa: "/map/props/cities/sa-town.svg",
  eu: "/map/props/cities/eu-town.svg",
  an: "/map/props/cities/af-town.svg",
  af: "/map/props/cities/af-town.svg",
  me: "/map/props/cities/me-town.svg",
  aw: "/map/props/cities/as-town.svg",
  ae: "/map/props/cities/as-town.svg",
  ss: "/map/props/cities/as-town.svg",
  oc: "/map/props/cities/oc-town.svg",
};

export const CONTINENT_CITY_SRC: Record<ContinentId, string> = {
  at: "/map/props/cities/na.svg",
  nw: "/map/props/cities/na.svg",
  ne: "/map/props/cities/na.svg",
  ca: "/map/props/cities/ca.svg",
  sa: "/map/props/cities/sa.svg",
  eu: "/map/props/cities/eu.svg",
  an: "/map/props/cities/af.svg",
  af: "/map/props/cities/af.svg",
  me: "/map/props/cities/me.svg",
  aw: "/map/props/cities/as.svg",
  ae: "/map/props/cities/as.svg",
  ss: "/map/props/cities/as.svg",
  oc: "/map/props/cities/oc.svg",
};

export const FAUNA_SRC: Record<FaunaId, string> = {
  camel: "/map/fauna/camel.png",
  elephant: "/map/fauna/elephant.png",
  lion: "/map/fauna/lion.png",
  giraffe: "/map/fauna/giraffe.png",
  bison: "/map/fauna/bison.png",
  "polar-bear": "/map/fauna/polar-bear.png",
  kangaroo: "/map/fauna/kangaroo.png",
  tiger: "/map/fauna/tiger.png",
  llama: "/map/fauna/llama.png",
  moose: "/map/fauna/moose.png",
  panda: "/map/fauna/panda.png",
  macaw: "/map/fauna/macaw.png",
  whale: "/map/fauna/whale.png",
  penguin: "/map/fauna/penguin.png",
  gorilla: "/map/fauna/gorilla.png",
  dolphin: "/map/fauna/dolphin.png",
  jaguar: "/map/fauna/jaguar.png",
  boar: "/map/fauna/boar.png",
  "wild-dog": "/map/fauna/wild-dog.png",
  direwolf: "/map/fauna/direwolf.png",
  rhino: "/map/fauna/rhino.png",
  caiman: "/map/fauna/caiman.png",
  buffalo: "/map/fauna/buffalo.png",
  crocodile: "/map/fauna/crocodile.png",
  "siberian-tiger": "/map/fauna/siberian-tiger.png",
  grizzly: "/map/fauna/grizzly.png",
  hippo: "/map/fauna/hippo.png",
  mastodon: "/map/fauna/mastodon.png",
  sabertooth: "/map/fauna/sabertooth.png",
  mammoth: "/map/fauna/mammoth.png",
  giant: "/map/fauna/giant.png",
};

export type BeastId =
  | "direwolf"
  | "rhino"
  | "gorilla"
  | "jaguar"
  | "tiger"
  | "grizzly"
  | "lion"
  | "hippo"
  | "crocodile"
  | "sabertooth"
  | "mammoth"
  | "polar-bear"
  | "giant";

export interface BeastDef {
  id: BeastId;
  name: string;
  /** Damages enemy units. */
  atk: number;
  /** Knocks through walls. */
  strength: number;
  /** Movement on the field. */
  speed: number;
  /** Hit points against enemy blows. */
  health: number;
  /** How far away they start damaging enemies. */
  range: number;
  /** Alias of health for auto-resolve. */
  def: number;
  cost: number;
}

function beast(id: BeastId, name: string, atk: number, strength: number, speed: number, health: number, range: number, cost: number): BeastDef {
  return { id, name, atk, strength, speed, health, range, def: health, cost };
}

export const EMPIRE_BEAST: Record<EmpireId, BeastDef> = {
  asgard: beast("polar-bear", "Polar bear", 20, 16, 16, 17, 11, 9),
  eldorado: beast("gorilla", "Gorilla", 15, 15, 10, 18, 13, 9),
  aztec: beast("jaguar", "Jaguar", 14, 10, 17, 11, 18, 8),
  tartaria: beast("tiger", "Tiger", 17, 14, 16, 13, 15, 9),
  siberia: beast("grizzly", "Grizzly", 19, 15, 15, 16, 12, 9),
  lumuria: beast("rhino", "Rhino", 10, 18, 13, 15, 15, 10),
  egypt: beast("lion", "Lion", 15, 12, 20, 12, 14, 7),
  sumer: beast("giant", "Giant", 18, 18, 14, 15, 13, 11),
  cape: beast("hippo", "Hippo", 13, 17, 14, 15, 12, 9),
  gondwana: beast("crocodile", "Crocodile", 15, 14, 12, 20, 10, 8),
  thule: beast("sabertooth", "Sabertooth", 16, 13, 18, 15, 13, 9),
  alaska: beast("mammoth", "Mammoth", 11, 19, 11, 19, 12, 10),
  atlantis: beast("direwolf", "Direwolf", 18, 11, 19, 14, 15, 8),
};

export const BEAST_SRC: Record<BeastId, string> = {
  direwolf: "/map/fauna/direwolf.png",
  rhino: "/map/fauna/rhino.png",
  gorilla: "/map/fauna/gorilla.png",
  jaguar: "/map/fauna/jaguar.png",
  tiger: "/map/fauna/tiger.png",
  grizzly: "/map/fauna/grizzly.png",
  lion: "/map/fauna/lion.png",
  hippo: "/map/fauna/hippo.png",
  crocodile: "/map/fauna/crocodile.png",
  sabertooth: "/map/fauna/sabertooth.png?v=3",
  mammoth: "/map/fauna/mammoth.png?v=3",
  "polar-bear": "/map/fauna/polar-bear.png",
  giant: "/map/fauna/giant.png",
};

export const KING_SRC: Record<EmpireId, string> = {
  asgard: "/map/kings/asgard.jpg?v=2",
  eldorado: "/map/kings/eldorado.jpg?v=2",
  aztec: "/map/kings/aztec.jpg?v=2",
  tartaria: "/map/kings/tartaria.jpg?v=2",
  siberia: "/map/kings/siberia.jpg?v=2",
  lumuria: "/map/kings/lumuria.jpg?v=2",
  egypt: "/map/kings/egypt.jpg?v=2",
  sumer: "/map/kings/sumer.jpg?v=2",
  cape: "/map/kings/cape.jpg?v=2",
  gondwana: "/map/kings/gondwana.jpg?v=2",
  thule: "/map/kings/thule.jpg?v=2",
  alaska: "/map/kings/alaska.jpg?v=2",
  atlantis: "/map/kings/atlantis.jpg?v=2",
};

export const BEAST_LABEL: Record<BeastId, string> = {
  direwolf: "Direwolf",
  rhino: "Rhino",
  gorilla: "Gorilla",
  jaguar: "Jaguar",
  tiger: "Tiger",
  grizzly: "Grizzly",
  lion: "Lion",
  hippo: "Hippo",
  crocodile: "Crocodile",
  sabertooth: "Sabertooth",
  mammoth: "Mammoth",
  "polar-bear": "Polar bear",
  giant: "Giant",
};

export function beastOf(empire: EmpireId): BeastDef {
  return EMPIRE_BEAST[empire];
}

/** Field stats for a dragon: trained 50, special (capital) ~62, rare (region) ~87. */
export function dragonPowerFor(tier: number): number {
  if (tier >= 3) return 87;
  if (tier >= 2) return 62;
  return 50;
}

export const OCEAN_LABELS = OCEAN_LABELS_GEN;

export const SEA_LIFE: { fauna: FaunaId; x: number; y: number; w: number; h: number }[] = [
  { fauna: "whale", x: 90, y: 280, w: 36, h: 28 },
  { fauna: "whale", x: 1550, y: 320, w: 36, h: 28 },
  { fauna: "dolphin", x: 540, y: 540, w: 26, h: 20 },
  { fauna: "whale", x: 1100, y: 780, w: 34, h: 26 },
  { fauna: "dolphin", x: 1500, y: 600, w: 26, h: 20 },
  { fauna: "penguin", x: 820, y: 980, w: 24, h: 20 },
];

export const LANDSCAPE: Record<string, LandscapeDef> = {
  ...LANDSCAPE_GEN,
  ...TRIBAL_LANDSCAPE,
} as Record<string, LandscapeDef>;

const WONDER_BY_EMPIRE: Partial<Record<EmpireId, WonderId>> = {
  asgard: "icewall",
  eldorado: "eldorado",
  aztec: "teocalli",
  tartaria: "pagoda",
  lumuria: "stupa",
  egypt: "pyramids",
  sumer: "gardens",
  cape: "lighthouse",
  gondwana: "reefshrine",
  thule: "meadhall",
  atlantis: "pantheon",
};

const WONDER_AT_CAPITAL: Record<string, WonderId> = Object.fromEntries(
  (Object.entries(WONDER_BY_EMPIRE) as [EmpireId, WonderId][]).map(([empire, wonder]) => [CAPITOL[empire], wonder]),
);

export function landscapeOf(id: string): LandscapeDef {
  const base = LANDSCAPE[id] ?? { terrain: "grass" };
  const wonder = WONDER_AT_CAPITAL[id];
  if (base.wonder === wonder) return base;
  const { wonder: _old, ...rest } = base;
  return wonder ? { ...rest, wonder } : rest;
}
