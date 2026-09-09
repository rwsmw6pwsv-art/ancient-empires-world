export type ContinentId = "at" | "nw" | "ne" | "ca" | "sa" | "eu" | "an" | "af" | "me" | "aw" | "ae" | "ss" | "oc";

export type EmpireId =
  | "atlantis"
  | "lumuria"
  | "eldorado"
  | "aztec"
  | "asgard"
  | "tartaria"
  | "egypt"
  | "siberia"
  | "cape"
  | "gondwana"
  | "thule"
  | "alaska"
  | "sumer";

export const PLAYER_COUNT = 13;
export type PlayerId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const SAVE_VERSION = 84;
export const WIN_CONTINENTS = 7;
/** Sim/safety cap only — the campaign has no turn limit. */
export const TURN_LIMIT = 200;
export const GAME_TAGLINE = "Seven regions write the age";

export const CONTINENT_NAMES: Record<ContinentId, string> = {
  at: "Antarctica",
  nw: "West America",
  ne: "East America",
  ca: "Central America",
  sa: "South America",
  eu: "Europe",
  an: "North Africa",
  af: "South Africa",
  me: "Middle East",
  aw: "West Asia",
  ae: "East Asia",
  ss: "South Asia",
  oc: "Oceania",
};

export const NA_REGIONS: readonly ContinentId[] = ["nw", "ne"];
export const AS_REGIONS: readonly ContinentId[] = ["aw", "ae", "ss"];
export const AF_REGIONS: readonly ContinentId[] = ["an", "af"];
export const AT_REGIONS: readonly ContinentId[] = ["at"];

export const HOUSES: readonly EmpireId[] = [
  "asgard",
  "eldorado",
  "aztec",
  "tartaria",
  "siberia",
  "lumuria",
  "egypt",
  "sumer",
  "cape",
  "gondwana",
  "thule",
  "alaska",
  "atlantis",
] as const;

export const CAPITOL: Record<EmpireId, string> = {
  asgard: "asgard",
  eldorado: "pantanal",
  aztec: "volcan",
  tartaria: "gobi",
  siberia: "siberia",
  lumuria: "irrawaddy",
  egypt: "sahel",
  sumer: "tigris",
  cape: "karoo",
  gondwana: "sahul",
  thule: "nord",
  alaska: "yukon",
  atlantis: "atlantis",
};

export type Difficulty = "easy" | "normal" | "hard";
export type Opening = "capital";
/** Warriors who wake on each capital. */
export const START_LEVY: Record<Difficulty, number> = { easy: 10, normal: 5, hard: 3 };
/** Archers who wake on each capital. */
export const START_BOWMEN: Record<Difficulty, number> = { easy: 10, normal: 5, hard: 3 };
/** Knights who wake on each capital. */
export const START_KNIGHTS: Record<Difficulty, number> = { easy: 5, normal: 3, hard: 2 };
/** House beasts who wake on each capital. */
export const START_BEASTS: Record<Difficulty, number> = { easy: 3, normal: 2, hard: 1 };

export type UnitKind = "levy" | "bowman" | "knight" | "dragon" | "beast";
export type SiegeKind = "ram" | "catapult" | "ladder" | "tower";

export type JobKind = "castle" | "mine" | "port" | "ship" | "market" | "road" | "farm" | "scorpion" | "walls" | "outer-walls" | "keep-works" | "towers" | "moats" | SiegeKind | UnitKind;

export function isTrainKind(kind: string): kind is UnitKind {
  return kind === "levy" || kind === "bowman" || kind === "knight" || kind === "dragon" || kind === "beast";
}

export const SIEGE_KINDS: readonly SiegeKind[] = ["ram", "catapult", "ladder", "tower"] as const;

export function isSiegeKind(kind: string): kind is SiegeKind {
  return kind === "ram" || kind === "catapult" || kind === "ladder" || kind === "tower";
}

export const UNIT_LABEL: Record<UnitKind, string> = {
  levy: "Warrior",
  bowman: "Archer",
  knight: "Knight",
  dragon: "Dragon",
  beast: "Beast",
};

export const UNIT_LABEL_PLURAL: Record<UnitKind, string> = {
  levy: "Warriors",
  bowman: "Archers",
  knight: "Knights",
  dragon: "Dragons",
  beast: "Beasts",
};

export type CardId = "levy" | "forge" | "tide" | "raid" | "wall";

export interface TerritoryDef {
  id: string;
  name: string;
  continent: ContinentId;
  coastal: boolean;
  path: string;
  labelX: number;
  labelY: number;
}

