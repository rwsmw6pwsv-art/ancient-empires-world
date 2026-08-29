import {
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildShip,
  constructionBusy,
  endTurn,
  forceStrength,
  hostDefense,
  incomeFor,
  legalMarchTargets,
  ownedIds,
  playCard,
  resolveAttack,
  standing,
  trainUnit,
} from "./engine";
import type { AiAction, Difficulty, GameState, JobKind, PlayerId, TerritoryState } from "./types";
import { UNIT_COST } from "./types";
import { TERRITORY_BY_ID, landNeighbors } from "./world";
import { empireOf } from "./empires";
import { beastOf } from "./landscape";

function owned(state: GameState, player: PlayerId): TerritoryState[] {
  return ownedIds(state, player).map((id) => state.territories[id]!);
}

function profile(diff: Difficulty) {
  if (diff === "easy") {
    return {
      marchMin: 4,
      keepExtra: 2,
      capFloor: 5,
      landFloor: 2,
      capDanger: 5,
      cities: true,
      knights: true,
      dragons: true,
      empires: false,
    };
  }
  if (diff === "hard") {
    return {
      marchMin: -1,
      keepExtra: -2,
      capFloor: 2,
      landFloor: 1,
      capDanger: 3,
      cities: true,
      knights: true,
      dragons: true,
      empires: true,
    };
  }
  return {
    marchMin: 2,
    keepExtra: 1,
    capFloor: 4,
    landFloor: 2,
    capDanger: 4,
    cities: true,
    knights: true,
    dragons: true,
    empires: true,
  };
}

function neighborThreat(state: GameState, t: TerritoryState, player: PlayerId): number {
  let threat = 0;
  for (const id of landNeighbors(t.id)) {
    const d = state.territories[id];
    if (!d || d.owner === player) continue;
    threat = Math.max(threat, hostDefense(state, d));
  }
  return threat;
}

function garrisonKeep(
  state: GameState,
  t: TerritoryState,
  player: PlayerId,
  isCapitol: boolean,
  spec: ReturnType<typeof profile>,
): number {
  const host = standing(t);
  const floor = isCapitol ? spec.capFloor : spec.landFloor;
  const need = Math.max(floor, neighborThreat(state, t, player) + spec.keepExtra);
  return Math.min(host, need);
}

function splitSend(t: TerritoryState, keep: number): { levy: number; knights: number; dragons: number; beasts: number } {
  let remain = Math.max(0, keep);
  const keepD = Math.min(t.dragons, remain);
  remain -= keepD;
  const keepB = Math.min(t.beasts ?? 0, remain);
  remain -= keepB;
  const keepK = Math.min(t.knights, remain);
  remain -= keepK;
  const keepL = Math.min(t.levy, remain);
  return {
    levy: t.levy - keepL,
    knights: t.knights - keepK,
    dragons: t.dragons - keepD,
    beasts: (t.beasts ?? 0) - keepB,
  };
}

function sendCount(send: { levy: number; knights: number; dragons: number; beasts: number }) {
  return send.levy + send.knights + send.dragons + send.beasts;
}

function threatened(state: GameState, t: TerritoryState, player: PlayerId): boolean {
  return neighborThreat(state, t, player) >= standing(t);
}

function landWalk(state: GameState, t: TerritoryState, player: PlayerId): string[] {
  return landNeighbors(t.id).filter((id) => {
    const d = state.territories[id];
    return d && d.owner !== player;
  });
}

