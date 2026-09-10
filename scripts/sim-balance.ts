/**
 * Headless AI-vs-AI balance: 3 seeds × each empire × easy/normal/hard.
 * Usage: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/sim-balance.ts [easy|normal|hard|all]
 */
import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { nextAiAction, applyAiAction } from "../src/lib/game/ai.ts";
import {
  continentsHeld,
  createNewGame,
  endTurn,
  ownedIds,
  rankPlayers,
  setInPlaceSim,
  standing,
} from "../src/lib/game/engine.ts";
import { empireOf } from "../src/lib/game/empires.ts";
import { beastOf } from "../src/lib/game/landscape.ts";
import {
  HOUSES,
  TURN_LIMIT,
  WIN_CONTINENTS,
  type Difficulty,
  type EmpireId,
  type GameState,
} from "../src/lib/game/types.ts";
import { TERRITORIES, landNeighbors, continentTerritories } from "../src/lib/game/world.ts";

const SEEDS = [101, 404, 777];
const DIFFS: Difficulty[] = ["easy", "normal", "hard"];

type WinHow = "continents" | "last" | "timeout" | "draw" | "unfinished";

interface Row {
  hero: EmpireId;
  difficulty: Difficulty;
  seed: number;
  turn: number;
  steps: number;
  phase: GameState["phase"];
  winHow: WinHow;
  winner: EmpireId | null;
  winnerName: string;
  winnerLands: number;
  winnerContinents: number;
  heroAlive: boolean;
  heroLands: number;
  heroContinents: number;
  heroRank: number;
  heroGold: number;
  heroWood: number;
  heroStone: number;
  heroMetal: number;
  heroFood: number;
  heroSilver: number;
  heroLevy: number;
  heroBowmen: number;
  heroKnights: number;
  heroDragons: number;
  heroBeasts: number;
  heroShips: number;
  heroPorts: number;
  heroMines: number;
  heroMarkets: number;
  heroFarms: number;
  heroCastles: number;
  firstExpandTurn: number | null;
  tribalLeft: number;
  boardMaxLands: number;
  boardMaxCont: number;
  boardBeasts: number;
  boardDragons: number;
  boardMarkets: number;
  jobsLeft: number;
  marchesLeft: number;
  alive: number;
  overruns: number;
  raids: number;
  broken: number;
  startNeighborHost: number;
  startNeighborCount: number;
}

function winHowOf(s: GameState): WinHow {
  if (s.phase !== "gameover") return "unfinished";
  const line = s.log.at(-1) ?? "";
  if (line.includes("stands alone")) return "last";
  if (line.includes("seven regions") || line.includes("five regions") || line.includes("two continents") || line.includes("six continents") || line.includes("capitals")) {
    return "continents";
  }
  if (line.includes("dead heat") || line.includes("No court remains") || line.includes("No empire remains")) return "draw";
  if (s.clock.turn >= TURN_LIMIT) return "timeout";
  return "timeout";
}

function tally(s: GameState, player: number) {
  let levy = 0,
    bowmen = 0,
    knights = 0,
    dragons = 0,
    beasts = 0,
    ships = 0,
    ports = 0,
    mines = 0,
    markets = 0,
    farms = 0,
    castles = 0;
  for (const id of ownedIds(s, player as 0)) {
    const t = s.territories[id]!;
    levy += t.levy;
    bowmen += t.bowmen ?? 0;
    knights += t.knights;
    dragons += t.dragons;
    beasts += t.beasts ?? 0;
    ships += t.ships;
    if (t.port) ports++;
    if (t.mine) mines++;
    if (t.market) markets++;
    if (t.farm) farms++;
    if (t.castle) castles++;
  }
  return { levy, bowmen, knights, dragons, beasts, ships, ports, mines, markets, farms, castles };
}

function neighborHostAtStart(s: GameState, capitol: string): { host: number; count: number } {
  let host = 0;
  let count = 0;
  for (const id of landNeighbors(capitol)) {
    const t = s.territories[id];
    if (!t || t.owner !== "barbarian") continue;
    host += standing(t);
    count++;
  }
  return { host, count };
}

