import type { Difficulty, EmpireId, Opening } from "./types";

export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Rivals hold their seats and only strike much weaker tribes." },
  { id: "normal", label: "Medium", blurb: "They expand, but only when the fight is clearly theirs." },
  { id: "hard", label: "Hard", blurb: "They strip the line thin and press every opening." },
];

export const OPENINGS: { id: Opening; label: string; blurb: string }[] = [
  { id: "capital", label: "Capital only", blurb: "Each house wakes in its seat. The rest is tribal." },
];

export function playHref(empire: EmpireId, difficulty: Difficulty, opening: Opening) {
  return {
    to: "/play/$empire/$difficulty/$opening" as const,
    params: { empire, difficulty, opening },
  };
}
