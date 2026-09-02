import { empireOf } from "./empires";
import { beastOf, landscapeOf, type BeastDef } from "./landscape";
import { mulberry32, randInt } from "./rng";
import type { EmpireId, GameState, HostForce, TerritoryState, UnitKind } from "./types";
import { UNIT_ATK, UNIT_DEF, UNIT_HP } from "./types";
import { TERRITORY_BY_ID } from "./world";

export type BattleSide = "atk" | "def";

export interface BattleStack {
  id: string;
  side: BattleSide;
  kind: UnitKind;
  name: string;
  atk: number;
  def: number;
  hp: number;
  count: number;
  wounds: number;
  exhausted: boolean;
  retaliated: boolean;
}

export interface BattleState {
  fromId: string;
  toId: string;
  force: HostForce;
  humanSide: BattleSide;
  stacks: BattleStack[];
  fortHp: number;
  fortMax: number;
  startAtk: number;
  startDef: number;
  routed: BattleSide | null;
  activeSide: BattleSide;
  seed: number;
  strikes: number;
  log: string[];
}

const EMPTY: HostForce = { levy: 0, knights: 0, dragons: 0, beasts: 0 };

export function hostFromSide(stacks: BattleStack[], side: BattleSide): HostForce {
  const live = stacks.filter((s) => s.side === side && s.count > 0);
  return {
    levy: live.filter((s) => s.kind === "levy").reduce((n, s) => n + s.count, 0),
    knights: live.filter((s) => s.kind === "knight").reduce((n, s) => n + s.count, 0),
    dragons: live.filter((s) => s.kind === "dragon").reduce((n, s) => n + s.count, 0),
    beasts: live.filter((s) => s.kind === "beast").reduce((n, s) => n + s.count, 0),
  };
}

export function living(stacks: BattleStack[], side: BattleSide) {
  return stacks.filter((s) => s.side === side && s.count > 0);
}

export function livingCount(stacks: BattleStack[], side: BattleSide) {
  return living(stacks, side).reduce((n, s) => n + s.count, 0);
}

function other(side: BattleSide): BattleSide {
  return side === "atk" ? "def" : "atk";
}

function cloneBattle(battle: BattleState): BattleState {
  return {
    ...battle,
    stacks: battle.stacks.map((s) => ({ ...s })),
    log: [...battle.log],
  };
}

function beastFor(state: GameState, owner: TerritoryState["owner"]) {
  if (owner === "barbarian") return null;
  return beastOf(state.players[owner]!.empire);
}

function empireFor(state: GameState, owner: TerritoryState["owner"]): EmpireId | null {
  if (owner === "barbarian") return null;
  return state.players[owner]!.empire;
}

function terrainMods(
  terrain: string,
  empire: EmpireId | null,
  side: BattleSide,
  kind: UnitKind,
): { atk: number; def: number } {
  let atk = 0;
  let def = 0;
  if (terrain === "jungle" && kind === "beast") atk += 2;
  if ((terrain === "ice" || terrain === "tundra") && empire === "thule") def += 2;
  if (terrain === "mountain" && side === "def") def += 2;
  return { atk, def };
}

function statsFor(
  kind: UnitKind,
  beast: BeastDef | null,
  side: BattleSide,
  terrain: string,
  empire: EmpireId | null,
) {
  const atk0 = kind === "beast" ? (beast?.atk ?? UNIT_ATK.beast) : UNIT_ATK[kind];
  const def0 = kind === "beast" ? (beast?.def ?? UNIT_DEF.beast) : UNIT_DEF[kind];
  const mod = terrainMods(terrain, empire, side, kind);
  const name = kind === "beast" ? (beast?.name ?? "Beast") : kind === "levy" ? "Men" : kind === "knight" ? "Knights" : "Dragons";
  return { atk: atk0 + mod.atk, def: def0 + mod.def, name, hp: UNIT_HP[kind] };
}

function spawn(
  side: BattleSide,
  force: HostForce,
  beast: BeastDef | null,
  terrain: string,
  empire: EmpireId | null,
): BattleStack[] {
  const out: BattleStack[] = [];
  const add = (kind: UnitKind, n: number) => {
    if (n < 1) return;
    const s = statsFor(kind, beast, side, terrain, empire);
    out.push({
      id: `${side}-${kind}`,
      side,
      kind,
      name: s.name,
      atk: s.atk,
      def: s.def,
      hp: s.hp,
      count: n,
      wounds: 0,
      exhausted: false,
      retaliated: false,
    });
  };
  add("dragon", force.dragons);
  add("beast", force.beasts);
  add("knight", force.knights);
  add("levy", force.levy);
  return out;
}