function weakestPrey(state: GameState, player: PlayerId, capitol: string, spec: ReturnType<typeof profile>) {
  let best: { from: string; to: string; score: number; send: ReturnType<typeof splitSend> } | null = null;
  for (const t of owned(state, player)) {
    const keep = garrisonKeep(state, t, player, t.id === capitol, spec);
    const send = splitSend(t, keep);
    if (sendCount(send) < 1) continue;
    for (const nid of legalMarchTargets(state, t.id)) {
      const dest = state.territories[nid]!;
      if (dest.owner === player) continue;
      if (!spec.empires && dest.owner !== "barbarian") continue;
      const atk = forceStrength(send, beastOf(state.players[player]!.empire).atk);
      const def = hostDefense(state, dest);
      let score = atk - def;
      if (dest.owner === "barbarian") score += 3;
      if (landNeighbors(capitol).includes(nid)) score += 3;
      const destCont = TERRITORY_BY_ID[nid]!.continent;
      const heldOn = owned(state, player).filter((x) => TERRITORY_BY_ID[x.id]!.continent === destCont).length;
      score += heldOn * 3;
      const need = dest.owner === "barbarian" ? spec.marchMin : Math.max(0, spec.marchMin);
      if (score >= need && (!best || score > best.score)) best = { from: t.id, to: nid, score, send };
    }
  }
  return best;
}

export function nextAiAction(state: GameState): AiAction {
  const player = state.clock.currentPlayer;
  const p = state.players[player]!;
  const lands = owned(state, player);
  if (!lands.length) return { type: "end" };
  const diff = state.difficulty;
  const def = empireOf(p.empire);
  const spec = profile(diff);
  const capId = def.capitol;
  const cap = state.territories[capId];
  const holdCap = cap && cap.owner === player ? cap : null;

  if (holdCap) {
    const danger = threatened(state, holdCap, player) || standing(holdCap) < spec.capDanger;
    if (danger) {
      if (p.cards.includes("wall") && !holdCap.castle) {
        return { type: "card", card: "wall", territoryId: capId };
      }
      if (p.cards.includes("levy") && standing(holdCap) < 6) {
        return { type: "card", card: "levy", territoryId: capId };
      }
      if (p.gold >= UNIT_COST.levy.gold && p.metal >= UNIT_COST.levy.metal) {
        return { type: "train", territoryId: capId, kind: "levy" };
      }
      for (const t of lands) {
        if (t.id === capId) continue;
        if (!legalMarchTargets(state, t.id).includes(capId)) continue;
        const send = splitSend(t, garrisonKeep(state, t, player, false, spec));
        if (sendCount(send) < 1) continue;
        return { type: "march", from: t.id, to: capId, ...send };
      }
    }
  }

  const stack = holdCap ?? lands.reduce((a, b) => (standing(a) >= standing(b) ? a : b));
  let trainAt = stack;
  for (const t of lands) {
    const walk = landWalk(state, t, player);
    const sea = t.port && t.ships > 0;
    if (!walk.length && !sea) continue;
    const foes = walk.length
      ? walk
      : legalMarchTargets(state, t.id).filter((id) => state.territories[id]!.owner !== player);
    if (!foes.length) continue;
    if (standing(t) < hostDefense(state, state.territories[foes[0]!]!)) trainAt = t;
  }

  for (const t of lands) {
    const meta = TERRITORY_BY_ID[t.id]!;
    if (constructionBusy(state, t.id)) continue;
    const portGold = def.portGoldCost ?? 5;
    if (meta.coastal && !t.port && p.gold >= portGold && p.wood >= 3) {
      return { type: "build", territoryId: t.id, kind: "port" };
    }
  }
  for (const t of lands) {
    if (constructionBusy(state, t.id)) continue;
    if (t.port && t.ships < 1 && landWalk(state, t, player).length === 0 && p.gold >= 3 && p.wood >= (def.shipWoodCost ?? 5)) {
      return { type: "build", territoryId: t.id, kind: "ship" };
    }
  }
  for (const t of lands) {
    const meta = TERRITORY_BY_ID[t.id]!;
    if (constructionBusy(state, t.id)) continue;
    const mineGold = def.mineGoldCost ?? 4;
    const mineStone = def.mineStoneCost ?? 3;
    const castleGold = def.castleCost ?? 6;
    if (!meta.coastal && !t.mine && p.gold >= mineGold && p.stone >= mineStone) {
      return { type: "build", territoryId: t.id, kind: "mine" };
    }
    if (t.port && t.ships < 1 && p.gold >= 3 && p.wood >= (def.shipWoodCost ?? 5)) {
      return { type: "build", territoryId: t.id, kind: "ship" };
    }
    if (!t.market && p.gold >= 4 && p.wood >= 2) {
      return { type: "build", territoryId: t.id, kind: "market" };
    }
    if (!t.castle && standing(t) >= 4 && p.gold >= castleGold && p.stone >= 4 && spec.cities) {
      return { type: "build", territoryId: t.id, kind: "castle" };
    }
  }

  const inc = incomeFor(state, player);
  if (holdCap && p.gold >= beastOf(p.empire).cost && standing(holdCap) >= 2) {
    return { type: "train", territoryId: holdCap.id, kind: "beast" };
  }
  if (spec.knights && p.gold >= UNIT_COST.knight.gold && p.metal >= UNIT_COST.knight.metal && stack.levy >= (diff === "hard" ? 2 : 3)) {
    return { type: "train", territoryId: stack.id, kind: "knight" };
  }
  if (spec.dragons && p.gold >= UNIT_COST.dragon.gold) {
    const nest = lands.find((t) => t.dragons < 1);
    if (nest) {
      if (diff === "hard" && (inc.gold >= 4 || nest.knights >= 1 || standing(nest) >= 4)) {
        return { type: "train", territoryId: nest.id, kind: "dragon" };
      }
      if (diff !== "hard" && nest.knights >= 1) {
        return { type: "train", territoryId: nest.id, kind: "dragon" };
      }
    }
  }

  if (p.gold >= UNIT_COST.levy.gold && p.metal >= UNIT_COST.levy.metal) {
    return { type: "train", territoryId: trainAt.id, kind: "levy" };
  }

  if (holdCap && p.cards.includes("levy")) {
    return { type: "card", card: "levy", territoryId: capId };
  }
  if (holdCap && p.cards.includes("wall") && !holdCap.castle) {
    return { type: "card", card: "wall", territoryId: capId };
  }
  if (p.cards.includes("forge") && p.gold < 6) {
    return { type: "card", card: "forge", territoryId: holdCap?.id };
  }

  for (const home of lands) {
    const need = garrisonKeep(state, home, player, home.id === capId, spec);
    if (standing(home) >= need && standing(home) >= spec.landFloor) continue;
    for (const t of lands) {
      if (t.id === home.id) continue;
      if (!legalMarchTargets(state, t.id).includes(home.id)) continue;
      const send = splitSend(t, garrisonKeep(state, t, player, t.id === capId, spec));
      if (sendCount(send) < 1) continue;
      return { type: "march", from: t.id, to: home.id, ...send };
    }
  }

  const prey = weakestPrey(state, player, capId, spec);
  if (prey) {
    return { type: "march", from: prey.from, to: prey.to, ...prey.send };
  }

  return { type: "end" };
}

