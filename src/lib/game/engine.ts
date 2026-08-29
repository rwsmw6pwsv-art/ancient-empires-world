import { EMPIRES, empireOf } from "./empires";
import { mulberry32, randInt, shuffle } from "./rng";
import type {
  AiAction,
  CardId,
  ContinentId,
  Difficulty,
  EmpireId,
  GameState,
  Job,
  JobKind,
  Opening,
  PlayerId,
  PlayerState,
  TerritoryState,
  UnitKind,
  HostForce,
} from "./types";
import {
  CAPITOL,
  CONTINENT_BONUS,
  HOUSES,
  PLAYER_COUNT,
  SAVE_VERSION,
  TURN_LIMIT,
  UNIT_ATK,
  UNIT_COST,
  UNIT_DEF,
  CITY_DEF,
  WALL_DEF,
  TRIBAL_DEF,
  DRAGON_CAP,
  WIN_CONTINENTS,
} from "./types";
import {
  BARBARIAN_IDS,
  continentTerritories,
  landNeighbors,
  seaNeighbors,
  TERRITORIES,
  TERRITORY_BY_ID,
} from "./world";
import { beastOf, landscapeOf, type BeastDef } from "./landscape";

export function isBarbarian(owner: TerritoryState["owner"]): owner is "barbarian" {
  return owner === "barbarian";
}

export function standing(t: TerritoryState): number {
  return t.levy + t.knights + t.dragons + (t.beasts ?? 0);
}

export function beastOfOwner(state: GameState, owner: TerritoryState["owner"]): BeastDef | null {
  if (owner === "barbarian") return null;
  return beastOf(state.players[owner]!.empire);
}

export function forceStrength(
  force: { levy: number; knights: number; dragons: number; beasts?: number },
  beastAtk: number,
): number {
  return (
    force.levy * UNIT_ATK.levy +
    force.knights * UNIT_ATK.knight +
    force.dragons * UNIT_ATK.dragon +
    (force.beasts ?? 0) * beastAtk
  );
}

export function forceDefense(
  force: { levy: number; knights: number; dragons: number; beasts?: number },
  beastDef: number,
): number {
  return (
    force.levy * UNIT_DEF.levy +
    force.knights * UNIT_DEF.knight +
    force.dragons * UNIT_DEF.dragon +
    (force.beasts ?? 0) * beastDef
  );
}

export function worksDefense(t: TerritoryState): number {
  if (isBarbarian(t.owner)) return TRIBAL_DEF;
  return CITY_DEF + (t.castle ? WALL_DEF : 0);
}

export function defenseStrength(t: TerritoryState, beastDef = 0): number {
  return forceDefense(t, beastDef) + worksDefense(t);
}

export function hostAttack(state: GameState, t: TerritoryState): number {
  return forceStrength(t, beastOfOwner(state, t.owner)?.atk ?? 0);
}

export function hostDefense(state: GameState, t: TerritoryState): number {
  return defenseStrength(t, beastOfOwner(state, t.owner)?.def ?? 0);
}

export function oddsLabel(atk: number, def: number): string {
  const d = atk - def;
  if (d >= 3) return "Likely to carry the field.";
  if (d >= 1) return "Favours the attack.";
  if (d === 0) return "Even fight.";
  if (d >= -2) return "Uphill.";
  return "The defence holds the ground.";
}

export function ownedIds(state: GameState, player: PlayerId): string[] {
  return Object.values(state.territories)
    .filter((t) => t.owner === player)
    .map((t) => t.id);
}

export function hasJob(state: GameState, territoryId: string): boolean {
  return state.jobs.some((j) => j.territoryId === territoryId);
}

export function constructionBusy(state: GameState, territoryId: string): boolean {
  return hasJob(state, territoryId);
}

function playerOf(state: GameState, id: PlayerId): PlayerState {
  return state.players[id]!;
}

function terr(state: GameState, id: string): TerritoryState {
  const t = state.territories[id];
  if (!t) throw new Error(`Unknown territory ${id}`);
  return t;
}