export function openBattle(
  state: GameState,
  fromId: string,
  toId: string,
  force: HostForce,
  humanSide: BattleSide,
  works: number,
): BattleState | null {
  const from = state.territories[fromId];
  const to = state.territories[toId];
  if (!from || !to) return null;
  if (from.owner === to.owner) return null;
  const send: HostForce = {
    levy: force.levy,
    knights: force.knights,
    dragons: force.dragons,
    beasts: force.beasts,
  };
  if (send.levy + send.knights + send.dragons + send.beasts < 1) return null;
  const terrain = landscapeOf(toId).terrain;
  const atkEmpire = empireFor(state, from.owner);
  const defEmpire = empireFor(state, to.owner);
  const stacks = [
    ...spawn("atk", send, beastFor(state, from.owner), terrain, atkEmpire),
    ...spawn(
      "def",
      { levy: to.levy, knights: to.knights, dragons: to.dragons, beasts: to.beasts ?? 0 },
      beastFor(state, to.owner),
      terrain,
      defEmpire,
    ),
  ];
  const fromName = TERRITORY_BY_ID[fromId]!.name;
  const toName = TERRITORY_BY_ID[toId]!.name;
  const atkName = from.owner === "barbarian" ? "Tribes" : empireOf(state.players[from.owner]!.empire).name;
  const defName = to.owner === "barbarian" ? "Independent tribes" : empireOf(state.players[to.owner]!.empire).name;
  const startAtk = livingCount(stacks, "atk");
  const startDef = livingCount(stacks, "def");
  const log = [`${atkName} fall on ${toName} from ${fromName}. ${defName} hold the ground.`];
  if (works > 0) log.push(`Walls stand ${works} strong.`);
  if (terrain === "jungle") log.push("Jungle favours the beasts.");
  if (terrain === "ice" || terrain === "tundra") log.push("The ice favours Nord.");
  if (terrain === "mountain") log.push("The heights favour the defence.");
  return {
    fromId,
    toId,
    force: send,
    humanSide,
    stacks,
    fortHp: works,
    fortMax: works,
    startAtk,
    startDef,
    routed: null,
    activeSide: humanSide,
    seed: (state.seed + state.clock.turn * 997 + toId.length) >>> 0,
    strikes: 0,
    log,
  };
}

export function readyFighters(battle: BattleState) {
  if (battle.activeSide !== battle.humanSide) return [];
  return living(battle.stacks, battle.humanSide).filter((s) => !s.exhausted);
}

export function battleWinner(battle: BattleState): BattleSide | null {
  if (battle.routed) return other(battle.routed);
  const atk = livingCount(battle.stacks, "atk");
  const def = livingCount(battle.stacks, "def");
  if (atk < 1 && def < 1) return "def";
  if (atk < 1) return "def";
  if (def < 1) return "atk";
  return null;
}

export function battleOutcome(battle: BattleState): { winner: BattleSide; atkLeft: HostForce; defLeft: HostForce } {
  const winner = battleWinner(battle) ?? "def";
  const atkLeft = hostFromSide(battle.stacks, "atk");
  const defLeft = hostFromSide(battle.stacks, "def");
  if (winner === "atk") return { winner, atkLeft, defLeft: EMPTY };
  return { winner, atkLeft, defLeft };
}

export function strikeOdds(atk: number, def: number): "likely" | "even" | "desperate" {
  const d = atk - def;
  if (d >= 2) return "likely";
  if (d <= -2) return "desperate";
  return "even";
}

function hitDamage(aRoll: number, dRoll: number): number {
  if (aRoll > dRoll) return 1 + (aRoll - dRoll > 3 ? 1 : 0);
  return 0;
}

function applyWounds(stack: BattleStack, dmg: number): number {
  let d = dmg;
  let killed = 0;
  while (d > 0 && stack.count > 0) {
    const left = stack.hp - stack.wounds;
    if (d >= left) {
      d -= left;
      stack.count -= 1;
      stack.wounds = 0;
      killed += 1;
    } else {
      stack.wounds += d;
      d = 0;
    }
  }
  return killed;
}

function applyHits(battle: BattleState, stack: BattleStack, dmg: number): { killed: number; soaked: number } {
  let rest = dmg;
  let soaked = 0;
  if (stack.side === "def" && battle.fortHp > 0 && rest > 0) {
    soaked = Math.min(battle.fortHp, rest);
    battle.fortHp -= soaked;
    rest -= soaked;
  }
  const killed = rest > 0 ? applyWounds(stack, rest) : 0;
  return { killed, soaked };
}

function stackLabel(s: BattleStack) {
  return s.count > 1 ? `${s.name} (${s.count})` : s.name;
}

