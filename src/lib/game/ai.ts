import {
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildShip,
  buildRoad,
  buildFarm,
  buildSiege,
  beginSiege,
  canRaiseSiege,
  hasKindJob,
  endTurn,
  forceStrength,
  hostDefense,
  incomeFor,
  issueMarch,
  legalMarchTargets,
  ownedIds,
  playCard,
  standing,
  trainUnit,
  upkeepFor,
  worksCost,
  worksRank,
  foodNeed,
  shipsCap,
  siegeBringOf,
  siegeTargetOf,
  fortOf,
  raiseWorks,
} from "./engine";
import { openRaid, type RaidState } from "./raid";
import type { AiAction, Difficulty, GameState, JobKind, PlayerId, TerritoryState } from "./types";
import { UNIT_COST, BEAST_WAGE, FORT_CAP, isSiegeKind } from "./types";
import { TERRITORY_BY_ID, continentTerritories, landNeighbors } from "./world";
import { empireOf } from "./empires";
import { beastOf } from "./landscape";
import { DEFENSE_CAP, DEFENSE_KINDS, defenseRank, isDefenseKind } from "./defense";

function owned(state: GameState, player: PlayerId): TerritoryState[] {
  return ownedIds(state, player).map((id) => state.territories[id]!);
}

function profile(diff: Difficulty) {
  if (diff === "easy") {
    return {
      marchMin: 0,
      keepExtra: 0,
      capFloor: 2,
      landFloor: 1,
      capDanger: 2,
      atkSlack: 0,
      cities: true,
      knights: true,
      dragons: true,
      empires: true,
      bankToSpend: 0,
      spendFloor: 0,
      beastBank: 4,
      saveBeastGap: 0,
      saveDragonFrom: 22,
      raid: false,
      huntLeader: false,
      tribeUntil: 4,
    };
  }
  if (diff === "hard") {
    return {
      marchMin: -1,
      keepExtra: 0,
      capFloor: 3,
      landFloor: 1,
      capDanger: 3,
      atkSlack: 1,
      cities: true,
      knights: true,
      dragons: true,
      empires: true,
      bankToSpend: 0,
      spendFloor: 0,
      beastBank: 0,
      saveBeastGap: 2,
      saveDragonFrom: 18,
      raid: true,
      huntLeader: true,
      tribeUntil: 0,
    };
  }
  return {
    marchMin: 0,
    keepExtra: 0,
    capFloor: 2,
    landFloor: 1,
    capDanger: 2,
    atkSlack: 0,
    cities: true,
    knights: true,
    dragons: true,
    empires: true,
    bankToSpend: 0,
    spendFloor: 0,
    beastBank: 0,
    saveBeastGap: 2,
    saveDragonFrom: 20,
    raid: false,
    huntLeader: true,
    tribeUntil: 4,
  };
}

type Spec = ReturnType<typeof profile>;

function neighborThreat(state: GameState, t: TerritoryState, player: PlayerId): number {
  let imperial = 0;
  let tribal = 0;
  for (const id of landNeighbors(t.id)) {
    const d = state.territories[id];
    if (!d || d.owner === player) continue;
    const def = hostDefense(state, d);
    if (d.owner === "barbarian") tribal = Math.max(tribal, Math.min(3, Math.floor(def / 2) + 1));
    else imperial = Math.max(imperial, def);
  }
  return Math.max(imperial, tribal);
}

function garrisonKeep(
  state: GameState,
  t: TerritoryState,
  player: PlayerId,
  isCapitol: boolean,
  spec: Spec,
): number {
  const host = standing(t);
  const floor = isCapitol ? spec.capFloor : spec.landFloor;
  const need = Math.max(floor, neighborThreat(state, t, player) + spec.keepExtra);
  return Math.min(host, need);
}

function splitSend(t: TerritoryState, keep: number): { levy: number; bowmen: number; knights: number; dragons: number; beasts: number } {
  const beasts = t.beasts ?? 0;
  const bowmen = t.bowmen ?? 0;
  const holdable = t.levy + t.knights + t.dragons;
  let remain = Math.min(Math.max(0, keep), holdable);
  const keepD = Math.min(t.dragons, remain);
  remain -= keepD;
  const keepK = Math.min(t.knights, remain);
  remain -= keepK;
  const keepL = Math.min(t.levy, remain);
  const keepB = t.castle ? Math.min(bowmen, 2) : 0;
  return {
    levy: t.levy - keepL,
    bowmen: Math.max(0, bowmen - keepB),
    knights: t.knights - keepK,
    dragons: t.dragons - keepD,
    beasts,
  };
}

