export type ContinentId = "na" | "ca" | "sa" | "eu" | "af" | "me" | "as" | "oc";

export type EmpireId =
  | "atlantis"
  | "lumuria"
  | "eldorado"
  | "aztec"
  | "asgard"
  | "tartaria"
  | "egypt"
  | "babylon"
  | "cape"
  | "patagonia"
  | "gondwana"
  | "thule";

export const PLAYER_COUNT = 12;
export type PlayerId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SAVE_VERSION = 45;
export const WIN_CONTINENTS = 5;
export const TURN_LIMIT = 200;
export const GAME_TAGLINE = "Five continents write the age";

export const CONTINENT_NAMES: Record<ContinentId, string> = {
  na: "North America",
  ca: "Central America",
  sa: "South America",
  eu: "Europe",
  af: "Africa",
  me: "Middle East",
  as: "Asia",
  oc: "Oceania",
};

export const HOUSES: readonly EmpireId[] = [
  "atlantis",
  "lumuria",
  "eldorado",
  "aztec",
  "asgard",
  "tartaria",
  "egypt",
  "babylon",
  "cape",
  "patagonia",
  "gondwana",
  "thule",
] as const;

export const CAPITOL: Record<EmpireId, string> = {
  atlantis: "roma",
  lumuria: "india",
  eldorado: "amazon",
  aztec: "mexico",
  asgard: "alaska",
  tartaria: "cathay",
  egypt: "nile",
  babylon: "mesopotamia",
  cape: "cape",
  patagonia: "patagonia",
  gondwana: "coral",
  thule: "greenland",
};

export type Difficulty = "easy" | "normal" | "hard";
export type Opening = "capital";
/** Men who wake on each capital, before house bonuses. */
export const START_LEVY: Record<Difficulty, number> = { easy: 6, normal: 8, hard: 10 };
/** House beasts who wake on each capital. */
export const START_BEASTS: Record<Difficulty, number> = { easy: 3, normal: 2, hard: 1 };

export type UnitKind = "levy" | "knight" | "dragon" | "beast";

export type JobKind = "castle" | "mine" | "port" | "ship" | "market" | "road" | "farm";

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
  homes: readonly string[];
  color: string;
  blurb: string;
  /** Extra wood on owned African lands (Karoo). */
  woodOnAf?: boolean;
  /** Extra timber on owned Asian lands (Lemuria). */
  woodOnAs?: boolean;
  /** Extra timber on owned North American lands (Asgard). */
  woodOnNa?: boolean;
  /** Extra stone on owned South American lands (Patagonia). */
  stoneOnSa?: boolean;
  /** Extra stone on owned North American lands (Nord). */
  stoneOnNa?: boolean;
  /** Extra stone on owned European lands (Atlantis). */
  stoneOnEu?: boolean;
  /** Extra stone on owned Asian lands (Tartaria). */
  stoneOnAs?: boolean;
  /** Extra gold on owned Oceanian lands (Sahul). */
  goldOnOc?: boolean;
  /** Extra gold on owned Central American lands (Aztec). */
  goldOnCa?: boolean;
  /** Extra gold on owned Middle Eastern lands (Babylon). */
  goldOnMe?: boolean;
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
}

export interface Job {
  id: string;
  kind: JobKind;
  territoryId: string;
  player: PlayerId;
  remaining: number;
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
  log: string[];
  marchFrom: string | null;
  winner: PlayerId | null;
  nextJobId: number;
}

export type AiAction =
  | { type: "end" }
  | { type: "train"; territoryId: string; kind: UnitKind }
  | { type: "build"; territoryId: string; kind: JobKind }
  | { type: "march"; from: string; to: string; levy: number; knights: number; dragons: number; beasts: number }
  | { type: "card"; card: CardId; territoryId?: string };

export interface HostForce {
  levy: number;
  knights: number;
  dragons: number;
  beasts: number;
}

export const UNIT_COST: Record<UnitKind, { gold: number; wood: number; stone: number; metal: number }> = {
  levy: { gold: 2, wood: 0, stone: 0, metal: 1 },
  knight: { gold: 4, wood: 0, stone: 0, metal: 1 },
  dragon: { gold: 25, wood: 0, stone: 0, metal: 0 },
  /** Fallback only — live beast gold is per-empire. */
  beast: { gold: 7, wood: 0, stone: 0, metal: 0 },
};

export const UNIT_ATK: Record<UnitKind, number> = {
  levy: 1,
  knight: 2,
  beast: 7,
  dragon: 25,
};

export const UNIT_DEF: Record<UnitKind, number> = {
  levy: 1,
  knight: 2,
  beast: 8,
  dragon: 25,
};

/** Attack value — used where a single strength is needed. */
export const UNIT_STR = UNIT_ATK;

export const CITY_DEF = 5;
export const WALL_DEF = 12;
/** Extra defence per wall rank after the first. */
export const WALL_IMPROVE = 8;
export const TRIBAL_DEF = 1;
export const DRAGON_CAP = 1;
/** Highest rank for markets, ports, mines and walls. */
export const WORKS_CAP = 3;
/** Keels per harbour rank (I=2, II=4, III=6). A beach without a port berths 1. */
export const SHIPS_PER_RANK = 2;
export const SHIPS_CAP = WORKS_CAP * SHIPS_PER_RANK;
/** Silver wages per this many standing men; a host always costs at least 1. */
export const LEVY_COMMISSION = 2;
/** Silver wages per standing house beast. Hunt with them or the mint eats the court. */
export const BEAST_WAGE = 3;
/** Flat gold on any capture, plus 1 per defending soldier. */
export const CAPTURE_GOLD_BASE = 2;
/** Extra gold on top of the continent bonus for cracking a locked continent. */
export const CONTINENT_BREAK_GOLD = 6;
/** Silver minted each watch by any held capital. */
export const CAPITAL_SILVER = 5;
/** Silver from each owned land. */
export const SILVER_PER_LAND = 2;
/** Citizens fed by this many food. */
export const FOOD_PER_POP = 2;

export const CONTINENT_BONUS: Record<ContinentId, number> = {
  na: 5,
  ca: 3,
  sa: 4,
  eu: 5,
  af: 4,
  me: 4,
  as: 5,
  oc: 3,
};
