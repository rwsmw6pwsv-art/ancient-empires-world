import type { JobKind, TerritoryState } from "./types";

export type DefenseKind = "walls" | "outer-walls" | "keep-works" | "towers" | "moats" | "scorpion";

export const DEFENSE_KINDS: readonly DefenseKind[] = [
  "walls",
  "outer-walls",
  "keep-works",
  "towers",
  "moats",
  "scorpion",
] as const;

export function isDefenseKind(kind: string): kind is DefenseKind {
  return (DEFENSE_KINDS as readonly string[]).includes(kind);
}

export const WALL_STEPS = ["None", "Wood", "Stone", "High stone", "Giant stone", "Colossal stone"] as const;
export const TOWER_STEPS = ["None", "2 wooden towers", "2 stone towers", "3 towers", "2 inner + 2 outer", "4 inner + 2 outer"] as const;
export const MOAT_STEPS = ["None", "Single moat", "Dual moats", "Triple moats"] as const;
export const SCORPION_STEPS = ["None", "1 limited range", "2 medium range", "2 long range", "2 outer + 1 inner", "2 outer + 2 inner"] as const;

export const DEFENSE_CAP: Record<DefenseKind, number> = {
  walls: 5,
  "outer-walls": 5,
  "keep-works": 5,
  towers: 5,
  moats: 3,
  scorpion: 5,
};

export const DEFENSE_LABEL: Record<DefenseKind, string> = {
  walls: "Walls",
  "outer-walls": "Outer walls",
  "keep-works": "Keep",
  towers: "Towers",
  moats: "Moats",
  scorpion: "Scorpions",
};

export const DEFENSE_HINT: Record<DefenseKind, string> = {
  walls: "Attackers must smash a closed gate or a breach to enter. Wood, then stone, then high, giant and colossal stone.",
  "outer-walls": "First ring. Slows the host before they reach the inner walls.",
  "keep-works": "Holds stores and the last garrison until the walls fall.",
  towers: "Archers fill the gate-towers first, then the other towers. If a tower falls, its watch dies with it.",
  moats: "Slows attackers and cuts their range and blows. Single, then dual, then a third around the keep.",
  scorpion: "The only ground engine that wounds dragons. Range and count grow with each rank.",
};

export const DEFENSE_COST: Record<DefenseKind, { gold: number; wood: number; stone: number; metal: number }> = {
  walls: { gold: 4, wood: 3, stone: 4, metal: 0 },
  "outer-walls": { gold: 4, wood: 3, stone: 5, metal: 0 },
  "keep-works": { gold: 6, wood: 2, stone: 5, metal: 1 },
  towers: { gold: 3, wood: 3, stone: 3, metal: 1 },
  moats: { gold: 3, wood: 1, stone: 2, metal: 0 },
  scorpion: { gold: 3, wood: 2, stone: 0, metal: 2 },
};

export const DEFENSE_TURNS: Record<DefenseKind, number> = {
  walls: 2,
  "outer-walls": 2,
  "keep-works": 2,
  towers: 1,
  moats: 2,
  scorpion: 2,
};

export function defenseRank(t: TerritoryState, kind: DefenseKind): number {
  if (kind === "walls") return t.wallRank ?? (t.fort >= 2 ? 2 : t.fort >= 1 ? 1 : 0);
  if (kind === "outer-walls") return t.outerWallRank ?? 0;
  if (kind === "keep-works") return t.keepRank ?? (t.fort >= 4 ? 2 : t.fort >= 3 ? 1 : 0);
  if (kind === "towers") return t.towerRank ?? 0;
  if (kind === "moats") return t.moatRank ?? 0;
  return t.scorpionRank ?? Math.min(5, t.scorpions ?? 0);
}

export function setDefenseRank(t: TerritoryState, kind: DefenseKind, rank: number) {
  const cap = DEFENSE_CAP[kind];
  const n = Math.max(0, Math.min(cap, rank));
  if (kind === "walls") t.wallRank = n;
  else if (kind === "outer-walls") t.outerWallRank = n;
  else if (kind === "keep-works") t.keepRank = n;
  else if (kind === "towers") t.towerRank = n;
  else if (kind === "moats") t.moatRank = n;
  else {
    t.scorpionRank = n;
    t.scorpions = n;
  }
  syncFortFromDefense(t);
}

export function nextDefenseLabel(t: TerritoryState, kind: DefenseKind): string {
  const r = defenseRank(t, kind);
  const cap = DEFENSE_CAP[kind];
  if (r >= cap) return currentDefenseLabel(t, kind);
  if (kind === "walls" || kind === "outer-walls" || kind === "keep-works") return WALL_STEPS[r + 1]!;
  if (kind === "towers") return TOWER_STEPS[r + 1]!;
  if (kind === "moats") return MOAT_STEPS[r + 1]!;
  return SCORPION_STEPS[r + 1]!;
}

export function currentDefenseLabel(t: TerritoryState, kind: DefenseKind): string {
  const r = defenseRank(t, kind);
  if (kind === "walls" || kind === "outer-walls" || kind === "keep-works") return WALL_STEPS[r] ?? "None";
  if (kind === "towers") return TOWER_STEPS[r] ?? "None";
  if (kind === "moats") return MOAT_STEPS[r] ?? "None";
  return SCORPION_STEPS[r] ?? "None";
}

export function syncFortFromDefense(t: TerritoryState) {
  const walls = t.wallRank ?? 0;
  const keep = t.keepRank ?? 0;
  let fort = t.fort ?? 0;
  if (walls >= 1) fort = Math.max(fort, 1);
  if (walls >= 2) fort = Math.max(fort, 2);
  if (keep >= 1) fort = Math.max(fort, 3);
  if (keep >= 2) fort = Math.max(fort, 4);
  t.fort = Math.min(4, fort);
  t.castle = t.fort > 0 || (t.castle ?? false);
  t.castleRank = Math.max(t.castleRank ?? 0, t.fort);
}

export function wallHpFor(rank: number): number {
  return [0, 160, 250, 360, 500, 680][Math.max(0, Math.min(5, rank))] ?? 0;
}

export function keepHpFor(rank: number, camp: boolean): number {
  if (camp) return 220;
  return 280 + rank * 90;
}

export function scorpionRangeFor(rank: number): number {
  return [0, 140, 180, 220, 250, 280][Math.max(0, Math.min(5, rank))] ?? 140;
}

export function scorpionCounts(rank: number): { outer: number; inner: number } {
  if (rank <= 0) return { outer: 0, inner: 0 };
  if (rank === 1) return { outer: 1, inner: 0 };
  if (rank === 2) return { outer: 2, inner: 0 };
  if (rank === 3) return { outer: 2, inner: 0 };
  if (rank === 4) return { outer: 2, inner: 1 };
  return { outer: 2, inner: 2 };
}

export function towerCounts(rank: number): { outer: number; inner: number } {
  if (rank <= 0) return { outer: 0, inner: 0 };
  if (rank === 1) return { outer: 0, inner: 2 };
  if (rank === 2) return { outer: 0, inner: 2 };
  if (rank === 3) return { outer: 0, inner: 3 };
  if (rank === 4) return { outer: 2, inner: 2 };
  return { outer: 2, inner: 4 };
}

export function asJobKind(kind: DefenseKind): JobKind {
  return kind as JobKind;
}
