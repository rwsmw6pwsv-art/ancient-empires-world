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
  SiegeKind,
  SiegeStock,
  MarchOrder,
  PulseEvent,
} from "./types";
import {
  CAPITOL,
  CONTINENT_BONUS,
  CONTINENT_NAMES,
  AS_REGIONS,
  NA_REGIONS,
  AF_REGIONS,
  HOUSES,
  PLAYER_COUNT,
  SAVE_VERSION,
  TURN_LIMIT,
  UNIT_ATK,
  UNIT_COST,
  UNIT_DEF,
  UNIT_LABEL,
  UNIT_TURNS,
  CITY_DEF,
  TRIBAL_DEF,
  FORT_CAP,
  FORT_COST,
  FORT_DEF,
  FORT_LABEL,
  FORT_TURNS,
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
  SIEGE_CAP,
  SIEGE_COST,
  SIEGE_LABEL,
  SIEGE_TURNS,
  SCORPION_CAP,
  SCORPION_COST,
  SCORPION_TURNS,
  isSiegeKind,
  isTrainKind,
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
  return t.levy + (t.bowmen ?? 0) + t.knights + t.dragons + (t.beasts ?? 0);
}

/** Warriors who never march — a capital and walled city keep a watch on the walls. */
export function cityWatch(t: TerritoryState): number {
  if (isBarbarian(t.owner)) return 0;
  const seat = Object.values(CAPITOL).includes(t.id);
  const fort = fortOf(t);
  if (!seat && fort < 1) return 0;
  const floor = (seat ? 2 : 0) + fort;
  const host = t.levy + (t.bowmen ?? 0);
  return Math.max(0, floor - host);
}

export function isSeat(t: TerritoryState): boolean {
  return Object.values(CAPITOL).includes(t.id);
}

export function hostOf(t: Pick<TerritoryState, "levy" | "bowmen" | "knights" | "dragons" | "beasts">): HostForce {
  return {
    levy: t.levy ?? 0,
    bowmen: t.bowmen ?? 0,
    knights: t.knights ?? 0,
    dragons: t.dragons ?? 0,
    beasts: t.beasts ?? 0,
  };
}

export function hostTotal(force: { levy?: number; bowmen?: number; knights?: number; dragons?: number; beasts?: number }): number {
  return (force.levy ?? 0) + (force.bowmen ?? 0) + (force.knights ?? 0) + (force.dragons ?? 0) + (force.beasts ?? 0);
}

export function beastOfOwner(state: GameState, owner: TerritoryState["owner"]): BeastDef | null {
  if (owner === "barbarian") return null;
  return beastOf(state.players[owner]!.empire);
}

export function forceStrength(
  force: { levy: number; bowmen?: number; knights: number; dragons: number; beasts?: number },
  beastAtk: number,
): number {
  return (
    force.levy * UNIT_ATK.levy +
    (force.bowmen ?? 0) * UNIT_ATK.bowman +
    force.knights * UNIT_ATK.knight +
    force.dragons * UNIT_ATK.dragon +
    (force.beasts ?? 0) * beastAtk
  );
}

export function forceDefense(
  force: { levy: number; bowmen?: number; knights: number; dragons: number; beasts?: number },
  beastDef: number,
): number {
  return (
    force.levy * UNIT_DEF.levy +
    (force.bowmen ?? 0) * UNIT_DEF.bowman +
    force.knights * UNIT_DEF.knight +
    force.dragons * UNIT_DEF.dragon +
    (force.beasts ?? 0) * beastDef
  );
}

export function worksRank(t: TerritoryState, kind: JobKind): number {
  if (kind === "castle") return fortOf(t);
  const stored =
    kind === "market"
      ? t.marketRank
      : kind === "port"
        ? t.portRank
        : kind === "mine"
          ? t.mineRank
          : kind === "farm"
            ? t.farmRank
            : 0;
  if ((stored ?? 0) > 0) return stored!;
  if (kind === "market") return t.market ? 1 : 0;
  if (kind === "port") return t.port ? 1 : 0;
  if (kind === "mine") return t.mine ? 1 : 0;
  if (kind === "farm") return t.farm ? 1 : 0;
  return 0;
}

export function fortOf(t: TerritoryState): number {
  if (typeof t.fort === "number" && t.fort > 0) return Math.min(FORT_CAP, t.fort);
  if (t.castle) return Math.min(FORT_CAP, Math.max(1, t.castleRank ?? 1));
  return 0;
}

export function setFort(t: TerritoryState, rank: number) {
  const n = Math.max(0, Math.min(FORT_CAP, rank));
  t.fort = n;
  t.castle = n >= 1;
  t.castleRank = n;
}

export function hasKeep(t: TerritoryState): boolean {
  return fortOf(t) >= 3;
}

export function shipsCap(t: TerritoryState): number {
  const r = worksRank(t, "port");
  if (r < 1) return 1;
  return Math.min(SHIPS_CAP, r * SHIPS_PER_RANK);
}

export function siegeCount(t: TerritoryState, kind: SiegeKind): number {
  if (kind === "ram") return t.rams ?? 0;
  if (kind === "catapult") return t.catapults ?? 0;
  if (kind === "ladder") return t.ladders ?? 0;
  return t.towers ?? 0;
}

export function siegeStockOf(t: TerritoryState): SiegeStock {
  return {
    rams: t.rams ?? 0,
    catapults: t.catapults ?? 0,
    ladders: t.ladders ?? 0,
    towers: t.towers ?? 0,
  };
}

export function siegeBringOf(t: TerritoryState): SiegeStock {
  return {
    rams: Math.min(1, t.rams ?? 0),
    catapults: Math.min(1, t.catapults ?? 0),
    ladders: Math.min(1, t.ladders ?? 0),
    towers: Math.min(1, t.towers ?? 0),
  };
}

export function siegeTargetOf(state: GameState, fromId: string): string | null {
  for (const t of Object.values(state.territories)) {
    if (t.besiegedFrom === fromId) return t.id;
  }
  return null;
}

export function canRaiseSiege(state: GameState, fromId: string): boolean {
  const from = state.territories[fromId];
  if (!from || isBarbarian(from.owner) || standing(from) < 1) return false;
  return siegeTargetOf(state, fromId) != null;
}

export function liftSiegesFrom(state: GameState, fromId: string) {
  for (const t of Object.values(state.territories)) {
    if (t.besiegedFrom === fromId) t.besiegedFrom = null;
  }
}

export function liftBrokenSieges(state: GameState) {
  for (const t of Object.values(state.territories)) {
    const fromId = t.besiegedFrom;
    if (!fromId) continue;
    const from = state.territories[fromId];
    if (!from || from.owner === "barbarian" || from.owner === t.owner || standing(from) < 1) {
      t.besiegedFrom = null;
      continue;
    }
    if (!landNeighbors(fromId).includes(t.id) && !seaNeighbors(fromId).includes(t.id)) {
      t.besiegedFrom = null;
    }
  }
}