function resolveStrike(battle: BattleState, attackerId: string, targetId: string): BattleState {
  const next = cloneBattle(battle);
  const attacker = next.stacks.find((s) => s.id === attackerId);
  const target = next.stacks.find((s) => s.id === targetId);
  if (!attacker || !target || attacker.count < 1 || target.count < 1) return battle;
  if (attacker.exhausted || attacker.side === target.side) return battle;
  const rng = mulberry32((next.seed + next.strikes * 7919) >>> 0);
  const aRoll = attacker.atk + randInt(rng, 0, 2);
  const dRoll = target.def + randInt(rng, 0, 2);
  next.strikes += 1;
  const dmg = hitDamage(aRoll, dRoll);
  if (dmg < 1) {
    next.log.push(`${stackLabel(attacker)} miss a ${target.name.toLowerCase()}.`);
  } else {
    const { killed, soaked } = applyHits(next, target, dmg);
    if (soaked && killed < 1 && target.count > 0) {
      next.log.push(`${stackLabel(attacker)} chew the walls (${next.fortHp} left).`);
    } else if (killed) {
      next.log.push(`${stackLabel(attacker)} cut down ${killed} ${target.name.toLowerCase()}.`);
    } else {
      next.log.push(`${stackLabel(attacker)} wound a ${target.name.toLowerCase()}.`);
    }
  }
  const liveAtk = next.stacks.find((s) => s.id === attacker.id);
  const liveTgt = next.stacks.find((s) => s.id === target.id);
  if (liveTgt && liveTgt.count > 0 && !liveTgt.retaliated && liveTgt.atk > 0 && liveAtk && liveAtk.count > 0) {
    liveTgt.retaliated = true;
    const rRoll = liveTgt.atk + randInt(rng, 0, 2);
    const gRoll = liveAtk.def + randInt(rng, 0, 2);
    const back = hitDamage(rRoll, gRoll);
    if (back > 0) {
      const hit = applyHits(next, liveAtk, back);
      if (hit.killed) next.log.push(`${stackLabel(liveTgt)} strike back and fell ${hit.killed}.`);
      else next.log.push(`${stackLabel(liveTgt)} strike back.`);
    }
  }
  const still = next.stacks.find((s) => s.id === attacker.id);
  if (still && still.count > 0) still.exhausted = true;
  return next;
}

function maybeRout(battle: BattleState): BattleState {
  if (battle.routed || battleWinner(battle)) return battle;
  const atk = livingCount(battle.stacks, "atk");
  const def = livingCount(battle.stacks, "def");
  if (battle.startAtk >= 2 && atk * 2 < battle.startAtk) {
    battle.routed = "atk";
    battle.log.push("The attacking host breaks and flees.");
    return battle;
  }
  if (battle.startDef >= 2 && def * 2 < battle.startDef) {
    battle.routed = "def";
    battle.log.push("The defence breaks and flees the walls.");
    return battle;
  }
  return battle;
}

function weakest(foes: BattleStack[]) {
  return [...foes].sort((a, b) => {
    const ah = a.hp - a.wounds + (a.count - 1) * a.hp;
    const bh = b.hp - b.wounds + (b.count - 1) * b.hp;
    return a.def - b.def || ah - bh;
  })[0]!;
}

function runAiVolley(battle: BattleState): BattleState {
  let next = battle;
  let guard = 16;
  while (guard-- > 0 && !battleWinner(next) && !next.routed) {
    const ready = living(next.stacks, next.activeSide).filter((s) => !s.exhausted && s.atk > 0);
    const foes = living(next.stacks, other(next.activeSide));
    if (!ready.length || !foes.length) break;
    const striker = [...ready].sort((a, b) => b.atk - a.atk)[0]!;
    const mark = weakest(foes);
    next = resolveStrike(next, striker.id, mark.id);
    next = maybeRout(next);
  }
  return next;
}

function wakeAll(battle: BattleState) {
  for (const s of battle.stacks) {
    if (s.count > 0) {
      s.exhausted = false;
      s.retaliated = false;
    }
  }
}

function maybeEndVolley(battle: BattleState): BattleState {
  if (battleWinner(battle) || battle.routed) return battle;
  const ready = living(battle.stacks, battle.activeSide).filter((s) => !s.exhausted && s.atk > 0);
  if (ready.length) return battle;
  if (battle.activeSide === battle.humanSide) {
    const next = cloneBattle(battle);
    next.activeSide = other(next.humanSide);
    next.log.push("The other host answers.");
    const after = runAiVolley(next);
    if (battleWinner(after) || after.routed) return after;
    wakeAll(after);
    after.activeSide = after.humanSide;
    after.log.push("The host draws breath. Ready again.");
    return after;
  }
  return battle;
}

export function strikeBattle(battle: BattleState, attackerId: string, targetId: string): BattleState {
  if (battleWinner(battle) || battle.routed) return battle;
  if (battle.activeSide !== battle.humanSide) return battle;
  let next = resolveStrike(battle, attackerId, targetId);
  next = maybeRout(next);
  next = maybeEndVolley(next);
  return next;
}

/** Play remaining ready stacks, then the answering volley, until the field is decided. */
export function autoVolley(battle: BattleState): BattleState {
  let next = battle;
  let guard = 80;
  while (guard-- > 0 && !battleWinner(next) && !next.routed) {
    const ready = readyFighters(next);
    const foes = living(next.stacks, other(next.humanSide));
    if (!ready.length || !foes.length) {
      next = maybeEndVolley(next);
      if (!battleWinner(next) && !next.routed && !readyFighters(next).length) break;
      continue;
    }
    const striker = [...ready].sort((a, b) => b.atk - a.atk)[0]!;
    const mark = weakest(foes);
    const after = strikeBattle(next, striker.id, mark.id);
    if (after === next) break;
    next = after;
  }
  return next;
}
