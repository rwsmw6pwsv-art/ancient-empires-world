import type { Difficulty, EmpireId, Opening } from "./types";

export const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: "easy", label: "Easy", blurb: "Rivals bank a fat purse and only spend then. They take sure tribal fights." },
  { id: "normal", label: "Medium", blurb: "They spend and expand every watch, saving only for a beast or a dragon." },
  { id: "hard", label: "Hard", blurb: "They empty the treasury, press every opening, and hunt the leading court." },
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