export function applyAiAction(state: GameState, action: AiAction): GameState {
  if (action.type === "train") return trainUnit(state, action.territoryId, action.kind);
  if (action.type === "build") {
    const kind: JobKind = action.kind;
    if (kind === "port") return buildPort(state, action.territoryId);
    if (kind === "mine") return buildMine(state, action.territoryId);
    if (kind === "castle") return buildCastle(state, action.territoryId);
    if (kind === "market") return buildMarket(state, action.territoryId);
    return buildShip(state, action.territoryId);
  }
  if (action.type === "march") {
    return resolveAttack(state, action.from, action.to, {
      levy: action.levy,
      knights: action.knights,
      dragons: action.dragons,
      beasts: action.beasts,
    });
  }
  if (action.type === "card") return playCard(state, action.card, action.territoryId);
  return endTurn(state);
}

/** Play every rival court until the human's watch returns. */
export function playAiTurns(state: GameState, maxSteps = 800): GameState {
  let next = state;
  let steps = 0;
  let acted = 0;
  let watching = next.clock.currentPlayer;
  while (next.phase === "play" && !next.players[next.clock.currentPlayer]!.human && steps < maxSteps) {
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

export function frontierPressure(state: GameState, player: PlayerId): number {
  let n = 0;
  for (const t of owned(state, player)) {
    for (const id of landNeighbors(t.id)) {
      const d = state.territories[id];
      if (d && d.owner !== player) n += 1;
    }
  }
  return n;
}