function fp(s: GameState) {
  const p = s.players[s.clock.currentPlayer]!;
  return `${s.log.length}|${s.nextJobId}|${s.marches.length}|${s.jobs.length}|${s.clock.currentPlayer}|${s.clock.turn}|${p.gold}|${p.wood}|${p.stone}|${p.metal}`;
}

function playAllAi(state: GameState, maxSteps = 250_000): { end: GameState; firstExpandTurn: number | null; steps: number } {
  for (const p of state.players) p.human = false;
  let next = state;
  let steps = 0;
  let watching = next.clock.currentPlayer;
  let acted = 0;
  let firstExpandTurn: number | null = null;
  const hero = 0;
  while (next.phase === "play" && steps < maxSteps) {
    if (firstExpandTurn == null && ownedIds(next, hero).length > 1) {
      firstExpandTurn = next.clock.turn;
    }
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
    if (action.type === "end") {
      next = endTurn(next);
      acted = 0;
      steps += 1;
      continue;
    }
    const before = fp(next);
    next = applyAiAction(next, action);
    if (fp(next) === before) {
      next = endTurn(next);
      acted = 0;
    } else {
      acted += 1;
    }
    steps += 1;
  }
  return { end: next, firstExpandTurn, steps };
}

function snapshot(end: GameState, hero: EmpireId, difficulty: Difficulty, firstExpandTurn: number | null, steps: number, startN: { host: number; count: number }): Row {
  const ranked = rankPlayers(end);
  const heroP = end.players.find((p) => p.empire === hero)!;
  const winnerP = end.winner == null ? null : end.players[end.winner]!;
  const heroRank = heroP.alive ? ranked.findIndex((r) => r.empire === hero) + 1 : 13;
  const t = tally(end, heroP.id);
  let boardMaxLands = 0;
  let boardMaxCont = 0;
  let boardBeasts = 0;
  let boardDragons = 0;
  let boardMarkets = 0;
  for (const p of end.players) {
    boardMaxLands = Math.max(boardMaxLands, ownedIds(end, p.id).length);
    boardMaxCont = Math.max(boardMaxCont, continentsHeld(end, p.id).length);
  }
  for (const terr of Object.values(end.territories)) {
    boardBeasts += terr.beasts ?? 0;
    boardDragons += terr.dragons ?? 0;
    if (terr.market) boardMarkets += 1;
  }
  return {
    hero,
    difficulty,
    seed: end.seed,
    turn: end.clock.turn,
    steps,
    phase: end.phase,
    winHow: winHowOf(end),
    winner: winnerP?.empire ?? null,
    winnerName: winnerP ? empireOf(winnerP.empire).name : "Draw",
    winnerLands: winnerP ? ownedIds(end, winnerP.id).length : 0,
    winnerContinents: winnerP ? continentsHeld(end, winnerP.id).length : 0,
    heroAlive: heroP.alive,
    heroLands: ownedIds(end, heroP.id).length,
    heroContinents: continentsHeld(end, heroP.id).length,
    heroRank: heroP.alive ? heroRank : 13,
    heroGold: heroP.gold,
    heroWood: heroP.wood,
    heroStone: heroP.stone,
    heroMetal: heroP.metal,
    heroFood: heroP.food,
    heroSilver: heroP.silver,
    heroLevy: t.levy,
    heroBowmen: t.bowmen,
    heroKnights: t.knights,
    heroDragons: t.dragons,
    heroBeasts: t.beasts,
    heroShips: t.ships,
    heroPorts: t.ports,
    heroMines: t.mines,
    heroMarkets: t.markets,
    heroFarms: t.farms,
    heroCastles: t.castles,
    firstExpandTurn,
    tribalLeft: Object.values(end.territories).filter((x) => x.owner === "barbarian").length,
    boardMaxLands,
    boardMaxCont,
    boardBeasts,
    boardDragons,
    boardMarkets,
    jobsLeft: end.jobs.length,
    marchesLeft: end.marches.length,
    alive: end.players.filter((p) => p.alive).length,
    overruns: end.log.filter((l) => l.includes("overrun")).length,
    raids: end.log.filter((l) => l.includes("raid")).length,
    broken: end.log.filter((l) => l.includes("is broken")).length,
    startNeighborHost: startN.host,
    startNeighborCount: startN.count,
  };
}