function log(state: GameState, line: string) {
  state.log.push(line);
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

export function continentsHeld(state: GameState, player: PlayerId): ContinentId[] {
  const owned = new Set(ownedIds(state, player));
  const held: ContinentId[] = [];
  for (const c of Object.keys(CONTINENT_BONUS) as ContinentId[]) {
    const lands = continentTerritories(c);
    if (lands.length && lands.every((t) => owned.has(t.id))) held.push(c);
  }
  return held;
}

export function continentShare(state: GameState, player: PlayerId): Record<ContinentId, number> {
  const share = { na: 0, ca: 0, sa: 0, eu: 0, af: 0, me: 0, as: 0, oc: 0 };
  for (const id of ownedIds(state, player)) {
    share[TERRITORY_BY_ID[id]!.continent] += 1;
  }
  return share;
}

export function realmRecruits(lands: number): number {
  return Math.max(0, Math.floor(lands / 2));
}

export function incomeFor(state: GameState, player: PlayerId) {
  const p = playerOf(state, player);
  const def = empireOf(p.empire);
  const ids = ownedIds(state, player);
  const n = ids.length;
  let gold = n;
  let wood = Math.floor(n / 3);
  let stone = Math.floor(n / 3);
  let metal = Math.floor(n / 4);
  for (const id of ids) {
    const t = terr(state, id);
    const meta = TERRITORY_BY_ID[id]!;
    gold += 2;
    if (t.mine) gold += 2;
    if (t.port) gold += 1;
    if (t.market) gold += 1;
    const rich = landscapeOf(id).resource;
    if (rich === "gold") gold += 2;
    if (rich === "wood") wood += 2;
    if (rich === "stone") stone += 2;
    if (rich === "metal") metal += 2;
    if (rich && (t.market || t.port)) gold += 2;
    if (def.woodOnAf && meta.continent === "af") wood += 1;
    if (def.stoneOnSa && meta.continent === "sa") stone += 1;
    if (def.goldOnOc && meta.continent === "oc") gold += 1;
    if (def.stoneOnNa && meta.continent === "na") stone += 1;
  }
  const kinds: Record<"gold" | "wood" | "stone" | "metal", number> = { gold: 0, wood: 0, stone: 0, metal: 0 };
  for (const id of ids) {
    const rich = landscapeOf(id).resource;
    if (rich) kinds[rich] += 1;
  }
  for (const count of Object.values(kinds)) {
    if (count >= 2) gold += count - 1;
  }
  const share = continentShare(state, player);
  for (const c of Object.keys(share) as ContinentId[]) {
    const held = share[c];
    if (held >= 2) gold += held * 2;
  }
  for (const c of continentsHeld(state, player)) gold += CONTINENT_BONUS[c];
  return { gold, wood, stone, metal };
}

export function upkeepFor(state: GameState, player: PlayerId) {
  let gold = 0;
  for (const id of ownedIds(state, player)) {
    const t = terr(state, id);
    gold += t.knights;
    gold += t.dragons * 2;
    gold += t.beasts ?? 0;
    gold += t.ships;
  }
  return { gold };
}

function pay(p: PlayerState, gold: number, wood = 0, stone = 0, metal = 0): boolean {
  if (p.gold < gold || p.wood < wood || p.stone < stone || p.metal < metal) return false;
  p.gold -= gold;
  p.wood -= wood;
  p.stone -= stone;
  p.metal -= metal;
  return true;
}

function grantSpoils(state: GameState, player: PlayerId, territoryId: string) {
  const p = playerOf(state, player);
  p.gold += 3;
  const rich = landscapeOf(territoryId).resource;
  if (rich === "gold") p.gold += 2;
  if (rich === "wood") p.wood += 2;
  if (rich === "stone") p.stone += 2;
  if (rich === "metal") p.metal += 2;
}

function grantTerritory(
  state: GameState,
  id: string,
  owner: PlayerId,
  extras?: Partial<TerritoryState>,
) {
  const t = terr(state, id);
  const def = empireOf(playerOf(state, owner).empire);
  const meta = TERRITORY_BY_ID[id]!;
  t.owner = owner;
  if (def.capitalPort && meta.id === def.capitol && meta.coastal) t.port = true;
  Object.assign(t, extras);
}

function seedBarbarians(state: GameState, rng: () => number) {
  for (const id of BARBARIAN_IDS) {
    const t = terr(state, id);
    t.owner = "barbarian";
    t.levy = randInt(rng, 4, 6);
    t.knights = rng() < 0.2 ? 1 : 0;
    t.castle = false;
    t.pressure = 0;
  }
  const labrador = state.territories.labrador;
  if (labrador && labrador.owner === "barbarian") labrador.levy = Math.max(labrador.levy, 5);
}

export function createNewGame(opts: {
  empire: EmpireId;
  difficulty?: Difficulty;
  opening?: Opening;
  seed?: number;
}): GameState {
  const seed = opts.seed ?? (Math.floor(Math.random() * 1e9) + 1);
  const rng = mulberry32(seed);
  const difficulty = opts.difficulty ?? "normal";
  const opening = opts.opening ?? "capital";

  const others = shuffle(
    rng,
    HOUSES.filter((h) => h !== opts.empire),
  );
  const order: EmpireId[] = [opts.empire, ...others];

  const players: PlayerState[] = order.map((empire, i) => ({
    id: i as PlayerId,
    empire,
    gold: 8,
    wood: 4,
    stone: 3,
    metal: 4,
    alive: true,
    human: i === 0,
    cards: ["levy", "forge"] as CardId[],
  }));

  const territories: Record<string, TerritoryState> = {};
  for (const d of TERRITORIES) {
    territories[d.id] = {
      id: d.id,
      owner: "barbarian",
      levy: 0,
      knights: 0,
      dragons: 0,
      beasts: 0,
      castle: false,
      mine: false,
      port: false,
      market: false,
      ships: 0,
      pressure: 0,
    };
  }

  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    difficulty,
    opening,
    clock: { turn: 1, currentPlayer: 0 },
    phase: "play",
    players,
    territories,
    jobs: [],
    log: [`The twelve empires take the field. Only the capitals are yours.`],
    marchFrom: null,
    winner: null,
    nextJobId: 1,
  };

  for (const p of players) {
    const def = empireOf(p.empire);
    const cap = def.capitol;
    const startLevy =
      (p.human ? 6 : difficulty === "hard" ? 8 : difficulty === "easy" ? 4 : 5) + (def.startLevyBonus ?? 0);
    grantTerritory(state, cap, p.id, {
      levy: startLevy,
      knights: 0,
      castle: Boolean(def.capitalCastle),
    });
  }
  seedBarbarians(state, rng);
  return state;
}

