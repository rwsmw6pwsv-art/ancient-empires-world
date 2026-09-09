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

/** Lands created when regions were evened to ten. */
const EVEN_LANDS: readonly string[] = [
  "adelie",
  "byrd",
  "magellan",
  "natal",
  "limpopo",
  "highveld",
];

/** Lands absorbed into a neighbour when regions were evened to ten. */
const MERGED_LANDS: readonly string[] = [
  "doggerland",
  "danube",
  "baltic",
  "reefs",
  "gulf",
  "polynesia",
];

/** Lands created when regions were doubled to twenty hex seats. */
const HEX_LANDS: readonly string[] = [
  "ellsworth",
  "filchner",
  "dufek",
  "shirase",
  "oates",
  "siple",
  "berkner",
  "pennell",
  "thurston",
  "getz",
  "yukon",
  "mackenzie",
  "keewatin",
  "ontario",
  "acadia",
  "dakota",
  "columbia",
  "baffin",
  "aleut",
  "cordillera",
  "olmec",
  "toltec",
  "mixtec",
  "zapotec",
  "tarascan",
  "taino",
  "arawak",
  "nicoya",
  "tehuantepec",
  "maui",
  "chaco",
  "parana",
  "marajo",
  "araguaia",
  "araucania",
  "altiplano",
  "guapore",
  "tocantins",
  "plata",
  "chubut",
  "aquitaine",
  "bohemia",
  "dacia",
  "thrace",
  "lusitania",
  "armorica",
  "helvetia",
  "liguria",
  "noricum",
  "scythia",
  "nubia",
  "cyrenaica",
  "fezzan",
  "kanem",
  "awdaghost",
  "axum",
  "punt",
  "carthage",
  "gaetulia",
  "timbuktu",
  "transvaal",
  "caprivi",
  "nyasa",
  "mashona",
  "bechuana",
  "pondoland",
  "namaqua",
  "sofala",
  "lesotho",
  "swazi",
  "persia",
  "media",
  "elam",
  "phoenicia",
  "nabataea",
  "cappadocia",
  "urartu",
  "dilmun",
  "magan",
  "parthia",
  "buryatia",
  "yakutia",
  "manchuria",
  "korea",
  "dzungaria",
  "sayan",
  "kolyma",
  "chukotka",
  "ussuri",
  "tuva",
  "bengal",
  "punjab",
  "tamil",
  "ceylon",
  "siam",
  "annam",
  "java",
  "sumatra",
  "kashmir",
  "tibet",
  "zealandia",
  "vanuatu",
  "fiji",
  "nullarbor",
  "arnhem",
  "pilbara",
  "carpentaria",
  "chatham",
  "macquarie",
  "melanesia",
];

/** Lands created when North America and North Asia were split east/west. */
const SPLIT_LANDS: readonly string[] = [
  "vinland",
  "markland",
  "helluland",
  "erie",
  "huron",
  "fundy",
  "newfoundland",
  "nunavut",
  "ohio",
  "illinois",
  "chesapeake",
  "carolina",
  "adirondack",
  "ottawa",
  "algonquin",
  "iroquois",
  "micmac",
  "muskeg",
  "winnipeg",
  "unggava",
  "sakhalin",
  "hokkaido",
  "ryukyu",
  "primorye",
  "magadan",
  "okhotsk",
  "anadyr",
  "koryak",
  "nanai",
  "jeju",
  "ezo",
  "kuril",
  "liaodong",
  "jilin",
  "heilong",
  "ulaan",
  "udege",
  "oroqen",
  "chuvan",
  "tsushima",
];

/** Lands dropped when hexes were snapped onto one global grid. */
const DROPPED_LANDS: readonly string[] = [
  "mixtec",
  "taino",
  "timbuktu",
  "punt",
  "elburz",
  "zagros",
  "magan",
  "oman",
  "ussuri",
  "sumatra",
  "himalaya",
  "siam",
  "ganges",
];

