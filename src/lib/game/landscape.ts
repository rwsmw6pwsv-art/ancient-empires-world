import type { ContinentId, EmpireId } from "./types";
import { LANDSCAPE_GEN, OCEAN_LABELS as OCEAN_LABELS_GEN } from "./lands.gen";

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
  | "mammoth";

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
};

export const WONDER_LABEL: Record<WonderId, string> = {
  pyramids: "The Pyramids",
  teocalli: "The Sun Pyramid",
  gardens: "The Hanging Gardens",
  pantheon: "The Inner-Sea Temple",
  stupa: "The Monsoon Stupa",
  eldorado: "The Gilded City",
  meadhall: "The Dawn Hall",
  pagoda: "The Eastern Court",
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

export const BATTLE_UNIT_SRC: Record<"levy" | "bowman" | "knight" | "dragon", string> = {
  levy: "/map/battle/levy.jpg",
  bowman: "/map/battle/bowman.jpg",
  knight: "/map/battle/knight.jpg",
  dragon: "/map/battle/dragon.jpg",
};

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
  gold: "/map/props/gold.png",
  silver: "/map/props/silver.svg",
  wood: "/map/props/wood.png",
  stone: "/map/props/stone.png",
  metal: "/map/props/metal.svg",
  food: "/map/props/food.svg",
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
};

export type BeastId =
  | "direwolf"
  | "elephant"
  | "mastodon"
  | "jaguar"
  | "tiger"
  | "grizzly"
  | "lion"
  | "hippo"
  | "crocodile"
  | "sabertooth"
  | "mammoth"
  | "polar-bear";

export interface BeastDef {
  id: BeastId;
  name: string;
  atk: number;
  def: number;
  cost: number;
}

export const EMPIRE_BEAST: Record<EmpireId, BeastDef> = {
  asgard: { id: "polar-bear", name: "Polar bear", atk: 15, def: 10, cost: 9 },
  eldorado: { id: "mastodon", name: "Mastodon", atk: 16, def: 10, cost: 10 },
  aztec: { id: "jaguar", name: "Jaguar", atk: 13, def: 6, cost: 8 },
  tartaria: { id: "tiger", name: "Tiger", atk: 15, def: 9, cost: 9 },
  siberia: { id: "grizzly", name: "Grizzly", atk: 15, def: 9, cost: 8 },
  lumuria: { id: "elephant", name: "Elephant", atk: 16, def: 10, cost: 10 },
  egypt: { id: "lion", name: "Lion", atk: 14, def: 7, cost: 7 },
  cape: { id: "hippo", name: "Hippo", atk: 15, def: 10, cost: 9 },
  gondwana: { id: "crocodile", name: "Crocodile", atk: 13, def: 8, cost: 7 },
  thule: { id: "sabertooth", name: "Sabertooth", atk: 16, def: 7, cost: 9 },
  alaska: { id: "mammoth", name: "Mammoth", atk: 16, def: 11, cost: 10 },
  atlantis: { id: "direwolf", name: "Direwolf", atk: 16, def: 8, cost: 8 },
};

export const BEAST_SRC: Record<BeastId, string> = {
  direwolf: "/map/fauna/direwolf.png",
  elephant: "/map/fauna/elephant.png",
  mastodon: "/map/fauna/mastodon.png?v=2",
  jaguar: "/map/fauna/jaguar.png",
  tiger: "/map/fauna/tiger.png",
  grizzly: "/map/fauna/grizzly.png",
  lion: "/map/fauna/lion.png",
  hippo: "/map/fauna/hippo.png",
  crocodile: "/map/fauna/crocodile.png",
  sabertooth: "/map/fauna/sabertooth.png?v=2",
  mammoth: "/map/fauna/mammoth.png?v=2",
  "polar-bear": "/map/fauna/polar-bear.png",
};

export const BEAST_LABEL: Record<BeastId, string> = {
  direwolf: "Direwolf",
  elephant: "Elephant",
  mastodon: "Mastodon",
  jaguar: "Jaguar",
  tiger: "Tiger",
  grizzly: "Grizzly",
  lion: "Lion",
  hippo: "Hippo",
  crocodile: "Crocodile",
  sabertooth: "Sabertooth",
  mammoth: "Mammoth",
  "polar-bear": "Polar bear",
};

export function beastOf(empire: EmpireId): BeastDef {
  return EMPIRE_BEAST[empire];
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

export const LANDSCAPE: Record<string, LandscapeDef> = LANDSCAPE_GEN as Record<string, LandscapeDef>;

export function landscapeOf(id: string): LandscapeDef {
  return LANDSCAPE[id] ?? { terrain: "grass" };
}
