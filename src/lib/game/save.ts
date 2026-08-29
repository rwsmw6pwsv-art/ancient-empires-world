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
