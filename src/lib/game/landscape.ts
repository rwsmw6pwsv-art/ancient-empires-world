import type { ContinentId, EmpireId } from "./types";

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
  | "hippo";

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

export const PROP_SRC = {
  city: "/map/props/city.png",
  castle: "/map/props/castle.png",
  camp: "/map/props/camp.svg",
  walls: "/map/props/walls.png",
  port: "/map/props/port.png",
  mine: "/map/props/mine.png",
  market: "/map/props/market.png",
  road: "/map/props/road.svg",
  farm: "/map/props/food.svg",
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

export const CAPITAL_SRC: Record<EmpireId, string> = {
  atlantis: "/map/props/capitals/atlantis.svg",
  lumuria: "/map/props/capitals/lumuria.svg",
  eldorado: "/map/props/capitals/eldorado.svg",
  aztec: "/map/props/capitals/aztec.svg",
  asgard: "/map/props/capitals/asgard.svg",
  tartaria: "/map/props/capitals/tartaria.svg",
  egypt: "/map/props/capitals/egypt.svg",
  babylon: "/map/props/capitals/babylon.svg",
  cape: "/map/props/capitals/cape.svg",
  patagonia: "/map/props/capitals/patagonia.svg",
  gondwana: "/map/props/capitals/gondwana.svg",
  thule: "/map/props/capitals/thule.svg",
};

export const CONTINENT_TOWN_SRC: Record<ContinentId, string> = {
  na: "/map/props/cities/na-town.svg",
  ca: "/map/props/cities/ca-town.svg",
  sa: "/map/props/cities/sa-town.svg",
  eu: "/map/props/cities/eu-town.svg",
  af: "/map/props/cities/af-town.svg",
  me: "/map/props/cities/me-town.svg",
  as: "/map/props/cities/as-town.svg",
  oc: "/map/props/cities/oc-town.svg",
};

export const CONTINENT_CITY_SRC: Record<ContinentId, string> = {
  na: "/map/props/cities/na.svg",
  ca: "/map/props/cities/ca.svg",
  sa: "/map/props/cities/sa.svg",
  eu: "/map/props/cities/eu.svg",
  af: "/map/props/cities/af.svg",
  me: "/map/props/cities/me.svg",
  as: "/map/props/cities/as.svg",
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
};

export type BeastId =
  | "direwolf"
  | "rhino"
  | "caiman"
  | "jaguar"
  | "buffalo"
  | "lion"
  | "elephant"
  | "crocodile"
  | "siberian-tiger"
  | "grizzly"
  | "polar-bear"
  | "hippo";

export interface BeastDef {
  id: BeastId;
  name: string;
  atk: number;
  def: number;
  cost: number;
}

export const EMPIRE_BEAST: Record<EmpireId, BeastDef> = {
  atlantis: { id: "direwolf", name: "Direwolves", atk: 16, def: 8, cost: 8 },
  lumuria: { id: "rhino", name: "Rhinos", atk: 14, def: 10, cost: 8 },
  eldorado: { id: "caiman", name: "Black caiman", atk: 13, def: 8, cost: 7 },
  aztec: { id: "jaguar", name: "Jaguars", atk: 13, def: 6, cost: 6 },
  asgard: { id: "buffalo", name: "Buffalo", atk: 13, def: 8, cost: 7 },
  egypt: { id: "lion", name: "Lions", atk: 14, def: 7, cost: 7 },
  babylon: { id: "elephant", name: "Elephants", atk: 16, def: 10, cost: 10 },
  gondwana: { id: "crocodile", name: "Crocodiles", atk: 13, def: 8, cost: 7 },
  tartaria: { id: "siberian-tiger", name: "Siberian tigers", atk: 15, def: 9, cost: 9 },
  patagonia: { id: "grizzly", name: "Grizzly bears", atk: 15, def: 9, cost: 9 },
  thule: { id: "polar-bear", name: "Polar bears", atk: 16, def: 10, cost: 10 },
  cape: { id: "hippo", name: "Hippos", atk: 15, def: 10, cost: 9 },
};

export const BEAST_SRC: Record<BeastId, string> = {
  direwolf: "/map/fauna/direwolf.png",
  rhino: "/map/fauna/rhino.png",
  caiman: "/map/fauna/caiman.png",
  jaguar: "/map/fauna/jaguar.png",
  buffalo: "/map/fauna/buffalo.png",
  lion: "/map/fauna/lion.png",
  elephant: "/map/fauna/elephant.png",
  crocodile: "/map/fauna/crocodile.png",
  "siberian-tiger": "/map/fauna/siberian-tiger.png",
  grizzly: "/map/fauna/grizzly.png",
  "polar-bear": "/map/fauna/polar-bear.png",
  hippo: "/map/fauna/hippo.png",
};

export const BEAST_LABEL: Record<BeastId, string> = {
  direwolf: "Direwolves",
  rhino: "Rhinos",
  caiman: "Black caiman",
  jaguar: "Jaguars",
  buffalo: "Buffalo",
  lion: "Lions",
  elephant: "Elephants",
  crocodile: "Crocodiles",
  "siberian-tiger": "Siberian tigers",
  grizzly: "Grizzly bears",
  "polar-bear": "Polar bears",
  hippo: "Hippos",
};

export function beastOf(empire: EmpireId): BeastDef {
  return EMPIRE_BEAST[empire];
}

export const OCEAN_LABELS: { name: string; x: number; y: number }[] = [
  { name: "ARCTIC OCEAN", x: 780, y: 36 },
  { name: "PACIFIC OCEAN", x: 90, y: 390 },
  { name: "PACIFIC OCEAN", x: 1580, y: 410 },
  { name: "ATLANTIC OCEAN", x: 520, y: 430 },
  { name: "INDIAN OCEAN", x: 1120, y: 650 },
  { name: "SOUTHERN OCEAN", x: 860, y: 880 },
];

export const SEA_LIFE: { fauna: FaunaId; x: number; y: number; w: number; h: number }[] = [
  { fauna: "whale", x: 96, y: 250, w: 36, h: 28 },
  { fauna: "whale", x: 1548, y: 280, w: 36, h: 28 },
  { fauna: "dolphin", x: 530, y: 510, w: 26, h: 20 },
  { fauna: "whale", x: 1088, y: 710, w: 34, h: 26 },
  { fauna: "dolphin", x: 1488, y: 540, w: 26, h: 20 },
  { fauna: "dolphin", x: 240, y: 560, w: 24, h: 18 },
];

export const LANDSCAPE: Record<string, LandscapeDef> = {
  alaska: { terrain: "tundra", resource: "metal", wonder: "meadhall", fauna: "buffalo" },
  yukon: { terrain: "tundra", resource: "silver", fauna: "moose" },
  hudson: { terrain: "tundra", resource: "metal", fauna: "polar-bear" },
  labrador: { terrain: "forest", resource: "wood", fauna: "moose" },
  greenland: { terrain: "ice", resource: "stone", wonder: "icewall", fauna: "polar-bear" },
  cascade: { terrain: "mountain", resource: "wood", fauna: "moose" },
  prairie: { terrain: "grass", resource: "food", fauna: "bison" },
  heartland: { terrain: "grass", resource: "gold", fauna: "bison" },
  seaboard: { terrain: "forest", resource: "food", fauna: "bison" },

  hawaii: { terrain: "jungle", resource: "wood", fauna: "dolphin" },
  texas: { terrain: "savanna", resource: "silver", fauna: "bison" },
  sierra: { terrain: "mountain", resource: "metal", fauna: "tiger" },
  mexico: { terrain: "mountain", resource: "gold", wonder: "teocalli", fauna: "jaguar" },
  yucatan: { terrain: "jungle", resource: "wood", fauna: "tiger" },
  panama: { terrain: "jungle", resource: "gold", fauna: "tiger" },
  caribbean: { terrain: "jungle", resource: "wood", fauna: "dolphin" },

  grenada: { terrain: "jungle", resource: "silver", fauna: "jaguar" },
  amazon: { terrain: "jungle", resource: "gold", wonder: "eldorado", fauna: "caiman" },
  guiana: { terrain: "jungle", resource: "gold", fauna: "macaw" },
  andes: { terrain: "mountain", resource: "metal", fauna: "llama" },
  cerrado: { terrain: "savanna", resource: "food", fauna: "jaguar" },
  brazil: { terrain: "jungle", resource: "wood", fauna: "jaguar" },
  pampas: { terrain: "grass", resource: "food", fauna: "llama" },
  patagonia: { terrain: "steppe", resource: "stone", wonder: "megalith", fauna: "grizzly" },

  fjords: { terrain: "mountain", resource: "metal", fauna: "boar" },
  highlands: { terrain: "mountain", resource: "metal", fauna: "boar" },
  gaul: { terrain: "grass", resource: "food", fauna: "boar" },
  rhine: { terrain: "forest", resource: "wood", fauna: "boar" },
  slavic: { terrain: "forest", resource: "wood", fauna: "boar" },
  iberia: { terrain: "mediterranean", resource: "silver", fauna: "boar" },
  roma: { terrain: "mediterranean", resource: "stone", wonder: "pantheon", fauna: "direwolf" },
  balkans: { terrain: "mountain", resource: "metal", fauna: "boar" },
  volga: { terrain: "steppe", resource: "gold", fauna: "boar" },

  maghreb: { terrain: "desert", resource: "gold", fauna: "camel" },
  nile: { terrain: "desert", resource: "gold", wonder: "pyramids", fauna: "lion" },
  guinea: { terrain: "jungle", resource: "gold", fauna: "elephant" },
  congo: { terrain: "jungle", resource: "wood", fauna: "gorilla" },
  horn: { terrain: "savanna", resource: "food", fauna: "lion" },
  rift: { terrain: "savanna", resource: "silver", fauna: "giraffe" },
  cape: { terrain: "mediterranean", resource: "gold", wonder: "lighthouse", fauna: "hippo" },
  madagascar: { terrain: "jungle", resource: "wood", fauna: "lion" },

  anatolia: { terrain: "mountain", resource: "metal", fauna: "camel" },
  arabia: { terrain: "desert", resource: "gold", fauna: "camel" },
  gulf: { terrain: "desert", resource: "silver", fauna: "camel" },
  mesopotamia: { terrain: "grass", resource: "food", wonder: "gardens", fauna: "elephant" },
  persia: { terrain: "desert", resource: "gold", fauna: "camel" },
  armenia: { terrain: "mountain", resource: "metal", fauna: "camel" },
  media: { terrain: "mountain", resource: "gold", fauna: "camel" },
  steppe: { terrain: "steppe", resource: "gold", fauna: "camel" },

  siberia: { terrain: "tundra", resource: "metal", fauna: "siberian-tiger" },
  nippon: { terrain: "forest", resource: "wood", fauna: "elephant" },
  yakutia: { terrain: "ice", resource: "silver", fauna: "polar-bear" },
  gobi: { terrain: "desert", resource: "stone", fauna: "camel" },
  cathay: { terrain: "grass", resource: "food", wonder: "pagoda", fauna: "panda" },
  canton: { terrain: "jungle", resource: "wood", fauna: "elephant" },
  india: { terrain: "savanna", resource: "gold", wonder: "stupa", fauna: "rhino" },
  indochina: { terrain: "jungle", resource: "wood", fauna: "elephant" },

  malaya: { terrain: "jungle", resource: "wood", fauna: "wild-dog" },
  papua: { terrain: "jungle", resource: "wood", fauna: "wild-dog" },
  outback: { terrain: "desert", resource: "gold", fauna: "wild-dog" },
  westralia: { terrain: "desert", resource: "silver", fauna: "kangaroo" },
  coral: { terrain: "jungle", resource: "gold", wonder: "reefshrine", fauna: "crocodile" },
  aotearoa: { terrain: "mountain", resource: "wood", fauna: "wild-dog" },
  polynesia: { terrain: "jungle", resource: "gold", fauna: "dolphin" },
  tasmania: { terrain: "forest", resource: "wood", fauna: "wild-dog" },
};

export function landscapeOf(id: string): LandscapeDef {
  return LANDSCAPE[id] ?? { terrain: "grass" };
}
