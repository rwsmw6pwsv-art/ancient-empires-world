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
  CONTINENT_NAMES,
  HOUSES,
  PLAYER_COUNT,
  SAVE_VERSION,
  TURN_LIMIT,
  UNIT_ATK,
  UNIT_COST,
  UNIT_DEF,
  CITY_DEF,
  WALL_DEF,
  WALL_IMPROVE,
  TRIBAL_DEF,
  DRAGON_CAP,
  WORKS_CAP,
  SHIPS_CAP,
  SHIPS_PER_RANK,
  WIN_CONTINENTS,
  LEVY_COMMISSION,
  BEAST_WAGE,
  CAPTURE_GOLD_BASE,
  CONTINENT_BREAK_GOLD,
  CAPITAL_SILVER,
  SILVER_PER_LAND,
  FOOD_PER_POP,
  START_LEVY,
  START_BEASTS,
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

export function worksRank(t: TerritoryState, kind: JobKind): number {
  const stored =
    kind === "market"
      ? t.marketRank
      : kind === "port"
        ? t.portRank
        : kind === "mine"
          ? t.mineRank
          : kind === "castle"
            ? t.castleRank
            : kind === "farm"
              ? t.farmRank
              : 0;
  if ((stored ?? 0) > 0) return stored!;
  if (kind === "market") return t.market ? 1 : 0;
  if (kind === "port") return t.port ? 1 : 0;
  if (kind === "mine") return t.mine ? 1 : 0;
  if (kind === "castle") return t.castle ? 1 : 0;
  if (kind === "farm") return t.farm ? 1 : 0;
  return 0;
}

export function shipsCap(t: TerritoryState): number {
  const r = worksRank(t, "port");
  if (r < 1) return 1;
  return Math.min(SHIPS_CAP, r * SHIPS_PER_RANK);
}

function berthShip(from: TerritoryState, to: TerritoryState): boolean {
  if (to.ships < shipsCap(to)) {
    to.ships += 1;
    return true;
  }
  from.ships += 1;
  return false;
}