export interface EmpireDef {
  id: EmpireId;
  name: string;
  adjective: string;
  capitol: string;
  region: ContinentId;
  homes: readonly string[];
  color: string;
  blurb: string;
  /** Extra wood on owned African lands (Karoo). */
  woodOnAf?: boolean;
  /** Extra timber on owned Asian lands (Shangri-La — North and South Asia). */
  woodOnAs?: boolean;
  /** Extra timber on owned American lands (Nord — North America). */
  woodOnNa?: boolean;
  /** Extra stone on owned American lands (Nord — North America). */
  stoneOnNa?: boolean;
  /** Extra stone on owned Antarctic lands (Asgard). */
  stoneOnAt?: boolean;
  /** Extra stone on owned European lands (Atlantis). */
  stoneOnEu?: boolean;
  /** Extra stone on owned Asian lands (Kunlun — North and South Asia). */
  stoneOnAs?: boolean;
  /** Extra gold on owned Oceanian lands (Sahul). */
  goldOnOc?: boolean;
  /** Extra gold on owned Central American lands (Mayan). */
  goldOnCa?: boolean;
  /** Extra grain on owned African lands (Egypt). */
  foodOnAf?: boolean;
  shipWoodCost?: number;
  mineGoldCost?: number;
  mineStoneCost?: number;
  portGoldCost?: number;
  castleCost?: number;
  farmGoldCost?: number;
  marketGoldCost?: number;
  capitalPort?: boolean;
  /** Capital begins with a mine (inland seats). */
  capitalMine?: boolean;
  /** Capital begins with a keel in the harbour (isolated island seats). */
  startShip?: boolean;
}

export interface TerritoryState {
  id: string;
  owner: PlayerId | "barbarian";
  levy: number;
  bowmen: number;
  knights: number;
  dragons: number;
  beasts: number;
  castle: boolean;
  mine: boolean;
  port: boolean;
  market: boolean;
  road: boolean;
  castleRank: number;
  mineRank: number;
  portRank: number;
  marketRank: number;
  farm: boolean;
  farmRank: number;
  ships: number;
  rams: number;
  catapults: number;
  ladders: number;
  towers: number;
  scorpions: number;
  /** Inner walls 0–5 (wood → colossal stone). */
  wallRank: number;
  /** Outer walls 0–5. */
  outerWallRank: number;
  /** Keep 0–5. */
  keepRank: number;
  /** Wall towers 0–5. */
  towerRank: number;
  /** Moats 0–3. */
  moatRank: number;
  /** Scorpion battery 0–5. */
  scorpionRank: number;
  /** 0 none, 1 wooden walls, 2 stone walls, 3 wooden keep, 4 stone keep. */
  fort: number;
  /** 0 none, 1 normal, 2 special (capital), 3 rare (region). */
  dragonTier: number;
  /** Catapult hits already landed on this city before the assault. */
  breach: number;
  /** Neighbouring city that currently lays siege here. */
  besiegedFrom: string | null;
  pressure: number;
  population: number;
}

export interface PlayerState {
  id: PlayerId;
  empire: EmpireId;
  gold: number;
  silver: number;
  wood: number;
  stone: number;
  metal: number;
  food: number;
  lastLands: number;
  alive: boolean;
  human: boolean;
  cards: CardId[];
  specialDragons: number;
  rareDragons: number;
}

export interface Job {
  id: string;
  kind: JobKind;
  territoryId: string;
  player: PlayerId;
  remaining: number;
  /** Original watches when the job was queued — used for the progress bar. */
  total: number;
  gold: number;
  wood: number;
  stone: number;
  metal: number;
}

export interface MarchOrder {
  id: string;
  player: PlayerId;
  from: string;
  to: string;
  levy: number;
  bowmen: number;
  knights: number;
  dragons: number;
  beasts: number;
  rams: number;
  catapults: number;
  ladders: number;
  towers: number;
  ships: number;
  remaining: number;
  /** True when independent tribes are the column — player is unused for ownership. */
  tribal?: boolean;
}

export interface PulseEvent {
  type: "train" | "build" | "march";
  player: PlayerId;
  fromId?: string;
  toId: string;
  kind?: string;
  text: string;
}

export type Phase = "play" | "gameover";

export interface Clock {
  turn: number;
  currentPlayer: PlayerId;
}

export interface GameState {
  version: number;
  seed: number;
  difficulty: Difficulty;
  opening: Opening;
  clock: Clock;
  phase: Phase;
  players: PlayerState[];
  territories: Record<string, TerritoryState>;
  jobs: Job[];
  marches: MarchOrder[];
  arrivals: MarchOrder[];
  events: PulseEvent[];
  log: string[];
  marchFrom: string | null;
  winner: PlayerId | null;
  nextJobId: number;
}

export type AiAction =
  | { type: "end" }
  | { type: "train"; territoryId: string; kind: UnitKind }
  | { type: "build"; territoryId: string; kind: JobKind }
  | { type: "siege"; from: string; to: string }
  | { type: "march"; from: string; to: string; levy: number; bowmen: number; knights: number; dragons: number; beasts: number }
  | { type: "card"; card: CardId; territoryId?: string };

export interface HostForce {
  levy: number;
  bowmen?: number;
  knights: number;
  dragons: number;
  beasts: number;
}

export interface SiegeStock {
  rams: number;
  catapults: number;
  ladders: number;
  towers: number;
}

export const EMPTY_HOST: HostForce = { levy: 0, bowmen: 0, knights: 0, dragons: 0, beasts: 0 };