export function beginSiege(state: GameState, fromId: string, toId: string): GameState {
  const next = clone(state);
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  if (from.owner !== player || to.owner === player) return state;
  if (standing(from) < 1) return state;
  const legal = legalMarchTargets(next, fromId);
  if (!legal.includes(toId)) return state;
  liftSiegesFrom(next, fromId);
  to.besiegedFrom = fromId;
  const place = TERRITORY_BY_ID[toId]!.name;
  const camp = TERRITORY_BY_ID[fromId]!.name;
  log(next, `${empireOf(playerOf(next, player).empire).name} lays siege to ${place} from ${camp}. Rams and ladders raise in a watch; towers in three; catapults in five.`);
  return next;
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
  const fort = fortOf(t);
  if (isBarbarian(t.owner)) return fort > 0 ? FORT_DEF[fort]! : TRIBAL_DEF;
  return CITY_DEF + (fort > 0 ? FORT_DEF[fort]! : 0);
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

export function jobsAt(state: GameState, territoryId: string): Job[] {
  return state.jobs.filter((j) => j.territoryId === territoryId);
}

export function jobsOfKind(state: GameState, territoryId: string, kind: JobKind): Job[] {
  return state.jobs.filter((j) => j.territoryId === territoryId && j.kind === kind);
}

export function hasKindJob(state: GameState, territoryId: string, kind: JobKind): boolean {
  return state.jobs.some((j) => j.territoryId === territoryId && j.kind === kind);
}

export function trainBusy(state: GameState, territoryId: string): boolean {
  return state.jobs.some((j) => j.territoryId === territoryId && isTrainKind(j.kind));
}

export function constructionBusy(state: GameState, territoryId: string): boolean {
  return state.jobs.some((j) => j.territoryId === territoryId && !isTrainKind(j.kind));
}

export function trainJobOf(state: GameState, territoryId: string): Job | undefined {
  return state.jobs.find((j) => j.territoryId === territoryId && isTrainKind(j.kind));
}

export function trainJobsOf(state: GameState, territoryId: string): Job[] {
  return state.jobs.filter((j) => j.territoryId === territoryId && isTrainKind(j.kind));
}

export function workJobOf(state: GameState, territoryId: string): Job | undefined {
  return state.jobs.find((j) => j.territoryId === territoryId && !isTrainKind(j.kind));
}

export function workJobsOf(state: GameState, territoryId: string): Job[] {
  return state.jobs.filter((j) => j.territoryId === territoryId && !isTrainKind(j.kind));
}

export function marchesFrom(state: GameState, territoryId: string): MarchOrder[] {
  return (state.marches ?? []).filter((m) => m.from === territoryId);
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

function pushEvent(state: GameState, ev: PulseEvent) {
  if (!state.events) state.events = [];
  state.events.push(ev);
}

function hostFromOrder(o: MarchOrder): HostForce {
  return { levy: o.levy, bowmen: o.bowmen, knights: o.knights, dragons: o.dragons, beasts: o.beasts };
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
  const share = Object.fromEntries(
    (Object.keys(CONTINENT_BONUS) as ContinentId[]).map((c) => [c, 0]),
  ) as Record<ContinentId, number>;
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
  let silver = 0;
  let wood = 0;
  let stone = 0;
  let metal = 0;
  let food = 0;
  for (const id of ids) {
    const t = terr(state, id);
    const meta = TERRITORY_BY_ID[id]!;
    gold += 2;
    silver += SILVER_PER_LAND;
    wood += 1;
    stone += 1;
    metal += 1;
    food += 1;
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
    if (def.woodOnAf && AF_REGIONS.includes(meta.continent)) wood += 1;
    if (def.woodOnAs && AS_REGIONS.includes(meta.continent)) wood += 1;
    if (def.woodOnNa && NA_REGIONS.includes(meta.continent)) wood += 1;
    if (def.stoneOnNa && NA_REGIONS.includes(meta.continent)) stone += 1;
    if (def.stoneOnEu && meta.continent === "eu") stone += 1;
    if (def.stoneOnAs && AS_REGIONS.includes(meta.continent)) stone += 1;
    if (def.goldOnOc && meta.continent === "oc") gold += 1;
    if (def.goldOnCa && meta.continent === "ca") gold += 1;
    if (def.goldOnMe && meta.continent === "me") gold += 1;
    if (def.foodOnAf && AF_REGIONS.includes(meta.continent)) food += 1;
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
    silver += Math.max(t.levy + (t.bowmen ?? 0) > 0 ? 1 : 0, Math.floor((t.levy + (t.bowmen ?? 0)) / LEVY_COMMISSION));
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
  return t.levy + (t.bowmen ?? 0) + t.knights + t.dragons + (t.beasts ?? 0) + cityWatch(t);
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
    return { min: 2, max: 4, cap: 5, grow: 0.18, pressGrow: 0.06, knight: 0.04, knightLevy: 5 };
  }
  if (diff === "hard") {
    return { min: 5, max: 7, cap: 8, grow: 0.28, pressGrow: 0.12, knight: 0.1, knightLevy: 6 };
  }
  return { min: 3, max: 5, cap: 6, grow: 0.22, pressGrow: 0.1, knight: 0.07, knightLevy: 5 };
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
  if (t.fort == null) t.fort = t.castle ? Math.max(1, t.castleRank ?? 1) : 1;
  if (t.castle) t.castleRank = Math.max(t.castleRank ?? 0, t.fort || 1);
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
    setFort(t, 0);
    t.pressure = 0;
    t.population = 1;
  }
  const labrador = state.territories.labrador;
  if (labrador && labrador.owner === "barbarian") {
    const floor = state.difficulty === "easy" ? band.max : state.difficulty === "hard" ? 6 : 4;
    labrador.levy = Math.max(labrador.levy, floor);
  }
  const seats = new Set(Object.values(CAPITOL));
  for (const id of BARBARIAN_IDS) {
    const t = terr(state, id);
    if (t.owner !== "barbarian") continue;
    if (!landNeighbors(id).some((n) => seats.has(n))) continue;
    t.levy = Math.min(band.cap + 1, t.levy + 1);
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
      bowmen: 0,
      knights: 0,
      dragons: 0,
      beasts: 0,
      castle: true,
      mine: false,
      port: false,
      market: false,
      road: false,
      castleRank: 1,
      mineRank: 0,
      portRank: 0,
      marketRank: 0,
      farm: false,
      farmRank: 0,
      ships: 0,
      rams: 0,
      catapults: 0,
      ladders: 0,
      towers: 0,
      scorpions: 0,
      fort: 0,
      breach: 0,
      besiegedFrom: null,
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
    marches: [],
    arrivals: [],
    events: [],
    log: [`The eleven empires take the field. Only the capitals are yours.`],
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
      castleRank: 2,
      fort: 2,
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
  return inPlaceSim ? v : structuredClone(v);
}

/** Headless sims only: mutate the live state instead of cloning every action. */
let inPlaceSim = false;
export function setInPlaceSim(on: boolean) {
  inPlaceSim = on;
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
  defBowmen = 0,
  dragonsVulnerable = false,
): { levy: number; bowmen: number; knights: number; dragons: number; beasts: number } {
  let d = damage;
  let levy = defLevy;
  let bowmen = defBowmen;
  let knights = defKnights;
  let beasts = defBeasts;
  let dragons = defDragons;
  const take = (pool: number) => {
    const n = Math.min(pool, d);
    d -= n;
    return pool - n;
  };
  levy = take(levy);
  if (d > 0) bowmen = take(bowmen);
  if (d > 0) knights = take(knights);
  if (d > 0) beasts = take(beasts);
  if (d > 0 && dragonsVulnerable) dragons = take(dragons);
  return { levy, bowmen, knights, dragons, beasts };
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
  force: HostForce;
  convoy: number;
  tribalCamp: boolean;
  defHost: number;
  prevOwner: TerritoryState["owner"];
  destCont: ContinentId;
  brokeContinent: boolean;
  wasCapitol: boolean;
  continentsBefore: number;
  player: PlayerId;
  tribal?: boolean;
  watch: number;
  fieldLevy: number;
};

function prepareAssault(
  state: GameState,
  fromId: string,
  toId: string,
  force: { levy: number; bowmen?: number; knights: number; dragons: number; beasts?: number },
): { next: GameState; meta: AssaultMeta } | { next: GameState; friendly: true } | null {
  const next = clone(state);
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  const sendBeasts = force.beasts ?? 0;
  const sendBowmen = force.bowmen ?? 0;
  if (from.owner !== player) return null;
  if (force.levy < 0 || sendBowmen < 0 || force.knights < 0 || force.dragons < 0 || sendBeasts < 0) return null;
  if (
    force.levy > from.levy ||
    sendBowmen > (from.bowmen ?? 0) ||
    force.knights > from.knights ||
    force.dragons > from.dragons ||
    sendBeasts > (from.beasts ?? 0)
  ) {
    return null;
  }
  const sent = force.levy + sendBowmen + force.knights + force.dragons + sendBeasts;
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
  from.bowmen = (from.bowmen ?? 0) - sendBowmen;
  from.knights -= force.knights;
  from.dragons -= force.dragons;
  from.beasts = (from.beasts ?? 0) - sendBeasts;

  if (to.owner === player) {
    to.levy += force.levy;
    to.bowmen = (to.bowmen ?? 0) + sendBowmen;
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
      force: { levy: force.levy, bowmen: sendBowmen, knights: force.knights, dragons: force.dragons, beasts: sendBeasts },
      convoy,
      tribalCamp,
      defHost,
      prevOwner,
      destCont,
      brokeContinent,
      wasCapitol,
      continentsBefore,
      player,
      watch: cityWatch(to),
      fieldLevy: to.levy,
    },
  };
}

function persistFieldLevy(fieldLevy: number, watch: number, dLevy: number): number {
  const lost = Math.max(0, fieldLevy + watch - dLevy);
  return Math.max(0, fieldLevy - lost);
}

function finishAssault(
  next: GameState,
  meta: AssaultMeta,
  aLevy: number,
  aBowmen: number,
  aKnights: number,
  aDragons: number,
  aBeasts: number,
  dLevy: number,
  dBowmen: number,
  dKnights: number,
  dDragons: number,
  dBeasts: number,
): GameState {
  const from = terr(next, meta.fromId);
  const to = terr(next, meta.toId);
  const attackerName = meta.tribal ? "Tribes" : empireOf(playerOf(next, meta.player).empire).name;
  const place = TERRITORY_BY_ID[meta.toId]!.name;
  const aliveAtk = aLevy + aBowmen + aKnights + aDragons + aBeasts;
  const aliveDef = dLevy + dBowmen + dKnights + dDragons + dBeasts;

  if (aliveDef <= 0 && aliveAtk > 0) {
    const prev = to.owner;
    to.owner = meta.tribal ? "barbarian" : meta.player;
    to.levy = aLevy;
    to.bowmen = aBowmen;
    to.knights = aKnights;
    to.dragons = aDragons;
    to.beasts = aBeasts;
    if (to.dragons > DRAGON_CAP) {
      from.dragons += to.dragons - DRAGON_CAP;
      to.dragons = DRAGON_CAP;
    }
    to.ships = 0;
    if (meta.convoy && !meta.tribal) berthShip(from, to);
    to.pressure = 0;
    to.breach = 0;
    to.besiegedFrom = null;
    liftSiegesFrom(next, meta.fromId);
    if ((to.population ?? 0) < 1) to.population = 1;
    if (meta.tribal) {
      setFort(to, 0);
      to.bowmen = 0;
      to.knights = 0;
      to.dragons = 0;
      to.beasts = 0;
      to.ships = 0;
    } else {
      grantSpoils(next, meta.player, meta.toId, meta.defHost, meta.brokeContinent);
    }
    if (prev === "barbarian") {
      if (!meta.tribal) to.levy += 1;
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
    if (!meta.tribal && meta.wasCapitol) {
      const nest = placeDragon(next, meta.player, meta.toId, meta.fromId);
      if (nest) log(next, `A dragon wakes in ${TERRITORY_BY_ID[nest]!.name} over the fallen capital.`);
    }
    if (!meta.tribal && continentsHeld(next, meta.player).length > meta.continentsBefore) {
      const nest = placeDragon(next, meta.player, meta.toId, meta.fromId);
      if (nest) log(next, `${CONTINENT_NAMES[meta.destCont]} yields a dragon in ${TERRITORY_BY_ID[nest]!.name}.`);
    }
  } else {
    to.levy = persistFieldLevy(meta.fieldLevy, meta.watch, dLevy);
    to.bowmen = dBowmen;
    to.knights = dKnights;
    to.dragons = dDragons;
    to.beasts = dBeasts;
    from.levy += aLevy;
    from.bowmen = (from.bowmen ?? 0) + aBowmen;
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
  force: { levy: number; bowmen?: number; knights: number; dragons: number; beasts?: number },
): GameState {
  const prepared = prepareAssault(state, fromId, toId, force);
  if (!prepared) return state;
  if ("friendly" in prepared) return prepared.next;
  const { next, meta } = prepared;
  const to = terr(next, toId);
  const sendBeasts = meta.force.beasts;
  const sendBowmen = meta.force.bowmen ?? 0;
  const rng = mulberry32((next.seed + next.clock.turn * 997 + (meta.force.levy + sendBowmen + meta.force.knights + meta.force.dragons + sendBeasts) * 13 + toId.length) >>> 0);
  let aLevy = meta.force.levy;
  let aBowmen = sendBowmen;
  let aKnights = meta.force.knights;
  let aDragons = meta.force.dragons;
  let aBeasts = sendBeasts;
  let dLevy = to.levy + meta.watch;
  let dBowmen = to.bowmen ?? 0;
  let dKnights = to.knights;
  let dDragons = to.dragons;
  let dBeasts = to.beasts ?? 0;
  const support = supportingDragonDamage(next, meta.player, toId);
  const dragonsCanBite = aDragons > 0;
  if (support > 0) {
    const hit = applyStrikeToDefense(dLevy, dKnights, dDragons, support, dBeasts, dBowmen, dragonsCanBite);
    dLevy = hit.levy;
    dBowmen = hit.bowmen;
    dKnights = hit.knights;
    dDragons = hit.dragons;
    dBeasts = hit.beasts;
  }
  const atkBeast = beastOf(playerOf(next, meta.player).empire);
  const defBeast = beastOfOwner(next, to.owner);
  let works = spendSiegeOnWorks(terr(next, fromId), worksDefense(to));
  works = Math.max(0, works - (to.breach ?? 0) * 4);
  let guard = 24;
  const aliveAtk = () => aLevy + aBowmen + aKnights + aDragons + aBeasts;
  const aliveDef = () => dLevy + dBowmen + dKnights + dDragons + dBeasts;
  while (guard-- > 0 && aliveAtk() > 0 && aliveDef() > 0) {
    const knightBonus = aKnights > 0 && dLevy > 0 ? aKnights * 2 : 0;
    const atkStr =
      aLevy * UNIT_ATK.levy +
      aBowmen * UNIT_ATK.bowman +
      aKnights * UNIT_ATK.knight +
      knightBonus +
      aDragons * UNIT_ATK.dragon +
      aBeasts * atkBeast.atk;
    const wallBonus = dBowmen > 0 && works > 0 ? dBowmen * 2 : 0;
    const defStr = Math.max(
      0,
      dLevy * UNIT_DEF.levy +
        dBowmen * UNIT_DEF.bowman +
        wallBonus +
        dKnights * UNIT_DEF.knight +
        dDragons * UNIT_DEF.dragon +
        dBeasts * (defBeast?.def ?? 0) +
        works,
    );
    const { atkLoss, defLoss } = combatRound(rng, atkStr, defStr);
    if (defLoss) {
      const h = applyStrikeToDefense(dLevy, dKnights, dDragons, defLoss, dBeasts, dBowmen, aDragons > 0);
      dLevy = h.levy;
      dBowmen = h.bowmen;
      dKnights = h.knights;
      dDragons = h.dragons;
      dBeasts = h.beasts;
    }
    if (atkLoss) {
      const h = applyStrikeToDefense(aLevy, aKnights, aDragons, atkLoss, aBeasts, aBowmen, dDragons > 0);
      aLevy = h.levy;
      aBowmen = h.bowmen;
      aKnights = h.knights;
      aDragons = h.dragons;
      aBeasts = h.beasts;
    }
  }
  return finishAssault(next, meta, aLevy, aBowmen, aKnights, aDragons, aBeasts, dLevy, dBowmen, dKnights, dDragons, dBeasts);
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
    atkLeft.bowmen ?? 0,
    atkLeft.knights,
    atkLeft.dragons,
    atkLeft.beasts,
    defLeft.levy,
    defLeft.bowmen ?? 0,
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
  recall: { levy: number; bowmen?: number; knights: number; dragons: number; beasts: number; ships?: number },
): GameState {
  const next = clone(state);
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  if (from.owner !== player || to.owner !== player) return state;
  let levy = Math.max(0, Math.min(recall.levy, to.levy));
  let bowmen = Math.max(0, Math.min(recall.bowmen ?? 0, to.bowmen ?? 0));
  let knights = Math.max(0, Math.min(recall.knights, to.knights));
  let dragons = Math.max(0, Math.min(recall.dragons, to.dragons));
  let beasts = Math.max(0, Math.min(recall.beasts, to.beasts ?? 0));
  const stay =
    to.levy - levy + ((to.bowmen ?? 0) - bowmen) + (to.knights - knights) + (to.dragons - dragons) + ((to.beasts ?? 0) - beasts);
  if (stay < 1) {
    if (to.levy - levy < 1 && to.levy >= 1) levy = to.levy - 1;
    if (to.levy - levy + (to.bowmen ?? 0) - bowmen + to.knights - knights + to.dragons - dragons + (to.beasts ?? 0) - beasts < 1) {
      return state;
    }
  }
  to.levy -= levy;
  to.bowmen = (to.bowmen ?? 0) - bowmen;
  to.knights -= knights;
  to.dragons -= dragons;
  to.beasts = (to.beasts ?? 0) - beasts;
  from.levy += levy;
  from.bowmen = (from.bowmen ?? 0) + bowmen;
  from.knights += knights;
  from.dragons += dragons;
  from.beasts = (from.beasts ?? 0) + beasts;
  const returning = levy + bowmen + knights + dragons + beasts;
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
  if (kind === "dragon" && hasKindJob(next, territoryId, "dragon")) return state;
  const beast = beastOf(p.empire);
  const cost = kind === "beast" ? { gold: beast.cost, wood: 0, stone: 0, metal: 0 } : UNIT_COST[kind];
  if (!pay(p, cost.gold, cost.wood, cost.stone, cost.metal)) return state;
  const wait = UNIT_TURNS[kind];
  enqueue(next, kind, territoryId, wait, cost);
  const label = kind === "beast" ? beast.name : UNIT_LABEL[kind].toLowerCase();
  const watches = wait === 1 ? "one watch" : `${wait} watches`;
  log(next, `${empireOf(p.empire).name} drills ${label} in ${TERRITORY_BY_ID[territoryId]!.name} — ${watches}.`);
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
  if (isSiegeKind(kind)) return SIEGE_COST[kind];
  if (kind === "scorpion") return SCORPION_COST;
  if (t && (kind === "port" || kind === "mine" || kind === "market" || kind === "farm")) {
    const rank = worksRank(t, kind);
    if (rank > 0) return { ...improveCost(rank), metal: 0 };
  }
  if (kind === "castle" && t) {
    const step = (Math.max(fortOf(t), 0) + 1) as 1 | 2 | 3 | 4;
    if (step === 1) return { gold: 3, wood: 4, stone: 0, metal: 0 };
    if (step === 2 || step === 3 || step === 4) return FORT_COST[step];
  }
  if (kind === "port") return { ...portCost(p), metal: 0 };
  if (kind === "mine") return { ...mineCost(p), metal: 0 };
  if (kind === "castle") return { ...castleCost(p), metal: 0 };
  if (kind === "ship") return { ...shipCost(p), metal: 0 };
  if (kind === "road") return { ...roadCost(p), metal: 0 };
  if (kind === "farm") return { ...farmCost(p), metal: 0 };
  return { ...marketCost(p), metal: 0 };
}

function enqueue(
  state: GameState,
  kind: JobKind,
  territoryId: string,
  remaining: number,
  cost: { gold?: number; wood?: number; stone?: number; metal?: number } = {},
) {
  const job: Job = {
    id: `j${state.nextJobId++}`,
    kind,
    territoryId,
    player: state.clock.currentPlayer,
    remaining,
    total: remaining,
    gold: cost.gold ?? 0,
    wood: cost.wood ?? 0,
    stone: cost.stone ?? 0,
    metal: cost.metal ?? 0,
  };
  state.jobs.push(job);
}

export function cancelJob(state: GameState, jobId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const i = next.jobs.findIndex((j) => j.id === jobId && j.player === p.id);
  if (i < 0) return state;
  const job = next.jobs[i]!;
  p.gold += job.gold ?? 0;
  p.wood += job.wood ?? 0;
  p.stone += job.stone ?? 0;
  p.metal += job.metal ?? 0;
  next.jobs.splice(i, 1);
  const place = TERRITORY_BY_ID[job.territoryId]?.name ?? job.territoryId;
  const label = isTrainKind(job.kind)
    ? job.kind === "beast"
      ? beastOf(p.empire).name
      : UNIT_LABEL[job.kind]
    : job.kind === "castle"
      ? "walls"
      : job.kind === "tower"
        ? "siege tower"
        : job.kind;
  log(next, `${empireOf(p.empire).name} halts ${String(label).toLowerCase()} in ${place}.`);
  return next;
}

export function cancelMarch(state: GameState, marchId: string): GameState {
  const next = clone(state);
  if (!next.marches) next.marches = [];
  const p = current(next);
  const i = next.marches.findIndex((m) => m.id === marchId && m.player === p.id);
  if (i < 0) return state;
  const order = next.marches[i]!;
  const from = next.territories[order.from];
  if (!from) return state;
  mergeHost(from, hostFromOrder(order), from);
  from.rams = (from.rams ?? 0) + (order.rams ?? 0);
  from.catapults = (from.catapults ?? 0) + (order.catapults ?? 0);
  from.ladders = (from.ladders ?? 0) + (order.ladders ?? 0);
  from.towers = (from.towers ?? 0) + (order.towers ?? 0);
  if (order.ships) from.ships += order.ships;
  next.marches.splice(i, 1);
  log(next, `${empireOf(p.empire).name} recalls the column bound for ${TERRITORY_BY_ID[order.to]!.name}.`);
  return next;
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
  if (t.owner !== p.id || rank >= WORKS_CAP || hasKindJob(next, t.id, kind)) return null;
  if (rank === 0) {
    if (!pay(p, first.gold, first.wood, first.stone)) return null;
    enqueue(next, kind, t.id, firstTurns, first);
    log(next, firstLine);
  } else {
    const cost = improveCost(rank);
    if (!pay(p, cost.gold, cost.wood, cost.stone)) return null;
    enqueue(next, kind, t.id, 1, cost);
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
  if (kind === "scorpion") return buildScorpion(state, territoryId);
  if (isSiegeKind(kind)) return buildSiege(state, territoryId, kind);
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
  const fort = fortOf(t);
  if (t.owner !== p.id || fort >= FORT_CAP || hasKindJob(next, t.id, "castle")) return state;
  const step = (fort + 1) as 1 | 2 | 3 | 4;
  const cost = step === 1 ? { gold: 3, wood: 4, stone: 0, metal: 0 } : FORT_COST[step as 2 | 3 | 4];
  const wait = step === 1 ? 1 : FORT_TURNS[step as 2 | 3 | 4];
  if (!pay(p, cost.gold, cost.wood, cost.stone, cost.metal)) return state;
  enqueue(next, "castle", t.id, wait, cost);
  const name = TERRITORY_BY_ID[territoryId]!.name;
  log(next, `${empireOf(p.empire).name} raises ${FORT_LABEL[step]!.toLowerCase()} in ${name}.`);
  return next;
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
  if (t.owner !== p.id || t.road || hasKindJob(next, territoryId, "road")) return state;
  const cost = roadCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "road", territoryId, 1, cost);
  log(next, `${empireOf(p.empire).name} lays a road through ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function buildShip(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  const queued = jobsOfKind(next, territoryId, "ship").length;
  if (t.owner !== p.id || !t.port || t.ships + queued >= shipsCap(t)) return state;
  const cost = shipCost(p);
  if (!pay(p, cost.gold, cost.wood, cost.stone)) return state;
  enqueue(next, "ship", territoryId, 1, cost);
  log(next, `${empireOf(p.empire).name} lays a keel at ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function buildSiege(state: GameState, territoryId: string, kind: SiegeKind): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  const queued = jobsOfKind(next, territoryId, kind).length;
  if (t.owner !== p.id || siegeCount(t, kind) + queued >= SIEGE_CAP) return state;
  if (!canRaiseSiege(next, territoryId)) return state;
  enqueue(next, kind, territoryId, SIEGE_TURNS[kind]);
  const place = TERRITORY_BY_ID[territoryId]!.name;
  const mark = siegeTargetOf(next, territoryId);
  const at = mark ? ` against ${TERRITORY_BY_ID[mark]!.name}` : "";
  const verb = kind === "ladder" ? "cut" : kind === "tower" ? "raises" : kind === "ram" ? "timbers" : "frames";
  const wait = SIEGE_TURNS[kind] === 1 ? "one watch" : `${SIEGE_TURNS[kind]} watches`;
  log(next, `${empireOf(p.empire).name} ${verb} ${SIEGE_LABEL[kind].toLowerCase()} in ${place}${at} — ${wait}, no purse.`);
  return next;
}

export function buildScorpion(state: GameState, territoryId: string): GameState {
  const next = clone(state);
  const p = current(next);
  const t = terr(next, territoryId);
  if (t.owner !== p.id || hasKindJob(next, territoryId, "scorpion") || (t.scorpions ?? 0) >= SCORPION_CAP) return state;
  if (!pay(p, SCORPION_COST.gold, SCORPION_COST.wood, SCORPION_COST.stone, SCORPION_COST.metal)) return state;
  enqueue(next, "scorpion", territoryId, SCORPION_TURNS, SCORPION_COST);
  log(next, `${empireOf(p.empire).name} raises a scorpion on the walls of ${TERRITORY_BY_ID[territoryId]!.name}.`);
  return next;
}

export function consumeSiege(state: GameState, territoryId: string, used: Partial<SiegeStock>): GameState {
  const next = clone(state);
  const t = next.territories[territoryId];
  if (!t) return state;
  t.rams = Math.max(0, (t.rams ?? 0) - (used.rams ?? 0));
  t.catapults = Math.max(0, (t.catapults ?? 0) - (used.catapults ?? 0));
  t.ladders = Math.max(0, (t.ladders ?? 0) - (used.ladders ?? 0));
  t.towers = Math.max(0, (t.towers ?? 0) - (used.towers ?? 0));
  return next;
}

function spendSiegeOnWorks(from: TerritoryState, works: number): number {
  let next = works;
  if ((from.rams ?? 0) > 0) {
    from.rams -= 1;
    next = Math.floor(next * 0.4);
  }
  if ((from.towers ?? 0) > 0) {
    from.towers -= 1;
    next = Math.floor(next * 0.7);
  }
  if ((from.ladders ?? 0) > 0) {
    from.ladders -= 1;
    next = Math.floor(next * 0.85);
  }
  if ((from.catapults ?? 0) > 0) {
    from.catapults -= 1;
    next = Math.max(0, next - 8);
  }
  return next;
}

export function advanceJobs(state: GameState): GameState {
  const next = clone(state);
  if (!next.marches) next.marches = [];
  if (!next.arrivals) next.arrivals = [];
  if (!next.events) next.events = [];
  const player = next.clock.currentPlayer;
  const done: Job[] = [];
  for (const job of next.jobs) {
    if (job.player !== player) continue;
    job.remaining -= 1;
    if (job.remaining <= 0) done.push(job);
  }
  next.jobs = next.jobs.filter((j) => j.remaining > 0);
  for (const job of done) {
    const t = next.territories[job.territoryId];
    if (!t || t.owner !== job.player) continue;
    if (isTrainKind(job.kind)) {
      if (job.kind === "levy") t.levy += 1;
      if (job.kind === "bowman") t.bowmen = (t.bowmen ?? 0) + 1;
      if (job.kind === "knight") t.knights += 1;
      if (job.kind === "dragon") t.dragons = Math.min(DRAGON_CAP, t.dragons + 1);
      if (job.kind === "beast") t.beasts = (t.beasts ?? 0) + 1;
      const beast = beastOf(playerOf(next, job.player).empire);
      const label = job.kind === "beast" ? beast.name : UNIT_LABEL[job.kind];
      const place = TERRITORY_BY_ID[job.territoryId]!.name;
      log(next, `${place}: ${label} ready.`);
      pushEvent(next, {
        type: "train",
        player: job.player,
        toId: job.territoryId,
        kind: job.kind,
        text: `${label} ready in ${place}.`,
      });
      continue;
    }
    if (job.kind === "port") {
      t.portRank = Math.min(WORKS_CAP, (t.portRank ?? 0) + 1);
      t.port = true;
    }
    if (job.kind === "mine") {
      t.mineRank = Math.min(WORKS_CAP, (t.mineRank ?? 0) + 1);
      t.mine = true;
    }
    if (job.kind === "castle") {
      setFort(t, Math.min(FORT_CAP, fortOf(t) + 1));
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
    if (job.kind === "ram") t.rams = Math.min(SIEGE_CAP, (t.rams ?? 0) + 1);
    if (job.kind === "catapult") {
      t.catapults = Math.min(SIEGE_CAP, (t.catapults ?? 0) + 1);
      const mark = siegeTargetOf(next, job.territoryId);
      if (mark) {
        const dest = next.territories[mark]!;
        dest.breach = (dest.breach ?? 0) + 1;
        if (fortOf(dest) > 1 && dest.breach % 2 === 0) setFort(dest, Math.max(1, fortOf(dest) - 1));
        log(next, `Catapults weaken the defences of ${TERRITORY_BY_ID[mark]!.name} from a distance.`);
      }
    }
    if (job.kind === "ladder") t.ladders = Math.min(SIEGE_CAP, (t.ladders ?? 0) + 1);
    if (job.kind === "tower") t.towers = Math.min(SIEGE_CAP, (t.towers ?? 0) + 1);
    if (job.kind === "scorpion") t.scorpions = Math.min(SCORPION_CAP, (t.scorpions ?? 0) + 1);
    const label =
      job.kind === "castle"
        ? FORT_LABEL[fortOf(t)]!.toLowerCase()
        : job.kind === "tower"
          ? "siege tower"
          : job.kind === "ram"
            ? "ram"
            : job.kind === "scorpion"
              ? "scorpion"
              : job.kind;
    const rank =
      job.kind === "port" || job.kind === "mine" || job.kind === "castle" || job.kind === "market" || job.kind === "farm"
        ? worksRank(t, job.kind)
        : 0;
    const place = TERRITORY_BY_ID[job.territoryId]!.name;
    log(next, `${place}: ${label}${rank > 1 && job.kind !== "castle" ? ` ${"I".repeat(rank)}` : ""} complete.`);
    pushEvent(next, {
      type: "build",
      player: job.player,
      toId: job.territoryId,
      kind: job.kind,
      text: `${place}: ${label} finished.`,
    });
  }
  return advanceMarches(next, player);
}

export function issueMarch(
  state: GameState,
  fromId: string,
  toId: string,
  force: { levy: number; bowmen?: number; knights: number; dragons: number; beasts?: number },
  siege?: Partial<SiegeStock>,
): GameState {
  const next = clone(state);
  if (!next.marches) next.marches = [];
  const from = terr(next, fromId);
  const to = terr(next, toId);
  const player = next.clock.currentPlayer;
  const sendBeasts = force.beasts ?? 0;
  const sendBowmen = force.bowmen ?? 0;
  if (from.owner !== player) return state;
  if (force.levy < 0 || sendBowmen < 0 || force.knights < 0 || force.dragons < 0 || sendBeasts < 0) return state;
  if (
    force.levy > from.levy ||
    sendBowmen > (from.bowmen ?? 0) ||
    force.knights > from.knights ||
    force.dragons > from.dragons ||
    sendBeasts > (from.beasts ?? 0)
  ) {
    return state;
  }
  const sent = force.levy + sendBowmen + force.knights + force.dragons + sendBeasts;
  if (sent < 1) return state;
  const legal = legalMarchTargets(next, fromId);
  if (!legal.includes(toId)) return state;

  const seaHop = !landNeighbors(fromId).includes(toId);
  let convoy = 0;
  if (seaHop) {
    if (!TERRITORY_BY_ID[fromId]?.coastal || from.ships < 1) return state;
    from.ships -= 1;
    convoy = 1;
  }

  from.levy -= force.levy;
  from.bowmen = (from.bowmen ?? 0) - sendBowmen;
  from.knights -= force.knights;
  from.dragons -= force.dragons;
  from.beasts = (from.beasts ?? 0) - sendBeasts;

  const rams = Math.min(1, siege?.rams ?? 0, from.rams ?? 0);
  const catapults = Math.min(1, siege?.catapults ?? 0, from.catapults ?? 0);
  const ladders = Math.min(1, siege?.ladders ?? 0, from.ladders ?? 0);
  const towers = Math.min(1, siege?.towers ?? 0, from.towers ?? 0);
  from.rams = (from.rams ?? 0) - rams;
  from.catapults = (from.catapults ?? 0) - catapults;
  from.ladders = (from.ladders ?? 0) - ladders;
  from.towers = (from.towers ?? 0) - towers;

  const order: MarchOrder = {
    id: `m${next.nextJobId++}`,
    player,
    from: fromId,
    to: toId,
    levy: force.levy,
    bowmen: sendBowmen,
    knights: force.knights,
    dragons: force.dragons,
    beasts: sendBeasts,
    rams,
    catapults,
    ladders,
    towers,
    ships: convoy,
    remaining: 1,
  };
  next.marches.push(order);
  const fromName = TERRITORY_BY_ID[fromId]!.name;
  const toName = TERRITORY_BY_ID[toId]!.name;
  const verb = to.owner === player ? "marches for" : convoy ? "sails on" : "marches on";
  log(next, `${empireOf(playerOf(next, player).empire).name} ${verb} ${toName} from ${fromName} — they arrive next watch.`);
  pushEvent(next, {
    type: "march",
    player,
    fromId,
    toId,
    text: `Column on the road from ${fromName} to ${toName}.`,
  });
  next.marchFrom = fromId;
  return next;
}

function advanceMarches(state: GameState, player: PlayerId): GameState {
  if (!state.marches) state.marches = [];
  if (!state.arrivals) state.arrivals = [];
  const due: MarchOrder[] = [];
  for (const m of state.marches) {
    if (m.player !== player) continue;
    m.remaining -= 1;
    if (m.remaining <= 0) due.push(m);
  }
  state.marches = state.marches.filter((m) => m.remaining > 0);
  for (const order of due) settleMarch(state, order);
  return state;
}

function settleMarch(state: GameState, order: MarchOrder) {
  const from = state.territories[order.from];
  const to = state.territories[order.to];
  if (!from || !to) return;
  const force = hostFromOrder(order);
  const toName = TERRITORY_BY_ID[order.to]!.name;
  const fromName = TERRITORY_BY_ID[order.from]!.name;
  if (to.owner === order.player) {
    mergeHost(to, force, from);
    if (order.ships) berthShip(from, to);
    log(state, `${empireOf(playerOf(state, order.player).empire).name} arrives in ${toName}.`);
    pushEvent(state, {
      type: "march",
      player: order.player,
      fromId: order.from,
      toId: order.to,
      text: `Host arrives in ${toName} from ${fromName}.`,
    });
    return;
  }
  const humanSeat = state.players.find((p) => p.human)?.id;
  const humanInvolved = humanSeat != null && (order.player === humanSeat || to.owner === humanSeat);
  if (humanInvolved) {
    state.arrivals.push(order);
    log(state, `The column from ${fromName} falls on ${toName}.`);
    pushEvent(state, {
      type: "march",
      player: order.player,
      fromId: order.from,
      toId: order.to,
      text: `The host from ${fromName} reaches ${toName}.`,
    });
    return;
  }
  const fought = resolveArrival(state, order);
  Object.assign(state, fought);
}

function mergeHost(to: TerritoryState, force: HostForce, overflow: TerritoryState) {
  to.levy += force.levy;
  to.bowmen = (to.bowmen ?? 0) + (force.bowmen ?? 0);
  to.knights += force.knights;
  to.dragons += force.dragons;
  if (to.dragons > DRAGON_CAP) {
    overflow.dragons += to.dragons - DRAGON_CAP;
    to.dragons = DRAGON_CAP;
  }
  to.beasts = (to.beasts ?? 0) + (force.beasts ?? 0);
}

function resolveArrival(state: GameState, order: MarchOrder): GameState {
  const force = hostFromOrder(order);
  return resolveAttackWithHost(state, order.from, order.to, force, order.ships, order.player, Boolean(order.tribal));
}

function resolveAttackWithHost(
  state: GameState,
  fromId: string,
  toId: string,
  force: HostForce,
  convoy: number,
  attacker: PlayerId,
  tribal = false,
): GameState {
  const next = clone(state);
  const to = terr(next, toId);
  const from = terr(next, fromId);
  const player = attacker;
  const sendBeasts = force.beasts ?? 0;
  const sendBowmen = force.bowmen ?? 0;
  if (isBarbarian(to.owner)) to.pressure = 3;
  const watch = cityWatch(to);
  const meta: AssaultMeta = {
    fromId,
    toId,
    force: { levy: force.levy, bowmen: sendBowmen, knights: force.knights, dragons: force.dragons, beasts: sendBeasts },
    convoy,
    tribalCamp: isBarbarian(to.owner),
    defHost: defendingHost(to),
    prevOwner: to.owner,
    destCont: TERRITORY_BY_ID[toId]!.continent,
    brokeContinent: to.owner !== "barbarian" && holdsContinent(next, to.owner, TERRITORY_BY_ID[toId]!.continent),
    wasCapitol: to.owner !== "barbarian" && empireOf(playerOf(next, to.owner).empire).capitol === toId,
    continentsBefore: continentsHeld(next, player).length,
    player,
    tribal,
    watch,
    fieldLevy: to.levy,
  };
  const rng = mulberry32((next.seed + next.clock.turn * 997 + (force.levy + sendBowmen + force.knights + force.dragons + sendBeasts) * 13 + toId.length) >>> 0);
  let aLevy = force.levy;
  let aBowmen = sendBowmen;
  let aKnights = force.knights;
  let aDragons = force.dragons;
  let aBeasts = sendBeasts;
  let dLevy = to.levy + watch;
  let dBowmen = to.bowmen ?? 0;
  let dKnights = to.knights;
  let dDragons = to.dragons;
  let dBeasts = to.beasts ?? 0;
  const support = tribal ? 0 : supportingDragonDamage(next, player, toId);
  if (support > 0) {
    const hit = applyStrikeToDefense(dLevy, dKnights, dDragons, support, dBeasts, dBowmen, aDragons > 0);
    dLevy = hit.levy;
    dBowmen = hit.bowmen;
    dKnights = hit.knights;
    dDragons = hit.dragons;
    dBeasts = hit.beasts;
  }
  const atkBeast = tribal ? { atk: 0, def: 0 } : beastOf(playerOf(next, player).empire);
  const defBeast = beastOfOwner(next, to.owner);
  let works = spendSiegeOnWorks(
    { ...from, rams: 0, catapults: 0, ladders: 0, towers: 0 },
    worksDefense(to),
  );
  works = Math.max(0, works - (to.breach ?? 0) * 4);
  let guard = 24;
  const aliveAtk = () => aLevy + aBowmen + aKnights + aDragons + aBeasts;
  const aliveDef = () => dLevy + dBowmen + dKnights + dDragons + dBeasts;
  while (guard-- > 0 && aliveAtk() > 0 && aliveDef() > 0) {
    const knightBonus = aKnights > 0 && dLevy > 0 ? aKnights * 2 : 0;
    const atkStr =
      aLevy * UNIT_ATK.levy +
      aBowmen * UNIT_ATK.bowman +
      aKnights * UNIT_ATK.knight +
      knightBonus +
      aDragons * UNIT_ATK.dragon +
      aBeasts * atkBeast.atk;
    const wallBonus = dBowmen > 0 && works > 0 ? dBowmen * 2 : 0;
    const defStr = Math.max(
      0,
      dLevy * UNIT_DEF.levy +
        dBowmen * UNIT_DEF.bowman +
        wallBonus +
        dKnights * UNIT_DEF.knight +
        dDragons * UNIT_DEF.dragon +
        dBeasts * (defBeast?.def ?? 0) +
        works,
    );
    const { atkLoss, defLoss } = combatRound(rng, atkStr, defStr);
    if (defLoss) {
      const h = applyStrikeToDefense(dLevy, dKnights, dDragons, defLoss, dBeasts, dBowmen, aDragons > 0);
      dLevy = h.levy;
      dBowmen = h.bowmen;
      dKnights = h.knights;
      dDragons = h.dragons;
      dBeasts = h.beasts;
    }
    if (atkLoss) {
      const h = applyStrikeToDefense(aLevy, aKnights, aDragons, atkLoss, aBeasts, aBowmen, dDragons > 0);
      aLevy = h.levy;
      aBowmen = h.bowmen;
      aKnights = h.knights;
      aDragons = h.dragons;
      aBeasts = h.beasts;
    }
  }
  return finishAssault(next, meta, aLevy, aBowmen, aKnights, aDragons, aBeasts, dLevy, dBowmen, dKnights, dDragons, dBeasts);
}

export function settleArrival(
  state: GameState,
  order: MarchOrder,
  atkLeft: HostForce,
  defLeft: HostForce,
): GameState {
  const next = clone(state);
  const to = terr(next, order.to);
  const player = order.player;
  const force = hostFromOrder(order);
  const watch = cityWatch(to);
  const meta: AssaultMeta = {
    fromId: order.from,
    toId: order.to,
    force,
    convoy: order.ships,
    tribalCamp: isBarbarian(to.owner),
    defHost: defendingHost(to),
    prevOwner: to.owner,
    destCont: TERRITORY_BY_ID[order.to]!.continent,
    brokeContinent: to.owner !== "barbarian" && holdsContinent(next, to.owner, TERRITORY_BY_ID[order.to]!.continent),
    wasCapitol: to.owner !== "barbarian" && empireOf(playerOf(next, to.owner).empire).capitol === order.to,
    continentsBefore: continentsHeld(next, player).length,
    player,
    tribal: Boolean(order.tribal),
    watch,
    fieldLevy: to.levy,
  };
  next.arrivals = (next.arrivals ?? []).filter((a) => a.id !== order.id);
  return finishAssault(
    next,
    meta,
    atkLeft.levy,
    atkLeft.bowmen ?? 0,
    atkLeft.knights,
    atkLeft.dragons,
    atkLeft.beasts ?? 0,
    defLeft.levy,
    defLeft.bowmen ?? 0,
    defLeft.knights,
    defLeft.dragons,
    defLeft.beasts ?? 0,
  );
}

export function abortArrival(state: GameState, order: MarchOrder): GameState {
  const next = clone(state);
  next.arrivals = (next.arrivals ?? []).filter((a) => a.id !== order.id);
  const force = hostFromOrder(order);
  if (order.tribal) {
    const camp = next.territories[order.from];
    if (camp) mergeHost(camp, force, camp);
    return next;
  }
  const from = next.territories[order.from];
  const dumpId =
    from && from.owner === order.player ? order.from : ownedIds(next, order.player)[0];
  if (!dumpId) return next;
  const home = terr(next, dumpId);
  mergeHost(home, force, home);
  if (order.ships) home.ships += order.ships;
  home.rams = (home.rams ?? 0) + (order.rams ?? 0);
  home.catapults = (home.catapults ?? 0) + (order.catapults ?? 0);
  home.ladders = (home.ladders ?? 0) + (order.ladders ?? 0);
  home.towers = (home.towers ?? 0) + (order.towers ?? 0);
  log(next, `${empireOf(playerOf(next, order.player).empire).name} turns the column back to ${TERRITORY_BY_ID[dumpId]!.name}.`);
  return next;
}

export function popArrival(state: GameState): MarchOrder | null {
  const list = state.arrivals ?? [];
  return list[0] ?? null;
}

export function consumeArrival(state: GameState, id: string): GameState {
  const next = clone(state);
  next.arrivals = (next.arrivals ?? []).filter((a) => a.id !== id);
  return next;
}

export function drainEvents(state: GameState, player: PlayerId): { next: GameState; events: PulseEvent[] } {
  const next = clone(state);
  const events = (next.events ?? []).filter((e) => e.player === player);
  next.events = (next.events ?? []).filter((e) => e.player !== player);
  return { next, events };
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
    log(next, `${empireOf(p.empire).name} calls warriors.`);
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
      const hit = applyStrikeToDefense(t.levy, t.knights, t.dragons, 2, t.beasts ?? 0, t.bowmen ?? 0, false);
      t.levy = hit.levy;
      t.bowmen = hit.bowmen;
      t.knights = hit.knights;
      t.dragons = hit.dragons;
      t.beasts = hit.beasts;
      log(next, `${empireOf(p.empire).name} raids ${TERRITORY_BY_ID[territoryId]!.name}.`);
    }
  } else if (card === "wall" && territoryId) {
    const t = terr(next, territoryId);
    if (t.owner === p.id) {
      setFort(t, Math.min(FORT_CAP, Math.max(1, fortOf(t) + 1)));
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
      log(next, `${empireOf(p.empire).name} holds five regions.`);
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
        `The age closes. ${empireOf(best.empire).name} holds the most provinces among the leading regions.`,
      );
    } else if (best.continents > 0) {
      log(next, `The age closes. ${empireOf(best.empire).name} holds the most regions.`);
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
      while (p.silver < 0 && (t.bowmen ?? 0) > 0) {
        t.bowmen -= 1;
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
  if (difficulty === "easy") return 20;
  if (difficulty === "hard") return 40;
  return 30;
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
  const humanSeat = state.players.find((p) => p.human)?.id;
  const imperial = Object.values(state.territories).filter((t) => t.owner !== "barbarian");
  for (const target of shuffle(rng, imperial)) {
    if (rng() > 0.4) continue;
    const raiders = landNeighbors(target.id)
      .map((id) => state.territories[id]!)
      .filter((t) => t.owner === "barbarian" && t.pressure === 0 && standing(t) >= 3);
    if (!raiders.length) continue;
    raiders.sort((a, b) => standing(b) - standing(a));
    const tribe = raiders[0]!;
    const place = TERRITORY_BY_ID[target.id]!.name;
    const camp = TERRITORY_BY_ID[tribe.id]!.name;
    const thin = standing(target) <= 1;
    const watch = cityWatch(target);
    const seat = isSeat(target);
    const sendCap = thin ? Math.max(2, watch || 2) : 2;
    const sendN = Math.max(1, Math.min(tribe.levy - 1, sendCap));
    if (sendN < 1) continue;
    tribe.levy -= sendN;
    const human = humanSeat != null && target.owner === humanSeat;
    const storm = thin || (seat && standing(target) < 2);
    if (human && storm) {
      if (!state.arrivals) state.arrivals = [];
      state.arrivals.push({
        id: `m${state.nextJobId++}`,
        player: humanSeat,
        from: tribe.id,
        to: target.id,
        levy: sendN,
        bowmen: 0,
        knights: 0,
        dragons: 0,
        beasts: 0,
        rams: 0,
        catapults: 0,
        ladders: 0,
        towers: 0,
        ships: 0,
        remaining: 0,
        tribal: true,
      });
      log(state, `Tribes march on ${place} from ${camp}.`);
      continue;
    }
    const canOverrun = thin && watch <= 0 && fortOf(target) === 0 && !seat;
    if (storm && !canOverrun) {
      const fought = resolveAttackWithHost(
        state,
        tribe.id,
        target.id,
        { levy: sendN, bowmen: 0, knights: 0, dragons: 0, beasts: 0 },
        0,
        0,
        true,
      );
      Object.assign(state, fought);
      break;
    }
    if (canOverrun) {
      const prev = target.owner;
      target.owner = "barbarian";
      target.levy = sendN;
      target.knights = 0;
      target.dragons = 0;
      target.beasts = 0;
      target.ships = 0;
      setFort(target, 0);
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
  liftBrokenSieges(next);
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
  lines.push(`Watch ${after.clock.turn} begins.`);
  for (const ev of after.events ?? []) {
    if (ev.player === 0) lines.push(ev.text);
  }
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
  for (const a of after.arrivals ?? []) {
    const dest = after.territories[a.to];
    if (!dest || dest.owner !== 0) continue;
    const place = TERRITORY_BY_ID[a.to]?.name ?? a.to;
    const camp = TERRITORY_BY_ID[a.from]?.name ?? "the road";
    lines.push(
      a.tribal ? `Tribes fall on ${place} from ${camp}.` : `${empireOf(after.players[a.player]!.empire).name} falls on ${place}.`,
    );
  }
  for (const p of after.players) {
    if (before.players[p.id]!.alive && !p.alive) {
      lines.push(`${empireOf(p.empire).name} is broken.`);
    }
  }
  for (const job of before.jobs) {
    const still = after.jobs.some((j) => j.id === job.id);
    if (still) continue;
    const t = after.territories[job.territoryId];
    if (!t) continue;
    const place = TERRITORY_BY_ID[job.territoryId]!.name;
    const label = job.kind === "castle" ? "walls" : isTrainKind(job.kind) ? UNIT_LABEL[job.kind] : job.kind;
    if (t.owner === 0) {
      lines.push(`${place}: ${label} finished.`);
      continue;
    }
    if (job.player !== 0 && t.owner === job.player) {
      lines.push(`${empireOf(after.players[job.player]!.empire).name} finishes ${String(label).toLowerCase()} in ${place}.`);
    }
  }
  const rivalWork = after.jobs.filter((j) => j.player !== 0).slice(0, 3);
  for (const job of rivalWork) {
    const place = TERRITORY_BY_ID[job.territoryId]?.name ?? job.territoryId;
    const house = empireOf(after.players[job.player]!.empire).name;
    const label = job.kind === "castle" ? "walls" : isTrainKind(job.kind) ? UNIT_LABEL[job.kind].toLowerCase() : job.kind;
    const wait = job.remaining === 1 ? "1 watch" : `${job.remaining} watches`;
    lines.push(`${house} ${isTrainKind(job.kind) ? "drills" : "raises"} ${label} in ${place} — ${wait} left.`);
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
