/**
 * Headless AI-vs-AI balance sim: each empire as first player, 3 seeds.
 * Usage: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/sim-empires.ts
 */
import { createNewGame, continentsHeld, capitalsHeld, ownedIds, rankPlayers } from "../src/lib/game/engine.ts";
import { nextAiAction, applyAiAction } from "../src/lib/game/ai.ts";
import { empireOf } from "../src/lib/game/empires.ts";
import { HOUSES, TURN_LIMIT, type Difficulty, type EmpireId, type GameState } from "../src/lib/game/types.ts";
import { TERRITORIES, continentTerritories } from "../src/lib/game/world.ts";
import { beastOf } from "../src/lib/game/landscape.ts";
import { endTurn } from "../src/lib/game/engine.ts";

function playAllAi(state: GameState, maxSteps = 250_000): GameState {
  for (const p of state.players) p.human = false;
  let next = state;
  let steps = 0;
  let watching = next.clock.currentPlayer;
  let acted = 0;
  while (next.phase === "play" && steps < maxSteps) {
    if (next.clock.currentPlayer !== watching) {
      watching = next.clock.currentPlayer;
      acted = 0;
    }
    if (acted >= 40) {
      next = endTurn(next);
      acted = 0;
      steps += 1;
      continue;
    }
    const action = nextAiAction(next);
    const before = next;
    next = applyAiAction(next, action);
    if (action.type !== "end" && next === before) next = endTurn(next);
    acted += 1;
    steps += 1;
  }
  return next;
}

function snapshot(state: GameState, hero: EmpireId) {
  const ranked = rankPlayers(state);
  const heroP = state.players.find((p) => p.empire === hero)!;
  const winnerP = state.winner == null ? null : state.players[state.winner]!;
  const heroRank = ranked.findIndex((r) => r.empire === hero) + 1;
  return {
    hero,
    seed: state.seed,
    turn: state.clock.turn,
    phase: state.phase,
    stepsOk: state.phase === "gameover",
    winner: winnerP?.empire ?? null,
    winnerName: winnerP ? empireOf(winnerP.empire).name : "Draw",
    winHow:
      state.winner == null
        ? "draw"
        : capitalsHeld(state, state.winner).length >= 7
          ? "capitals"
          : continentsHeld(state, state.winner).length >= 2
          ? "continents"
          : "last-standing",
    winnerLands: winnerP ? ownedIds(state, winnerP.id).length : 0,
    winnerContinents: winnerP ? continentsHeld(state, winnerP.id) : [],
    heroAlive: heroP.alive,
    heroLands: ownedIds(state, heroP.id).length,
    heroContinents: continentsHeld(state, heroP.id),
    heroRank: heroP.alive ? heroRank : 13,
    alive: state.players.filter((p) => p.alive).map((p) => p.empire),
    standings: ranked.map((r) => ({
      empire: r.empire,
      name: empireOf(r.empire).name,
      continents: r.continents,
      lands: r.lands,
    })),
  };
}

const SEEDS = [101, 404, 777];

function main() {
  const difficulty = ((process.argv[2] as Difficulty) || "easy") as Difficulty;
  console.error(`difficulty=${difficulty}`);
  const continentSizes = Object.fromEntries(
    (["at", "nw", "ne", "ca", "sa", "eu", "an", "af", "me", "aw", "ae", "ss", "oc"] as const).map((c) => [
      c,
      continentTerritories(c).length,
    ]),
  );
  const results: ReturnType<typeof snapshot>[] = [];
  const t0 = Date.now();
  for (const empire of HOUSES) {
    for (const seed of SEEDS) {
      const start = createNewGame({ empire, difficulty, seed });
      const end = playAllAi(start);
      const row = snapshot(end, empire);
      results.push(row);
      const name = empireOf(empire).name.padEnd(10);
      console.error(
        `${name} seed ${seed}  t${row.turn}  ${row.winHow.padEnd(14)} winner=${row.winnerName.padEnd(10)} hero lands=${row.heroLands} rank=${row.heroRank}`,
      );
    }
  }
  const byHero: Record<string, typeof results> = {};
  for (const r of results) (byHero[r.hero] ??= []).push(r);

  const overallWins: Record<string, number> = {};
  for (const r of results) {
    if (r.winner) overallWins[r.winner] = (overallWins[r.winner] ?? 0) + 1;
  }

  const summary = HOUSES.map((id) => {
    const rows = byHero[id]!;
    const wins = rows.filter((r) => r.winner === id).length;
    const avgLands = rows.reduce((s, r) => s + r.heroLands, 0) / rows.length;
    const avgRank = rows.reduce((s, r) => s + r.heroRank, 0) / rows.length;
    const avgTurn = rows.reduce((s, r) => s + r.turn, 0) / rows.length;
    const alive = rows.filter((r) => r.heroAlive).length;
    const def = empireOf(id);
    const beast = beastOf(id);
    const cap = TERRITORIES.find((t) => t.id === def.capitol)!;
    return {
      id,
      name: def.name,
      capitol: def.capitol,
      continent: cap.continent,
      coastal: cap.coastal,
      startLevyBonus: 0,
      capitalCastle: true,
      capitalPort: Boolean(def.capitalPort),
      beast: beast.name,
      beastAtk: beast.atk,
      beastDef: beast.def,
      beastCost: beast.cost,
      power: (beast.atk + beast.def) / beast.cost,
      wins,
      winRate: wins / rows.length,
      alive,
      avgLands: +avgLands.toFixed(1),
      avgRank: +avgRank.toFixed(2),
      avgTurn: +avgTurn.toFixed(1),
      overallWins: overallWins[id] ?? 0,
    };
  });

  const payload = {
    games: results.length,
    turnLimit: TURN_LIMIT,
    elapsedMs: Date.now() - t0,
    continentSizes,
    draws: results.filter((r) => r.winner == null).length,
    continentWins: results.filter((r) => r.winHow === "continents").length,
    lastStanding: results.filter((r) => r.winHow === "last-standing").length,
    overallWins,
    summary,
    results,
  };
  console.log(JSON.stringify(payload, null, 2));
}

main();