export const UNIT_COST: Record<UnitKind, { gold: number; wood: number; stone: number; metal: number }> = {
  levy: { gold: 2, wood: 0, stone: 0, metal: 1 },
  bowman: { gold: 2, wood: 1, stone: 0, metal: 1 },
  knight: { gold: 4, wood: 0, stone: 0, metal: 1 },
  dragon: { gold: 25, wood: 0, stone: 0, metal: 0 },
  /** Fallback only — live beast gold is per-empire. */
  beast: { gold: 7, wood: 0, stone: 0, metal: 0 },
};

export const UNIT_ATK: Record<UnitKind, number> = {
  levy: 2,
  bowman: 1,
  knight: 2,
  beast: 7,
  dragon: 50,
};

export const UNIT_DEF: Record<UnitKind, number> = {
  levy: 1,
  bowman: 3,
  knight: 2,
  beast: 8,
  dragon: 50,
};

/** Hit points per body on the field. */
export const UNIT_HP: Record<UnitKind, number> = {
  levy: 2,
  bowman: 1,
  knight: 2,
  beast: 3,
  dragon: 10,
};

/** Attack value — used where a single strength is needed. */
export const UNIT_STR = UNIT_ATK;

export const CITY_DEF = 5;
export const WALL_DEF = 12;
/** Extra defence per wall rank after the first. */
export const WALL_IMPROVE = 8;
export const TRIBAL_DEF = 4;
export const FORT_CAP = 4;
export const FORT_LABEL = ["None", "Wooden walls", "Stone walls", "Wooden keep", "Stone keep"] as const;
export const FORT_DEF = [0, 6, 12, 20, 28] as const;
export const FORT_COST: Record<2 | 3 | 4, { gold: number; wood: number; stone: number; metal: number }> = {
  2: { gold: 4, wood: 2, stone: 4, metal: 0 },
  3: { gold: 6, wood: 5, stone: 2, metal: 0 },
  4: { gold: 8, wood: 2, stone: 6, metal: 0 },
};
export const FORT_TURNS: Record<2 | 3 | 4, number> = { 2: 1, 3: 2, 4: 2 };
export const UNIT_TURNS: Record<UnitKind, number> = {
  levy: 1,
  bowman: 1,
  knight: 2,
  beast: 3,
  dragon: 5,
};
export const DRAGON_CAP = 99;
/** Bodies of each kind that can stand a city, a drill host, or the field. */
export const UNIT_CAP: Record<UnitKind, number> = {
  levy: 100,
  bowman: 50,
  knight: 25,
  beast: 25,
  dragon: DRAGON_CAP,
};
/** Highest rank for markets, ports, mines and walls. */
export const WORKS_CAP = 3;
/** Keels per harbour rank (I=2, II=4, III=6). A beach without a port berths 1. */
export const SHIPS_PER_RANK = 2;
export const SHIPS_CAP = WORKS_CAP * SHIPS_PER_RANK;
/** Siege engines stored on a city. */
export const SIEGE_CAP = 5;
/** At most this many of each engine march with a host. */
export const SIEGE_BRING = 5;
/** Engines cost nothing — they take time once a neighbour is under siege. */
export const SIEGE_COST: Record<SiegeKind, { gold: number; wood: number; stone: number; metal: number }> = {
  ram: { gold: 0, wood: 0, stone: 0, metal: 0 },
  catapult: { gold: 0, wood: 0, stone: 0, metal: 0 },
  ladder: { gold: 0, wood: 0, stone: 0, metal: 0 },
  tower: { gold: 0, wood: 0, stone: 0, metal: 0 },
};
export const SIEGE_TURNS: Record<SiegeKind, number> = {
  ram: 1,
  ladder: 1,
  tower: 3,
  catapult: 5,
};
export const SIEGE_LABEL: Record<SiegeKind, string> = {
  ram: "Ram",
  catapult: "Catapult",
  ladder: "Ladders",
  tower: "Siege tower",
};
export const TOWER_CARGO = { levy: 20, bowmen: 10, knights: 5, beasts: 5 } as const;
export const SCORPION_CAP = 2;
export const SCORPION_TURNS = 2;
export const SCORPION_COST = { gold: 3, wood: 2, stone: 0, metal: 2 };
/** Silver wages per this many standing men; a host always costs at least 1. */
export const LEVY_COMMISSION = 2;
/** Silver wages per standing house beast. Hunt with them or the mint eats the empire. */
export const BEAST_WAGE = 3;
/** Flat gold on any capture, plus 1 per defending soldier. */
export const CAPTURE_GOLD_BASE = 2;
/** Extra gold on top of the region bonus for cracking a locked region. */
export const CONTINENT_BREAK_GOLD = 6;
/** Silver minted each watch by any held capital. */
export const CAPITAL_SILVER = 5;
/** Silver from each owned land. */
export const SILVER_PER_LAND = 2;
/** Citizens fed by this many food. */
export const FOOD_PER_POP = 2;

export const CONTINENT_BONUS: Record<ContinentId, number> = {
  at: 3,
  nw: 3,
  ne: 3,
  ca: 3,
  sa: 4,
  eu: 5,
  an: 4,
  af: 4,
  me: 4,
  aw: 3,
  ae: 3,
  ss: 3,
  oc: 3,
};
