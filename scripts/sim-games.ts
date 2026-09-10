import { nextAiAction, applyAiAction } from "../src/lib/game/ai.ts";
import {
  continentsHeld,
  createNewGame,
  endTurn,
  incomeFor,
  ownedIds,
  standing,
} from "../src/lib/game/engine.ts";
import { EMPIRE_LIST, empireOf } from "../src/lib/game/empires.ts";
import type { EmpireId, GameState } from "../src/lib/game/types.ts";
import { TERRITORY_BY_ID } from "../src/lib/game/world.ts";

type WinKind = "two-continents" | "last" | "most-continents" | "most-provinces" | "unfinished";

interface Row {
  empire: EmpireId;
  seed: number;
  winner: string;
  winnerIsHuman: boolean;
  winKind: WinKind;
  turn: number;
  steps: number;
  humanLands: number;
  humanContinents: number;
  humanGold: number;
  humanWood: number;
  humanStone: number;
  humanStanding: number;
  humanPorts: number;
  humanMines: number;
  humanMarkets: number;
  humanCastles: number;
  humanKnights: number;
  humanDragons: number;
  humanShips: number;
  humanBeasts: number;
  alive: number;
  firstExpandTurn: number | null;
  tribalLeft: number;
  boardMaxLands: number;
  boardMaxCont: number;
  boardBeasts: number;
  boardMarkets: number;
  overruns: number;
  raids: number;
  broken: number;
}

function winKindOf(s: GameState): WinKind {
  if (s.phase !== "gameover" || s.winner == null) return "unfinished";
  const line = s.log.at(-1) ?? "";
  if (line.includes("two continents") || line.includes("six continents") || line.includes("seven regions") || line.includes("five regions") || line.includes("five continents") || line.includes("capitals")) return "two-continents";
  if (line.includes("stands alone")) return "last";
  if (line.includes("most provinces")) return "most-provinces";
  if (line.includes("most continents") || line.includes("most regions")) return "most-continents";
  return "unfinished";
}

function tally(s: GameState, player: 0) {
  let ports = 0,
    mines = 0,
    markets = 0,
    castles = 0,
    knights = 0,
    dragons = 0,
    ships = 0,
    beasts = 0,
    host = 0;
  for (const id of ownedIds(s, player)) {
    const t = s.territories[id]!;
    if (t.port) ports++;
    if (t.mine) mines++;
    if (t.market) markets++;
    if (t.castle) castles++;
    knights += t.knights;
    dragons += t.dragons;
    ships += t.ships;
    beasts += t.beasts ?? 0;
    host += standing(t);
  }
  return { ports, mines, markets, castles, knights, dragons, ships, beasts, host };
}

function playGame(empire: EmpireId, seed: number): Row {
  let s = createNewGame({ empire, difficulty: "normal", seed });
  let steps = 0;
  let firstExpandTurn: number | null = null;
  const MAX = 60000;
  let acted = 0;
  let watching = s.clock.currentPlayer;
  while (s.phase === "play" && steps < MAX) {
    if (ownedIds(s, 0).length > 1 && firstExpandTurn == null) firstExpandTurn = s.clock.turn;
    if (s.clock.currentPlayer !== watching) {
      watching = s.clock.currentPlayer;
      acted = 0;
    }
    if (acted >= 40) {
      s = applyAiAction(s, { type: "end" });
      acted = 0;
      steps++;
      continue;
    }
    const action = nextAiAction(s);
    const before = s;
    s = applyAiAction(s, action);
    if (action.type !== "end" && s === before) s = applyAiAction(s, { type: "end" });
    acted++;
    steps++;
  }
  const human = s.players[0]!;
  const t = tally(s, 0);
  const tribalLeft = Object.values(s.territories).filter((x) => x.owner === "barbarian").length;
  let boardMaxLands = 0;
  let boardMaxCont = 0;
  let boardBeasts = 0;
  let boardMarkets = 0;
  for (const p of s.players) {
    boardMaxLands = Math.max(boardMaxLands, ownedIds(s, p.id).length);
    boardMaxCont = Math.max(boardMaxCont, continentsHeld(s, p.id).length);
  }
  for (const t of Object.values(s.territories)) {
    boardBeasts += t.beasts ?? 0;
    if (t.market) boardMarkets += 1;
  }
  return {
    empire,
    seed,
    winner: s.winner == null ? "none" : empireOf(s.players[s.winner]!.empire).name,
    winnerIsHuman: s.winner === 0,
    winKind: winKindOf(s),
    turn: s.clock.turn,
    steps,
    humanLands: ownedIds(s, 0).length,
    humanContinents: continentsHeld(s, 0).length,
    humanGold: human.gold,
    humanWood: human.wood,
    humanStone: human.stone,
    humanStanding: t.host,
    humanPorts: t.ports,
    humanMines: t.mines,
    humanMarkets: t.markets,
    humanCastles: t.castles,
    humanKnights: t.knights,
    humanDragons: t.dragons,
    humanShips: t.ships,
    humanBeasts: t.beasts,
    alive: s.players.filter((p) => p.alive).length,
    firstExpandTurn,
    tribalLeft,
    boardMaxLands,
    boardMaxCont,
    boardBeasts,
    boardMarkets,
    overruns: s.log.filter((l) => l.includes("overrun")).length,
    raids: s.log.filter((l) => l.includes("raid")).length,
    broken: s.log.filter((l) => l.includes("is broken")).length,
  };
}