function playGame(empire: EmpireId, difficulty: Difficulty, seed: number): Row {
  setInPlaceSim(true);
  const start = createNewGame({ empire, difficulty, seed });
  const cap = empireOf(empire).capitol;
  const startN = neighborHostAtStart(start, cap);
  const { end, firstExpandTurn, steps } = playAllAi(start);
  return snapshot(end, empire, difficulty, firstExpandTurn, steps, startN);
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function summarize(rows: Row[]) {
  const byHero: Record<string, Row[]> = {};
  const byDiff: Record<string, Row[]> = {};
  const overallWins: Record<string, number> = {};
  for (const r of rows) {
    (byHero[r.hero] ??= []).push(r);
    (byDiff[r.difficulty] ??= []).push(r);
    if (r.winner) overallWins[r.winner] = (overallWins[r.winner] ?? 0) + 1;
  }
  const empires = HOUSES.map((id) => {
    const rs = byHero[id] ?? [];
    const wins = rs.filter((r) => r.winner === id).length;
    const def = empireOf(id);
    const beast = beastOf(id);
    const cap = TERRITORIES.find((t) => t.id === def.capitol)!;
    return {
      id,
      name: def.name,
      capitol: def.capitol,
      continent: cap.continent,
      coastal: cap.coastal,
      capitalPort: Boolean(def.capitalPort),
      capitalMine: Boolean(def.capitalMine),
      beast: beast.name,
      beastAtk: beast.atk,
      beastDef: beast.def,
      beastCost: beast.cost,
      games: rs.length,
      wins,
      winRate: +(wins / (rs.length || 1)).toFixed(3),
      alive: rs.filter((r) => r.heroAlive).length,
      neverExpand: rs.filter((r) => r.firstExpandTurn == null).length,
      avgRank: +mean(rs.map((r) => r.heroRank)).toFixed(2),
      avgLands: +mean(rs.map((r) => r.heroLands)).toFixed(1),
      avgCont: +mean(rs.map((r) => r.heroContinents)).toFixed(2),
      avgTurn: +mean(rs.map((r) => r.turn)).toFixed(1),
      avgFirst: +mean(rs.map((r) => r.firstExpandTurn ?? 200)).toFixed(1),
      avgBeasts: +mean(rs.map((r) => r.heroBeasts)).toFixed(1),
      avgDragons: +mean(rs.map((r) => r.heroDragons)).toFixed(1),
      avgKnights: +mean(rs.map((r) => r.heroKnights)).toFixed(1),
      avgBowmen: +mean(rs.map((r) => r.heroBowmen)).toFixed(1),
      avgPorts: +mean(rs.map((r) => r.heroPorts)).toFixed(1),
      avgMines: +mean(rs.map((r) => r.heroMines)).toFixed(1),
      avgMarkets: +mean(rs.map((r) => r.heroMarkets)).toFixed(1),
      avgGold: +mean(rs.map((r) => r.heroGold)).toFixed(0),
      avgStartHost: +mean(rs.map((r) => r.startNeighborHost)).toFixed(1),
      overallWins: overallWins[id] ?? 0,
    };
  });

  const diffs = DIFFS.filter((d) => byDiff[d]).map((d) => {
    const rs = byDiff[d]!;
    const kinds: Record<string, number> = {};
    const winners: Record<string, number> = {};
    for (const r of rs) {
      kinds[r.winHow] = (kinds[r.winHow] ?? 0) + 1;
      if (r.winner) winners[r.winner] = (winners[r.winner] ?? 0) + 1;
    }
    return {
      difficulty: d,
      games: rs.length,
      heroWins: rs.filter((r) => r.winner === r.hero).length,
      draws: rs.filter((r) => r.winner == null).length,
      unfinished: rs.filter((r) => r.winHow === "unfinished").length,
      kinds,
      winners,
      avgTurn: +mean(rs.map((r) => r.turn)).toFixed(1),
      avgAlive: +mean(rs.map((r) => r.alive)).toFixed(1),
      avgTribalLeft: +mean(rs.map((r) => r.tribalLeft)).toFixed(1),
      avgFirst: +mean(rs.map((r) => r.firstExpandTurn ?? 200)).toFixed(1),
      neverExpand: rs.filter((r) => r.firstExpandTurn == null).length,
      avgBoardMaxLands: +mean(rs.map((r) => r.boardMaxLands)).toFixed(1),
      avgBoardMaxCont: +mean(rs.map((r) => r.boardMaxCont)).toFixed(2),
      lockedContinent: rs.filter((r) => r.boardMaxCont >= 1).length,
      fiveRegions: rs.filter((r) => r.boardMaxCont >= WIN_CONTINENTS).length,
      avgBeasts: +mean(rs.map((r) => r.boardBeasts)).toFixed(1),
      avgDragons: +mean(rs.map((r) => r.boardDragons)).toFixed(1),
      avgMarkets: +mean(rs.map((r) => r.boardMarkets)).toFixed(1),
      avgOverruns: +mean(rs.map((r) => r.overruns)).toFixed(1),
      avgRaids: +mean(rs.map((r) => r.raids)).toFixed(1),
      gamesBroken: rs.filter((r) => r.broken > 0).length,
    };
  });

  return { empires, diffs, overallWins };
}

function runOne(empire: EmpireId, difficulty: Difficulty, seed: number) {
  const t0 = Date.now();
  const row = playGame(empire, difficulty, seed);
  const mark = row.winner === empire ? "WIN" : row.heroAlive ? "live" : "dead";
  console.error(
    `${difficulty.padEnd(6)} ${empireOf(empire).name.padEnd(10)} seed ${String(seed).padStart(3)}  ${mark.padEnd(4)}  ${row.winHow.padEnd(11)} t${String(row.turn).padStart(3)}  lands ${String(row.heroLands).padStart(2)}  cont ${row.heroContinents}  first ${row.firstExpandTurn ?? "-"}  winner ${row.winnerName}  ${Date.now() - t0}ms`,
  );
  console.log(JSON.stringify(row));
}

function spawnJob(empire: EmpireId, difficulty: Difficulty, seed: number): Promise<Row> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--experimental-strip-types",
        "--import",
        "./scripts/register-ts.mjs",
        "./scripts/sim-balance.ts",
        "--one",
        difficulty,
        empire,
        String(seed),
      ],
      { cwd: process.cwd(), stdio: ["ignore", "pipe", "inherit"] },
    );
    let out = "";
    child.stdout.on("data", (buf) => {
      out += buf.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`sim ${empire} ${difficulty} ${seed} exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out.trim()) as Row);
      } catch (err) {
        reject(new Error(`bad json for ${empire} ${difficulty} ${seed}: ${out.slice(0, 200)}`));
      }
    });
  });
}

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, n) }, () => worker()));
  return out;
}

async function main() {
  if (process.argv[2] === "--one") {
    const difficulty = process.argv[3] as Difficulty;
    const empire = process.argv[4] as EmpireId;
    const seed = Number(process.argv[5]);
    runOne(empire, difficulty, seed);
    return;
  }
  const arg = (process.argv[2] as Difficulty | "all" | undefined) ?? "all";
  const diffs = arg === "all" ? DIFFS : [arg as Difficulty];
  const jobs: { empire: EmpireId; difficulty: Difficulty; seed: number }[] = [];
  for (const d of diffs) {
    for (const empire of HOUSES) {
      for (const seed of SEEDS) jobs.push({ empire, difficulty: d, seed });
    }
  }
  const t0 = Date.now();
  const workers = Math.max(1, Math.min(cpus().length, 2));
  console.error(`queued ${jobs.length} games on ${workers} workers`);
  const rows = await pool(jobs, workers, (j) => spawnJob(j.empire, j.difficulty, j.seed));
  const continentSizes = Object.fromEntries(
    (["at", "nw", "ne", "ca", "sa", "eu", "an", "af", "me", "aw", "ae", "ss", "oc"] as const).map((c) => [
      c,
      continentTerritories(c).length,
    ]),
  );
  const payload = {
    games: rows.length,
    turnLimit: TURN_LIMIT,
    winContinents: WIN_CONTINENTS,
    elapsedMs: Date.now() - t0,
    continentSizes,
    summary: summarize(rows),
    results: rows,
  };
  console.log(JSON.stringify(payload));
}

void main();
