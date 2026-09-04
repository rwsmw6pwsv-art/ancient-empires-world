import { HOUSES, PLAYER_COUNT, SAVE_VERSION, type EmpireId, type GameState, type TerritoryState } from "./types";

const KEY = "ancient-empires.save";
const BACKUP = "ancient-empires.save.bak";

/** Lands added after a save was written. Keep in sync with world.ts splits. Never import world.ts here. */
const ADDED_LANDS: readonly string[] = [
  "baffin",
  "baikal",
  "chukotka",
  "himalaya",
  "sahel",
  "altai",
  "ontario",
  "tarim",
  "aleut",
  "kasai",
  "sahara",
  "burma",
  "mackenzie",
  "nyasa",
  "oaxaca",
  "atacama",
  "namib",
  "florida",
  "jiangnan",
  "baja",
  "korea",
  "columbia",
  "ural",
  "somali",
  "acadia",
  "yunnan",
  "hejaz",
  "ruthenia",
  "kimberley",
  "nullarbor",
  "plata",
  "dakota",
  "pantanal",
  "araucania",
  "lakes",
  "westgreenland",
  "gaetulia",
  "kaabu",
  "kanem",
  "teke",
  "lunda",
  "nubia",
  "kilwa",
  "yao",
  "damara",
  "khoi",
  "sakalava",
];

function blankTribe(id: string): TerritoryState {
  return {
    id,
    owner: "barbarian",
    levy: 4,
    bowmen: 0,
    knights: 0,
    dragons: 0,
    beasts: 0,
    castle: true,
    mine: false,
    port: false,
    market: false,
    road: false,
    castleRank: 1,
    mineRank: 0,
    portRank: 0,
    marketRank: 0,
    farm: false,
    farmRank: 0,
    ships: 0,
    rams: 0,
    catapults: 0,
    ladders: 0,
    towers: 0,
    scorpions: 0,
    fort: 1,
    breach: 0,
    besiegedFrom: null,
    pressure: 0,
    population: 1,
  };
}

function migrate(raw: GameState): GameState {
  const s = { ...raw };
  if (s.version < 24) s.version = 24;
  if (s.version < 25) s.version = 25;
  if (s.territories) {
    for (const t of Object.values(s.territories)) {
      if (t.market === undefined) t.market = false;
      if (t.road === undefined) t.road = false;
      t.marketRank = t.marketRank ?? (t.market ? 1 : 0);
      t.portRank = t.portRank ?? (t.port ? 1 : 0);
      t.mineRank = t.mineRank ?? (t.mine ? 1 : 0);
      t.castleRank = t.castleRank ?? (t.castle ? 1 : 0);
      if (t.farm === undefined) t.farm = false;
      t.farmRank = t.farmRank ?? (t.farm ? 1 : 0);
      if (t.population === undefined) t.population = t.owner === "barbarian" ? 1 : 4;
      t.rams = t.rams ?? 0;
      t.catapults = t.catapults ?? 0;
      t.ladders = t.ladders ?? 0;
      t.towers = t.towers ?? 0;
      t.bowmen = t.bowmen ?? 0;
      t.scorpions = t.scorpions ?? 0;
      t.breach = t.breach ?? 0;
      t.besiegedFrom = t.besiegedFrom ?? null;
      if (t.fort == null) {
        t.fort = t.castle ? Math.min(4, (t.castleRank ?? 1) + 1) : 1;
        t.castle = true;
        t.castleRank = t.fort;
      }
    }
    if (s.version < 61) {
      for (const id of ADDED_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
    }
  }
  if (s.jobs) {
    for (const job of s.jobs) {
      job.total = job.total ?? job.remaining ?? 1;
      job.gold = job.gold ?? 0;
      job.wood = job.wood ?? 0;
      job.stone = job.stone ?? 0;
      job.metal = job.metal ?? 0;
    }
  }
  if (s.players) {
    for (const p of s.players) {
      if (p.silver === undefined) p.silver = 12;
      if (p.food === undefined) p.food = 8;
      if (p.lastLands === undefined) p.lastLands = 1;
    }
  }
  if (!s.marches) s.marches = [];
  if (!s.arrivals) s.arrivals = [];
  if (!s.events) s.events = [];
  s.version = SAVE_VERSION;
  return s;
}

export function saveGame(state: GameState) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BACKUP, prev);
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== "object") return null;
    const s = migrate(parsed);
    if (!s.players || s.players.length !== PLAYER_COUNT) return null;
    if (s.players.some((p) => !HOUSES.includes(p.empire as EmpireId))) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}