const SEEDS = [11, 29, 47, 83, 101];
const rows: Row[] = [];
const t0 = Date.now();
for (const e of EMPIRE_LIST) {
  for (const seed of SEEDS) {
    const row = playGame(e.id, seed + e.name.length * 17);
    rows.push(row);
    const mark = row.winnerIsHuman ? "WIN" : "loss";
    console.log(
      `${e.name.padEnd(10)} seed ${String(row.seed).padStart(5)}  ${mark.padEnd(4)}  ${row.winKind.padEnd(11)} t${String(row.turn).padStart(3)}  lands ${String(row.humanLands).padStart(2)}  cont ${row.humanContinents}  first ${row.firstExpandTurn ?? "-"}  winner ${row.winner}`,
    );
  }
}
const ms = Date.now() - t0;
console.log("\n--- summary ---");
console.log(`games ${rows.length}  wall ${ms}ms  avg ${(ms / rows.length).toFixed(0)}ms`);

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

const byEmpire = new Map<string, Row[]>();
for (const r of rows) {
  const k = r.empire;
  if (!byEmpire.has(k)) byEmpire.set(k, []);
  byEmpire.get(k)!.push(r);
}

console.log(
  "\nempire        win  lands  cont  first  ports mkts city knt drg beasts  gold  tribals  kind",
);
for (const e of EMPIRE_LIST) {
  const rs = byEmpire.get(e.id)!;
  const wins = rs.filter((r) => r.winnerIsHuman).length;
  const kinds = [...new Set(rs.map((r) => r.winKind))].join(",");
  console.log(
    `${e.name.padEnd(12)} ${wins}/${rs.length}  ${mean(rs.map((r) => r.humanLands)).toFixed(1).padStart(5)}  ${mean(rs.map((r) => r.humanContinents)).toFixed(1).padStart(4)}  ${mean(rs.map((r) => r.firstExpandTurn ?? 100)).toFixed(1).padStart(5)}  ${mean(rs.map((r) => r.humanPorts)).toFixed(1)}  ${mean(rs.map((r) => r.humanMarkets)).toFixed(1)}  ${mean(rs.map((r) => r.humanCastles)).toFixed(1)}  ${mean(rs.map((r) => r.humanKnights)).toFixed(1)}  ${mean(rs.map((r) => r.humanDragons)).toFixed(1)}  ${mean(rs.map((r) => r.humanBeasts)).toFixed(1)}  ${mean(rs.map((r) => r.humanGold)).toFixed(0).padStart(4)}  ${mean(rs.map((r) => r.tribalLeft)).toFixed(0).padStart(5)}  ${kinds}`,
  );
}

const wins = rows.filter((r) => r.winnerIsHuman).length;
const kinds: Record<string, number> = {};
const winners: Record<string, number> = {};
for (const r of rows) {
  kinds[r.winKind] = (kinds[r.winKind] ?? 0) + 1;
  winners[r.winner] = (winners[r.winner] ?? 0) + 1;
}
console.log("\nhuman wins", wins, "/", rows.length, ((wins / rows.length) * 100).toFixed(1) + "%");
console.log("win kinds", kinds);
console.log("who actually won", winners);
console.log("avg turn", mean(rows.map((r) => r.turn)).toFixed(1));
console.log("avg alive", mean(rows.map((r) => r.alive)).toFixed(1));
console.log("avg tribal left", mean(rows.map((r) => r.tribalLeft)).toFixed(1));
console.log("never expanded", rows.filter((r) => r.firstExpandTurn == null).length);
console.log("avg steps", mean(rows.map((r) => r.steps)).toFixed(0));
console.log("avg board max lands", mean(rows.map((r) => r.boardMaxLands)).toFixed(1));
console.log("avg board max continents", mean(rows.map((r) => r.boardMaxCont)).toFixed(2));
console.log("games with a locked continent", rows.filter((r) => r.boardMaxCont >= 1).length);
console.log("avg beasts on board", mean(rows.map((r) => r.boardBeasts)).toFixed(1));
console.log("avg markets on board", mean(rows.map((r) => r.boardMarkets)).toFixed(1));
console.log("max lands any game", Math.max(...rows.map((r) => r.boardMaxLands)));
console.log("max human lands", Math.max(...rows.map((r) => r.humanLands)));
console.log("avg tribal overruns (log)", mean(rows.map((r) => r.overruns)).toFixed(1));
console.log("avg tribal raids (log)", mean(rows.map((r) => r.raids)).toFixed(1));
console.log("games with an empire broken", rows.filter((r) => r.broken > 0).length);
console.log("avg broken", mean(rows.map((r) => r.broken)).toFixed(2));