export function worksDefense(t: TerritoryState): number {
  if (isBarbarian(t.owner)) return TRIBAL_DEF;
  const walls = worksRank(t, "castle");
  return CITY_DEF + (walls > 0 ? WALL_DEF + (walls - 1) * WALL_IMPROVE : 0);
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

export function realmPopulation(state: GameState, player: PlayerId): number {
  return ownedIds(state, player).reduce((n, id) => n + (state.territories[id]!.population ?? 0), 0);
}

export function foodNeed(state: GameState, player: PlayerId): number {
  return Math.ceil(realmPopulation(state, player) / FOOD_PER_POP);
}

export function cityPopCap(t: TerritoryState): number {
  const capital = Object.values(CAPITOL).includes(t.id);
  return 4 + worksRank(t, "farm") + worksRank(t, "market") + worksRank(t, "castle") + (capital ? 2 : 0);
}

export function incomeFor(state: GameState, player: PlayerId) {
  const p = playerOf(state, player);
  const def = empireOf(p.empire);
  const ids = ownedIds(state, player);
  const n = ids.length;
  let gold = n;
  let silver = n * SILVER_PER_LAND;
  let wood = Math.floor(n / 3);
  let stone = Math.floor(n / 3);
  let metal = Math.floor(n / 4);
  let food = n;
  for (const id of ids) {
    const t = terr(state, id);
    const meta = TERRITORY_BY_ID[id]!;
    gold += 2;
    const mineR = worksRank(t, "mine");
    const portR = worksRank(t, "port");
    const marketR = worksRank(t, "market");
    const farmR = worksRank(t, "farm");
    if (mineR) gold += 2 * mineR;
    if (portR) gold += portR;
    if (marketR) gold += marketR;
    if (farmR) food += 2 * farmR;
    const rich = landscapeOf(id).resource;
    if (rich === "gold") gold += 2;
    if (rich === "silver") silver += 3;
    if (rich === "silver" && mineR) silver += 2 * mineR;
    if (Object.values(CAPITOL).includes(id)) silver += CAPITAL_SILVER;
    if (rich === "wood") wood += 2;
    if (rich === "stone") stone += 2;
    if (rich === "metal") metal += 2;
    if (rich === "food") food += 3;
    if (rich === "food" && farmR) food += 2 * farmR;
    if (rich && (marketR || portR)) gold += 2 * Math.max(marketR, portR);
    if (def.woodOnAf && meta.continent === "af") wood += 1;
    if (def.woodOnAs && meta.continent === "as") wood += 1;
    if (def.woodOnNa && meta.continent === "na") wood += 1;
    if (def.stoneOnSa && meta.continent === "sa") stone += 1;
    if (def.stoneOnNa && meta.continent === "na") stone += 1;
    if (def.stoneOnEu && meta.continent === "eu") stone += 1;
    if (def.stoneOnAs && meta.continent === "as") stone += 1;
    if (def.goldOnOc && meta.continent === "oc") gold += 1;
    if (def.goldOnCa && meta.continent === "ca") gold += 1;
    if (def.goldOnMe && meta.continent === "me") gold += 1;
    if (def.foodOnAf && meta.continent === "af") food += 1;
  }
  const kinds: Record<"gold" | "silver" | "wood" | "stone" | "metal" | "food", number> = {
    gold: 0,
    silver: 0,
    wood: 0,
    stone: 0,
    metal: 0,
    food: 0,
  };
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
  gold += tradeFor(state, player);
  return { gold, silver, wood, stone, metal, food };
}

export function tradeFor(state: GameState, player: PlayerId): number {
  const p = playerOf(state, player);
  const ids = ownedIds(state, player);
  const n = ids.length;
  let trade = Math.max(0, n - 1);
  const footholds = new Set(ids.map((id) => TERRITORY_BY_ID[id]!.continent));
  trade += footholds.size;
  trade += continentsHeld(state, player).length * 2;
  trade += Math.floor((p.gold + p.silver) / 8);
  let ports = 0;
  let ships = 0;
  let veins = 0;
  let roads = 0;
  for (const id of ids) {
    const t = terr(state, id);
    ports += worksRank(t, "port");
    ships += t.ships;
    const rich = landscapeOf(id).resource;
    if (rich === "gold" || rich === "silver") veins += 1;
    if (Object.values(CAPITOL).includes(id)) veins += 1;
    trade += worksRank(t, "market");
    trade += worksRank(t, "mine");
    trade += worksRank(t, "farm");
    if (t.road) {
      for (const nb of landNeighbors(id)) {
        if (nb <= id) continue;
        const u = state.territories[nb];
        if (u && u.owner === player && u.road) roads += 1;
      }
    }
  }
  trade += ports;
  trade += ships * 2;
  trade += veins;
  trade += roads * 2;
  trade += Math.floor(realmPopulation(state, player) / 2);
  return trade;
}

export function upkeepFor(state: GameState, player: PlayerId) {
  let silver = 0;
  for (const id of ownedIds(state, player)) {
    const t = terr(state, id);
    silver += Math.max(t.levy > 0 ? 1 : 0, Math.floor(t.levy / LEVY_COMMISSION));
    silver += t.knights;
    silver += t.dragons;
    silver += (t.beasts ?? 0) * BEAST_WAGE;
  }
  return { silver };
}

function pay(p: PlayerState, gold: number, wood = 0, stone = 0, metal = 0): boolean {
  if (p.gold < gold || p.wood < wood || p.stone < stone || p.metal < metal) return false;
  p.gold -= gold;
  p.wood -= wood;
  p.stone -= stone;
  p.metal -= metal;
  return true;
}

function grantSpoils(
  state: GameState,
  player: PlayerId,
  territoryId: string,
  defHost: number,
  brokeContinent: boolean,
) {
  const p = playerOf(state, player);
  p.gold += CAPTURE_GOLD_BASE + Math.max(0, defHost);
  if (brokeContinent) {
    const c = TERRITORY_BY_ID[territoryId]!.continent;
    p.gold += CONTINENT_BREAK_GOLD + CONTINENT_BONUS[c];
  }
  const rich = landscapeOf(territoryId).resource;
  if (rich === "gold") p.gold += 2;
  if (rich === "silver") p.silver += 2;
  if (rich === "wood") p.wood += 2;
  if (rich === "stone") p.stone += 2;
  if (rich === "metal") p.metal += 2;
}

function defendingHost(t: TerritoryState): number {
  return t.levy + t.knights + t.dragons + (t.beasts ?? 0);
}

function holdsContinent(state: GameState, player: PlayerId, continent: ContinentId): boolean {
  const lands = continentTerritories(continent);
  return lands.length > 0 && lands.every((d) => state.territories[d.id]!.owner === player);
}

function placeDragon(state: GameState, player: PlayerId, preferId: string, fallbackId: string): string | null {
  const tryPut = (id: string) => {
    const t = state.territories[id];
    if (!t || t.owner !== player || t.dragons >= DRAGON_CAP) return false;
    t.dragons += 1;
    return true;
  };
  if (tryPut(preferId)) return preferId;
  if (fallbackId !== preferId && tryPut(fallbackId)) return fallbackId;
  for (const id of ownedIds(state, player)) {
    if (tryPut(id)) return id;
  }
  return null;
}

function tribeBand(diff: Difficulty) {
  if (diff === "easy") {
    return { min: 1, max: 3, cap: 4, grow: 0.2, pressGrow: 0.08, knight: 0.03, knightLevy: 4 };
  }
  if (diff === "hard") {
    return { min: 7, max: 9, cap: 10, grow: 0.6, pressGrow: 0.28, knight: 0.16, knightLevy: 6 };
  }
  return { min: 4, max: 6, cap: 6, grow: 0.42, pressGrow: 0.18, knight: 0.08, knightLevy: 4 };
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
  if (def.capitalPort && meta.id === def.capitol && meta.coastal) {
    t.port = true;
    t.portRank = Math.max(t.portRank ?? 0, 1);
  }
  if (def.capitalMine && meta.id === def.capitol && !meta.coastal) {
    t.mine = true;
    t.mineRank = Math.max(t.mineRank ?? 0, 1);
  }
  Object.assign(t, extras);
  if (t.port) t.portRank = Math.max(t.portRank ?? 0, 1);
  if (t.castle) t.castleRank = Math.max(t.castleRank ?? 0, 1);
  if (t.mine) t.mineRank = Math.max(t.mineRank ?? 0, 1);
  if (t.market) t.marketRank = Math.max(t.marketRank ?? 0, 1);
  if (t.farm) t.farmRank = Math.max(t.farmRank ?? 0, 1);
  if ((t.population ?? 0) < 1) t.population = 1;
}

function seedBarbarians(state: GameState, rng: () => number) {
  const band = tribeBand(state.difficulty);
  for (const id of BARBARIAN_IDS) {
    const t = terr(state, id);
    t.owner = "barbarian";
    t.levy = randInt(rng, band.min, band.max);
    t.knights = rng() < (state.difficulty === "hard" ? 0.35 : state.difficulty === "easy" ? 0.05 : 0.2) ? 1 : 0;
    t.castle = false;
    t.castleRank = 0;
    t.pressure = 0;
    t.population = 1;
  }
  const labrador = state.territories.labrador;
  if (labrador && labrador.owner === "barbarian") {
    const floor = state.difficulty === "easy" ? band.max : state.difficulty === "hard" ? 8 : 5;
    labrador.levy = Math.max(labrador.levy, floor);
  }
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
    silver: 12,
    wood: 4,
    stone: 3,
    metal: 4,
    food: 8,
    lastLands: 1,
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
      road: false,
      castleRank: 0,
      mineRank: 0,
      portRank: 0,
      marketRank: 0,
      farm: false,
      farmRank: 0,
      ships: 0,
      pressure: 0,
      population: 0,
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
    const startLevy = START_LEVY[difficulty];
    grantTerritory(state, cap, p.id, {
      levy: startLevy,
      knights: 0,
      beasts: START_BEASTS[difficulty],
      castle: true,
      road: true,
      population: 4,
      ships: def.startShip ? 1 : 0,
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
  const fromMeta = TERRITORY_BY_ID[fromId];
  const sea =
    fromMeta?.coastal && from.ships > 0
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

type AssaultMeta = {
  fromId: string;
  toId: string;
  force: { levy: number; knights: number; dragons: number; beasts: number };
  convoy: number;
  tribalCamp: boolean;
  defHost: number;
  prevOwner: TerritoryState["owner"];
  destCont: ContinentId;
  brokeContinent: boolean;
  wasCapitol: boolean;
  continentsBefore: number;
  player: PlayerId;
};

function prepareAssault(
  state: GameState,
  fromId: string,
  toId: string,
  force: { levy: number; knights: number; dragons: number; beasts?: number },
): { next: GameState; meta: AssaultMeta } | { next: GameState; friendly: true } | null {
  const next = clone(state);
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  const sendBeasts = force.beasts ?? 0;
  if (from.owner !== player) return null;
  if (force.levy < 0 || force.knights < 0 || force.dragons < 0 || sendBeasts < 0) return null;
  if (
    force.levy > from.levy ||
    force.knights > from.knights ||
    force.dragons > from.dragons ||
    sendBeasts > (from.beasts ?? 0)
  ) {
    return null;
  }
  const sent = force.levy + force.knights + force.dragons + sendBeasts;
  if (sent < 1) return null;
  const legal = legalMarchTargets(next, fromId);
  if (!legal.includes(toId)) return null;

  const seaHop = !landNeighbors(fromId).includes(toId);
  let convoy = 0;
  if (seaHop) {
    if (!TERRITORY_BY_ID[fromId]?.coastal || from.ships < 1) return null;
    from.ships -= 1;
    convoy = 1;
  }

  if (isBarbarian(to.owner)) to.pressure = 3;
  const tribalCamp = isBarbarian(to.owner);
  const defHost = defendingHost(to);
  const prevOwner = to.owner;
  const destCont = TERRITORY_BY_ID[toId]!.continent;
  const brokeContinent =
    prevOwner !== "barbarian" && holdsContinent(next, prevOwner, destCont);
  const wasCapitol =
    prevOwner !== "barbarian" && empireOf(playerOf(next, prevOwner).empire).capitol === toId;
  const continentsBefore = continentsHeld(next, player).length;

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
    if (convoy) berthShip(from, to);
    log(next, `${empireOf(playerOf(next, player).empire).name} ${convoy ? "sails" : "marches"} into ${TERRITORY_BY_ID[toId]!.name}.`);
    next.marchFrom = null;
    return { next, friendly: true };
  }

  return {
    next,
    meta: {
      fromId,
      toId,
      force: { levy: force.levy, knights: force.knights, dragons: force.dragons, beasts: sendBeasts },
      convoy,
      tribalCamp,
      defHost,
      prevOwner,
      destCont,
      brokeContinent,
      wasCapitol,
      continentsBefore,
      player,
    },
  };
}

function finishAssault(
  next: GameState,
  meta: AssaultMeta,
  aLevy: number,
  aKnights: number,
  aDragons: number,
  aBeasts: number,
  dLevy: number,
  dKnights: number,
  dDragons: number,
  dBeasts: number,
): GameState {
  const from = terr(next, meta.fromId);
  const to = terr(next, meta.toId);
  const attackerName = empireOf(playerOf(next, meta.player).empire).name;
  const place = TERRITORY_BY_ID[meta.toId]!.name;
  const aliveAtk = aLevy + aKnights + aDragons + aBeasts;
  const aliveDef = dLevy + dKnights + dDragons + dBeasts;

  if (aliveDef <= 0 && aliveAtk > 0) {
    const prev = to.owner;
    to.owner = meta.player;
    to.levy = aLevy;
    to.knights = aKnights;
    to.dragons = aDragons;
    to.beasts = aBeasts;
    if (to.dragons > DRAGON_CAP) {
      from.dragons += to.dragons - DRAGON_CAP;
      to.dragons = DRAGON_CAP;
    }
    to.ships = 0;
    if (meta.convoy) berthShip(from, to);
    to.pressure = 0;
    if ((to.population ?? 0) < 1) to.population = 1;
    grantSpoils(next, meta.player, meta.toId, meta.defHost, meta.brokeContinent);
    if (prev === "barbarian") {
      to.levy += 1;
      log(next, `${attackerName} takes ${place} and strips the camp.`);
    } else {
      const leftover = ownedIds(next, prev).length;
      if (leftover === 0) {
        playerOf(next, prev).alive = false;
        log(next, `${empireOf(playerOf(next, prev).empire).name} is broken.`);
      }
      if (meta.brokeContinent) {
        log(next, `${attackerName} cracks the ${CONTINENT_NAMES[meta.destCont]} lock on ${place}.`);
      } else {
        log(next, `${attackerName} takes ${place}.`);
      }
    }
    if (meta.wasCapitol) {
      const nest = placeDragon(next, meta.player, meta.toId, meta.fromId);
      if (nest) log(next, `A dragon wakes in ${TERRITORY_BY_ID[nest]!.name} over the fallen capital.`);
    }
    if (continentsHeld(next, meta.player).length > meta.continentsBefore) {
      const nest = placeDragon(next, meta.player, meta.toId, meta.fromId);
      if (nest) log(next, `${CONTINENT_NAMES[meta.destCont]} yields a dragon in ${TERRITORY_BY_ID[nest]!.name}.`);
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
    if (meta.convoy && aliveAtk > 0) from.ships += meta.convoy;
    if (meta.tribalCamp) to.pressure = 3;
    log(next, `${attackerName} is thrown back from ${place}.`);
  }
  next.marchFrom = null;
  return checkVictory(next);
}

export function resolveAttack(
  state: GameState,
  fromId: string,
  toId: string,
  force: { levy: number; knights: number; dragons: number; beasts?: number },
): GameState {
  const prepared = prepareAssault(state, fromId, toId, force);
  if (!prepared) return state;
  if ("friendly" in prepared) return prepared.next;
  const { next, meta } = prepared;
  const to = terr(next, toId);
  const sendBeasts = meta.force.beasts;
  const rng = mulberry32((next.seed + next.clock.turn * 997 + (meta.force.levy + meta.force.knights + meta.force.dragons + sendBeasts) * 13 + toId.length) >>> 0);
  let aLevy = meta.force.levy;
  let aKnights = meta.force.knights;
  let aDragons = meta.force.dragons;
  let aBeasts = sendBeasts;
  let dLevy = to.levy;
  let dKnights = to.knights;
  let dDragons = to.dragons;
  let dBeasts = to.beasts ?? 0;
  const support = supportingDragonDamage(next, meta.player, toId);
  if (support > 0) {
    const hit = applyStrikeToDefense(dLevy, dKnights, dDragons, support, dBeasts);
    dLevy = hit.levy;
    dKnights = hit.knights;
    dDragons = hit.dragons;
    dBeasts = hit.beasts;
  }
  const atkBeast = beastOf(playerOf(next, meta.player).empire);
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
  return finishAssault(next, meta, aLevy, aKnights, aDragons, aBeasts, dLevy, dKnights, dDragons, dBeasts);
}

export function commitBattle(
  state: GameState,
  fromId: string,
  toId: string,
  force: HostForce,
  atkLeft: HostForce,
  defLeft: HostForce,
): GameState {
  const prepared = prepareAssault(state, fromId, toId, force);
  if (!prepared) return state;
  if ("friendly" in prepared) return prepared.next;
  return finishAssault(
    prepared.next,
    prepared.meta,
    atkLeft.levy,
    atkLeft.knights,
    atkLeft.dragons,
    atkLeft.beasts,
    defLeft.levy,
    defLeft.knights,
    defLeft.dragons,
    defLeft.beasts,
  );
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
  recall: { levy: number; knights: number; dragons: number; beasts: number; ships?: number },
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
  const returning = levy + knights + dragons + beasts;
  const sailHome = (recall.ships ?? 0) > 0 && returning > 0 && (to.ships ?? 0) > 0 && seaNeighbors(toId).includes(fromId);
  if (sailHome) {
    to.ships -= 1;
    berthShip(to, from);
  }
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

function marketCost(p: PlayerState) {
  const def = empireOf(p.empire);
  return { gold: def.marketGoldCost ?? 4, wood: 2, stone: 0 };
}

function roadCost(_p: PlayerState) {
  return { gold: 3, wood: 4, stone: 1 };
}

function farmCost(p: PlayerState) {
  const def = empireOf(p.empire);
  return { gold: def.farmGoldCost ?? 3, wood: 2, stone: 0 };
}

function improveCost(rank: number) {
  return { gold: 4 + 4 * rank, wood: 0, stone: 0 };
}

export function worksCost(p: PlayerState, kind: JobKind, t?: TerritoryState) {
  if (t && (kind === "port" || kind === "mine" || kind === "castle" || kind === "market" || kind === "farm")) {
    const rank = worksRank(t, kind);
    if (rank > 0) return improveCost(rank);
  }
  if (kind === "port") return portCost(p);
  if (kind === "mine") return mineCost(p);
  if (kind === "castle") return castleCost(p);
  if (kind === "ship") return shipCost(p);
  if (kind === "road") return roadCost(p);
  if (kind === "farm") return farmCost(p);
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

function startImproveable(
  next: GameState,
  t: TerritoryState,
  kind: "port" | "mine" | "castle" | "market" | "farm",
  first: { gold: number; wood: number; stone: number },
  firstTurns: number,
  firstLine: string,
  improveLine: string,
): GameState | null {
  const p = current(next);
  const rank = worksRank(t, kind);
  if (t.owner !== p.id || rank >= WORKS_CAP || constructionBusy(next, t.id)) return null;
  if (rank === 0) {
    if (!pay(p, first.gold, first.wood, first.stone)) return null;
    enqueue(next, kind, t.id, firstTurns);
    log(next, firstLine);
  } else {
    const cost = improveCost(rank);
    if (!pay(p, cost.gold, cost.wood, cost.stone)) return null;
    enqueue(next, kind, t.id, 1);
    log(next, improveLine);
  }
  return next;
}

export function raiseWorks(state: GameState, territoryId: string, kind: JobKind): GameState {
  if (kind === "castle") return buildCastle(state, territoryId);
  if (kind === "mine") return buildMine(state, territoryId);
  if (kind === "port") return buildPort(state, territoryId);
  if (kind === "market") return buildMarket(state, territoryId);
  if (kind === "road") return buildRoad(state, territoryId);
  if (kind === "farm") return buildFarm(state, territoryId);
  return buildShip(state, territoryId);
}

export function buildPort(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const t = terr(next, territoryId);
  const meta = TERRITORY_BY_ID[territoryId]!;
  if (!meta.coastal) return state;
  const p = current(next);
  const started = startImproveable(
    next,
    t,
    "port",
    portCost(p),
    1,
    `${empireOf(p.empire).name} lays a port at ${meta.name}.`,
    `${empireOf(p.empire).name} improves the port at ${meta.name}.`,
  );
  return started ?? state;
}

export function buildMine(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const t = terr(next, territoryId);
  const meta = TERRITORY_BY_ID[territoryId]!;
  if (meta.coastal) return state;
  const p = current(next);
  const started = startImproveable(
    next,
    t,
    "mine",
    mineCost(p),
    1,
    `${empireOf(p.empire).name} sinks a mine in ${meta.name}.`,
    `${empireOf(p.empire).name} deepens the mine in ${meta.name}.`,
  );
  return started ?? state;
}

export function buildCastle(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const t = terr(next, territoryId);
  const p = current(next);
  const rank = worksRank(t, "castle");
  const started = startImproveable(
    next,
    t,
    "castle",
    castleCost(p),
    rank === 0 ? 2 : 1,
    `${empireOf(p.empire).name} raises walls in ${TERRITORY_BY_ID[territoryId]!.name}.`,
    `${empireOf(p.empire).name} strengthens the walls in ${TERRITORY_BY_ID[territoryId]!.name}.`,
  );
  return started ?? state;
}

export function buildMarket(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const t = terr(next, territoryId);
  const p = current(next);
  const started = startImproveable(
    next,
    t,
    "market",
    marketCost(p),
    1,
    `${empireOf(p.empire).name} opens a market in ${TERRITORY_BY_ID[territoryId]!.name}.`,
    `${empireOf(p.empire).name} expands the market in ${TERRITORY_BY_ID[territoryId]!.name}.`,
  );
  return started ?? state;
}

export function buildFarm(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const t = terr(next, territoryId);
  const p = current(next);
  const started = startImproveable(
    next,
    t,
    "farm",
    farmCost(p),
    1,
    `${empireOf(p.empire).name} sows farms in ${TERRITORY_BY_ID[territoryId]!.name}.`,
    `${empireOf(p.empire).name} expands the farms in ${TERRITORY_BY_ID[territoryId]!.name}.`,
  );
  return started ?? state;
}

export function buildRoad(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id || t.road || constructionBusy(next, territoryId)) return state;
  const cost = roadCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "road", territoryId, 1);
  log(next, `${empireOf(p.empire).name} lays a road through ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function buildShip(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id || !t.port || constructionBusy(next, territoryId) || t.ships >= shipsCap(t)) return state;
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
    if (job.kind === "port") {
      t.portRank = Math.min(WORKS_CAP, (t.portRank ?? 0) + 1);
      t.port = true;
    }
    if (job.kind === "mine") {
      t.mineRank = Math.min(WORKS_CAP, (t.mineRank ?? 0) + 1);
      t.mine = true;
    }
    if (job.kind === "castle") {
      t.castleRank = Math.min(WORKS_CAP, (t.castleRank ?? 0) + 1);
      t.castle = true;
    }
    if (job.kind === "market") {
      t.marketRank = Math.min(WORKS_CAP, (t.marketRank ?? 0) + 1);
      t.market = true;
    }
    if (job.kind === "farm") {
      t.farmRank = Math.min(WORKS_CAP, (t.farmRank ?? 0) + 1);
      t.farm = true;
    }
    if (job.kind === "road") t.road = true;
    if (job.kind === "ship") t.ships += 1;
    const label = job.kind === "castle" ? "walls" : job.kind;
    const rank =
      job.kind === "port" ||
      job.kind === "mine" ||
      job.kind === "castle" ||
      job.kind === "market" ||
      job.kind === "farm"
        ? worksRank(t, job.kind)
        : 0;
    log(
      next,
      `${TERRITORY_BY_ID[job.territoryId]!.name}: ${label}${rank > 1 ? ` ${"I".repeat(rank)}` : ""} complete.`,
    );
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
    if (t.owner === p.id) {
      t.castle = true;
      t.castleRank = Math.max(t.castleRank ?? 0, 1);
    }
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
      log(next, `${empireOf(p.empire).name} holds five continents.`);
      return next;
    }
  }
  if (next.clock.turn >= TURN_LIMIT) {
    const ranked = rankPlayers(next);
    next.phase = "gameover";
    if (!ranked.length) {
      next.winner = null;
      log(next, "The age closes. No court remains.");
      return next;
    }
    const best = ranked[0]!;
    const second = ranked[1];
    const tie = Boolean(
      second && second.continents === best.continents && second.lands === best.lands,
    );
    if (tie) {
      next.winner = null;
      log(next, "The age closes in a dead heat.");
      return next;
    }
    next.winner = best.id;
    if (second && second.continents === best.continents) {
      log(
        next,
        `The age closes. ${empireOf(best.empire).name} holds the most provinces among the leading continents.`,
      );
    } else if (best.continents > 0) {
      log(next, `The age closes. ${empireOf(best.empire).name} holds the most continents.`);
    } else {
      log(next, `The age closes. ${empireOf(best.empire).name} holds the most provinces.`);
    }
  }
  return next;
}

function collectIncome(state: GameState, player: PlayerId) {
  const inc = incomeFor(state, player);
  const up = upkeepFor(state, player);
  const p = playerOf(state, player);
  p.gold += inc.gold;
  p.silver += inc.silver - up.silver;
  p.wood += inc.wood;
  p.stone += inc.stone;
  p.metal += inc.metal;
  p.food += inc.food;
  const need = foodNeed(state, player);
  p.food -= need;
  tickPopulation(state, player, p.food);
  if (p.food < 0) p.food = 0;
  p.lastLands = ownedIds(state, player).length;
  if (p.silver < 0) {
    for (const id of ownedIds(state, player)) {
      const t = terr(state, id);
      while (p.silver < 0 && t.dragons > 0) {
        t.dragons -= 1;
        p.silver += 1;
      }
      while (p.silver < 0 && (t.beasts ?? 0) > 0) {
        t.beasts -= 1;
        p.silver += BEAST_WAGE;
      }
      while (p.silver < 0 && t.knights > 0) {
        t.knights -= 1;
        p.silver += 1;
      }
      while (p.silver < 0 && t.levy > 0) {
        t.levy -= 1;
        p.silver += 1;
      }
    }
    p.silver = Math.max(0, p.silver);
  }
  grantRealmRecruits(state, player);
}

function tickPopulation(state: GameState, player: PlayerId, foodAfter: number) {
  const ids = ownedIds(state, player);
  const p = playerOf(state, player);
  const expanding = ids.length > (p.lastLands ?? ids.length);
  if (foodAfter < 0) {
    let hunger = -foodAfter;
    const crowded = ids
      .map((id) => terr(state, id))
      .filter((t) => (t.population ?? 0) > 1)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
    for (const t of crowded) {
      if (hunger <= 0) break;
      const drop = Math.min(hunger, (t.population ?? 1) - 1);
      t.population -= drop;
      hunger -= drop;
    }
    if (hunger > 0) log(state, `${empireOf(p.empire).name} starves.`);
    else log(state, `${empireOf(p.empire).name} goes hungry.`);
    return;
  }
  const surplus = foodAfter >= 2;
  if (!expanding && !surplus) return;
  const grown: string[] = [];
  const cities = ids
    .map((id) => terr(state, id))
    .sort((a, b) => (a.population ?? 0) - (b.population ?? 0));
  for (const t of cities) {
    const developed =
      expanding ||
      t.farm ||
      t.market ||
      t.road ||
      t.port ||
      Object.values(CAPITOL).includes(t.id);
    if (!developed) continue;
    if ((t.population ?? 0) >= cityPopCap(t)) continue;
    t.population = (t.population ?? 0) + 1;
    grown.push(TERRITORY_BY_ID[t.id]!.name);
    if (!expanding) break;
  }
  if (grown.length) log(state, `${empireOf(p.empire).name} grows in ${grown.slice(0, 3).join(", ")}.`);
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

function tribeGrowUntil(difficulty: Difficulty): number {
  if (difficulty === "easy") return 30;
  if (difficulty === "hard") return 80;
  return 50;
}

function tickTribes(state: GameState) {
  const rng = mulberry32((state.seed + state.clock.turn * 7919) >>> 0);
  const band = tribeBand(state.difficulty);
  for (const t of Object.values(state.territories)) {
    if (t.owner === "barbarian" && t.pressure > 0) t.pressure -= 1;
  }
  if (state.clock.turn < tribeGrowUntil(state.difficulty)) {
    for (const t of Object.values(state.territories)) {
      if (t.owner !== "barbarian") continue;
      const chance = t.pressure > 0 ? band.pressGrow : band.grow;
      if (t.levy < band.cap && rng() < chance) t.levy += 1;
      if (t.knights === 0 && t.levy >= band.knightLevy && rng() < band.knight) t.knights = 1;
    }
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
      target.castleRank = 0;
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
    const up = upkeepFor(after, 0);
    lines.push(
      `Tribute this watch: ${inc.gold} gold, ${inc.silver} silver, ${inc.food} food, ${inc.metal} metal, ${inc.wood} timber, ${inc.stone} stone. Wages: ${up.silver} silver. Grain for ${foodNeed(after, 0)} citizens.`,
    );
  }
  return lines.slice(0, 14);
}

export { EMPIRES, PLAYER_COUNT, TERRITORIES, TERRITORY_BY_ID };