function sendCount(send: { levy: number; bowmen?: number; knights: number; dragons: number; beasts: number }) {
  return send.levy + (send.bowmen ?? 0) + send.knights + send.dragons + send.beasts;
}

function borderStable(state: GameState, player: PlayerId, holdCap: TerritoryState | null): boolean {
  if (holdCap && threatened(state, holdCap, player)) return false;
  return true;
}

function marketSite(state: GameState, lands: TerritoryState[], p: GameState["players"][number]): TerritoryState | null {
  const cost = worksCost(p, "market");
  if (p.gold < cost.gold || p.wood < cost.wood) return null;
  const open = lands.filter((t) => !t.market && !hasKindJob(state, t.id, "market"));
  if (!open.length) return null;
  open.sort((a, b) => Number(Boolean(b.road)) - Number(Boolean(a.road)) || standing(b) - standing(a));
  return open[0] ?? null;
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

function rivalSize(state: GameState, owner: TerritoryState["owner"]): number {
  if (owner === "barbarian") return 0;
  return owned(state, owner).length;
}

function leadingRival(state: GameState, player: PlayerId): PlayerId | null {
  let best: { id: PlayerId; continents: number; lands: number } | null = null;
  for (const p of state.players) {
    if (p.id === player || !p.alive) continue;
    const lands = owned(state, p.id).length;
    if (!lands) continue;
    let continents = 0;
    const share: Record<string, number> = {};
    for (const t of owned(state, p.id)) {
      const c = TERRITORY_BY_ID[t.id]!.continent;
      share[c] = (share[c] ?? 0) + 1;
    }
    for (const c of Object.keys(share)) {
      if (share[c] === continentTerritories(c).length) continents += 1;
    }
    if (!best || continents > best.continents || (continents === best.continents && lands > best.lands)) {
      best = { id: p.id, continents, lands };
    }
  }
  return best?.id ?? null;
}

function weakestPrey(state: GameState, player: PlayerId, capitol: string, spec: Spec) {
  let best: { from: string; to: string; score: number; send: ReturnType<typeof splitSend> } | null = null;
  const homes = new Set(empireOf(state.players[player]!.empire).homes);
  const capCont = TERRITORY_BY_ID[capitol]!.continent;
  const leader = spec.huntLeader ? leadingRival(state, player) : null;
  for (const t of owned(state, player)) {
    const keep = garrisonKeep(state, t, player, t.id === capitol, spec);
    const send = splitSend(t, keep);
    if (sendCount(send) < 1) continue;
    for (const nid of legalMarchTargets(state, t.id)) {
      const dest = state.territories[nid]!;
      if (dest.owner === player) continue;
      const tribe = dest.owner === "barbarian";
      const tribeOnly = spec.tribeUntil > 0 && owned(state, player).length < spec.tribeUntil;
      if (tribeOnly && !tribe) continue;
      if (!spec.empires && !tribe) continue;
      const atk = forceStrength(send, beastOf(state.players[player]!.empire).atk);
      const def = hostDefense(state, dest);
      if (atk + spec.atkSlack < def) continue;
      let score = atk - def;
      if (send.beasts > 0) score += 6;
      if (tribe) score += 2;
      if (landNeighbors(capitol).includes(nid)) score += 2;
      if (homes.has(nid)) score += 3;
      const destCont = TERRITORY_BY_ID[nid]!.continent;
      if (destCont === capCont) score += 2;
      const heldOn = owned(state, player).filter((x) => TERRITORY_BY_ID[x.id]!.continent === destCont).length;
      score += heldOn;
      const landsOn = continentTerritories(destCont).length;
      if (heldOn + 1 >= landsOn) score += 8;
      if (!tribe && dest.owner !== "barbarian") {
        const size = rivalSize(state, dest.owner);
        if (size <= 2) score += 3;
        if (leader != null && dest.owner === leader) score += 4;
        if (nid === empireOf(state.players[dest.owner]!.empire).capitol) score += 2;
      }
      if (score >= spec.marchMin && (!best || score > best.score)) best = { from: t.id, to: nid, score, send };
    }
  }
  return best;
}

function savingFor(
  gold: number,
  beastCost: number,
  spec: Spec,
  canBeastNow: boolean,
  canDragonNow: boolean,
): "beast" | "dragon" | null {
  if (canDragonNow || canBeastNow) return null;
  if (spec.dragons && gold >= spec.saveDragonFrom && gold < UNIT_COST.dragon.gold) return "dragon";
  if (spec.saveBeastGap > 0 && gold >= beastCost - spec.saveBeastGap && gold < beastCost) return "beast";
  return null;
}

function raidTarget(state: GameState, player: PlayerId): string | null {
  let best: { id: string; score: number } | null = null;
  for (const t of owned(state, player)) {
    for (const id of legalMarchTargets(state, t.id)) {
      const dest = state.territories[id]!;
      if (dest.owner === player) continue;
      const host = standing(dest);
      if (host < 1 || host > 8) continue;
      let score = 6 - host;
      if (dest.owner !== "barbarian") score += 3;
      if (!best || score > best.score) best = { id, score };
    }
  }
  return best?.id ?? null;
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
  const beast = beastOf(p.empire);
  const realm = lands.length;
  const nest = lands.find((t) => t.dragons < 1);
  const readyForDragon = Boolean(spec.dragons && nest && (realm >= 3 || ((nest?.knights ?? 0) >= 1 && standing(nest!) >= 4)));
  const nearDragon = Boolean(readyForDragon && p.gold >= spec.saveDragonFrom && p.gold < UNIT_COST.dragon.gold);
  const canBeastNow =
    Boolean(holdCap) &&
    !nearDragon &&
    p.gold >= beast.cost + spec.beastBank &&
    standing(holdCap!) >= 2 &&
    realm >= (diff === "easy" ? 3 : 1);
  const canDragonNow = Boolean(spec.dragons && nest && p.gold >= UNIT_COST.dragon.gold);
  const saving = savingFor(p.gold, beast.cost, spec, canBeastNow, canDragonNow) ?? (nearDragon ? "dragon" : null);
  const wagesOk = (extra = 0) => p.silver + incomeFor(state, player).silver >= upkeepFor(state, player).silver + extra;
  const hungry = incomeFor(state, player).food + p.food < foodNeed(state, player);
  const openLand = lands.some((t) => landWalk(state, t, player).length > 0);
  const canSail = lands.some((t) => t.port && t.ships > 0 && legalMarchTargets(state, t.id).some((id) => state.territories[id]!.owner !== player));
  const isolated = !openLand;

  if (holdCap && threatened(state, holdCap, player)) {
    if (p.cards.includes("wall") && fortOf(holdCap) < FORT_CAP) {
      return { type: "card", card: "wall", territoryId: capId };
    }
    if (p.cards.includes("levy") && standing(holdCap) < 6) {
      return { type: "card", card: "levy", territoryId: capId };
    }
    if (p.gold >= UNIT_COST.levy.gold && p.metal >= UNIT_COST.levy.metal && wagesOk(1) && !hasKindJob(state, capId, "levy")) {
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

  if (spec.raid && p.cards.includes("raid")) {
    const target = raidTarget(state, player);
    if (target) return { type: "card", card: "raid", territoryId: target };
  }

  const prey = weakestPrey(state, player, capId, spec);
  if (prey) {
    return { type: "march", from: prey.from, to: prey.to, ...prey.send };
  }

  const stack = holdCap ?? lands.reduce((a, b) => (standing(a) >= standing(b) ? a : b));
  let trainAt = stack;
  let stoutBorder = false;
  for (const t of lands) {
    const walk = landWalk(state, t, player);
    if (!walk.length) continue;
    stoutBorder = true;
    const foe = walk
      .map((id) => state.territories[id]!)
      .sort((a, b) => hostDefense(state, a) - hostDefense(state, b))[0]!;
    if (standing(t) <= hostDefense(state, foe) + 1) trainAt = t;
  }

  const stable = borderStable(state, player, holdCap);

  if (canDragonNow && nest && wagesOk(1) && stable && !hasKindJob(state, nest.id, "dragon")) {
    return { type: "train", territoryId: nest.id, kind: "dragon" };
  }
  if (realm >= 3 && stable) {
    const stall = marketSite(state, lands, p);
    if (stall) return { type: "build", territoryId: stall.id, kind: "market" };
  }

  if (stoutBorder && !hasKindJob(state, trainAt.id, "levy") && p.gold >= UNIT_COST.levy.gold && p.metal >= UNIT_COST.levy.metal && wagesOk(1) && !saving) {
    return { type: "train", territoryId: trainAt.id, kind: "levy" };
  }
  if (stoutBorder && holdCap && p.cards.includes("levy")) {
    return { type: "card", card: "levy", territoryId: trainAt.id };
  }

  if (isolated) {
    for (const t of lands) {
      const meta = TERRITORY_BY_ID[t.id]!;
      if (hasKindJob(state, t.id, "port")) continue;
      const port = worksCost(p, "port");
      if (meta.coastal && !t.port && p.gold >= port.gold && p.wood >= port.wood) {
        return { type: "build", territoryId: t.id, kind: "port" };
      }
    }
    for (const t of lands) {
      if (hasKindJob(state, t.id, "ship")) continue;
      const ship = worksCost(p, "ship");
      const keelWant = diff === "hard" ? 4 : 2;
      if (t.port && t.ships < keelWant && t.ships < shipsCap(t) && p.gold >= ship.gold && p.wood >= ship.wood) {
        return { type: "build", territoryId: t.id, kind: "ship" };
      }
    }
  }

  if (hungry) {
    for (const t of lands) {
      if (hasKindJob(state, t.id, "farm") || t.farm) continue;
      const farm = worksCost(p, "farm");
      if (p.gold >= farm.gold && p.wood >= farm.wood) {
        return { type: "build", territoryId: t.id, kind: "farm" };
      }
    }
  }

  if (canBeastNow && holdCap && wagesOk(BEAST_WAGE) && !stoutBorder && !hasKindJob(state, holdCap.id, "beast")) {
    return { type: "train", territoryId: holdCap.id, kind: "beast" };
  }

  if (stoutBorder && spec.knights && p.gold >= UNIT_COST.knight.gold && p.metal >= UNIT_COST.knight.metal && wagesOk(1) && trainAt.levy >= 2 && !hasKindJob(state, trainAt.id, "knight")) {
    return { type: "train", territoryId: trainAt.id, kind: "knight" };
  }

  if (stoutBorder && p.gold >= UNIT_COST.bowman.gold && p.wood >= UNIT_COST.bowman.wood && p.metal >= UNIT_COST.bowman.metal && wagesOk(1) && (trainAt.bowmen ?? 0) < 3 && fortOf(trainAt) >= 1 && !hasKindJob(state, trainAt.id, "bowman")) {
    return { type: "train", territoryId: trainAt.id, kind: "bowman" };
  }

  if (stoutBorder) {
    for (const t of lands) {
      const wallId = landWalk(state, t, player).find((id) => worksRank(state.territories[id]!, "castle") > 0);
      if (!wallId) continue;
      if (!siegeTargetOf(state, t.id) && standing(t) >= 1) {
        return { type: "siege", from: t.id, to: wallId };
      }
      if (!canRaiseSiege(state, t.id)) continue;
      if ((t.rams ?? 0) < 1 && !hasKindJob(state, t.id, "ram")) return { type: "build", territoryId: t.id, kind: "ram" };
      if ((t.ladders ?? 0) < 1 && !hasKindJob(state, t.id, "ladder")) return { type: "build", territoryId: t.id, kind: "ladder" };
      if ((t.towers ?? 0) < 1 && !hasKindJob(state, t.id, "tower")) return { type: "build", territoryId: t.id, kind: "tower" };
      if ((t.catapults ?? 0) < 1 && !hasKindJob(state, t.id, "catapult")) return { type: "build", territoryId: t.id, kind: "catapult" };
    }
  }

  if (stoutBorder && !hasKindJob(state, trainAt.id, "levy") && p.gold >= UNIT_COST.levy.gold && p.metal >= UNIT_COST.levy.metal && wagesOk(1)) {
    return { type: "train", territoryId: trainAt.id, kind: "levy" };
  }

  if (saving && isolated) {
    if (p.cards.includes("forge") && p.gold < UNIT_COST.dragon.gold) {
      return { type: "card", card: "forge", territoryId: holdCap?.id };
    }
    if (saving === "dragon" && p.cards.includes("tide") && p.wood < 5) {
      return { type: "card", card: "tide" };
    }
  }

  if (!openLand && !canSail) {
    for (const t of lands) {
      const meta = TERRITORY_BY_ID[t.id]!;
      const mine = worksCost(p, "mine");
      const market = worksCost(p, "market");
      const road = worksCost(p, "road");
      if (!meta.coastal && !t.mine && !hasKindJob(state, t.id, "mine") && p.gold >= mine.gold && p.stone >= mine.stone) {
        return { type: "build", territoryId: t.id, kind: "mine" };
      }
      if (!t.road && realm >= 2 && !hasKindJob(state, t.id, "road") && p.gold >= road.gold && p.wood >= road.wood && p.stone >= road.stone) {
        return { type: "build", territoryId: t.id, kind: "road" };
      }
      if (!t.market && !hasKindJob(state, t.id, "market") && p.gold >= market.gold && p.wood >= market.wood) {
        return { type: "build", territoryId: t.id, kind: "market" };
      }
      if (spec.cities && standing(t) >= 4) {
        for (const kind of DEFENSE_KINDS) {
          if (defenseRank(t, kind) >= DEFENSE_CAP[kind] || hasKindJob(state, t.id, kind)) continue;
          const cost = worksCost(p, kind, t);
          if (p.gold >= cost.gold && p.wood >= (cost.wood ?? 0) && p.stone >= (cost.stone ?? 0) && p.metal >= (cost.metal ?? 0)) {
            return { type: "build", territoryId: t.id, kind };
          }
        }
      }
    }
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
    if (isDefenseKind(kind)) return raiseWorks(state, action.territoryId, kind);
    if (kind === "market") return buildMarket(state, action.territoryId);
    if (kind === "road") return buildRoad(state, action.territoryId);
    if (kind === "farm") return buildFarm(state, action.territoryId);
    if (isSiegeKind(kind)) return buildSiege(state, action.territoryId, kind);
    return buildShip(state, action.territoryId);
  }
  if (action.type === "siege") return beginSiege(state, action.from, action.to);
  if (action.type === "march") {
    return issueMarch(state, action.from, action.to, {
      levy: action.levy,
      bowmen: action.bowmen,
      knights: action.knights,
      dragons: action.dragons,
      beasts: action.beasts,
    });
  }
  if (action.type === "card") return playCard(state, action.card, action.territoryId);
  return endTurn(state);
}

/** Play every rival empire until the human's watch returns. */
export function playAiTurns(state: GameState, maxSteps = 800): GameState {
  return playAiTurnsUntilBattle(state, maxSteps).state;
}

/** Same as playAiTurns, but pause when a rival marches on the human. */
export function playAiTurnsUntilBattle(
  state: GameState,
  maxSteps = 800,
): { state: GameState; battle: RaidState | null } {
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
    const incoming = (next.arrivals ?? []).find((a) => next.territories[a.to]?.owner === 0);
    if (incoming) {
      const battle = openRaid(
        next,
        incoming.from,
        incoming.to,
        { levy: incoming.levy, bowmen: incoming.bowmen, knights: incoming.knights, dragons: incoming.dragons, beasts: incoming.beasts },
        { rams: incoming.rams, catapults: incoming.catapults, ladders: incoming.ladders, towers: incoming.towers },
        "def",
      );
      if (battle) return { state: next, battle };
    }
    const action = nextAiAction(next);
    const before = next;
    next = applyAiAction(next, action);
    if (action.type !== "end" && next === before) next = endTurn(next);
    acted += 1;
    steps += 1;
  }
  const incoming = (next.arrivals ?? []).find((a) => next.territories[a.to]?.owner === 0);
  if (incoming) {
    const battle = openRaid(
      next,
      incoming.from,
      incoming.to,
      { levy: incoming.levy, bowmen: incoming.bowmen, knights: incoming.knights, dragons: incoming.dragons, beasts: incoming.beasts },
      { rams: incoming.rams, catapults: incoming.catapults, ladders: incoming.ladders, towers: incoming.towers },
      "def",
    );
    if (battle) return { state: next, battle };
  }
  return { state: next, battle: null };
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