/** Lands removed for sitting on water, or at the player's request. */
const TRIMMED_LANDS: readonly string[] = [
  "eldorado",
  "guinea",
  "maghreb",
  "iberia",
  "wilkes",
  "sofala",
  "arabia",
];

/** Lands placed around Yucatan, Europe, Tamil, Barrier Reef and Nullarbor. */
const PLACE_LANDS: readonly string[] = [
  "calusa",
  "lucayan",
  "ciboney",
  "bimini",
  "doggerland",
  "jutland",
  "sarmatia",
  "mentawai",
  "flores",
  "timor",
  "nicobar",
  "loyalty",
  "tasman",
];

/** Lands added in the second named-place pass. */
const PLACE2_LANDS: readonly string[] = [
  "tibesti",
  "hoggar",
  "scoresby",
  "fram",
  "tunu",
  "tequesta",
  "timucua",
  "cuba",
  "alor",
  "coats",
  "larsen",
];

/** Lands the player asked to remove after the first named-place pass. */
const TRIMMED2_LANDS: readonly string[] = [
  "nicobar",
];

/** Lands added in the third named-place pass. */
const PLACE3_LANDS: readonly string[] = [
  "drake",
  "fuegia",
  "paria",
  "najd",
  "gotland",
  "iturup",
  "kunashir",
];

/** Lands added between Olmec and Paria. */
const PLACE4_LANDS: readonly string[] = [
  "miskito",
];

/** Lands flooded to sea. */
const TRIMMED4_LANDS: readonly string[] = [
  "ottawa",
  "unggava",
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
    wallRank: 0,
    outerWallRank: 0,
    keepRank: 0,
    towerRank: 0,
    moatRank: 0,
    scorpionRank: 0,
    fort: 1,
    dragonTier: 0,
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
      t.wallRank = t.wallRank ?? (t.fort >= 2 ? 2 : t.fort >= 1 ? 1 : 0);
      t.outerWallRank = t.outerWallRank ?? 0;
      t.keepRank = t.keepRank ?? (t.fort >= 4 ? 2 : t.fort >= 3 ? 1 : 0);
      t.towerRank = t.towerRank ?? 0;
      t.moatRank = t.moatRank ?? 0;
      t.scorpionRank = t.scorpionRank ?? Math.min(5, t.scorpions ?? 0);
      t.dragonTier = t.dragonTier ?? 0;
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
    if (s.version < 71) {
      for (const id of EVEN_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const id of MERGED_LANDS) {
        delete s.territories[id];
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 72) {
      for (const id of HEX_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 73) {
      for (const id of SPLIT_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 74) {
      for (const id of DROPPED_LANDS) {
        delete s.territories[id];
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 75) {
      for (const id of PLACE_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const id of TRIMMED_LANDS) {
        delete s.territories[id];
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 76) {
      for (const id of PLACE2_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const id of TRIMMED2_LANDS) {
        delete s.territories[id];
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 77) {
      for (const id of PLACE3_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
    }
    if (s.version < 78) {
      for (const id of PLACE4_LANDS) {
        if (!s.territories[id]) s.territories[id] = blankTribe(id);
      }
      for (const id of TRIMMED4_LANDS) {
        delete s.territories[id];
      }
      for (const t of Object.values(s.territories)) {
        if (t.besiegedFrom && !s.territories[t.besiegedFrom]) t.besiegedFrom = null;
      }
      if (s.jobs) s.jobs = s.jobs.filter((j) => s.territories[j.territoryId]);
      if (s.marches) s.marches = s.marches.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.arrivals) s.arrivals = s.arrivals.filter((m) => s.territories[m.from] && s.territories[m.to]);
      if (s.marchFrom && !s.territories[s.marchFrom]) s.marchFrom = null;
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
      if (p.specialDragons === undefined) p.specialDragons = 0;
      if (p.rareDragons === undefined) p.rareDragons = 0;
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
    if (!s.territories?.asgard || !s.territories?.nord) return null;
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