export function current(state: GameState): PlayerState {
  return playerOf(state, state.clock.currentPlayer);
}

export function legalTargets(state: GameState, fromId: string): string[] {
  return legalMarchTargets(state, fromId);
}

export function legalMarchTargets(state: GameState, fromId: string): string[] {
  const from = terr(state, fromId);
  if (isBarbarian(from.owner)) return [];
  const player = from.owner;
  const land = landNeighbors(fromId);
  const sea =
    from.port && from.ships > 0
      ? seaNeighbors(fromId).filter((id) => {
          const dest = TERRITORY_BY_ID[id];
          const dt = state.territories[id];
          return Boolean(dest?.coastal && dt);
        })
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...land, ...sea]) {
    if (id === fromId || seen.has(id)) continue;
    seen.add(id);
    const dest = terr(state, id);
    if (dest.owner === player && standing(dest) >= 0) out.push(id);
    else out.push(id);
  }
  return out;
}

export function setMarchFrom(state: GameState, id: string | null): GameState {
  const next = clone(state);
  if (id) {
    const t = terr(next, id);
    if (t.owner !== next.clock.currentPlayer) {
      next.marchFrom = null;
      return next;
    }
  }
  next.marchFrom = id;
  return next;
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export function supportingDragonDamage(state: GameState, attacker: PlayerId, toId: string): number {
  let dmg = 0;
  for (const n of landNeighbors(toId)) {
    const t = state.territories[n];
    if (t && t.owner === attacker && t.dragons > 0) dmg += t.dragons * 2;
  }
  return dmg;
}

export function applyStrikeToDefense(
  defLevy: number,
  defKnights: number,
  defDragons: number,
  damage: number,
  defBeasts = 0,
): { levy: number; knights: number; dragons: number; beasts: number } {
  let d = damage;
  let levy = defLevy;
  let knights = defKnights;
  let beasts = defBeasts;
  let dragons = defDragons;
  const take = (pool: number) => {
    const n = Math.min(pool, d);
    d -= n;
    return pool - n;
  };
  levy = take(levy);
  if (d > 0) knights = take(knights);
  if (d > 0) beasts = take(beasts);
  if (d > 0) dragons = take(dragons);
  return { levy, knights, dragons, beasts };
}

function combatRound(
  rng: () => number,
  atk: number,
  def: number,
): { atkLoss: number; defLoss: number } {
  const aRoll = atk + randInt(rng, 0, 2);
  const dRoll = def + randInt(rng, 0, 2);
  if (aRoll > dRoll) return { atkLoss: 0, defLoss: 1 + (aRoll - dRoll > 3 ? 1 : 0) };
  if (dRoll > aRoll) return { atkLoss: 1 + (dRoll - aRoll > 3 ? 1 : 0), defLoss: 0 };
  return { atkLoss: 1, defLoss: 1 };
}

export function resolveAttack(
  state: GameState,
  fromId: string,
  toId: string,
  force: { levy: number; knights: number; dragons: number; beasts?: number },
): GameState {
  const next = clone(state);
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  const sendBeasts = force.beasts ?? 0;
  if (from.owner !== player) return state;
  if (force.levy < 0 || force.knights < 0 || force.dragons < 0 || sendBeasts < 0) return state;
  if (
    force.levy > from.levy ||
    force.knights > from.knights ||
    force.dragons > from.dragons ||
    sendBeasts > (from.beasts ?? 0)
  ) {
    return state;
  }
  const sent = force.levy + force.knights + force.dragons + sendBeasts;
  if (sent < 1) return state;
  const legal = legalMarchTargets(next, fromId);
  if (!legal.includes(toId)) return state;

  const seaHop = !landNeighbors(fromId).includes(toId);
  if (seaHop) {
    if (!from.port || from.ships < 1) return state;
    from.ships -= 1;
  }

  if (isBarbarian(to.owner)) to.pressure = 3;
  const tribalCamp = isBarbarian(to.owner);

  from.levy -= force.levy;
  from.knights -= force.knights;
  from.dragons -= force.dragons;
  from.beasts = (from.beasts ?? 0) - sendBeasts;

  if (to.owner === player) {
    to.levy += force.levy;
    to.knights += force.knights;
    to.dragons += force.dragons;
    if (to.dragons > DRAGON_CAP) {
      from.dragons += to.dragons - DRAGON_CAP;
      to.dragons = DRAGON_CAP;
    }
    to.beasts = (to.beasts ?? 0) + sendBeasts;
    log(next, `${empireOf(playerOf(next, player).empire).name} marches into ${TERRITORY_BY_ID[toId]!.name}.`);
    next.marchFrom = null;
    return next;
  }

  const rng = mulberry32((next.seed + next.clock.turn * 997 + sent * 13 + toId.length) >>> 0);
  let aLevy = force.levy;
  let aKnights = force.knights;
  let aDragons = force.dragons;
  let aBeasts = sendBeasts;
  let dLevy = to.levy;
  let dKnights = to.knights;
  let dDragons = to.dragons;
  let dBeasts = to.beasts ?? 0;
  const support = supportingDragonDamage(next, player, toId);
  if (support > 0) {
    const hit = applyStrikeToDefense(dLevy, dKnights, dDragons, support, dBeasts);
    dLevy = hit.levy;
    dKnights = hit.knights;
    dDragons = hit.dragons;
    dBeasts = hit.beasts;
  }
  const atkBeast = beastOf(playerOf(next, player).empire);
  const defBeast = beastOfOwner(next, to.owner);
  const works = worksDefense(to);
  let guard = 24;
  const aliveAtk = () => aLevy + aKnights + aDragons + aBeasts;
  const aliveDef = () => dLevy + dKnights + dDragons + dBeasts;
  while (guard-- > 0 && aliveAtk() > 0 && aliveDef() > 0) {
    const atkStr =
      aLevy * UNIT_ATK.levy +
      aKnights * UNIT_ATK.knight +
      aDragons * UNIT_ATK.dragon +
      aBeasts * atkBeast.atk;
    const defStr = Math.max(
      0,
      dLevy * UNIT_DEF.levy +
        dKnights * UNIT_DEF.knight +
        dDragons * UNIT_DEF.dragon +
        dBeasts * (defBeast?.def ?? 0) +
        works,
    );
    const { atkLoss, defLoss } = combatRound(rng, atkStr, defStr);
    if (defLoss) {
      const h = applyStrikeToDefense(dLevy, dKnights, dDragons, defLoss, dBeasts);
      dLevy = h.levy;
      dKnights = h.knights;
      dDragons = h.dragons;
      dBeasts = h.beasts;
    }
    if (atkLoss) {
      const h = applyStrikeToDefense(aLevy, aKnights, aDragons, atkLoss, aBeasts);
      aLevy = h.levy;
      aKnights = h.knights;
      aDragons = h.dragons;
      aBeasts = h.beasts;
    }
  }

  const attackerName = empireOf(playerOf(next, player).empire).name;
  const place = TERRITORY_BY_ID[toId]!.name;

  if (aliveDef() <= 0 && aliveAtk() > 0) {
    const prev = to.owner;
    to.owner = player;
    to.levy = aLevy;
    to.knights = aKnights;
    to.dragons = aDragons;
    to.beasts = aBeasts;
    if (to.dragons > DRAGON_CAP) {
      from.dragons += to.dragons - DRAGON_CAP;
      to.dragons = DRAGON_CAP;
    }
    to.ships = 0;
    to.pressure = 0;
    if (prev === "barbarian") {
      grantSpoils(next, player, toId);
      to.levy += 1;
      log(next, `${attackerName} takes ${place} and strips the camp.`);
    } else {
      const leftover = ownedIds(next, prev).length;
      if (leftover === 0) {
        playerOf(next, prev).alive = false;
        log(next, `${empireOf(playerOf(next, prev).empire).name} is broken.`);
      }
      log(next, `${attackerName} takes ${place}.`);
    }
  } else {
    to.levy = dLevy;
    to.knights = dKnights;
    to.dragons = dDragons;
    to.beasts = dBeasts;
    from.levy += aLevy;
    from.knights += aKnights;
    from.dragons += aDragons;
    from.beasts = (from.beasts ?? 0) + aBeasts;
    if (tribalCamp) to.pressure = 3;
    log(next, `${attackerName} is thrown back from ${place}.`);
  }
  next.marchFrom = null;
  return checkVictory(next);
}

export function marchArmy(
  state: GameState,
  fromId: string,
  toId: string,
  force: HostForce,
): GameState {
  return resolveAttack(state, fromId, toId, force);
}

export function recallOccupiers(
  state: GameState,
  fromId: string,
  toId: string,
  recall: { levy: number; knights: number; dragons: number; beasts: number },
): GameState {
  const next = clone(state);
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  if (from.owner !== player || to.owner !== player) return state;
  let levy = Math.max(0, Math.min(recall.levy, to.levy));
  let knights = Math.max(0, Math.min(recall.knights, to.knights));
  let dragons = Math.max(0, Math.min(recall.dragons, to.dragons));
  let beasts = Math.max(0, Math.min(recall.beasts, to.beasts ?? 0));
  const stay =
    to.levy - levy + (to.knights - knights) + (to.dragons - dragons) + ((to.beasts ?? 0) - beasts);
  if (stay < 1) {
    if (to.levy - levy < 1 && to.levy >= 1) levy = to.levy - 1;
    if (to.levy - levy + to.knights - knights + to.dragons - dragons + (to.beasts ?? 0) - beasts < 1) {
      return state;
    }
  }
  to.levy -= levy;
  to.knights -= knights;
  to.dragons -= dragons;
  to.beasts = (to.beasts ?? 0) - beasts;
  from.levy += levy;
  from.knights += knights;
  from.dragons += dragons;
  from.beasts = (from.beasts ?? 0) + beasts;
  log(next, `${empireOf(playerOf(next, player).empire).name} sends a host back to ${TERRITORY_BY_ID[fromId]!.name}.`);
  return next;
}

export function trainUnit(state: GameState, territoryId: string, kind: UnitKind): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id) return state;
  if (kind === "beast" && !Object.values(CAPITOL).includes(territoryId)) return state;
  if (kind === "dragon" && t.dragons >= DRAGON_CAP) return state;
  const beast = beastOf(p.empire);
  const cost = kind === "beast" ? { gold: beast.cost, wood: 0, stone: 0, metal: 0 } : UNIT_COST[kind];
  if (!pay(p, cost.gold, cost.wood, cost.stone, cost.metal)) return state;
  if (kind === "levy") t.levy += 1;
  if (kind === "knight") t.knights += 1;
  if (kind === "dragon") t.dragons += 1;
  if (kind === "beast") t.beasts = (t.beasts ?? 0) + 1;
  const label = kind === "beast" ? beast.name : kind;
  log(next, `${empireOf(p.empire).name} raises ${label} in ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

function portCost(p: PlayerState) {
  const def = empireOf(p.empire);
  return { gold: def.portGoldCost ?? 5, wood: 3, stone: 0 };
}

function mineCost(p: PlayerState) {
  const def = empireOf(p.empire);
  return { gold: def.mineGoldCost ?? 4, wood: 0, stone: def.mineStoneCost ?? 3 };
}

function castleCost(p: PlayerState) {
  const def = empireOf(p.empire);
  return { gold: def.castleCost ?? 6, wood: 0, stone: 4 };
}

function shipCost(p: PlayerState) {
  const def = empireOf(p.empire);
  return { gold: 3, wood: def.shipWoodCost ?? 5, stone: 0 };
}

function marketCost(_p: PlayerState) {
  return { gold: 4, wood: 2, stone: 0 };
}

export function worksCost(p: PlayerState, kind: JobKind) {
  if (kind === "port") return portCost(p);
  if (kind === "mine") return mineCost(p);
  if (kind === "castle") return castleCost(p);
  if (kind === "ship") return shipCost(p);
  return marketCost(p);
}

function enqueue(state: GameState, kind: JobKind, territoryId: string, remaining: number) {
  const job: Job = {
    id: `j${state.nextJobId++}`,
    kind,
    territoryId,
    player: state.clock.currentPlayer,
    remaining,
  };
  state.jobs.push(job);
}

export function raiseWorks(state: GameState, territoryId: string, kind: JobKind): GameState {
  if (kind === "castle") return buildCastle(state, territoryId);
  if (kind === "mine") return buildMine(state, territoryId);
  if (kind === "port") return buildPort(state, territoryId);
  if (kind === "market") return buildMarket(state, territoryId);
  return buildShip(state, territoryId);
}

export function buildPort(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  const meta = TERRITORY_BY_ID[territoryId]!;
  if (t.owner !== p.id || t.port || !meta.coastal || constructionBusy(next, territoryId)) return state;
  const cost = portCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "port", territoryId, 1);
  log(next, `${empireOf(p.empire).name} lays a port at ${meta.name}.`);
  return next;
}

export function buildMine(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  const meta = TERRITORY_BY_ID[territoryId]!;
  if (t.owner !== p.id || t.mine || meta.coastal || constructionBusy(next, territoryId)) return state;
  const cost = mineCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "mine", territoryId, 1);
  log(next, `${empireOf(p.empire).name} sinks a mine in ${meta.name}.`);
  return next;
}

export function buildCastle(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id || t.castle || constructionBusy(next, territoryId)) return state;
  const cost = castleCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "castle", territoryId, 2);
  log(next, `${empireOf(p.empire).name} raises walls in ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function buildMarket(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id || t.market || constructionBusy(next, territoryId)) return state;
  const cost = marketCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "market", territoryId, 1);
  log(next, `${empireOf(p.empire).name} opens a market in ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function buildShip(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id || !t.port || constructionBusy(next, territoryId)) return state;
  const cost = shipCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "ship", territoryId, 1);
  log(next, `${empireOf(p.empire).name} lays a keel at ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function advanceJobs(state: GameState): GameState {
  const next = clone(state);
  const done: Job[] = [];
  for (const job of next.jobs) {
    job.remaining -= 1;
    if (job.remaining <= 0) done.push(job);
  }
  next.jobs = next.jobs.filter((j) => j.remaining > 0);
  for (const job of done) {
    const t = next.territories[job.territoryId];
    if (!t || t.owner !== job.player) continue;
    if (job.kind === "port") t.port = true;
    if (job.kind === "mine") t.mine = true;
    if (job.kind === "castle") t.castle = true;
    if (job.kind === "market") t.market = true;
    if (job.kind === "ship") t.ships += 1;
    log(next, `${TERRITORY_BY_ID[job.territoryId]!.name}: ${job.kind === "castle" ? "walls" : job.kind} complete.`);
  }
  return next;
}

export function playCard(state: GameState, card: CardId, territoryId?: string): GameState {
  const next = clone(state);
  const p = current(next);
  const idx = p.cards.indexOf(card);
  if (idx < 0) return state;
  p.cards.splice(idx, 1);
  if (card === "levy") {
    const id = territoryId ?? ownedIds(next, p.id)[0];
    if (id && terr(next, id).owner === p.id) terr(next, id).levy += 2;
    log(next, `${empireOf(p.empire).name} calls levies.`);
  } else if (card === "forge") {
    p.gold += 4;
    p.stone += 2;
    p.metal += 2;
    log(next, `${empireOf(p.empire).name} opens the forges.`);
  } else if (card === "tide") {
    p.wood += 4;
    log(next, `${empireOf(p.empire).name} rides a timber tide.`);
  } else if (card === "raid" && territoryId) {
    const t = terr(next, territoryId);
    if (t.owner !== p.id && standing(t) > 0) {
      const hit = applyStrikeToDefense(t.levy, t.knights, t.dragons, 2, t.beasts ?? 0);
      t.levy = hit.levy;
      t.knights = hit.knights;
      t.dragons = hit.dragons;
      t.beasts = hit.beasts;
      log(next, `${empireOf(p.empire).name} raids ${TERRITORY_BY_ID[territoryId]!.name}.`);
    }
  } else if (card === "wall" && territoryId) {
    const t = terr(next, territoryId);
    if (t.owner === p.id) t.castle = true;
    log(next, `${empireOf(p.empire).name} throws up a wall.`);
  }
  return next;
}

export function draftPick(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const t = terr(next, territoryId);
  if (!isBarbarian(t.owner)) return state;
  const p = current(next);
  grantTerritory(next, territoryId, p.id, { levy: 2 });
  log(next, `${empireOf(p.empire).name} claims ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function rankPlayers(state: GameState) {
  const alive = state.players.filter((p) => p.alive);
  return alive
    .map((p) => ({
      id: p.id,
      empire: p.empire,
      continents: continentsHeld(state, p.id).length,
      lands: ownedIds(state, p.id).length,
    }))
    .sort((a, b) => b.continents - a.continents || b.lands - a.lands);
}

export function checkVictory(state: GameState): GameState {
  const next = clone(state);
  const alive = next.players.filter((p) => p.alive);
  if (alive.length === 1) {
    next.phase = "gameover";
    next.winner = alive[0]!.id;
    log(next, `${empireOf(alive[0]!.empire).name} stands alone.`);
    return next;
  }
  for (const p of alive) {
    if (continentsHeld(next, p.id).length >= WIN_CONTINENTS) {
      next.phase = "gameover";
      next.winner = p.id;
      log(next, `${empireOf(p.empire).name} holds two continents.`);
      return next;
    }
  }
  if (next.clock.turn >= TURN_LIMIT) {
    const ranked = rankPlayers(next).filter((r) => r.continents >= WIN_CONTINENTS);
    next.phase = "gameover";
    if (!ranked.length) {
      next.winner = null;
      log(next, "The age closes. No court held two continents.");
      return next;
    }
    const best = ranked[0]!;
    const tie = ranked[1] && ranked[1].continents === best.continents;
    next.winner = best.id;
    if (tie) {
      log(
        next,
        `The age closes. ${empireOf(best.empire).name} holds the most provinces among the leading continents.`,
      );
    } else {
      log(next, `The age closes. ${empireOf(best.empire).name} holds the most continents.`);
    }
  }
  return next;
}

function collectIncome(state: GameState, player: PlayerId) {
  const inc = incomeFor(state, player);
  const up = upkeepFor(state, player);
  const p = playerOf(state, player);
  p.gold += inc.gold - up.gold;
  p.wood += inc.wood;
  p.stone += inc.stone;
  p.metal += inc.metal;
  if (p.gold < 0) {
    for (const id of ownedIds(state, player)) {
      const t = terr(state, id);
      while (p.gold < 0 && t.dragons > 0) {
        t.dragons -= 1;
        p.gold += 2;
      }
      while (p.gold < 0 && (t.beasts ?? 0) > 0) {
        t.beasts -= 1;
        p.gold += 1;
      }
      while (p.gold < 0 && t.knights > 0) {
        t.knights -= 1;
        p.gold += 1;
      }
      while (p.gold < 0 && t.ships > 0) {
        t.ships -= 1;
        p.gold += 1;
      }
    }
    p.gold = Math.max(0, p.gold);
  }
  grantRealmRecruits(state, player);
}

function grantRealmRecruits(state: GameState, player: PlayerId) {
  const ids = ownedIds(state, player);
  let n = realmRecruits(ids.length);
  if (n < 1) return;
  const ranked = ids
    .map((id) => terr(state, id))
    .sort((a, b) => standing(a) - standing(b));
  while (n > 0) {
    let placed = false;
    for (const t of ranked) {
      if (n <= 0) break;
      t.levy += 1;
      n -= 1;
      placed = true;
    }
    if (!placed) break;
  }
}

function tickTribes(state: GameState) {
  const rng = mulberry32((state.seed + state.clock.turn * 7919) >>> 0);
  for (const t of Object.values(state.territories)) {
    if (t.owner === "barbarian" && t.pressure > 0) t.pressure -= 1;
  }
  for (const t of Object.values(state.territories)) {
    if (t.owner !== "barbarian") continue;
    const cap = 6;
    const chance = t.pressure > 0 ? 0.18 : 0.42;
    if (t.levy < cap && rng() < chance) t.levy += 1;
    if (t.knights === 0 && t.levy >= 4 && rng() < 0.08) t.knights = 1;
  }
  const imperial = Object.values(state.territories).filter((t) => t.owner !== "barbarian");
  for (const target of shuffle(rng, imperial)) {
    if (rng() > 0.4) continue;
    const raiders = landNeighbors(target.id)
      .map((id) => state.territories[id]!)
      .filter((t) => t.owner === "barbarian" && t.pressure === 0 && standing(t) >= 4);
    if (!raiders.length) continue;
    raiders.sort((a, b) => standing(b) - standing(a));
    const tribe = raiders[0]!;
    const sendN = Math.max(1, Math.min(tribe.levy - 1, 2));
    tribe.levy -= sendN;
    const place = TERRITORY_BY_ID[target.id]!.name;
    const camp = TERRITORY_BY_ID[tribe.id]!.name;
    const thin = standing(target) <= 1;
    if (thin && sendN > 0) {
      const prev = target.owner;
      target.owner = "barbarian";
      target.levy = sendN;
      target.knights = 0;
      target.dragons = 0;
      target.beasts = 0;
      target.ships = 0;
      target.castle = false;
      target.pressure = 0;
      if (prev !== "barbarian" && ownedIds(state, prev).length === 0) {
        playerOf(state, prev).alive = false;
        log(state, `${empireOf(playerOf(state, prev).empire).name} is broken.`);
      }
      log(state, `Tribes overrun ${place} from ${camp}.`);
    } else {
      const hit = applyStrikeToDefense(target.levy, target.knights, target.dragons, 1, target.beasts ?? 0);
      target.levy = hit.levy;
      target.knights = hit.knights;
      target.dragons = hit.dragons;
      target.beasts = hit.beasts;
      tribe.levy += sendN;
      log(state, `Tribes raid ${place} from ${camp}.`);
    }
  }
}

function nextAlive(state: GameState, from: PlayerId): PlayerId {
  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const id = ((from + i) % PLAYER_COUNT) as PlayerId;
    if (playerOf(state, id).alive) return id;
  }
  return from;
}

export function endTurn(state: GameState): GameState {
  let next = clone(state);
  if (next.phase !== "play") return next;
  next.marchFrom = null;
  const prev = next.clock.currentPlayer;
  let np = nextAlive(next, prev);
  if (np <= prev) {
    next.clock.turn += 1;
    tickTribes(next);
  }
  next.clock.currentPlayer = np;
  next = advanceJobs(next);
  collectIncome(next, np);
  if (next.clock.turn % 6 === 0 && playerOf(next, np).cards.length < 4) {
    const deck: CardId[] = ["levy", "forge", "tide", "raid", "wall"];
    playerOf(next, np).cards.push(deck[next.clock.turn % deck.length]!);
  }
  return checkVictory(next);
}

export function watchReport(before: GameState, after: GameState): string[] {
  const lines: string[] = [];
  if (after.clock.turn > before.clock.turn) {
    lines.push(`The age turns to watch ${after.clock.turn}.`);
  }
  const lost: string[] = [];
  const gained: string[] = [];
  const overruns: string[] = [];
  const takes: string[] = [];
  for (const id of Object.keys(after.territories)) {
    const prev = before.territories[id];
    const nextT = after.territories[id];
    if (!prev || !nextT || prev.owner === nextT.owner) continue;
    const name = TERRITORY_BY_ID[id]!.name;
    if (prev.owner === 0) {
      if (nextT.owner === "barbarian") lost.push(`Tribes overrun ${name}.`);
      else lost.push(`${empireOf(after.players[nextT.owner]!.empire).name} takes ${name} from you.`);
    } else if (nextT.owner === 0) {
      gained.push(`You hold ${name}.`);
    } else if (nextT.owner === "barbarian") {
      overruns.push(`Tribes overrun ${name}.`);
    } else {
      takes.push(`${empireOf(after.players[nextT.owner]!.empire).name} takes ${name}.`);
    }
  }
  lines.push(...lost, ...gained, ...overruns.slice(0, 4), ...takes.slice(0, 4));
  for (const p of after.players) {
    if (before.players[p.id]!.alive && !p.alive) {
      lines.push(`${empireOf(p.empire).name} is broken.`);
    }
  }
  for (const job of before.jobs) {
    const still = after.jobs.some((j) => j.territoryId === job.territoryId && j.kind === job.kind);
    if (still) continue;
    const t = after.territories[job.territoryId];
    if (!t || t.owner !== 0) continue;
    lines.push(`${TERRITORY_BY_ID[job.territoryId]!.name}: ${job.kind === "castle" ? "walls" : job.kind} finished.`);
  }
  if (after.players[0]?.alive) {
    const inc = incomeFor(after, 0);
    lines.push(`Tribute this watch: ${inc.gold} gold, ${inc.metal} metal, ${inc.wood} timber, ${inc.stone} stone.`);
  }
  return lines.slice(0, 14);
}

export { EMPIRES, PLAYER_COUNT, TERRITORIES, TERRITORY_BY_ID };
