import { SAVE_VERSION, type GameState } from "./types";

const KEY = "ancient-empires.save";
const BACKUP = "ancient-empires.save.bak";

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
    }
  }
  if (s.players) {
    for (const p of s.players) {
      if (p.silver === undefined) p.silver = 12;
      if (p.food === undefined) p.food = 8;
      if (p.lastLands === undefined) p.lastLands = 1;
    }
  }
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
    return migrate(parsed);
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
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}
