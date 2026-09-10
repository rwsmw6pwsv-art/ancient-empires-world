// @ts-nocheck
import { empireOf } from "./empires";
import { beastOf, cityArtForRanks, dragonPowerFor, landscapeOf, type TerrainId } from "./landscape";
import type { EmpireId, GameState, HostForce, SiegeKind, SiegeStock, TerritoryState, UnitKind } from "./types";
import { EMPTY_HOST, SIEGE_CAP, SIEGE_LABEL, TOWER_CARGO, UNIT_CAP, UNIT_LABEL_PLURAL } from "./types";
import { TERRITORY_BY_ID, landNeighbors } from "./world";
import { cityWatch, isBarbarian, worksRank as castleRankOf, beastOfLand, beastOfTerritory } from "./engine";
import {
  defenseRank,
  keepHpFor,
  scorpionCounts,
  scorpionRangeFor,
  towerCounts,
  wallHpFor,
} from "./defense";

export type RaidAlertKind = "gate" | "wall" | "tower" | "keep" | "ladder";
export interface RaidAlert {
  id: string;
  text: string;
  kind: RaidAlertKind;
  age: number;
}
export interface RaidBattleStatus {
  camp: boolean;
  gateLabel: string;
  wallLabel: string;
  towerLabel: string;
  gateDown: boolean;
  wallBreached: boolean;
  towersDown: number;
  towersTotal: number;
}
export interface RaidArmyHp {
  atk: { cur: number; max: number };
  def: { cur: number; max: number };
}
export type RaidKind = UnitKind | SiegeKind;
export type BattleSide = "atk" | "def";
export type RaidTactic = "any" | "gate" | "walls" | "keep" | "scorpions";
export type RaidTargetPref = "keep" | "def" | "wall" | "air" | "any";
export type RaidOrder = "gate" | "ladder" | "tower" | "wall" | "guard" | "posts" | "wyrm" | "scorpions" | "keep" | "hold";

export interface RaidNeighbor {
  id: string;
  name: string;
  terrain: TerrainId;
  dx: number;
  dy: number;
}

export interface RaidUnit {
  id: string;
  side: BattleSide;
  kind: RaidKind;
  name: string;
  x: number;
  y: number;
  hp: number;
  max: number;
  speed: number;
  range: number;
  dmg: number;
  air: boolean;
  pref: RaidTargetPref;
  cd: number;
  target: string | null;
  path: { x: number; y: number }[];
  planted: boolean;
  dumped: boolean;
  flash: number;
  radius: number;
  onWall: boolean;
  cargo: HostForce | null;
  roam: number;
  facing: number;
  postId: string | null;
  holdGate: boolean;
  gateRing: "outer" | "inner" | "keep" | null;
  order: RaidOrder;
  held: boolean;
  file: number;
  aimed: number;
}

export interface RaidBuilding {
  id: string;
  kind: "keep" | "cannon" | "archer" | "air" | "store" | "scorpion";
  x: number;
  y: number;
  r: number;
  hp: number;
  max: number;
  range: number;
  dmg: number;
  cd: number;
  cdLeft: number;
  hitsAir: boolean;
  hitsGround: boolean;
  flash: number;
  hostId: string | null;
  aimed: number;
  press: number;
  gatePost: boolean;
  ring: "outer" | "inner" | "keep" | null;
}

export interface RaidWall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  max: number;
  climb: boolean;
  gate: boolean;
  ring: "outer" | "inner" | "keep";
  a: number;
  press: number;
}

export interface RaidShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  splash: number;
  ttl: number;
  air: boolean;
  ground: boolean;
  side: BattleSide;
  vsDragon: boolean;
}

export interface RaidSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export interface RaidMoat {
  r0: number;
  r1: number;
}

export interface RaidBridge {
  x: number;
  y: number;
  w: number;
  h: number;
  a: number;
}

export interface RaidState {
  fromId: string;
  toId: string;
  force: HostForce;
  siege: SiegeStock;
  humanSide: BattleSide;
  stock: HostForce & SiegeStock;
  atkStock: HostForce & SiegeStock;
  deployed: HostForce & SiegeStock;
  units: RaidUnit[];
  buildings: RaidBuilding[];
  walls: RaidWall[];
  shots: RaidShot[];
  sparks: RaidSpark[];
  garrison: HostForce;
  keepDestroyed: boolean;
  destruction: number;
  stars: number;
  timeLeft: number;
  phase: RaidPhase;
  selected: RaidKind | null;
  timeScale: number;
  nextId: number;
  seed: number;
  rng: number;
  log: string[];
  alerts: RaidAlert[];
  trauma: number;
  walk: Uint8Array;
  walkDirty: boolean;
  terrain: TerrainId;
  camp: boolean;
  fort: number;
  atkName: string;
  defName: string;
  fromName: string;
  toName: string;
  beastName: string;
  defBeastName: string;
  beastId: string | null;
  squash: number;
  moats: RaidMoat[];
  bridges: RaidBridge[];
  beastStats: { atk: number; strength: number; speed: number; health: number; range: number } | null;
  atkDragon: number;
  defDragon: number;
  moatRank: number;
  wallRank: number;
  outerWallRank: number;
  keepRank: number;
  towerRank: number;
  tactic: RaidTactic;
  orders: Record<RaidKind, RaidOrder>;
  orderLots: Partial<Record<RaidKind, Partial<Record<RaidOrder, number>>>>;
  lastOrders: Record<RaidKind, RaidOrder>;
  wave: number;
  firstBreach: { id: string; x: number; y: number; gate: boolean } | null;
  coastal: boolean;
  worldX: number;
  worldY: number;
  neighbors: RaidNeighbor[];
  liveAtk: RaidUnit[];
  liveDef: RaidUnit[];
  liveN: Partial<Record<RaidKind, number>>;
}

export interface RaidTally {
  remaining: HostForce;
  lost: HostForce;
  captured: HostForce;
}

export interface RaidOutcome {
  winner: BattleSide;
  atkLeft: HostForce;
  defLeft: HostForce;
  captured: HostForce;
  atk: RaidTally;
  def: RaidTally;
  stars: number;
  destruction: number;
  used: SiegeStock;
  keepDestroyed: boolean;
}

export type { CityArtId } from "./landscape";

export type RaidOrderRow = { id: RaidOrder; label: string; hint: string };

export const RAID_W = 720;
export const RAID_H = 480;
export const RAID_TIME = 360;
export const RAID_CELL = 20;
export const RAID_COLS = RAID_W / RAID_CELL;
export const RAID_ROWS = RAID_H / RAID_CELL;
export const RAID_CX = RAID_W / 2;
export const RAID_CY = RAID_H / 2;

export const RAID_TACTICS: { id: RaidTactic; label: string; hint: string }[] = [
  { id: "any", label: "Free", hint: "Captains pick their own marks." },
  { id: "gate", label: "Gate", hint: "Rams and the host drive the bridges and the gate." },
  { id: "walls", label: "Walls", hint: "Beasts and catapults smash a breach. Ladders scale." },
  { id: "keep", label: "Keep", hint: "Once inside, drive for the citadel. Dragons burn the keep." },
  { id: "scorpions", label: "Scorpions", hint: "Burn the batteries first — they are the only ground engines that wound a dragon." },
];

/** South-facing city gate (canvas +Y). One gate per ring. */
export const RAID_GATE_A = Math.PI / 2;
/** Angular offset of the two gate-towers flanking each gate. */
export const RAID_GATE_TOWER_DA = 0.22;
var GATE_WATCH = 8;
var BEAST_GATE = 5;
var STEP = 1 / 60;
/** Playable battle speeds. Slowest is the default so the field can be read. */
export const RAID_SPEEDS = [0.12, 0.25, 0.5, 1] as const;
export const RAID_SLOWEST = RAID_SPEEDS[0];
export const RAID_ALERT_LIFE = 6.4;
export const BOARDABLE: readonly RaidKind[] = ["levy", "bowman", "knight", "beast"];
export const KIND_ORDERS: Partial<Record<RaidKind, RaidOrderRow[]>> = {
levy: [
	{
		id: "gate",
		label: "Follow ram",
		hint: "Follow the ram. Enter when the gate falls, then keep fighting."
	},
	{
		id: "ladder",
		label: "Ladders",
		hint: "Scale with the ladders over the wall, then keep fighting."
	},
	{
		id: "tower",
		label: "Siege tower",
		hint: "Ride the tower over the wall, then keep fighting."
	},
	{
		id: "keep",
		label: "Keep",
		hint: "Drive for the citadel. The land is not yours until the keep falls."
	},
	{
		id: "hold",
		label: "Hold",
		hint: "Stand until the next charge."
	}
],
bowman: [
	{
		id: "tower",
		label: "On tower",
		hint: "Ride the siege tower and shoot the defensive towers."
	},
	{
		id: "posts",
		label: "Towers",
		hint: "Shoot the defensive towers from outside."
	},
	{
		id: "guard",
		label: "Guard ram",
		hint: "Cover the ram at the gate."
	},
	{
		id: "keep",
		label: "Keep",
		hint: "Shoot the citadel. The land is not yours until it falls."
	},
	{
		id: "hold",
		label: "Hold",
		hint: "Stand until the next charge."
	}
],
knight: [
	{
		id: "gate",
		label: "Follow ram",
		hint: "Follow the ram. Enter when the gate falls, then flank."
	},
	{
		id: "tower",
		label: "Siege tower",
		hint: "Ride over the wall and flank the garrison."
	},
	{
		id: "keep",
		label: "Keep",
		hint: "Ride for the citadel. The land is not yours until it falls."
	},
	{
		id: "hold",
		label: "Hold",
		hint: "Stand until the next charge."
	}
],
beast: [
	{
		id: "wall",
		label: "Weak wall",
		hint: "Punch a weak stretch of wall."
	},
	{
		id: "gate",
		label: "Gate",
		hint: "Drive the gate with the ram."
	},
	{
		id: "tower",
		label: "Siege tower",
		hint: "Ride over the wall."
	},
	{
		id: "keep",
		label: "Keep",
		hint: "Break for the citadel. The land is not yours until it falls."
	},
	{
		id: "hold",
		label: "Hold",
		hint: "Stand until the next charge."
	}
],
catapult: [
	{
		id: "wall",
		label: "Breach",
		hint: "Open another entry in the wall. Slower than a ram."
	},
	{
		id: "posts",
		label: "Towers",
		hint: "Aim for the defensive towers."
	},
	{
		id: "keep",
		label: "Keep",
		hint: "Hurl at the citadel. The land is not yours until it falls."
	},
	{
		id: "hold",
		label: "Hold",
		hint: "Stand until the next charge."
	}
],
dragon: [
	{
		id: "wyrm",
		label: "Dragons",
		hint: "Hunt enemy dragons first, then scorpions."
	},
	{
		id: "scorpions",
		label: "Scorpions",
		hint: "Burn the batteries first."
	},
	{
		id: "keep",
		label: "Keep",
		hint: "Fly straight at the citadel. The land is not yours until it falls."
	},
	{
		id: "hold",
		label: "Hold",
		hint: "Stand until the next charge."
	}
]
};

export const DEF_KIND_ORDERS: Partial<Record<RaidKind, RaidOrderRow[]>> = {
	levy: [
		{
			id: "gate",
			label: "Hold gate",
			hint: "Stand behind the gate. Ride a wall breach if one opens first."
		},
		{
			id: "wall",
			label: "First breach",
			hint: "Ride to the first hole in the wall or a fallen gate."
		},
		{
			id: "keep",
			label: "Protect keep",
			hint: "Stand the citadel and meet whoever comes inside."
		}
	],
	bowman: [
		{
			id: "gate",
			label: "Hold gate",
			hint: "Fill the gate-towers first and shoot whoever drives the gate."
		},
		{
			id: "wall",
			label: "First breach",
			hint: "Stand the walls and cover the first hole."
		},
		{
			id: "keep",
			label: "Protect keep",
			hint: "Stand the citadel and shoot whoever comes for it."
		}
	],
	knight: [
		{
			id: "wall",
			label: "First breach",
			hint: "Start around the ring. Ride to the first hole or fallen gate."
		},
		{
			id: "gate",
			label: "Hold gate",
			hint: "Muster at the gate, then ride a breach if the walls break elsewhere."
		},
		{
			id: "keep",
			label: "Protect keep",
			hint: "Hold the citadel and ride down whoever comes inside."
		}
	],
	beast: [
		{
			id: "gate",
			label: "Hold gate",
			hint: "Stand the gate. Ride a wall breach if one opens first."
		},
		{
			id: "wall",
			label: "First breach",
			hint: "Ride to the first hole in the wall or a fallen gate."
		},
		{
			id: "keep",
			label: "Protect keep",
			hint: "Guard the citadel and meet whoever comes inside."
		}
	],
	dragon: [
		{
			id: "wyrm",
			label: "Dragons",
			hint: "Start over the keep. Hunt enemy dragons, then the largest group at the gate or a breach."
		},
		{
			id: "keep",
			label: "Protect keep",
			hint: "Hold the citadel and burn whoever comes inside."
		},
		{
			id: "gate",
			label: "Hold gate",
			hint: "Hold over the gate and burn the column there."
		},
		{
			id: "wall",
			label: "First breach",
			hint: "Cover the first hole in the wall or a fallen gate."
		}
	]
};

export function ordersFor(side: BattleSide): Partial<Record<RaidKind, RaidOrderRow[]>> {
	return side === "def" ? DEF_KIND_ORDERS : KIND_ORDERS;
}

export function defaultOrders(gear?: SiegeStock): Record<RaidKind, RaidOrder> {
const rams = gear?.rams ?? 0;
const ladders = gear?.ladders ?? 0;
const towers = gear?.towers ?? 0;
return {
	ram: "gate",
	levy: rams > 0 ? "gate" : ladders > 0 ? "ladder" : towers > 0 ? "tower" : "gate",
	bowman: towers > 0 ? "tower" : rams > 0 ? "guard" : "posts",
	knight: rams > 0 ? "gate" : towers > 0 ? "tower" : "gate",
	beast: "wall",
	catapult: "wall",
	dragon: "wyrm",
	ladder: "wall",
	tower: "wall"
};
}

export function defaultDefOrders(): Record<RaidKind, RaidOrder> {
	return {
		ram: "gate",
		levy: "gate",
		bowman: "gate",
		knight: "wall",
		beast: "gate",
		catapult: "wall",
		dragon: "wyrm",
		ladder: "wall",
		tower: "wall"
	};
}

function atkOrderOf(raid, kind) {
	if (raid.humanSide === "atk") return raid.orders?.[kind] ?? defaultOrders(raid.siege)[kind];
	return defaultOrders(raid.siege)[kind];
}

function defOrderOf(raid, kind) {
	if (raid.humanSide === "def") return raid.orders?.[kind] ?? defaultDefOrders()[kind];
	return defaultDefOrders()[kind];
}

const LOT_KINDS: RaidKind[] = ["levy", "bowman", "knight", "beast", "dragon", "ram", "catapult", "ladder", "tower"];

function emptyLots(side: BattleSide): Partial<Record<RaidKind, Partial<Record<RaidOrder, number>>>> {
	const lots = {};
	for (const kind of LOT_KINDS) {
		const rows = ordersFor(side)[kind] ?? [];
		if (!rows.length) continue;
		lots[kind] = {};
		for (const row of rows) lots[kind][row.id] = 0;
	}
	return lots;
}

function kindHeadcount(raid, kind) {
	return stockKind(raid.stock, kind) + raid.units.filter((u) => u.side === raid.humanSide && u.kind === kind && u.hp > 0).length;
}

function placedByOrder(raid, kind) {
	const tally: Partial<Record<RaidOrder, number>> = {};
	for (const u of raid.units) {
		if (u.side !== raid.humanSide || u.kind !== kind || u.hp <= 0) continue;
		const id = u.held ? "hold" : (u.order || defOrderOf(raid, kind));
		tally[id] = (tally[id] || 0) + 1;
	}
	return tally;
}

function seedOrderLots(raid) {
	const lots = emptyLots(raid.humanSide);
	const bag = raid.stock;
	const defaults = raid.humanSide === "def" ? defaultDefOrders() : defaultOrders(raid.siege);
	for (const kind of LOT_KINDS) {
		const rows = ordersFor(raid.humanSide)[kind] ?? [];
		if (!rows.length) continue;
		const n = stockKind(bag, kind);
		const home = raid.orders?.[kind] ?? defaults[kind];
		if (lots[kind] && n > 0) lots[kind][home] = n;
	}
	raid.orderLots = lots;
}

export function orderLot(raid: RaidState, kind: RaidKind, order: RaidOrder): number {
	return raid.orderLots?.[kind]?.[order] ?? 0;
}

function applyLotsToUnits(raid, kind) {
	const side = raid.humanSide;
	const allowed = (ordersFor(side)[kind] ?? []).map((r) => r.id);
	const lots = raid.orderLots?.[kind] ?? {};
	const units = raid.units.filter((u) => u.side === side && u.kind === kind && u.hp > 0);
	let i = 0;
	for (const id of allowed) {
		const n = lots[id] ?? 0;
		for (let k = 0; k < n && i < units.length; k++, i++) {
			const u = units[i];
			if (id === "hold") {
				u.held = true;
				if (u.order === "hold") u.order = combatOrder(kind, raid);
			} else {
				u.order = id;
				u.held = false;
			}
			if (side === "def") u.holdGate = id === "gate";
		}
	}
}

export function setOrderLot(raid: RaidState, kind: RaidKind, order: RaidOrder, n: number) {
	if (!raid.orderLots) seedOrderLots(raid);
	const allowed = (ordersFor(raid.humanSide)[kind] ?? []).map((r) => r.id);
	if (!allowed.includes(order)) return;
	const total = kindHeadcount(raid, kind);
	n = Math.max(0, Math.min(total, n | 0));
	const lots = raid.orderLots[kind] ?? (raid.orderLots[kind] = {});
	for (const id of allowed) if (lots[id] == null) lots[id] = 0;
	const cur = lots[order] || 0;
	let delta = n - cur;
	lots[order] = n;
	if (delta > 0) {
		for (const id of [...allowed].reverse()) {
			if (id === order || delta <= 0) continue;
			const take = Math.min(lots[id] || 0, delta);
			lots[id] -= take;
			delta -= take;
		}
	} else if (delta < 0) {
		const dest = allowed.find((id) => id !== order) ?? order;
		lots[dest] = (lots[dest] || 0) - delta;
	}
	let sum = 0;
	for (const id of allowed) sum += lots[id] || 0;
	if (sum !== total) lots[order] = (lots[order] || 0) + (total - sum);
	raid.orders[kind] = order;
	rememberOrder(raid, kind, order);
	applyLotsToUnits(raid, kind);
}

function takeLotOrder(raid, kind) {
	const side = raid.humanSide;
	const allowed = (ordersFor(side)[kind] ?? []).map((r) => r.id);
	const lots = raid.orderLots?.[kind] ?? {};
	const placed = placedByOrder(raid, kind);
	const sel = raid.orders?.[kind];
	if (sel && allowed.includes(sel)) {
		if ((lots[sel] || 0) > (placed[sel] || 0)) return sel;
		let donor = allowed.find((id) => id !== sel && (lots[id] || 0) > (placed[id] || 0));
		if (!donor) donor = allowed.find((id) => id !== sel && (lots[id] || 0) > 0);
		if (donor) {
			lots[donor] = Math.max(0, (lots[donor] || 0) - 1);
			lots[sel] = (lots[sel] || 0) + 1;
		}
		return sel;
	}
	for (const id of allowed) {
		if ((lots[id] || 0) > (placed[id] || 0)) return id;
	}
	return side === "def" ? defaultDefOrders()[kind] : defaultOrders(raid.siege)[kind];
}

function attackerBag(raid) {
	return raid.humanSide === "def" ? raid.atkStock : raid.stock;
}

function combatOrder(kind, raid) {
const last = raid?.lastOrders?.[kind];
if (last && last !== "hold") return last;
const cur = raid?.orders?.[kind];
if (cur && cur !== "hold") return cur;
return (KIND_ORDERS[kind] ?? []).find((r) => r.id !== "hold")?.id ?? defaultOrders()[kind];
}
function rememberOrder(raid, kind, order) {
if (!raid.lastOrders) raid.lastOrders = defaultOrders();
if (order !== "hold") raid.lastOrders[kind] = order;
}
function orderOf(u, raid) {
if (u.order && u.order !== "hold") return u.order;
return combatOrder(u.kind, raid);
}
function releaseHold(u, raid) {
u.held = false;
if (u.order === "hold") u.order = combatOrder(u.kind, raid);
}
var STATS = {
levy: {
	hp: 42,
	dmg: 6,
	speed: 22,
	range: 16,
	air: false,
	pref: "keep",
	radius: 3,
	cd: 1.05
},
bowman: {
	hp: 18,
	dmg: 6,
	speed: 18,
	range: 164,
	air: false,
	pref: "def",
	radius: 3,
	cd: 0.78
},
knight: {
	hp: 52,
	dmg: 8,
	speed: 34,
	range: 18,
	air: false,
	pref: "def",
	radius: 4,
	cd: 0.95
},
beast: {
	hp: 88,
	dmg: 14,
	speed: 24,
	range: 20,
	air: false,
	pref: "wall",
	radius: 5,
	cd: 1.2
},
dragon: {
	hp: 200,
	dmg: 36,
	speed: 48,
	range: 280,
	air: true,
	pref: "keep",
	radius: 7,
	cd: 0.7
},
ram: {
	hp: 400,
	dmg: 28,
	speed: 14,
	range: 16,
	air: false,
	pref: "wall",
	radius: 7,
	cd: 1.35
},
catapult: {
	hp: 80,
	dmg: 36,
	speed: 10,
	range: 220,
	air: false,
	pref: "wall",
	radius: 6,
	cd: 1.85
},
ladder: {
	hp: 36,
	dmg: 0,
	speed: 16,
	range: 14,
	air: false,
	pref: "wall",
	radius: 4,
	cd: 0.7
},
tower: {
	hp: 240,
	dmg: 6,
	speed: 9,
	range: 16,
	air: false,
	pref: "wall",
	radius: 8,
	cd: 1.2
}
};
var KNIGHT_VS_LEVY = 2.8;
var BOWMAN_HIT = 1.45;
var WALL_BOW_RANGE = 42;
var WALL_BOW_DMG = 5;
var EMPTY = { ...EMPTY_HOST };
var EMPTY_SIEGE = {
rams: 0,
catapults: 0,
ladders: 0,
towers: 0
};
function worksRankSafe(t) {
try {
	return worksRank(t, "castle");
} catch {
	return t.castle ? Math.max(1, t.castleRank ?? 1) : 0;
}
}
function dist(ax, ay, bx, by) {
return Math.hypot(ax - bx, ay - by);
}
function clamp(n, a, b) {
return Math.max(a, Math.min(b, n));
}
function nextRng(raid) {
raid.rng = Math.imul(raid.rng ^ raid.rng >>> 16, 2146121005) >>> 0 || 1;
return (raid.rng >>> 0) / 4294967296;
}
function uid(raid, p) {
raid.nextId += 1;
return `${p}${raid.nextId}`;
}
function pushAlert(raid, kind, text) {
if (!raid.alerts) raid.alerts = [];
raid.alerts.push({
	id: uid(raid, "a"),
	text,
	kind,
	age: 0
});
raid.log.push(text);
}
export function ageRaidAlerts(raid: RaidState, dt: number) {
if (!raid.alerts?.length) return;
for (const a of raid.alerts) a.age += dt;
raid.alerts = raid.alerts.filter((a) => a.age < RAID_ALERT_LIFE);
}
function stockKind(stock, kind) {
if (kind === "levy") return stock.levy;
if (kind === "bowman") return stock.bowmen ?? 0;
if (kind === "knight") return stock.knights;
if (kind === "dragon") return stock.dragons;
if (kind === "beast") return stock.beasts;
if (kind === "ram") return stock.rams;
if (kind === "catapult") return stock.catapults;
if (kind === "ladder") return stock.ladders;
return stock.towers;
}
function takeStock(stock, kind, n = 1) {
if (kind === "levy") stock.levy = Math.max(0, stock.levy - n);
else if (kind === "bowman") stock.bowmen = Math.max(0, (stock.bowmen ?? 0) - n);
else if (kind === "knight") stock.knights = Math.max(0, stock.knights - n);
else if (kind === "dragon") stock.dragons = Math.max(0, stock.dragons - n);
else if (kind === "beast") stock.beasts = Math.max(0, stock.beasts - n);
else if (kind === "ram") stock.rams = Math.max(0, stock.rams - n);
else if (kind === "catapult") stock.catapults = Math.max(0, stock.catapults - n);
else if (kind === "ladder") stock.ladders = Math.max(0, stock.ladders - n);
else stock.towers = Math.max(0, stock.towers - n);
}
function addStock(stock, kind, n = 1) {
takeStock(stock, kind, -n);
}
export function raidKindsLeft(raid: RaidState): RaidKind[] {
return [
	"ram",
	"tower",
	"ladder",
	"catapult",
	"beast",
	"knight",
	"levy",
	"bowman",
	"dragon"
].filter((k) => stockKind(raid.stock, k) > 0);
}
export function cloneRaid(raid: RaidState): RaidState {
return {
	...raid,
	force: { ...raid.force },
	siege: { ...raid.siege },
	stock: { ...raid.stock },
	atkStock: { ...(raid.atkStock ?? raid.stock) },
	deployed: { ...raid.deployed },
	garrison: { ...raid.garrison },
	units: raid.units.map((u) => ({
		...u,
		path: u.path.map((p) => ({ ...p }))
	})),
	buildings: raid.buildings.map((b) => ({ ...b })),
	walls: raid.walls.map((w) => ({ ...w })),
	shots: raid.shots.map((s) => ({ ...s })),
	sparks: raid.sparks.map((s) => ({ ...s })),
	log: [...raid.log],
	alerts: (raid.alerts ?? []).map((a) => ({ ...a })),
	walk: raid.walk.slice(),
	moats: raid.moats.map((m) => ({ ...m })),
	bridges: raid.bridges.map((b) => ({ ...b })),
	beastStats: raid.beastStats ? { ...raid.beastStats } : null,
	neighbors: (raid.neighbors ?? []).map((n) => ({ ...n })),
	orders: { ...raid.orders ?? defaultOrders() },
	orderLots: raid.orderLots
		? Object.fromEntries(Object.entries(raid.orderLots).map(([k, v]) => [k, { ...v }]))
		: emptyLots(raid.humanSide),
	lastOrders: { ...raid.lastOrders ?? raid.orders ?? defaultOrders() },
	wave: raid.wave ?? 0,
	firstBreach: raid.firstBreach ? { ...raid.firstBreach } : null,
	coastal: Boolean(raid.coastal),
	worldX: raid.worldX,
	worldY: raid.worldY
};
}
function keepOf(raid) {
return raid.buildings.find((b) => b.kind === "keep") ?? null;
}
function wallBox(raid) {
const live = raid.walls.filter((w) => w.hp > 0);
if (!live.length) return null;
let x0 = RAID_W;
let y0 = RAID_H;
let x1 = 0;
let y1 = 0;
for (const w of live) {
	x0 = Math.min(x0, w.x);
	y0 = Math.min(y0, w.y);
	x1 = Math.max(x1, w.x + w.w);
	y1 = Math.max(y1, w.y + w.h);
}
return {
	x: x0,
	y: y0,
	w: x1 - x0,
	h: y1 - y0
};
}
function inRect(x, y, r, pad = 0) {
return x >= r.x - pad && y >= r.y - pad && x <= r.x + r.w + pad && y <= r.y + r.h + pad;
}
function markCells(walk, x, y, w, h) {
const c0 = clamp(Math.floor(x / 20), 0, 35);
const r0 = clamp(Math.floor(y / 20), 0, 23);
const c1 = clamp(Math.floor((x + w - .1) / 20), 0, 35);
const r1 = clamp(Math.floor((y + h - .1) / 20), 0, 23);
for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) walk[r * 36 + c] = 0;
}
function rebuildWalk(raid) {
const walk = raid.walk;
walk.fill(1);
for (const w of raid.walls) {
	if (w.hp <= 0 || w.climb) continue;
	markCells(walk, w.x, w.y, w.w, w.h);
}
for (const b of raid.buildings) {
	if (b.hp <= 0) continue;
	const s = b.kind === "keep" ? b.r * 1.2 : b.r * .7;
	markCells(walk, b.x - s, b.y - s, s * 2, s * 2);
}
raid.walkDirty = false;
}
function walkableFor(raid, x, y, u) {
if (u.air) return true;
const c = Math.floor(x / 20);
const r = Math.floor(y / 20);
if (c < 0 || r < 0 || c >= 36 || r >= 24) return false;
if (raid.walk[r * 36 + c] === 1) return true;
if (u.kind !== "beast") return false;
for (const w of raid.walls) {
	if (w.hp <= 0) continue;
	if (x >= w.x - 4 && y >= w.y - 4 && x <= w.x + w.w + 4 && y <= w.y + w.h + 4) return w.hp / w.max <= .45 || w.climb;
}
return false;
}
function astar(raid, sx, sy, tx, ty) {
const sc = clamp(Math.floor(sx / 20), 0, 35);
const sr = clamp(Math.floor(sy / 20), 0, 23);
const tc = clamp(Math.floor(tx / 20), 0, 35);
const tr = clamp(Math.floor(ty / 20), 0, 23);
if (sc === tc && sr === tr) return [{
	x: tx,
	y: ty
}];
const walk = raid.walk;
const key = (c, r) => r * 36 + c;
const open = [key(sc, sr)];
const came = (/* @__PURE__ */ new Int32Array(864)).fill(-1);
const g = (/* @__PURE__ */ new Float32Array(864)).fill(1e9);
const start = key(sc, sr);
g[start] = 0;
const heur = (c, r) => Math.hypot(c - tc, r - tr);
let found = -1;
let guard = 900;
while (open.length && guard-- > 0) {
	let bestI = 0;
	let best = 0xe8d4a51000;
	for (let i = 0; i < open.length; i++) {
		const k = open[i];
		const c = k % 36;
		const r = k / 36 | 0;
		const f = g[k] + heur(c, r);
		if (f < best) {
			best = f;
			bestI = i;
		}
	}
	const cur = open.splice(bestI, 1)[0];
	const cc = cur % 36;
	const cr = cur / 36 | 0;
	if (cc === tc && cr === tr) {
		found = cur;
		break;
	}
	for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
		if (!dc && !dr) continue;
		const nc = cc + dc;
		const nr = cr + dr;
		if (nc < 0 || nr < 0 || nc >= 36 || nr >= 24) continue;
		const nk = key(nc, nr);
		if (walk[nk] === 0 && !(nc === tc && nr === tr)) continue;
		if (dc && dr && (walk[key(cc + dc, cr)] === 0 || walk[key(cc, cr + dr)] === 0)) continue;
		const step = dc && dr ? 1.41 : 1;
		const ng = g[cur] + step;
		if (ng < g[nk]) {
			g[nk] = ng;
			came[nk] = cur;
			if (!open.includes(nk)) open.push(nk);
		}
	}
}
if (found < 0) return [];
const pts = [];
let k = found;
while (k !== start && k >= 0) {
	const c = k % 36;
	const r = k / 36 | 0;
	pts.push({
		x: (c + .5) * 20,
		y: (r + .5) * 20
	});
	k = came[k];
}
pts.reverse();
if (pts.length) pts[pts.length - 1] = {
	x: tx,
	y: ty
};
return pts;
}
function addBuilding(raid, kind, x, y, spec) {
raid.buildings.push({
	id: uid(raid, "b"),
	kind,
	x,
	y,
	r: spec.r,
	hp: spec.hp,
	max: spec.hp,
	range: spec.range ?? 0,
	dmg: spec.dmg ?? 0,
	cd: spec.cd ?? 1,
	cdLeft: .2 + nextRng(raid) * .4,
	hitsAir: spec.hitsAir ?? false,
	hitsGround: spec.hitsGround ?? true,
	flash: 0,
	hostId: spec.hostId ?? null,
	aimed: 0,
	press: 0,
	gatePost: Boolean(spec.gatePost),
	ring: spec.ring ?? null
});
}
function spark(raid, x, y, n) {
for (let i = 0; i < n && raid.sparks.length < 90; i++) {
	const a = nextRng(raid) * Math.PI * 2;
	const s = 18 + nextRng(raid) * 40;
	raid.sparks.push({
		x,
		y,
		vx: Math.cos(a) * s,
		vy: Math.sin(a) * s,
		life: .28 + nextRng(raid) * .25,
		max: .5
	});
}
}
function makeUnit(raid, side, kind, x, y, name) {
const s = { ...STATS[kind] };
if (kind === "beast" && raid.beastStats) {
	const b = raid.beastStats;
	s.hp = Math.round(b.health * 4.8);
	s.dmg = Math.round(b.atk * 1.05);
	s.speed = 12 + b.speed * 1.15;
	s.range = 10 + b.range * 1.35;
}
if (kind === "dragon") {
	const p = side === "atk" ? raid.atkDragon : raid.defDragon;
	s.hp = Math.round(p * 16);
	s.dmg = Math.round(p * 1.45);
	s.speed = 22 + p * 0.48;
	s.range = 210 + p * 2.2;
}
const label = name ?? (kind === "beast" ? (side === "def" ? raid.defBeastName ?? raid.beastName : raid.beastName) : kind === "ram" || kind === "catapult" || kind === "ladder" || kind === "tower" ? SIEGE_LABEL[kind] : UNIT_LABEL_PLURAL[kind]);
const onWall = false;
let pref = s.pref;
if (side === "atk") {
	if (raid.tactic === "keep") pref = "keep";
	else if (raid.tactic === "walls" || raid.tactic === "gate") pref = "wall";
	else if (raid.tactic === "scorpions") pref = "air";
}
return {
	id: uid(raid, "u"),
	side,
	kind,
	name: label,
	x,
	y,
	hp: onWall ? Math.max(6, Math.round(s.hp * .7)) : s.hp,
	max: onWall ? Math.max(6, Math.round(s.hp * .7)) : s.hp,
	speed: onWall ? 0 : s.speed,
	range: onWall ? s.range + WALL_BOW_RANGE : s.range,
	dmg: onWall ? s.dmg + WALL_BOW_DMG : s.dmg,
	air: s.air,
	pref,
	cd: 0,
	target: null,
	path: [],
	planted: false,
	dumped: false,
	flash: 0,
	radius: s.radius,
	onWall,
	cargo: null,
	roam: 0,
	facing: Math.atan2(RAID_CY - y, RAID_CX - x),
	postId: null,
	holdGate: false,
	gateRing: null,
	order: side === "atk" ? (atkOrderOf(raid, kind) === "hold" ? combatOrder(kind, raid) : atkOrderOf(raid, kind)) : defOrderOf(raid, kind),
	held: side === "atk" && atkOrderOf(raid, kind) === "hold",
	file: 0,
	aimed: 0
};
}
export function openRaid(state: GameState, fromId: string, toId: string, force: HostForce, siege: SiegeStock, humanSide: BattleSide, atkBeastHouse?: EmpireId): RaidState | null {
const from = state.territories[fromId];
const to = state.territories[toId];
if (!from || !to) return null;
if (from.owner === to.owner) return null;
const send = {
	levy: Math.max(0, force.levy | 0),
	bowmen: Math.max(0, (force.bowmen ?? 0) | 0),
	knights: Math.max(0, force.knights | 0),
	dragons: Math.max(0, force.dragons | 0),
	beasts: Math.max(0, force.beasts | 0)
};
const gear = {
	rams: Math.min(5, Math.max(0, siege.rams | 0)),
	catapults: Math.min(5, Math.max(0, siege.catapults | 0)),
	ladders: Math.min(5, Math.max(0, siege.ladders | 0)),
	towers: Math.min(5, Math.max(0, siege.towers | 0))
};
if (send.levy + (send.bowmen ?? 0) + send.knights + send.dragons + send.beasts < 1) return null;
const fromName = TERRITORY_BY_ID[fromId].name;
const toName = TERRITORY_BY_ID[toId].name;
const atkName = from.owner === "barbarian" ? "Tribes" : empireOf(state.players[from.owner].empire).name;
const defName = to.owner === "barbarian" ? "Independent tribes" : empireOf(state.players[to.owner].empire).name;
const atkBeast = send.beasts > 0
	? (atkBeastHouse || from.beastHouse ? beastOf(atkBeastHouse ?? from.beastHouse) : beastOfLand(fromId))
	: from.owner === "barbarian" ? null : beastOf(state.players[from.owner].empire);
const defBeast = (to.beasts ?? 0) > 0 ? beastOfTerritory(to) : to.owner === "barbarian" ? null : beastOf(state.players[to.owner].empire);
const seed = state.seed + state.clock.turn * 997 + toId.length * 13 >>> 0;
const watch = cityWatch(to);
const atkPlayer = from.owner === "barbarian" ? null : state.players[from.owner];
const defPlayer = to.owner === "barbarian" ? null : state.players[to.owner];
const fieldBeast = atkBeast ?? defBeast;
const raid = {
	fromId,
	toId,
	force: send,
	siege: gear,
	humanSide,
	stock: humanSide === "def"
		? {
			levy: to.levy + watch,
			bowmen: to.bowmen ?? 0,
			knights: to.knights,
			dragons: to.dragons,
			beasts: to.beasts ?? 0,
			...EMPTY_SIEGE
		}
		: {
			...send,
			...gear
		},
	atkStock: {
		...send,
		...gear
	},
	deployed: {
		...EMPTY,
		...EMPTY_SIEGE
	},
	units: [],
	buildings: [],
	walls: [],
	shots: [],
	sparks: [],
	garrison: {
		levy: to.levy + watch,
		bowmen: to.bowmen ?? 0,
		knights: to.knights,
		dragons: to.dragons,
		beasts: to.beasts ?? 0
	},
	keepDestroyed: false,
	destruction: 0,
	stars: 0,
	timeLeft: RAID_TIME,
	phase: "deploy",
	selected: null,
	timeScale: RAID_SLOWEST,
	nextId: 1,
	seed,
	rng: seed || 1,
	log: [`${atkName} fall on ${toName} from ${fromName}. ${defName} hold the ground.`, ...watch > 0 && to.levy < watch ? ["The city watch stands the walls."] : []],
	alerts: [],
	trauma: 0,
	walk: /* @__PURE__ */ new Uint8Array(RAID_COLS * RAID_ROWS),
	walkDirty: true,
	terrain: landscapeOf(toId).terrain,
	camp: isBarbarian(to.owner),
	fort: worksRankSafe(to),
	atkName,
	defName,
	fromName,
	toName,
	beastName: atkBeast?.name ?? "Beasts",
	defBeastName: defBeast?.name ?? "Beasts",
	beastId: atkBeast?.id ?? null,
	squash: .78,
	moats: [],
	bridges: [],
	beastStats: fieldBeast ? {
		atk: fieldBeast.atk,
		strength: fieldBeast.strength,
		speed: fieldBeast.speed,
		health: fieldBeast.health,
		range: fieldBeast.range
	} : null,
	atkDragon: dragonPowerFor(Math.max(from.dragonTier ?? 0, atkPlayer?.rareDragons ? 3 : atkPlayer?.specialDragons ? 2 : 1)),
	defDragon: dragonPowerFor(Math.max(to.dragonTier ?? 0, defPlayer?.rareDragons ? 3 : defPlayer?.specialDragons ? 2 : 1)),
	moatRank: defenseRank(to, "moats"),
	wallRank: defenseRank(to, "walls"),
	outerWallRank: defenseRank(to, "outer-walls"),
	keepRank: defenseRank(to, "keep-works"),
	towerRank: defenseRank(to, "towers"),
	tactic: "any",
	orders: humanSide === "def" ? defaultDefOrders() : defaultOrders(gear),
	orderLots: {},
	lastOrders: humanSide === "def" ? defaultDefOrders() : defaultOrders(gear),
	wave: 0,
	firstBreach: null,
	coastal: Boolean(TERRITORY_BY_ID[toId]?.coastal),
	worldX: TERRITORY_BY_ID[toId]?.labelX ?? RAID_CX,
	worldY: TERRITORY_BY_ID[toId]?.labelY ?? RAID_CY,
	neighbors: landNeighbors(toId).map((id) => {
		const n = TERRITORY_BY_ID[id];
		const here = TERRITORY_BY_ID[toId];
		return {
			id,
			name: n.name,
			terrain: landscapeOf(id).terrain,
			dx: n.labelX - here.labelX,
			dy: n.labelY - here.labelY
		};
	}),
	liveAtk: [],
	liveDef: [],
	liveN: {}
};
layoutVillage(raid, to);
rebuildWalk(raid);
if (humanSide !== "def") spawnGarrison(raid, to, state);
seedOrderLots(raid);
raid.selected = raidKindsLeft(raid)[0] ?? null;
const walls = defenseRank(to, "walls");
if (defenseRank(to, "outer-walls") > 0) raid.log.push("Outer walls stand as the first ring.");
else if (walls > 0) raid.log.push(`${walls >= 3 ? "High stone" : walls >= 2 ? "Stone walls" : "Wooden walls"} stand over the village.`);
if (keepOf(raid)) raid.log.push("The keep must fall to take the land.");
if (humanSide === "def") raid.log.push("Place the garrison inside the walls, then the assault begins.");
if (defenseRank(to, "moats") > 0) raid.log.push("Moats slow the host and cut their blows.");
if ((to.breach ?? 0) > 0) raid.log.push(`Catapults have already chewed the walls (${to.breach} hits).`);
if (defenseRank(to, "scorpion") > 0) raid.log.push("Scorpions watch the sky.");
if (gear.rams + gear.catapults + gear.ladders + gear.towers > 0) {
	const names = [
		"ram",
		"catapult",
		"ladder",
		"tower"
	].filter((k) => stockKind(gear, k) > 0).map((k) => SIEGE_LABEL[k].toLowerCase());
	raid.log.push(`Siege in the column: ${names.join(", ")}.`);
}
return raid;
}
function layoutVillage(raid, to) {
const sq = raid.squash;
const walls = raid.wallRank > 0 ? raid.wallRank : raid.fort >= 1 ? Math.min(2, raid.fort) : 0;
const outer = raid.camp ? 0 : raid.outerWallRank;
const keepRnk = raid.camp ? raid.fort >= 3 ? Math.min(2, raid.fort - 2) : 0 : raid.keepRank;
const towers = raid.camp ? 0 : raid.towerRank;
const moats = raid.camp || walls <= 0 && outer <= 0 ? 0 : raid.moatRank;
const scorp = raid.camp ? 0 : defenseRank(to, "scorpion");
const keepHp = keepHpFor(keepRnk, raid.camp);
addBuilding(raid, "keep", RAID_CX, RAID_CY, {
	r: raid.camp ? 32 : 42 + keepRnk * 4,
	hp: keepHp,
	range: 80 + keepRnk * 8,
	dmg: raid.camp ? 3 : 5 + keepRnk,
	cd: 1.35,
	hitsAir: true,
	hitsGround: true
});
const innerR = 124 + walls * 5;
const outerR = 184 + outer * 5;
const keepMoatR = 52;
const innerMoatR = innerR + 4;
const outerMoatR = outerR + 4;
const moatW = 6;
if (moats >= 3 && keepRnk > 0) raid.moats.push({
	r0: keepMoatR,
	r1: keepMoatR + moatW
});
if (moats >= 2 && walls > 0) raid.moats.push({
	r0: innerR + 2,
	r1: innerMoatR + moatW
});
if (moats >= 1 && (outer > 0 || walls > 0)) raid.moats.push({
	r0: (outer > 0 ? outerR : innerR) + 2,
	r1: (outer > 0 ? outerMoatR : innerMoatR) + moatW
});
const innerHp = wallHpFor(Math.max(1, walls));
const outerHp = wallHpFor(Math.max(1, outer));
const innerThick = walls >= 4 ? 16 : walls >= 2 ? 13 : 11;
const outerThick = outer >= 4 ? 15 : 11;
if (outer > 0) addRingWalls(raid, outerR, outerThick, outerHp, 20, [RAID_GATE_A], "outer", sq);
if (walls > 0) addRingWalls(raid, innerR, innerThick, innerHp, 16, [RAID_GATE_A], "inner", sq);
if (raid.moats.length) {
	const a = RAID_GATE_A;
	for (const m of raid.moats) {
		const mx = RAID_CX + Math.cos(a) * ((m.r0 + m.r1) / 2);
		const my = RAID_CY + Math.sin(a) * ((m.r0 + m.r1) / 2) * sq;
		raid.bridges.push({
			x: mx,
			y: my,
			w: 26,
			h: Math.max(18, m.r1 - m.r0 + 8),
			a
		});
	}
}
const breach = to.breach ?? 0;
if (breach > 0) for (const w of raid.walls) {
	const chip = Math.round(w.max * Math.min(.7, .18 * breach));
	w.hp = Math.max(1, w.hp - chip);
}
const tCounts = towerCounts(towers);
const innerTowerSpec = {
	r: 9,
	hp: 140 + walls * 18,
	range: 150 + walls * 8,
	dmg: 5 + Math.min(4, walls),
	cd: 0.95,
	hitsGround: true,
	hitsAir: false,
	ring: "inner"
};
const outerTowerSpec = {
	r: 9,
	hp: 130 + outer * 14,
	range: 140 + outer * 6,
	dmg: 4 + Math.min(3, outer),
	cd: 1.0,
	hitsGround: true,
	hitsAir: false,
	ring: "outer"
};
if (outer > 0) placeGateTowers(raid, outerR - 2, "outer", sq, outerTowerSpec);
if (walls > 0) placeGateTowers(raid, innerR - 2, "inner", sq, innerTowerSpec);
placeEvenOnRing(raid, tCounts.inner, innerR - 2, "archer", sq, innerTowerSpec);
placeEvenOnRing(raid, tCounts.outer, outerR - 2, "archer", sq, outerTowerSpec);
const sCounts = scorpionCounts(scorp);
const sRange = scorpionRangeFor(scorp);
mountOnPosts(raid, sCounts.inner + sCounts.outer, "scorpion", {
	r: 10,
	hp: 72,
	range: sRange,
	dmg: 14 + scorp * 2,
	cd: 1.2,
	hitsGround: false,
	hitsAir: true
});
}
function addRingWalls(raid, radius, thick, hp, segs, gateAngles, ring, squash) {
const gateIs = /* @__PURE__ */ new Set();
for (const g of gateAngles) {
	let bestI = 0;
	let best = 1e9;
	for (let i = 0; i < segs; i++) {
		const mid = (i / segs * Math.PI * 2 - Math.PI / 2 + ((i + 1) / segs * Math.PI * 2 - Math.PI / 2)) / 2;
		const d = Math.abs(Math.atan2(Math.sin(mid - g), Math.cos(mid - g)));
		if (d < best) {
			best = d;
			bestI = i;
		}
	}
	gateIs.add(bestI);
}
for (let i = 0; i < segs; i++) {
	const a0 = i / segs * Math.PI * 2 - Math.PI / 2;
	const a1 = (i + 1) / segs * Math.PI * 2 - Math.PI / 2;
	const x0 = RAID_CX + Math.cos(a0) * radius;
	const y0 = RAID_CY + Math.sin(a0) * radius * squash;
	const x1 = RAID_CX + Math.cos(a1) * radius;
	const y1 = RAID_CY + Math.sin(a1) * radius * squash;
	const len = Math.hypot(x1 - x0, y1 - y0) || 1;
	const ang = Math.atan2(y1 - y0, x1 - x0);
	const nx = Math.cos(ang);
	const ny = Math.sin(ang);
	const px = -ny;
	const py = nx;
	const cx = (x0 + x1) / 2;
	const cy = (y0 + y1) / 2;
	const wx = cx - len / 2 * nx - thick / 2 * px;
	const wy = cy - len / 2 * ny - thick / 2 * py;
	const gate = gateIs.has(i);
	raid.walls.push({
		id: uid(raid, "w"),
		x: wx,
		y: wy,
		w: len + 2,
		h: thick,
		hp: gate ? hp + 22 : hp,
		max: gate ? hp + 22 : hp,
		climb: false,
		gate,
		ring,
		a: ang,
		press: 0
	});
}
}
function evenRingAngles(n) {
const out = [];
for (let i = 0; i < n; i++) out.push(RAID_GATE_A + (i + .5) / n * Math.PI * 2);
return out;
}
function placeEvenOnRing(raid, n, radius, kind, squash, spec) {
if (n < 1) return;
for (const a of evenRingAngles(n)) addBuilding(raid, kind, RAID_CX + Math.cos(a) * radius, RAID_CY + Math.sin(a) * radius * squash, spec);
}
function placeGateTowers(raid, radius, ring, squash, spec) {
for (const sign of [-1, 1]) {
	const a = RAID_GATE_A + sign * RAID_GATE_TOWER_DA;
	addBuilding(raid, "archer", RAID_CX + Math.cos(a) * radius, RAID_CY + Math.sin(a) * radius * squash, {
		...spec,
		gatePost: true,
		ring
	});
}
}
function mountOnPosts(raid, n, kind, spec) {
if (n < 1) return;
const posts = raid.buildings.filter((b) => b.kind === "archer" && b.hp > 0);
const keep = keepOf(raid);
for (let i = 0; i < n; i++) {
	const host = posts[i] ?? keep;
	if (!host) continue;
	addBuilding(raid, kind, host.x, host.y, {
		...spec,
		hostId: host.id
	});
}
}
function spawnGarrison(raid, to, state) {
const keep = keepOf(raid);
const posts = raid.buildings.filter((b) => b.kind === "archer" && b.hp > 0);
const keepBonus = raid.keepRank >= 1 || (to.fort ?? to.castleRank ?? 0) >= 3;
const bowmen = Math.min(UNIT_CAP.bowman, to.bowmen ?? 0);
const outerGate = posts.filter((b) => b.gatePost && b.ring === "outer");
const innerGate = posts.filter((b) => b.gatePost && b.ring === "inner");
const firstGate = outerGate.length ? outerGate : innerGate;
const secondGate = outerGate.length ? innerGate : [];
const restPosts = posts.filter((b) => !b.gatePost);
const slots = [];
const fill = (list, per) => {
	for (let k = 0; k < per; k++) for (const p of list) slots.push({
		post: p,
		k
	});
};
fill(firstGate, 2);
fill(secondGate, 2);
fill(restPosts, 2);
for (let i = 0; i < bowmen; i++) {
	let x;
	let y;
	let postId = null;
	let wall = false;
	if (i < slots.length) {
		const tw = slots[i].post;
		const k = slots[i].k;
		const out = Math.atan2(tw.y - RAID_CY, tw.x - RAID_CX);
		x = tw.x + Math.cos(out + (k - 0.4) * 0.5) * 7;
		y = tw.y + Math.sin(out + (k - 0.4) * 0.5) * 5;
		postId = tw.id;
		wall = true;
	} else if (!posts.length && keep) {
		const a = i / Math.max(1, bowmen) * Math.PI * 2;
		x = keep.x + Math.cos(a) * (keep.r + 10);
		y = keep.y + Math.sin(a) * (keep.r + 8);
		postId = keep.id;
		wall = true;
	} else if (keep) {
		const extra = i - slots.length;
		const cols = 10;
		const a = RAID_GATE_A + ((extra % cols) - (cols - 1) / 2) * 0.16;
		const ring = 1 + Math.floor(extra / cols);
		x = keep.x + Math.cos(a) * (keep.r + 8 + ring * 8);
		y = keep.y + Math.sin(a) * (keep.r + 6 + ring * 6);
	} else {
		const muster = gateMuster(raid);
		x = muster.x;
		y = muster.y;
	}
	const u = makeUnit(raid, "def", "bowman", x, y);
	u.postId = postId;
	u.onWall = wall;
	if (wall) {
		u.speed = 0;
		u.range = STATS.bowman.range + WALL_BOW_RANGE;
		u.dmg = STATS.bowman.dmg + WALL_BOW_DMG;
		u.facing = postId && keep && postId === keep.id ? RAID_GATE_A : Math.atan2(y - RAID_CY, x - RAID_CX);
	} else {
		u.speed = STATS.bowman.speed;
		u.range = STATS.bowman.range;
		u.dmg = STATS.bowman.dmg;
		u.facing = RAID_GATE_A;
	}
	if (keepBonus) {
		u.range += 28;
		u.dmg += 2;
	}
	raid.units.push(u);
}
const beastName = (to.beasts ?? 0) > 0 ? beastOfTerritory(to).name : "Beasts";
clusterAtGates(raid, "levy", Math.min(UNIT_CAP.levy, to.levy));
placeAroundCity(raid, "knight", Math.min(UNIT_CAP.knight, to.knights), undefined, defOrderOf(raid, "knight") === "gate");
clusterAtGates(raid, "beast", Math.min(UNIT_CAP.beast, to.beasts ?? 0), beastName);
const drakes = Math.min(UNIT_CAP.dragon, to.dragons);
const dx = keep?.x ?? RAID_CX;
const dy = keep?.y ?? RAID_CY;
for (let i = 0; i < drakes; i++) {
	const a = ((i + 0.5) / drakes) * Math.PI * 2;
	raid.units.push(makeUnit(raid, "def", "dragon", dx + Math.cos(a) * 10, dy + Math.sin(a) * 8));
}
}
function orderedGates(raid) {
const gates = raid.walls.filter((w) => w.gate);
const outer = gates.filter((w) => w.ring === "outer");
const inner = gates.filter((w) => w.ring !== "outer");
return [...outer, ...inner];
}
function musterOfWall(w) {
const c = wallCenter(w);
const a = Math.atan2(RAID_CY - c.y, RAID_CX - c.x);
return {
	x: c.x + Math.cos(a) * 22,
	y: c.y + Math.sin(a) * 17,
	a,
	ring: w.ring
};
}
function gateMuster(raid) {
const g = orderedGates(raid)[0] ?? raid.walls.find((w) => w.gate) ?? null;
if (g) return musterOfWall(g);
return {
	x: RAID_CX,
	y: RAID_CY + (raid.camp ? 26 : 40),
	a: -Math.PI / 2,
	ring: null
};
}
function assignedMuster(raid, u) {
const gates = orderedGates(raid);
const match = u.gateRing ? gates.find((g) => g.ring === u.gateRing) : null;
const w = match ?? gates[0] ?? null;
if (w) return musterOfWall(w);
return gateMuster(raid);
}
function placeCluster(raid, kind, n, g, name, hold) {
if (n < 1) return;
const alongA = g.a + Math.PI / 2;
const packed = n > 8;
const cols = packed ? Math.max(1, Math.ceil(Math.sqrt(n))) : n;
const rows = packed ? Math.ceil(n / cols) : 1;
const gap = n > 16 ? 7 : 10;
for (let i = 0; i < n; i++) {
	const col = packed ? i % cols : i;
	const row = packed ? Math.floor(i / cols) : 0;
	const along = (col - (cols - 1) / 2) * gap;
	const inward = packed ? (row - (rows - 1) / 2) * gap * 0.85 : 0;
	const x = g.x + Math.cos(alongA) * along + Math.cos(g.a) * inward;
	const y = g.y + Math.sin(alongA) * along * 0.72 + Math.sin(g.a) * inward * 0.72;
	const u = makeUnit(raid, "def", kind, x, y, name);
	u.holdGate = hold;
	u.gateRing = g.ring ?? null;
	nudgeInside(raid, u);
	raid.units.push(u);
}
}
function nudgeInside(raid, u) {
if (u.air || u.onWall) return;
for (let k = 0; k < 10; k++) {
	if (walkableFor(raid, u.x, u.y, u)) return;
	const a = Math.atan2(RAID_CY - u.y, RAID_CX - u.x);
	u.x += Math.cos(a) * 6;
	u.y += Math.sin(a) * 5;
}
}
function placeAroundCity(raid, kind, n, name, hold = false) {
if (n < 1) return;
const keep = keepOf(raid);
const r = (keep?.r ?? 42) + 36;
for (let i = 0; i < n; i++) {
	const a = RAID_GATE_A + ((i + 0.5) / n) * Math.PI * 2;
	const x = RAID_CX + Math.cos(a) * r;
	const y = RAID_CY + Math.sin(a) * r * (raid.squash || 0.78);
	const u = makeUnit(raid, "def", kind, x, y, name);
	u.holdGate = hold;
	u.gateRing = null;
	nudgeInside(raid, u);
	raid.units.push(u);
}
}
function clusterAtGates(raid, kind, n, name) {
if (n < 1) return;
const gates = orderedGates(raid);
const musters = gates.length ? gates.map(musterOfWall) : [gateMuster(raid)];
const first = musters[0];
const second = musters[1] ?? null;
if (kind === "beast") {
	const n1 = Math.min(BEAST_GATE, n);
	placeCluster(raid, kind, n1, first, name, true);
	let left = n - n1;
	if (second && left > 0) {
		const n2 = Math.min(BEAST_GATE, left);
		placeCluster(raid, kind, n2, second, name, true);
		left -= n2;
	}
	if (left > 0) placeAroundCity(raid, kind, left, name);
	return;
}
const n1 = Math.min(GATE_WATCH, n);
placeCluster(raid, kind, n1, first, name, true);
const left = n - n1;
if (left > 0) placeCluster(raid, kind, left, second ?? first, name, true);
}
function placeAtKeep(raid, kind, n, name) {
	if (n < 1) return;
	const keep = keepOf(raid);
	const r = (keep?.r ?? 42) + 20;
	for (let i = 0; i < n; i++) {
		const a = RAID_GATE_A + Math.PI + ((i + 0.5) / Math.max(1, n)) * Math.PI * 1.5 - 0.75;
		const x = RAID_CX + Math.cos(a) * r;
		const y = RAID_CY + Math.sin(a) * r * (raid.squash || 0.78);
		const u = makeUnit(raid, "def", kind, x, y, name);
		u.holdGate = false;
		u.order = "keep";
		nudgeInside(raid, u);
		raid.units.push(u);
	}
}
function bowmanSlots(raid) {
	const keep = keepOf(raid);
	const posts = raid.buildings.filter((b) => b.kind === "archer" && b.hp > 0);
	const outerGate = posts.filter((b) => b.gatePost && b.ring === "outer");
	const innerGate = posts.filter((b) => b.gatePost && b.ring === "inner");
	const firstGate = outerGate.length ? outerGate : innerGate;
	const secondGate = outerGate.length ? innerGate : [];
	const restPosts = posts.filter((b) => !b.gatePost);
	const slots = [];
	const fill = (list, per) => {
		for (let k = 0; k < per; k++) for (const p of list) slots.push({ post: p, k });
	};
	fill(firstGate, 2);
	fill(secondGate, 2);
	fill(restPosts, 2);
	return { slots, keep, posts };
}
function stationBowmen(raid, n, order) {
	if (n < 1) return;
	const { slots, keep } = bowmanSlots(raid);
	const used = new Set(raid.units.filter((u) => u.side === "def" && u.kind === "bowman" && u.postId).map((u) => `${u.postId}:${Math.round(u.x)}:${Math.round(u.y)}`));
	const free = slots.filter((s) => !used.has(`${s.post.id}:${Math.round(s.post.x)}:${Math.round(s.post.y)}`));
	let pool = free;
	if (order === "keep") {
		const keepSlots = free.filter((s) => s.post.kind === "keep" || s.post.ring === "keep" || (keep && dist(s.post.x, s.post.y, keep.x, keep.y) < (keep.r ?? 42) + 36));
		pool = keepSlots.length ? keepSlots.concat(free.filter((s) => !keepSlots.includes(s))) : free;
	} else if (order === "wall") {
		const rest = free.filter((s) => !s.post.gatePost);
		pool = rest.length ? rest.concat(free.filter((s) => s.post.gatePost)) : free;
	}
	for (let i = 0; i < n; i++) {
		let x;
		let y;
		let postId = null;
		let wall = false;
		if (i < pool.length) {
			const tw = pool[i].post;
			const k = pool[i].k;
			const out = Math.atan2(tw.y - RAID_CY, tw.x - RAID_CX);
			x = tw.x + Math.cos(out + (k - 0.4) * 0.5) * 7;
			y = tw.y + Math.sin(out + (k - 0.4) * 0.5) * 5;
			postId = tw.id;
			wall = true;
		} else if (order === "keep" && keep) {
			const extra = i - pool.length;
			const a = extra / Math.max(1, n) * Math.PI * 2;
			x = keep.x + Math.cos(a) * (keep.r + 10);
			y = keep.y + Math.sin(a) * (keep.r + 8);
			postId = keep.id;
			wall = true;
		} else if (keep) {
			const extra = i - pool.length;
			const cols = 10;
			const a = RAID_GATE_A + ((extra % cols) - (cols - 1) / 2) * 0.16;
			const ring = 1 + Math.floor(extra / cols);
			x = keep.x + Math.cos(a) * (keep.r + 8 + ring * 8);
			y = keep.y + Math.sin(a) * (keep.r + 6 + ring * 6);
		} else {
			const muster = gateMuster(raid);
			x = muster.x;
			y = muster.y;
		}
		const u = makeUnit(raid, "def", "bowman", x, y);
		u.postId = postId;
		u.onWall = wall;
		u.order = order;
		u.holdGate = order === "gate";
		if (wall) {
			u.speed = 0;
			u.range = STATS.bowman.range + WALL_BOW_RANGE;
			u.dmg = STATS.bowman.dmg + WALL_BOW_DMG;
			u.facing = postId && keep && postId === keep.id ? RAID_GATE_A : Math.atan2(y - RAID_CY, x - RAID_CX);
		}
		raid.units.push(u);
	}
}
function spawnDefGroup(raid, kind, n, order, name) {
	if (n < 1) return;
	const prev = raid.orders[kind];
	raid.orders[kind] = order;
	if (kind === "bowman") stationBowmen(raid, n, order);
	else if (kind === "dragon") {
		const keep = keepOf(raid);
		const g = gateMuster(raid);
		for (let i = 0; i < n; i++) {
			let x;
			let y;
			if (order === "gate") {
				x = g.x + (i - (n - 1) / 2) * 10;
				y = g.y - 14;
			} else if (order === "wall") {
				const a = RAID_GATE_A + ((i + 0.5) / n) * Math.PI * 2;
				const r = (keep?.r ?? 42) + 36;
				x = RAID_CX + Math.cos(a) * r;
				y = RAID_CY + Math.sin(a) * r * (raid.squash || 0.78);
			} else {
				const a = ((i + 0.5) / n) * Math.PI * 2;
				x = (keep?.x ?? RAID_CX) + Math.cos(a) * 10;
				y = (keep?.y ?? RAID_CY) + Math.sin(a) * 8;
			}
			const u = makeUnit(raid, "def", "dragon", x, y);
			u.order = order;
			raid.units.push(u);
		}
	} else if (order === "keep") placeAtKeep(raid, kind, n, name);
	else if (order === "wall") placeAroundCity(raid, kind, n, name, false);
	else clusterAtGates(raid, kind, n, name);
	raid.orders[kind] = prev;
	const born = raid.units.filter((u) => u.side === "def" && u.kind === kind);
	const tail = born.slice(Math.max(0, born.length - n));
	for (const u of tail) {
		u.order = order;
		u.holdGate = order === "gate";
	}
}
export function autoDeployDef(raid: RaidState) {
	if (raid.humanSide !== "def" || raid.phase === "over") return;
	const name = raid.defBeastName ?? "Beasts";
	for (const kind of ["bowman", "levy", "knight", "beast", "dragon"]) {
		const allowed = ordersFor("def")[kind] ?? [];
		for (const row of allowed) {
			const need = Math.max(0, (raid.orderLots?.[kind]?.[row.id] || 0) - (placedByOrder(raid, kind)[row.id] || 0));
			const n = Math.min(need, stockKind(raid.stock, kind), UNIT_CAP[kind] ?? 99);
			if (n < 1) continue;
			spawnDefGroup(raid, kind, n, row.id, kind === "beast" ? name : undefined);
			takeStock(raid.stock, kind, n);
		}
		const left = Math.min(stockKind(raid.stock, kind), UNIT_CAP[kind] ?? 99);
		if (left > 0) {
			const order = raid.orders[kind] ?? defaultDefOrders()[kind];
			spawnDefGroup(raid, kind, left, order, kind === "beast" ? name : undefined);
			takeStock(raid.stock, kind, left);
		}
	}
	const remain = raidKindsLeft(raid);
	if (raid.selected && stockKind(raid.stock, raid.selected) < 1) raid.selected = remain[0] ?? null;
}
function wallsBreached(raid) {
if (raid.camp || raid.walls.length < 1) return true;
return raid.walls.some((w) => w.hp <= 0 || w.climb);
}
function ringOpen(raid) {
if (raid.camp || raid.walls.length < 1) return true;
return raid.walls.every((w) => w.hp <= 0 || w.climb);
}
function wallHoleElsewhere(raid) {
return raid.walls.some((w) => !w.gate && (w.hp <= 0 || w.climb));
}
function insideOfWall(w) {
const c = wallCenter(w);
const a = Math.atan2(RAID_CY - c.y, RAID_CX - c.x);
return {
	id: w.id,
	x: c.x + Math.cos(a) * 16,
	y: c.y + Math.sin(a) * 12,
	gate: Boolean(w.gate)
};
}
function noteBreach(raid, w) {
if (raid.firstBreach) return;
if (!(w.hp <= 0 || w.climb)) return;
raid.firstBreach = insideOfWall(w);
}
function firstBreachPoint(raid) {
if (raid.firstBreach) {
	const w = raid.walls.find((x) => x.id === raid.firstBreach.id);
	if (w && (w.hp <= 0 || w.climb)) return insideOfWall(w);
	return raid.firstBreach;
}
const hole = raid.walls.find((w) => w.hp <= 0 || w.climb);
return hole ? insideOfWall(hole) : null;
}
function largestAtkGroup(raid) {
const foes = livingAtk(raid).filter((f) => f.hp > 0 && !f.air);
if (!foes.length) return null;
const sites = [];
for (const w of raid.walls) {
	if (w.gate || w.hp <= 0 || w.climb) sites.push(wallCenter(w));
}
if (!sites.length) {
	const g = gateMuster(raid);
	sites.push({ x: g.x, y: g.y });
}
let best = null;
let bestN = 0;
for (const s of sites) {
	const cluster = foes.filter((f) => dist(f.x, f.y, s.x, s.y) < 82);
	if (cluster.length > bestN) {
		bestN = cluster.length;
		best = cluster;
	}
}
if (!best || !best.length) return foes[0];
return [...best].sort((a, b) => dist(a.x, a.y, RAID_CX, RAID_CY) - dist(b.x, b.y, RAID_CX, RAID_CY))[0];
}
function gateDestroyed(raid) {
return raid.walls.some((w) => w.gate && w.hp <= 0);
}
function breachInside(raid, x, y) {
let best = null;
let bestD = 1e9;
for (const w of raid.walls) {
	if (w.gate) continue;
	if (!(w.hp <= 0 || w.climb)) continue;
	const c = wallCenter(w);
	const a = Math.atan2(RAID_CY - c.y, RAID_CX - c.x);
	const px = c.x + Math.cos(a) * 16;
	const py = c.y + Math.sin(a) * 12;
	const d = dist(x, y, px, py);
	if (d < bestD) {
		bestD = d;
		best = {
			x: px,
			y: py
		};
	}
}
return best;
}
function ringDist(raid, x, y) {
const dx = x - RAID_CX;
const dy = (y - RAID_CY) / (raid.squash || .78);
return Math.hypot(dx, dy);
}
function onBridge(raid, x, y) {
for (const b of raid.bridges) if (Math.hypot(x - b.x, y - b.y) < 16) return true;
return false;
}
function inMoat(raid, x, y) {
if (!raid.moats?.length) return false;
if (onBridge(raid, x, y)) return false;
const r = ringDist(raid, x, y);
for (const m of raid.moats) if (r >= m.r0 && r <= m.r1) return true;
return false;
}
export function cityRadius(raid: RaidState): number {
if (raid.camp || raid.wallRank <= 0 && raid.outerWallRank <= 0) return 86;
if (raid.moats?.length) return Math.max(...raid.moats.map((m) => m.r1)) + 16;
if (raid.outerWallRank > 0) return 184 + raid.outerWallRank * 5 + 16;
if (raid.wallRank > 0) return 124 + raid.wallRank * 5 + 16;
return 86;
}
export function cityArtId(raid: RaidState): CityArtId {
  return cityArtForRanks(raid.wallRank, raid.outerWallRank, raid.moatRank, raid.camp);
}
export function raidBattleStatus(raid: RaidState): RaidBattleStatus {
const gates = raid.walls.filter((w) => w.gate);
const walls = raid.walls.filter((w) => !w.gate);
const towers = raid.buildings.filter((b) => b.kind === "archer");
const camp = Boolean(raid.camp || raid.walls.length < 1);
const gateDown = gates.length > 0 && gates.every((g) => g.hp <= 0);
const anyGateDown = gates.some((g) => g.hp <= 0);
const outerDown = gates.some((g) => g.ring === "outer" && g.hp <= 0);
const innerDown = gates.some((g) => g.ring !== "outer" && g.hp <= 0);
const wallBreached = walls.some((w) => w.hp <= 0 || w.climb);
const wallsDown = walls.length > 0 && walls.every((w) => w.hp <= 0);
const towersTotal = towers.length;
const towersDown = towers.filter((t) => t.hp <= 0).length;
let gateLabel = camp ? "Open ground" : "Gate holds";
if (!camp && gateDown) gateLabel = gates.length > 1 ? "Gates destroyed" : "Gate destroyed";
else if (!camp && outerDown && !innerDown) gateLabel = "Outer gate destroyed";
else if (!camp && anyGateDown) gateLabel = "A gate is destroyed";
let wallLabel = camp ? "" : "Walls hold";
if (!camp && wallsDown) wallLabel = "Walls down";
else if (!camp && wallBreached) wallLabel = "Walls breached";
let towerLabel = "";
if (towersTotal > 0) {
	if (towersDown >= towersTotal) towerLabel = "Towers destroyed";
	else if (towersDown === 1) towerLabel = "A tower is destroyed";
	else if (towersDown > 1) towerLabel = `${towersDown} towers destroyed`;
	else towerLabel = "Towers stand";
}
return {
	camp,
	gateLabel,
	wallLabel,
	towerLabel,
	gateDown,
	wallBreached,
	towersDown,
	towersTotal
};
}
const ARMY_HP_KINDS = ["levy", "bowman", "knight", "beast", "dragon", "ram", "catapult", "ladder", "tower"];
function unitSpecHp(raid, side, kind) {
	if (kind === "beast" && raid.beastStats) return Math.round(raid.beastStats.health * 4.8);
	if (kind === "dragon") {
		const p = side === "atk" ? raid.atkDragon : raid.defDragon;
		return Math.round(p * 16);
	}
	return STATS[kind]?.hp ?? 0;
}
function bagHp(raid, bag, side) {
	if (!bag) return 0;
	let n = 0;
	for (const kind of ARMY_HP_KINDS) n += (stockKind(bag, kind) | 0) * unitSpecHp(raid, side, kind);
	return n;
}
export function raidArmyHp(raid: RaidState): RaidArmyHp {
	let atkCur = 0;
	let atkMax = 0;
	let defCur = 0;
	let defMax = 0;
	for (const u of raid.units) {
		const cur = Math.max(0, u.hp);
		const max = Math.max(0, u.max);
		const cargoMax = bagHp(raid, u.cargo, u.side);
		const cargoCur = u.hp > 0 ? cargoMax : 0;
		if (u.side === "atk") {
			atkCur += cur + cargoCur;
			atkMax += max + cargoMax;
		} else {
			defCur += cur + cargoCur;
			defMax += max + cargoMax;
		}
	}
	const atkLeft = bagHp(raid, attackerBag(raid), "atk");
	atkCur += atkLeft;
	atkMax += atkLeft;
	if (raid.humanSide === "def") {
		const defLeft = bagHp(raid, raid.stock, "def");
		defCur += defLeft;
		defMax += defLeft;
	}
	return {
		atk: { cur: atkCur, max: atkMax },
		def: { cur: defCur, max: defMax }
	};
}
function villageInner(x, y, raid) {
if (ringDist(raid, x, y) < cityRadius(raid)) return true;
const box = wallBox(raid);
if (box && inRect(x, y, box, 12)) return true;
return false;
}
export function canDeployAt(raid: RaidState, x: number, y: number): boolean {
if (raid.phase === "over") return false;
if (x < 18 || y < 18 || x > 702 || y > 462) return false;
if (raid.humanSide === "def") return canDeployDefAt(raid, x, y, raid.selected);
return canDeployAtkAt(raid, x, y);
}
function canDeployAtkAt(raid, x, y) {
if (x < 18 || y < 18 || x > 702 || y > 462) return false;
if (villageInner(x, y, raid)) return false;
for (const b of raid.buildings) if (b.hp > 0 && dist(x, y, b.x, b.y) < b.r + 10) return false;
return true;
}
function canDeployDefAt(raid, x, y, kind) {
if (!villageInner(x, y, raid)) {
	if (kind === "dragon") {
		const r = cityRadius(raid) + 28;
		return dist(x, y, RAID_CX, RAID_CY) < r;
	}
	return false;
}
for (const b of raid.buildings) {
	if (b.hp <= 0) continue;
	if (kind === "bowman" && (b.kind === "archer" || b.kind === "keep") && dist(x, y, b.x, b.y) < b.r + 22) return true;
	if (b.kind === "keep" && dist(x, y, b.x, b.y) < b.r + 8) return false;
	if (b.kind !== "archer" && b.kind !== "keep" && dist(x, y, b.x, b.y) < b.r + 8) return false;
}
return true;
}
function nearestDefPost(raid, x, y) {
let best = null;
let bestD = 24;
for (const b of raid.buildings) {
	if (b.hp <= 0) continue;
	if (b.kind !== "archer" && b.kind !== "keep") continue;
	const d = dist(x, y, b.x, b.y);
	if (d < bestD) {
		bestD = d;
		best = b;
	}
}
return best;
}
export function deployTroop(raid: RaidState, kind: RaidKind, x: number, y: number, side?: BattleSide): boolean {
if (raid.phase === "over") return false;
const who = side ?? raid.humanSide;
if (who === "def") return deployDefender(raid, kind, x, y);
const bag = attackerBag(raid);
if (stockKind(bag, kind) < 1) return false;
if (isBoardable(kind)) {
	const tower = towerNear(raid, x, y);
	if (tower && boardTower(raid, tower, kind)) return true;
}
if (!canDeployAtkAt(raid, x, y)) return false;
const jitter = () => (nextRng(raid) - .5) * 8;
let px = clamp(x + jitter(), 16, 704);
let py = clamp(y + jitter(), 16, 464);
if (!canDeployAtkAt(raid, px, py)) {
	px = clamp(x, 16, 704);
	py = clamp(y, 16, 464);
	if (!canDeployAtkAt(raid, px, py)) return false;
}
const order = raid.humanSide === "atk" ? takeLotOrder(raid, kind) : atkOrderOf(raid, kind);
const u = makeUnit(raid, "atk", kind, px, py);
if (order === "hold") {
	u.held = true;
	u.order = combatOrder(kind, raid);
} else {
	u.order = order;
	u.held = false;
}
if (kind === "tower") u.cargo = loadTowerCargo(raid);
raid.units.push(u);
takeStock(bag, kind);
addStock(raid.deployed, kind);
if (raid.humanSide === "atk") {
	const left = raidKindsLeft(raid);
	if (raid.selected && stockKind(raid.stock, raid.selected) < 1) raid.selected = left[0] ?? null;
}
return true;
}
function deployDefender(raid, kind, x, y) {
if (stockKind(raid.stock, kind) < 1) return false;
if (kind === "ram" || kind === "catapult" || kind === "ladder" || kind === "tower") return false;
if (!canDeployDefAt(raid, x, y, kind)) return false;
const order = takeLotOrder(raid, kind);
const jitter = () => (nextRng(raid) - .5) * 6;
let px = clamp(x + jitter(), 16, 704);
let py = clamp(y + jitter(), 16, 464);
if (!canDeployDefAt(raid, px, py, kind)) {
	px = clamp(x, 16, 704);
	py = clamp(y, 16, 464);
}
const u = makeUnit(raid, "def", kind, px, py, kind === "beast" ? raid.defBeastName : undefined);
u.order = order;
u.holdGate = order === "gate";
if (kind === "bowman") {
	const post = nearestDefPost(raid, x, y);
	if (post) {
		const out = Math.atan2(post.y - RAID_CY, post.x - RAID_CX);
		u.x = post.x + Math.cos(out) * 7;
		u.y = post.y + Math.sin(out) * 5;
		u.postId = post.id;
		u.onWall = true;
		u.speed = 0;
		u.range = STATS.bowman.range + WALL_BOW_RANGE;
		u.dmg = STATS.bowman.dmg + WALL_BOW_DMG;
		u.facing = Math.atan2(u.y - RAID_CY, u.x - RAID_CX);
	}
}
nudgeInside(raid, u);
raid.units.push(u);
takeStock(raid.stock, kind);
const left = raidKindsLeft(raid);
if (raid.selected && stockKind(raid.stock, raid.selected) < 1) raid.selected = left[0] ?? null;
return true;
}
export function beginAssault(raid: RaidState): boolean {
if (raid.phase !== "deploy") return false;
if (raid.humanSide === "def") {
	autoDeployDef(raid);
	if (!raid.units.some((u) => u.side === "atk" && u.hp > 0)) autoDeployAll(raid);
}
if (!raid.units.some((u) => u.side === "atk" && u.hp > 0)) return false;
if (!raid.units.some((u) => u.side === "atk" && u.hp > 0 && !u.held)) {
	for (const u of raid.units) if (u.side === "atk" && u.hp > 0) releaseHold(u, raid);
}
raid.phase = "fight";
raid.wave = Math.max(1, raid.wave || 0);
raid.log.push("The host charges.");
return true;
}
export function heldCount(raid: RaidState): number {
return raid.units.filter((u) => u.side === "atk" && u.held && u.hp > 0).length;
}
export function chargeWave(raid: RaidState): boolean {
if (raid.phase === "deploy") return beginAssault(raid);
if (raid.phase !== "fight") return false;
let n = 0;
for (const u of raid.units) {
	if (u.side !== "atk" || !u.held || u.hp <= 0) continue;
	releaseHold(u, raid);
	n += 1;
}
if (!n) return false;
raid.wave = (raid.wave || 1) + 1;
raid.log.push("The held host charges.");
return true;
}
function loadTowerCargo(raid) {
const cargo = { ...EMPTY_HOST };
const bag = attackerBag(raid);
const want = (kind) => atkOrderOf(raid, kind) === "tower";
const take = (kind, cap) => {
	if (!want(kind)) return 0;
	const n = Math.min(cap, stockKind(bag, kind));
	if (n < 1) return 0;
	takeStock(bag, kind, n);
	addStock(raid.deployed, kind, n);
	return n;
};
cargo.beasts = take("beast", TOWER_CARGO.beasts);
cargo.knights = take("knight", TOWER_CARGO.knights);
cargo.levy = take("levy", TOWER_CARGO.levy);
cargo.bowmen = take("bowman", TOWER_CARGO.bowmen);
return cargo;
}
function isBoardable(kind) {
return kind === "levy" || kind === "bowman" || kind === "knight" || kind === "beast";
}
export function cargoTotal(cargo: HostForce | null | undefined): number {
if (!cargo) return 0;
return (cargo.levy | 0) + (cargo.bowmen ?? 0) + (cargo.knights | 0) + (cargo.beasts | 0);
}
function cargoHeld(cargo, kind) {
if (!cargo) return 0;
if (kind === "levy") return cargo.levy | 0;
if (kind === "bowman") return cargo.bowmen ?? 0;
if (kind === "knight") return cargo.knights | 0;
if (kind === "beast") return cargo.beasts | 0;
return 0;
}
function cargoCap(kind) {
if (kind === "levy") return TOWER_CARGO.levy;
if (kind === "bowman") return TOWER_CARGO.bowmen;
if (kind === "knight") return TOWER_CARGO.knights;
if (kind === "beast") return TOWER_CARGO.beasts;
return 0;
}
function addCargo(cargo, kind, n) {
if (kind === "levy") cargo.levy = (cargo.levy | 0) + n;
else if (kind === "bowman") cargo.bowmen = (cargo.bowmen ?? 0) + n;
else if (kind === "knight") cargo.knights = (cargo.knights | 0) + n;
else if (kind === "beast") cargo.beasts = (cargo.beasts | 0) + n;
}
export function towerNear(raid: RaidState, x: number, y: number): RaidUnit | null {
let best = null;
let bestD = 56;
for (const u of raid.units) {
	if (u.kind !== "tower" || u.side !== "atk" || u.hp <= 0 || u.dumped) continue;
	const d = Math.min(dist(x, y, u.x, u.y), dist(x, y, u.x, u.y - 16));
	if (d < bestD) {
		bestD = d;
		best = u;
	}
}
return best;
}
export function boardTower(raid: RaidState, tower: RaidUnit, kind: RaidKind): boolean {
if (!tower || tower.kind !== "tower" || tower.dumped || tower.hp <= 0) return false;
if (!isBoardable(kind)) return false;
if (stockKind(attackerBag(raid), kind) < 1) return false;
if (!tower.cargo) tower.cargo = { ...EMPTY_HOST };
if (cargoHeld(tower.cargo, kind) >= cargoCap(kind)) return false;
takeStock(attackerBag(raid), kind);
addStock(raid.deployed, kind);
addCargo(tower.cargo, kind, 1);
const left = raidKindsLeft(raid);
if (raid.selected && stockKind(raid.stock, raid.selected) < 1) raid.selected = left[0] ?? null;
return true;
}
function towerWithRoom(raid, kind) {
for (const u of raid.units) {
	if (u.kind !== "tower" || u.side !== "atk" || u.hp <= 0 || u.dumped) continue;
	if (!u.cargo) u.cargo = { ...EMPTY_HOST };
	if (cargoHeld(u.cargo, kind) < cargoCap(kind)) return u;
}
return null;
}
export function pickRaidKind(raid: RaidState, kind: RaidKind) {
if (stockKind(raid.stock, kind) > 0) raid.selected = kind;
}
export function setRaidOrder(raid: RaidState, kind: RaidKind, order: RaidOrder) {
if (!raid.orders) raid.orders = raid.humanSide === "def" ? defaultDefOrders() : defaultOrders();
if (!raid.lastOrders) raid.lastOrders = { ...raid.orders };
const allowed = ordersFor(raid.humanSide)[kind] ?? [];
if (!allowed.some((row) => row.id === order)) return;
raid.orders[kind] = order;
rememberOrder(raid, kind, order);
if (raid.phase === "deploy") {
	pickRaidKind(raid, kind);
	const row = allowed.find((o) => o.id === order);
	if (row) raid.log.push(`${kind === "beast" ? (raid.humanSide === "def" ? raid.defBeastName : raid.beastName) : kind === "levy" ? "Warriors" : kind === "bowman" ? "Archers" : kind === "knight" ? "Knights" : SIEGE_LABEL[kind] ?? UNIT_LABEL_PLURAL[kind] ?? kind} will ${row.label.toLowerCase()}.`);
	return;
}
for (const u of raid.units) {
	if (u.side !== raid.humanSide || u.kind !== kind || u.planted) continue;
	if (order === "hold") {
		u.held = true;
		if (u.order === "hold") u.order = combatOrder(kind, raid);
	} else {
		u.order = order;
		u.held = false;
	}
	if (u.side === "def") u.holdGate = order === "gate";
}
const row = allowed.find((o) => o.id === order);
if (row) raid.log.push(`${kind === "beast" ? raid.beastName : kind === "levy" ? "Warriors" : kind === "bowman" ? "Archers" : kind === "knight" ? "Knights" : SIEGE_LABEL[kind] ?? UNIT_LABEL_PLURAL[kind] ?? kind} ordered: ${row.label.toLowerCase()}.`);
}
function placeOnRing(raid, angle, distR) {
const minR = cityRadius(raid) + 18;
const start = Math.max(distR, minR);
for (let extra = 0; extra <= 90; extra += 10) {
	const reach = start + extra;
	for (let i = 0; i < 12; i++) {
		const a = angle + i * .12 * (i % 2 ? -1 : 1);
		const x = clamp(RAID_CX + Math.cos(a) * reach, 24, 696);
		const y = clamp(RAID_CY + Math.sin(a) * reach * (raid.squash || .78), 24, 456);
		if (canDeployAtkAt(raid, x, y)) return { x, y };
	}
}
for (let y = 448; y >= 24; y -= 14) {
	for (let x = 36; x <= 684; x += 14) {
		if (canDeployAtkAt(raid, x, y)) return { x, y };
	}
}
return null;
}
export function autoDeployAll(raid: RaidState) {
const bag = attackerBag(raid);
const gateA = RAID_GATE_A;
let n = 0;
const cap = UNIT_CAP.levy + UNIT_CAP.bowman + UNIT_CAP.knight + UNIT_CAP.beast + UNIT_CAP.dragon + SIEGE_CAP * 4;
const minReach = cityRadius(raid) + 20;
for (const kind of [
	"ram",
	"tower",
	"ladder",
	"catapult",
	"beast",
	"knight",
	"levy",
	"bowman",
	"dragon"
]) {
let k = 0;
let fails = 0;
while (stockKind(bag, kind) > 0) {
	if (isBoardable(kind) && atkOrderOf(raid, kind) === "tower") {
		const tower = towerWithRoom(raid, kind);
		if (tower && boardTower(raid, tower, kind)) {
			n += 1;
			if (n > cap) return;
			continue;
		}
	}
	let angle = gateA;
	let reach = Math.max(176, minReach);
	if (kind === "ram") {
		angle = gateA + (k % 3 - 1) * .05;
		reach = Math.max(166, minReach);
	} else if (kind === "levy" || kind === "knight" || kind === "beast") {
		const slot = k % 14;
		const ring = Math.floor(k / 14);
		const lane = kind === "beast" ? 0.2 : kind === "knight" ? -0.16 : 0;
		angle = gateA + (slot - 6.5) * 0.055 + lane;
		reach = Math.max(168, minReach) + ring * 13;
	} else if (kind === "ladder") {
		angle = gateA - .34;
		reach = Math.max(168, minReach);
	} else if (kind === "tower") {
		angle = gateA + .34;
		reach = Math.max(168, minReach);
	} else if (kind === "catapult") {
		angle = gateA + (k % 5 - 2) * .16;
		reach = Math.max(208, minReach + 24);
	} else if (kind === "bowman") {
		const slot = k % 14;
		const ring = Math.floor(k / 14);
		angle = gateA + (slot - 6.5) * 0.08;
		reach = Math.max(196, minReach + 16) + ring * 12;
	} else if (kind === "dragon") {
		angle = gateA + (k % 5 - 2) * .14;
		reach = Math.max(198, minReach + 24);
	}
	const p = placeOnRing(raid, angle, reach);
	if (!p || !deployTroop(raid, kind, p.x, p.y, "atk")) {
		fails += 1;
		k += 1;
		if (fails > 14) break;
		continue;
	}
	fails = 0;
	k += 1;
	n += 1;
	if (n > cap) return;
}
}
}
function livingAtk(raid) {
return raid.liveAtk ?? raid.units.filter((u) => u.side === "atk" && u.hp > 0 && !u.planted);
}
function livingDefBeasts(raid) {
return raid.units.filter((u) => u.side === "def" && u.kind === "beast" && u.hp > 0 && !u.planted);
}
function liveBuildings(raid) {
return raid.buildings.filter((b) => b.hp > 0);
}
function buildingHp(raid) {
let cur = 0;
let max = 0;
for (const b of raid.buildings) {
	cur += Math.max(0, b.hp);
	max += b.max;
}
return {
	cur,
	max
};
}
function updateStars(raid) {
const { cur, max } = buildingHp(raid);
raid.destruction = max > 0 ? Math.round(100 * (max - cur) / max) : 100;
const keep = keepOf(raid);
raid.keepDestroyed = !keep || keep.hp <= 0;
let stars = 0;
if (raid.destruction >= 50 || raid.keepDestroyed) stars = 1;
if (raid.destruction >= 50 && raid.keepDestroyed) stars = 2;
if (raid.destruction >= 100) stars = 3;
raid.stars = stars;
}
export function hurtBuilding(raid: RaidState, b: RaidBuilding, dmg: number) {
if (b.hp <= 0) return;
b.hp = Math.max(0, b.hp - dmg);
b.flash = .12;
spark(raid, b.x, b.y, b.kind === "keep" ? 6 : 3);
raid.trauma = Math.min(1, raid.trauma + (b.kind === "keep" ? .22 : .08));
if (b.hp <= 0) {
	raid.walkDirty = true;
	if (b.kind === "keep") pushAlert(raid, "keep", "The keep falls.");
	collapsePost(raid, b);
}
}
function collapsePost(raid, b) {
if (b.kind !== "archer" && b.kind !== "keep") return;
let slain = 0;
for (const u of raid.units) {
	if (u.postId !== b.id || u.hp <= 0) continue;
	u.hp = 0;
	slain += 1;
	spark(raid, u.x, u.y, 2);
}
for (const o of raid.buildings) {
	if (o === b || o.hostId !== b.id || o.hp <= 0) continue;
	o.hp = 0;
	o.flash = .12;
	spark(raid, o.x, o.y, 3);
}
if (b.kind === "archer") pushAlert(raid, "tower", slain > 0 ? "A tower is destroyed. Its watch dies with it." : "A tower is destroyed.");
}
function wallCenter(w) {
return {
	x: w.x + w.w / 2,
	y: w.y + w.h / 2
};
}
export function hurtWall(raid: RaidState, w: RaidWall, dmg: number) {
if (w.hp <= 0) return;
const was = w.hp;
w.hp = Math.max(0, w.hp - dmg);
spark(raid, w.x + w.w / 2, w.y + w.h / 2, 4);
raid.trauma = Math.min(1, raid.trauma + .1);
if (w.hp <= 0 && was > 0) {
	raid.walkDirty = true;
	noteBreach(raid, w);
	if (w.gate) pushAlert(raid, "gate", w.ring === "outer" ? "The outer gate is destroyed." : "The gate is destroyed.");
	else pushAlert(raid, "wall", "The wall is breached.");
}
}
function hurtUnit(raid, u, dmg, vsDragon = false) {
if (u.hp <= 0) return;
if (u.kind === "dragon" && !vsDragon) return;
const hit = u.kind === "bowman" ? Math.max(1, Math.round(dmg * BOWMAN_HIT)) : dmg;
u.hp = Math.max(0, u.hp - hit);
u.flash = .1;
if (u.hp <= 0) spark(raid, u.x, u.y, 3);
}
function nearestWall(raid, x, y, needSolid = false, preferGate = false) {
let best = null;
let bestD = 1e9;
const outerLive = raid.walls.some((w) => w.hp > 0 && w.ring === "outer" && !w.climb);
const wantGate = preferGate || raid.tactic === "gate";
for (const w of raid.walls) {
	if (w.hp <= 0) continue;
	if (needSolid && w.climb) continue;
	if (outerLive && w.ring !== "outer" && raid.tactic !== "keep") continue;
	const c = wallCenter(w);
	let d = dist(x, y, c.x, c.y);
	if (wantGate && w.gate) d -= 80;
	if (raid.tactic === "walls" && !w.gate) d -= 24;
	if (w.ring === "outer") d -= 12;
	if (d < bestD) {
		bestD = d;
		best = w;
	}
}
return best;
}
function nearestGate(raid, x, y) {
let best = null;
let bestD = 1e9;
for (const w of raid.walls) {
	if (w.hp <= 0 || !w.gate) continue;
	const c = wallCenter(w);
	const d = dist(x, y, c.x, c.y);
	if (d < bestD) {
		bestD = d;
		best = w;
	}
}
return best;
}
function nearestWeakWall(raid, x, y) {
let best = null;
let bestS = 1e9;
for (const w of raid.walls) {
	if (w.hp <= 0 || w.climb) continue;
	const c = wallCenter(w);
	const frac = w.hp / w.max;
	const s = dist(x, y, c.x, c.y) + frac * 80;
	if (s < bestS) {
		bestS = s;
		best = w;
	}
}
return best;
}
function wallsHoldKeep(raid) {
return raid.walls.some((w) => w.hp > 0 && !w.climb);
}
function pickBuilding(raid, u) {
const hold = wallsHoldKeep(raid) && !u.air && raid.tactic !== "keep" && !villageInner(u.x, u.y, raid);
const live = liveBuildings(raid).filter((b) => !(hold && b.kind === "keep"));
if (!live.length) return null;
const tactic = raid.tactic ?? "any";
const score = (b) => {
	const d = dist(u.x, u.y, b.x, b.y);
	if (tactic === "scorpions" || u.pref === "air") return (b.kind === "scorpion" || b.kind === "air" ? 0 : b.kind === "keep" ? 40 : 90) + d;
	if (tactic === "keep" || u.pref === "keep") return (b.kind === "keep" ? 0 : b.kind === "scorpion" ? 50 : 80) + d;
	if (u.pref === "def") return (b.kind === "cannon" || b.kind === "archer" || b.kind === "air" || b.kind === "scorpion" ? 0 : b.kind === "keep" ? 40 : 70) + d;
	if (u.pref === "wall") return (b.kind === "keep" ? 20 : 60) + d;
	return d;
};
return [...live].sort((a, b) => score(a) - score(b))[0] ?? null;
}
function inRangeB(u, b, raid) {
const reach = raid && inMoat(raid, u.x, u.y) && !u.air ? u.range * .55 : u.range;
return dist(u.x, u.y, b.x, b.y) <= reach + b.r;
}
function inRangeW(u, w, raid) {
const c = wallCenter(w);
const reach = raid && inMoat(raid, u.x, u.y) && !u.air ? u.range * .55 : u.range;
return dist(u.x, u.y, c.x, c.y) <= reach + Math.max(w.w, w.h) * .35;
}
function fireShot(raid, x, y, tx, ty, dmg, splash, air, ground, side, vsDragon = false) {
const d = dist(x, y, tx, ty) || 1;
const sp = 160;
raid.shots.push({
	x,
	y,
	vx: (tx - x) / d * sp,
	vy: (ty - y) / d * sp,
	dmg,
	splash,
	ttl: d / sp + .05,
	air,
	ground,
	side,
	vsDragon
});
}
function strikeTarget(raid, u) {
const s = STATS[u.kind];
const wetMul = !u.air && inMoat(raid, u.x, u.y) ? .55 : 1;
u.cd = s.cd;
if (u.kind === "ladder") {
	const w = nearestWall(raid, u.x, u.y, true);
	if (w && inRangeW(u, w)) {
		w.climb = true;
		u.planted = true;
		raid.walkDirty = true;
		noteBreach(raid, w);
		raid.log.push("Ladders bite the wall — the host can scale without breaking it.");
		raid.trauma = Math.min(1, raid.trauma + .12);
	}
	return;
}
if (u.kind === "tower" && !u.dumped) {
	const w = nearestWall(raid, u.x, u.y);
	if (w && inRangeW(u, w)) {
		u.dumped = true;
		const keep = keepOf(raid);
		const inward = keep ? Math.atan2(keep.y - u.y, keep.x - u.x) : 0;
		const cargo = u.cargo ?? {
			...EMPTY_HOST,
			levy: 4
		};
		const dump = (kind, n, ride = false) => {
			const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n))));
			for (let i = 0; i < n; i++) {
				const col = i % cols;
				const row = Math.floor(i / cols);
				const ox = (col - (cols - 1) / 2) * 9;
				const oy = 8 + row * 8;
				const spawned = makeUnit(raid, "atk", kind, ride ? u.x + ox * 0.4 : clamp(u.x + Math.cos(inward) * (22 + oy) + ox, 16, 704), ride ? u.y + oy * 0.2 : clamp(u.y + Math.sin(inward) * (16 + oy * 0.8) + ox * 0.3, 16, 464));
				spawned.held = false;
				spawned.order = kind === "bowman" ? "posts" : kind === "knight" ? "gate" : kind === "beast" ? "wall" : "gate";
				if (ride && kind === "bowman") {
					spawned.onWall = true;
					spawned.speed = 0;
					spawned.range = STATS.bowman.range + WALL_BOW_RANGE;
					spawned.dmg = STATS.bowman.dmg + WALL_BOW_DMG;
				}
				raid.units.push(spawned);
			}
		};
		dump("levy", cargo.levy ?? 0);
		dump("knight", cargo.knights ?? 0);
		dump("beast", cargo.beasts ?? 0);
		dump("bowman", cargo.bowmen ?? 0, true);
		const n = (cargo.levy ?? 0) + (cargo.knights ?? 0) + (cargo.beasts ?? 0) + (cargo.bowmen ?? 0);
		raid.log.push(n > 0 ? `The tower spills ${n} over the wall.` : "The tower leans on the wall empty.");
		u.pref = "keep";
		u.cargo = null;
		return;
	}
}
if (u.kind === "ram") {
	const gate = raid.walls.find((g) => g.hp > 0 && g.gate) ?? null;
	if (gate && inRangeW(u, gate)) {
		hurtWall(raid, gate, u.dmg);
		return;
	}
	const keep = keepOf(raid);
	if (keep && keep.hp > 0 && inRangeB(u, keep, raid)) hurtBuilding(raid, keep, u.dmg);
	return;
}
if (u.kind === "knight" || u.kind === "levy") {
	const foe = nearestGroundFoe(raid, u);
	if (foe && dist(u.x, u.y, foe.x, foe.y) <= u.range + foe.radius + 8) {
		strikeFoe(raid, u, foe);
		return;
	}
	const gate = nearestGate(raid, u.x, u.y);
	if (gate && inRangeW(u, gate, raid)) {
		gate.press = (gate.press || 0) + 1;
		if (gate.press <= 8) hurtWall(raid, gate, u.dmg * (u.kind === "knight" ? 0.55 : 0.45));
		return;
	}
}
if (u.kind === "knight") {
	const mark = nearestKindFoe(raid, u, "levy");
	if (mark && dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius + 8) {
		hurtUnit(raid, mark, u.dmg * KNIGHT_VS_LEVY, false);
		return;
	}
}
const w = u.kind === "beast" ? u.pref === "keep" ? null : nearestWall(raid, u.x, u.y) : u.kind === "catapult" ? orderOf(u, raid) !== "posts" && !catapultBreachOpen(raid) ? nearestBreachWall(raid, u.x, u.y) ?? nearestIntactWall(raid, u.x, u.y) : null : u.kind === "dragon" ? liveBuildings(raid).some((b) => b.kind === "scorpion") ? null : nearestWall(raid, u.x, u.y) : u.pref === "wall" ? nearestWall(raid, u.x, u.y) : null;
if (w && w.hp > 0 && inRangeW(u, w) && (u.kind === "beast" || u.kind === "dragon" || u.kind === "catapult" || u.kind === "tower")) {
	const frac = w.hp / w.max;
	let wallDmg = u.dmg * wetMul;
	if (u.kind === "beast") {
		const str = raid.beastStats?.strength ?? 15;
		wallDmg = (frac <= .45 ? str * 2.2 : str * .85) * wetMul;
		w.press = (w.press || 0) + 1;
		if (w.press > 6) return;
	}
	if (u.kind === "dragon") wallDmg = u.dmg * 1.4;
	if (u.kind === "catapult") {
		const c = wallCenter(w);
		fireShot(raid, u.x, u.y, c.x, c.y, wallDmg, 28, false, true, "atk", false);
	} else hurtWall(raid, w, wallDmg);
	if (u.kind === "beast") {
		const now = w.max > 0 ? w.hp / w.max : 0;
		if (now <= .5 && !w.climb) {
			w.climb = true;
			raid.walkDirty = true;
			noteBreach(raid, w);
			pushAlert(raid, "wall", "The wall is breached.");
		}
		if (now <= .45) u.pref = "keep";
	}
	return;
}
const b = pickBuilding(raid, u);
if (b && inRangeB(u, b)) {
	if ((u.kind === "levy" || u.kind === "knight" || u.kind === "beast") && !u.air) {
		b.press = (b.press || 0) + 1;
		if (b.press > 12) return;
	}
	const dmg = u.dmg * wetMul;
	if (u.kind === "dragon" || u.kind === "catapult" || u.kind === "bowman") fireShot(raid, u.x, u.y, b.x, b.y, dmg, u.kind === "catapult" ? 30 : 0, u.kind === "dragon", true, "atk", u.kind === "dragon");
	else hurtBuilding(raid, b, dmg);
}
}
function moveToward(u, x, y, dt, raid) {
const d = dist(u.x, u.y, x, y);
if (d < 2) return;
const wet = !u.air && inMoat(raid, u.x, u.y);
const sp = u.speed * dt * (wet ? .38 : 1);
let nx = u.x + (x - u.x) / d * Math.min(sp, d);
let ny = u.y + (y - u.y) / d * Math.min(sp, d);
if (!u.air && !walkableFor(raid, nx, ny, u)) {
	if (u.path.length < 1) u.path = astar(raid, u.x, u.y, x, y);
	if (u.path.length) {
		const p = u.path[0];
		const pd = dist(u.x, u.y, p.x, p.y);
		if (pd < 8) {
			u.path.shift();
			return;
		}
		nx = u.x + (p.x - u.x) / pd * Math.min(sp, pd);
		ny = u.y + (p.y - u.y) / pd * Math.min(sp, pd);
		if (!walkableFor(raid, nx, ny, u)) {
			u.path = astar(raid, u.x, u.y, x, y);
			return;
		}
	} else {
		const w = nearestWall(raid, u.x, u.y);
		if (w) {
			const c = wallCenter(w);
			const wd = dist(u.x, u.y, c.x, c.y) || 1;
			nx = u.x + (c.x - u.x) / wd * Math.min(sp, wd);
			ny = u.y + (c.y - u.y) / wd * Math.min(sp, wd);
		}
	}
} else if (!u.air) u.path = [];
if (nx !== u.x || ny !== u.y) u.facing = Math.atan2(ny - u.y, nx - u.x);
u.x = clamp(nx, 12, 708);
u.y = clamp(ny, 12, 468);
}
function nearestIntactWall(raid, x, y) {
let best = null;
let bestD = 1e9;
for (const w of raid.walls) {
	if (w.hp <= 0 || w.climb) continue;
	const c = wallCenter(w);
	const d = dist(x, y, c.x, c.y);
	if (d < bestD) {
		bestD = d;
		best = w;
	}
}
return best;
}
function nearestArcherPost(raid, x, y) {
const posts = liveBuildings(raid).filter((b) => b.kind === "archer");
if (!posts.length) return null;
return [...posts].sort((a, b) => dist(x, y, a.x, a.y) - dist(x, y, b.x, b.y))[0] ?? null;
}
function followAlly(raid, u, ally, dt, back = 18) {
const n = raid.liveN?.[u.kind] ?? 6;
const cols = n <= 6 ? Math.min(5, Math.max(1, n)) : Math.min(12, Math.ceil(Math.sqrt(n * 1.15)));
const col = (u.file ?? 0) % cols;
const row = Math.floor((u.file ?? 0) / cols);
const a = Math.atan2(ally.y - RAID_CY, ally.x - RAID_CX);
const perp = a + Math.PI / 2;
const tx = ally.x + Math.cos(a) * (back + row * 11) + Math.cos(perp) * (col - (cols - 1) / 2) * 10;
const ty = ally.y + Math.sin(a) * (back + row * 11) * .78 + Math.sin(perp) * (col - (cols - 1) / 2) * 7;
moveToward(u, clamp(tx, 12, RAID_W - 12), clamp(ty, 12, RAID_H - 12), dt, raid);
}
function nearestAtkKind(raid, kind, x, y) {
let best = null;
let bestD = 1e9;
const list = raid.liveAtk ?? raid.units;
for (const o of list) {
	if (o.side !== "atk" || o.kind !== kind || o.hp <= 0 || o.planted || o.held) continue;
	const d = dist(x, y, o.x, o.y);
	if (d < bestD) {
		bestD = d;
		best = o;
	}
}
return best;
}
function nearestOpening(raid, x, y) {
let best = null;
let bestD = 1e9;
for (const w of raid.walls) {
	if (!(w.hp <= 0 || w.climb)) continue;
	const c = wallCenter(w);
	let d = dist(x, y, c.x, c.y);
	if (w.gate) d -= 40;
	if (d < bestD) {
		bestD = d;
		best = c;
	}
}
return best;
}
function nearestBreachWall(raid, x, y) {
let best = null;
let bestS = 1e9;
for (const w of raid.walls) {
	if (w.hp <= 0 || w.climb || w.gate) continue;
	const c = wallCenter(w);
	const s = dist(x, y, c.x, c.y) + w.hp / w.max * 40;
	if (s < bestS) {
		bestS = s;
		best = w;
	}
}
return best ?? nearestIntactWall(raid, x, y);
}
function driveKeep(raid, u, dt) {
if (!villageInner(u.x, u.y, raid)) {
	const hole = nearestOpening(raid, u.x, u.y);
	if (hole && dist(u.x, u.y, hole.x, hole.y) > 16) {
		moveToward(u, hole.x, hole.y, dt, raid);
		return;
	}
}
const keep = keepOf(raid);
if (keep && keep.hp > 0) {
	fireAtBuilding(raid, u, keep, dt);
	return;
}
const mark = nearestGroundFoe(raid, u);
if (!mark) return;
if (dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius) {
	if (u.cd <= 0) strikeTarget(raid, u);
} else moveToward(u, mark.x, mark.y, dt, raid);
}
function catapultBreachOpen(raid) {
return raid.walls.some((w) => !w.gate && (w.hp <= 0 || w.climb));
}
function nearestGroundFoe(raid, u) {
const foes = u.side === "atk" ? (raid.liveDef ?? raid.units) : (raid.liveAtk ?? raid.units);
let best = null;
let bestS = 1e9;
for (const o of foes) {
	if (o.hp <= 0 || o.air || o.planted || o.side === u.side) continue;
	const d = dist(u.x, u.y, o.x, o.y);
	const score = d + (o.aimed || 0) * 16;
	if (score < bestS) {
		bestS = score;
		best = o;
	}
}
if (best) best.aimed = (best.aimed || 0) + 1;
return best;
}
function nearestKindFoe(raid, u, kind) {
const foes = u.side === "atk" ? (raid.liveDef ?? raid.units) : (raid.liveAtk ?? raid.units);
let best = null;
let bestS = 1e9;
for (const o of foes) {
	if (o.hp <= 0 || o.air || o.planted || o.kind !== kind || o.side === u.side) continue;
	const d = dist(u.x, u.y, o.x, o.y);
	const score = d + (o.aimed || 0) * 16;
	if (score < bestS) {
		bestS = score;
		best = o;
	}
}
if (best) best.aimed = (best.aimed || 0) + 1;
return best;
}
function facesOut(u, tx, ty) {
	if (!u.onWall) return true;
	const want = Math.atan2(ty - u.y, tx - u.x);
	const da = Math.abs(Math.atan2(Math.sin(want - u.facing), Math.cos(want - u.facing)));
	return da <= 1.15;
}
function pickDefFoe(raid, u, foes) {
	let best = null;
	let bestS = 1e9;
	for (const f of foes) {
		if (f.hp <= 0 || f.planted) continue;
		if (u.kind !== "dragon" && f.air) continue;
		if (u.onWall && !facesOut(u, f.x, f.y)) continue;
		const d = dist(u.x, u.y, f.x, f.y);
		if (d > u.range + f.radius + 4) continue;
		const score = d + (f.aimed || 0) * 32;
		if (score < bestS) {
			bestS = score;
			best = f;
		}
	}
	if (best) best.aimed = (best.aimed || 0) + 1;
	return best;
}
function refreshLive(raid) {
	const atk = [];
	const def = [];
	const files = {};
	for (const u of raid.units) {
		u.aimed = 0;
		if (u.hp <= 0 || u.planted) continue;
		if (u.side === "atk") {
			u.file = files[u.kind] || 0;
			files[u.kind] = u.file + 1;
			atk.push(u);
		} else def.push(u);
	}
	raid.liveAtk = atk;
	raid.liveDef = def;
	raid.liveN = files;
	for (const w of raid.walls) w.press = 0;
	for (const b of raid.buildings) {
		b.press = 0;
		b.aimed = 0;
	}
}
function separateUnits(raid) {
	const units = [];
	for (const u of raid.units) {
		if (u.hp <= 0 || u.air || u.onWall || u.planted || u.speed <= 0) continue;
		units.push(u);
	}
	const cell = 18;
	const buckets = new Map();
	const key = (cx, cy) => cx + 512 + ((cy + 512) << 12);
	for (const u of units) {
		const k = key(Math.floor(u.x / cell), Math.floor(u.y / cell));
		const b = buckets.get(k);
		if (b) b.push(u);
		else buckets.set(k, [u]);
	}
	for (const u of units) {
		const cx = Math.floor(u.x / cell);
		const cy = Math.floor(u.y / cell);
		let ox = 0, oy = 0, hits = 0;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const bucket = buckets.get(key(cx + dx, cy + dy));
				if (!bucket) continue;
				for (const o of bucket) {
					if (o === u || o.side !== u.side) continue;
					const d = dist(u.x, u.y, o.x, o.y);
					const min = (u.radius + o.radius) * 0.72;
					if (d < 0.15) {
						const h = (u.file || 0) * 1.7 + (o.file || 0);
						ox += Math.cos(h);
						oy += Math.sin(h);
						hits++;
					} else if (d < min) {
						const p = (min - d) / min;
						ox += (u.x - o.x) / d * p;
						oy += (u.y - o.y) / d * p;
						hits++;
					}
				}
			}
		}
		if (hits < 1) continue;
		u.x = clamp(u.x + ox * 2.1, 12, RAID_W - 12);
		u.y = clamp(u.y + oy * 2.1, 12, RAID_H - 12);
	}
}
function strikeFoe(raid, u, foe) {
u.cd = STATS[u.kind]?.cd ?? .55;
const dmg = u.kind === "knight" && foe.kind === "levy" ? u.dmg * KNIGHT_VS_LEVY : u.dmg;
if (u.kind === "bowman" || u.kind === "dragon") fireShot(raid, u.x, u.y, foe.x, foe.y, dmg, 0, u.kind === "dragon" || foe.air, !foe.air, u.side, u.kind === "dragon" && foe.kind === "dragon");
else hurtUnit(raid, foe, dmg, u.kind === "dragon" && foe.kind === "dragon");
}
function fightIfNear(raid, u) {
const foe = nearestGroundFoe(raid, u);
if (!foe || dist(u.x, u.y, foe.x, foe.y) > u.range + foe.radius) return false;
if (u.cd <= 0) strikeFoe(raid, u, foe);
return true;
}
function followEngine(raid, u, kinds, dt) {
for (const kind of kinds) {
	const eng = nearestAtkKind(raid, kind, u.x, u.y);
	if (!eng) continue;
	if (kind === "tower" && eng.dumped) continue;
	followAlly(raid, u, eng, dt, u.kind === "knight" ? 22 : u.kind === "bowman" ? 28 : 16);
	fightIfNear(raid, u);
	return true;
}
return false;
}
function steerToWall(raid, u, w, dt) {
if (inRangeW(u, w, raid)) {
	if (u.cd <= 0) strikeTarget(raid, u);
	return;
}
const c = wallCenter(w);
moveToward(u, c.x, c.y, dt, raid);
}
function dragonOrbitPoint(raid, u, tx, ty, dt, radius = 28) {
const aNow = Math.atan2(u.y - ty, u.x - tx);
const roam = u.id.charCodeAt(Math.max(0, u.id.length - 1)) % 2 ? 1 : -1;
const r = radius;
return {
	x: clamp(tx + Math.cos(aNow + roam * 1.4 * dt) * r, 28, 692),
	y: clamp(ty + Math.sin(aNow + roam * 1.4 * dt) * r * 0.78, 28, 452),
	orbit: r
};
}
function flyAcrossPoint(raid, u, tx, ty) {
const tR = ringDist(raid, tx, ty);
const uR = ringDist(raid, u.x, u.y);
const rim = cityRadius(raid);
if (uR > rim * 0.7 && tR > rim * 0.5) {
	const a = Math.atan2(ty - RAID_CY, tx - RAID_CX);
	const inner = Math.min(tR, rim * 0.55);
	return {
		x: RAID_CX + Math.cos(a) * inner,
		y: RAID_CY + Math.sin(a) * inner * (raid.squash || .78)
	};
}
return {
	x: tx,
	y: ty
};
}
function shotIncoming(raid, x, y) {
return raid.shots.some((s) => {
	if (s.side !== "atk") return false;
	return dist(s.x + s.vx * Math.max(0, s.ttl), s.y + s.vy * Math.max(0, s.ttl), x, y) < 28;
});
}
function huntClassOf(mark) {
if (mark.wall) return mark.wall.gate ? "gate" : "wall";
if (mark.building) {
	if (mark.building.kind === "archer") return "archer";
	if (mark.building.kind === "scorpion") return "scorpion";
	return "keep";
}
if (mark.unit) {
	if (mark.unit.kind === "dragon") return "dragon";
	if (mark.unit.kind === "beast") return "beast";
	if (mark.unit.kind === "knight") return "knight";
	if (mark.unit.kind === "bowman") return "bowman";
	return "levy";
}
return "keep";
}
function closestMark(raid, u, list) {
const open = list.filter((m) => !shotIncoming(raid, m.x, m.y));
return [...open.length ? open : list].sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
}
function huntOrder(order) {
if (order === "scorpions") return [
	"scorpion",
	"dragon",
	"gate",
	"archer",
	"beast",
	"knight",
	"bowman",
	"levy",
	"keep",
	"wall"
];
if (order === "keep") return [
	"keep",
	"dragon",
	"scorpion",
	"gate",
	"archer",
	"beast",
	"knight",
	"bowman",
	"levy",
	"wall"
];
if (order === "gate") return [
	"dragon",
	"scorpion",
	"gate",
	"beast",
	"knight",
	"bowman",
	"levy",
	"archer",
	"keep",
	"wall"
];
return [
	"dragon",
	"scorpion",
	"gate",
	"archer",
	"beast",
	"knight",
	"bowman",
	"levy",
	"keep",
	"wall"
];
}
function liveDragonMark(raid, id) {
if (!id) return null;
const unit = raid.units.find((o) => o.id === id && o.hp > 0);
if (unit) return {
	x: unit.x,
	y: unit.y,
	r: unit.radius,
	id: unit.id,
	unit
};
const b = raid.buildings.find((o) => o.id === id && o.hp > 0);
if (b) return {
	x: b.x,
	y: b.y,
	r: b.r,
	id: b.id,
	building: b
};
const w = raid.walls.find((o) => o.id === id && o.hp > 0);
if (w) {
	const c = wallCenter(w);
	return {
		x: c.x,
		y: c.y,
		r: w.gate ? 16 : 14,
		id: w.id,
		wall: w
	};
}
return null;
}
function allDragonMarks(raid) {
const marks = [];
for (const o of raid.units) {
	if (o.side !== "def" || o.hp <= 0) continue;
	marks.push({
		x: o.x,
		y: o.y,
		r: o.radius,
		id: o.id,
		unit: o
	});
}
for (const b of liveBuildings(raid)) marks.push({
	x: b.x,
	y: b.y,
	r: b.r,
	id: b.id,
	building: b
});
for (const w of raid.walls) {
	if (w.hp <= 0) continue;
	const c = wallCenter(w);
	marks.push({
		x: c.x,
		y: c.y,
		r: w.gate ? 16 : 14,
		id: w.id,
		wall: w
	});
}
return marks;
}
function pickDragonMark(raid, u) {
const stuck = liveDragonMark(raid, u.target);
if (stuck) return stuck;
const marks = allDragonMarks(raid);
if (!marks.length) return null;
const hunt = huntOrder(orderOf(u, raid));
const byClass = (cls) => marks.filter((m) => huntClassOf(m) === cls);
for (const cls of hunt) {
	const list = byClass(cls);
	if (list.length) return closestMark(raid, u, list);
}
return closestMark(raid, u, marks);
}
function standOff(raid, u, reach, dt) {
if (dist(u.x, u.y, RAID_CX, RAID_CY) >= reach - 10) return false;
const a = Math.atan2(u.y - RAID_CY, u.x - RAID_CX);
moveToward(u, RAID_CX + Math.cos(a) * reach, RAID_CY + Math.sin(a) * reach * .78, dt, raid);
return true;
}
function fireAtBuilding(raid, u, b, dt) {
if (inRangeB(u, b, raid)) {
	if (u.kind === "bowman" && (b.aimed || 0) >= 10) {
		return fightIfNear(raid, u);
	}
	if (u.cd <= 0) {
		const wet = !u.air && inMoat(raid, u.x, u.y);
		const dmg = u.dmg * (wet ? .7 : 1);
		u.cd = STATS[u.kind]?.cd ?? .55;
		b.aimed = (b.aimed || 0) + 1;
		fireShot(raid, u.x, u.y, b.x, b.y, dmg, u.kind === "catapult" ? 30 : 0, u.kind === "dragon", true, "atk", u.kind === "dragon");
	}
	return true;
}
moveToward(u, b.x, b.y, dt, raid);
return false;
}
function steerDefDragon(raid, u, foes, dt) {
	const order = orderOf(u, raid);
	const drakes = foes.filter((f) => f.kind === "dragon" && f.hp > 0);
	let mark = null;
	if (order === "gate") {
		const g = gateMuster(raid);
		const here = foes.filter((f) => dist(f.x, f.y, g.x, g.y) < 110);
		mark = (drakes.length ? pickDefFoe(raid, u, drakes) : null) || (here.length ? pickDefFoe(raid, u, here) || here[0] : null);
		if (!mark) {
			if (dist(u.x, u.y, g.x, g.y) > 28) moveToward(u, g.x, g.y - 12, dt, raid);
			return;
		}
	} else if (order === "wall") {
		const hole = firstBreachPoint(raid);
		if (hole) {
			const here = foes.filter((f) => dist(f.x, f.y, hole.x, hole.y) < 110);
			mark = (drakes.length ? pickDefFoe(raid, u, drakes) : null) || (here.length ? pickDefFoe(raid, u, here) || here[0] : null);
			if (!mark) {
				if (dist(u.x, u.y, hole.x, hole.y) > 28) moveToward(u, hole.x, hole.y, dt, raid);
				return;
			}
		} else {
			mark = drakes.length ? pickDefFoe(raid, u, drakes) : null;
			if (!mark) return;
		}
	} else if (drakes.length) {
		mark = pickDefFoe(raid, u, drakes) || drakes[0];
	} else if (order === "keep") {
		const keep = keepOf(raid);
		const cx = keep?.x ?? RAID_CX;
		const cy = keep?.y ?? RAID_CY;
		const inner = foes.filter((f) => dist(f.x, f.y, cx, cy) < 96);
		mark = inner.length ? pickDefFoe(raid, u, inner) || inner[0] : null;
		if (!mark) {
			if (dist(u.x, u.y, cx, cy) > 28) moveToward(u, cx, cy, dt, raid);
			return;
		}
	} else {
		mark = largestAtkGroup(raid) || pickDefFoe(raid, u, foes) || foes[0];
	}
	if (!mark) return;
	const reach = u.range + mark.radius;
	const d = dist(u.x, u.y, mark.x, mark.y);
	if (d <= reach) {
		if (u.cd <= 0) {
			u.cd = STATS.dragon.cd;
			if (mark.kind === "dragon") hurtUnit(raid, mark, u.dmg, true);
			else fireShot(raid, u.x, u.y, mark.x, mark.y, u.dmg, 0, true, !mark.air, "def", mark.kind === "dragon");
		}
		if (d < 36) {
			const ring = dragonOrbitPoint(raid, u, mark.x, mark.y, dt, 26);
			moveToward(u, ring.x, ring.y, dt, raid);
		}
		return;
	}
	u.roam = u.roam || 1.6;
	if (u.roam <= 0) u.roam = 1.6;
	const hop = flyAcrossPoint(raid, u, mark.x, mark.y);
	moveToward(u, hop.x, hop.y, dt, raid);
}

function strikeDefMark(raid, u, mark) {
	if (u.cd > 0) return;
	u.cd = STATS[u.kind]?.cd ?? .55;
	const dmg = u.kind === "knight" && mark.kind === "levy" ? u.dmg * KNIGHT_VS_LEVY : u.dmg;
	if (u.kind === "dragon" && mark.kind === "dragon") hurtUnit(raid, mark, dmg, true);
	else if (u.kind === "bowman" || u.kind === "dragon") fireShot(raid, u.x, u.y, mark.x, mark.y, dmg, 0, u.kind === "dragon" || mark.air, !mark.air, "def", u.kind === "dragon");
	else hurtUnit(raid, mark, dmg, false);
}

function steerUnit(raid, u, dt) {
if (u.hp <= 0 || u.planted) return;
u.cd = Math.max(0, u.cd - dt);
u.flash = Math.max(0, u.flash - dt);
u.roam = Math.max(0, u.roam - dt);
if (u.held) return;
if (u.side === "def") {
	const foes = livingAtk(raid);
	if (!foes.length) return;
	if (u.onWall || u.postId) {
		const mark = pickDefFoe(raid, u, foes);
		if (mark && dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius && u.cd <= 0) {
			u.cd = STATS[u.kind]?.cd ?? .55;
			if (u.kind === "bowman" || u.kind === "dragon") fireShot(raid, u.x, u.y, mark.x, mark.y, u.dmg, 0, u.kind === "dragon" || mark.air, !mark.air, "def", u.kind === "dragon");
			else hurtUnit(raid, mark, u.dmg, false);
		}
		return;
	}
	if (u.kind === "bowman" && !wallsBreached(raid)) {
		const mark = pickDefFoe(raid, u, foes);
		if (mark && dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius && u.cd <= 0) {
			u.cd = STATS[u.kind]?.cd ?? .55;
			fireShot(raid, u.x, u.y, mark.x, mark.y, u.dmg, 0, false, true, "def", false);
		}
		return;
	}
	if (u.kind === "dragon") {
		steerDefDragon(raid, u, foes, dt);
		return;
	}
	if (orderOf(u, raid) === "keep") {
		const keep = keepOf(raid);
		const cx = keep?.x ?? RAID_CX;
		const cy = keep?.y ?? RAID_CY;
		const inner = foes.filter((f) => dist(f.x, f.y, cx, cy) < 96);
		if (inner.length) {
			const mark = pickDefFoe(raid, u, inner) || inner[0];
			const reach = u.range + mark.radius;
			if (dist(u.x, u.y, mark.x, mark.y) <= reach) strikeDefMark(raid, u, mark);
			else moveToward(u, mark.x, mark.y, dt, raid);
			return;
		}
		const holdR = (keep?.r ?? 42) + 16;
		if (dist(u.x, u.y, cx, cy) > holdR) moveToward(u, cx, cy, dt, raid);
		return;
	}
	const rushFirst = orderOf(u, raid) === "wall" || (u.kind === "knight" && !u.holdGate);
	if (rushFirst && !ringOpen(raid)) {
		const hole = firstBreachPoint(raid);
		const near = foes.filter((f) => dist(f.x, f.y, u.x, u.y) <= u.range + f.radius);
		if (near.length) {
			strikeDefMark(raid, u, pickDefFoe(raid, u, near) || near[0]);
			return;
		}
		if (hole) {
			if (dist(u.x, u.y, hole.x, hole.y) > 16) moveToward(u, hole.x, hole.y, dt, raid);
			return;
		}
		return;
	}
	const huntMen = u.kind === "knight" ? foes.filter((f) => f.kind === "levy") : [];
	const mark = pickDefFoe(raid, u, huntMen.length ? huntMen : foes)
		|| [...(huntMen.length ? huntMen : foes)].sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y))[0];
	if (!mark) return;
	const reach = u.range + mark.radius;
	if (dist(u.x, u.y, mark.x, mark.y) <= reach) {
		strikeDefMark(raid, u, mark);
		return;
	}
	if (u.holdGate && !ringOpen(raid)) {
		const hole = wallHoleElsewhere(raid) ? breachInside(raid, u.x, u.y) : firstBreachPoint(raid);
		if (hole && (wallHoleElsewhere(raid) || hole.gate)) {
			if (dist(u.x, u.y, hole.x, hole.y) > 16) moveToward(u, hole.x, hole.y, dt, raid);
			return;
		}
		const g = assignedMuster(raid, u);
		if (gateDestroyed(raid)) {
			if (dist(u.x, u.y, g.x, g.y) > 22) moveToward(u, g.x, g.y, dt, raid);
			else if (dist(u.x, u.y, mark.x, mark.y) < 48) moveToward(u, mark.x, mark.y, dt, raid);
			return;
		}
		if (dist(u.x, u.y, g.x, g.y) > 18) moveToward(u, g.x, g.y, dt, raid);
		return;
	}
	moveToward(u, mark.x, mark.y, dt, raid);
	return;
}
const order = orderOf(u, raid);
if (order === "keep" && u.kind !== "ram" && u.kind !== "ladder" && u.kind !== "tower") {
	if (u.kind === "bowman" || u.kind === "catapult" || u.kind === "dragon") {
		if (u.kind === "bowman") standOff(raid, u, 168, dt);
		if (u.kind === "catapult") standOff(raid, u, 200, dt);
		if (u.kind === "dragon") {
			const mark = pickDragonMark(raid, u);
			if (!mark) return;
			u.target = mark.id;
			const d = dist(u.x, u.y, mark.x, mark.y);
			const standoff = Math.min(u.range * 0.16, 40);
			if (d > standoff + 10) {
				const hop = flyAcrossPoint(raid, u, mark.x, mark.y);
				moveToward(u, hop.x, hop.y, dt, raid);
			} else {
				const ring = dragonOrbitPoint(raid, u, mark.x, mark.y, dt, 26);
				moveToward(u, ring.x, ring.y, dt, raid);
			}
			if (u.cd <= 0 && d <= u.range + mark.r) {
				u.cd = STATS.dragon.cd;
				if (mark.building) hurtBuilding(raid, mark.building, u.dmg);
				else fireShot(raid, u.x, u.y, mark.x, mark.y, u.dmg, mark.wall ? 26 : 16, true, true, "atk", false);
			}
			return;
		}
		const keep = keepOf(raid);
		if (keep && keep.hp > 0) {
			fireAtBuilding(raid, u, keep, dt);
			return;
		}
	}
	if (fightIfNear(raid, u)) return;
	driveKeep(raid, u, dt);
	return;
}
if (u.kind === "bowman") {
	if (order === "tower") {
		if (followEngine(raid, u, ["tower"], dt)) return;
	}
	if (order === "guard") {
		if (followEngine(raid, u, ["ram"], dt)) return;
		const ram = nearestAtkKind(raid, "ram", u.x, u.y);
		const threats = raid.liveDef ?? raid.units;
		if (ram && threats.length) {
			let mark = null;
			let best = 1e9;
			for (const o of threats) {
				if (o.hp <= 0 || o.air || o.planted) continue;
				const d = dist(ram.x, ram.y, o.x, o.y);
				if (d < best) {
					best = d;
					mark = o;
				}
			}
			if (dist(u.x, u.y, mark.x, mark.y) <= u.range + mark.radius) {
				if (u.cd <= 0) strikeFoe(raid, u, mark);
				return;
			}
		}
	}
	standOff(raid, u, 168, dt);
	const post = nearestArcherPost(raid, u.x, u.y);
	if (post) {
		fireAtBuilding(raid, u, post, dt);
		return;
	}
	const keep = keepOf(raid);
	if (keep && keep.hp > 0) {
		fireAtBuilding(raid, u, keep, dt);
		return;
	}
	if (fightIfNear(raid, u)) return;
	if (u.cd <= 0) strikeTarget(raid, u);
	return;
}
if (u.kind === "catapult") {
	standOff(raid, u, 200, dt);
	if (order === "posts") {
		const post = nearestArcherPost(raid, u.x, u.y);
		if (post) {
			fireAtBuilding(raid, u, post, dt);
			return;
		}
		const keep = keepOf(raid);
		if (keep && keep.hp > 0) {
			fireAtBuilding(raid, u, keep, dt);
			return;
		}
	}
	if (order !== "posts" && !catapultBreachOpen(raid)) {
		const wall = nearestBreachWall(raid, u.x, u.y);
		if (wall) {
			steerToWall(raid, u, wall, dt);
			return;
		}
	}
	const post = nearestArcherPost(raid, u.x, u.y);
	if (post) {
		fireAtBuilding(raid, u, post, dt);
		return;
	}
	const wall = nearestIntactWall(raid, u.x, u.y);
	if (wall) {
		steerToWall(raid, u, wall, dt);
		return;
	}
	const keep = keepOf(raid);
	if (keep && keep.hp > 0) {
		fireAtBuilding(raid, u, keep, dt);
		return;
	}
	if (u.cd <= 0) strikeTarget(raid, u);
	return;
}
if (u.kind === "dragon") {
	const mark = pickDragonMark(raid, u);
	if (!mark) return;
	u.target = mark.id;
	const d = dist(u.x, u.y, mark.x, mark.y);
	const standoff = Math.min(u.range * 0.16, 40);
	if (d > standoff + 10) {
		const hop = flyAcrossPoint(raid, u, mark.x, mark.y);
		moveToward(u, hop.x, hop.y, dt, raid);
	} else {
		const ring = dragonOrbitPoint(raid, u, mark.x, mark.y, dt, 26);
		moveToward(u, ring.x, ring.y, dt, raid);
	}
	u.facing = Math.atan2(mark.y - u.y, mark.x - u.x);
	if (u.cd <= 0 && d <= u.range + mark.r) {
		u.cd = STATS.dragon.cd;
		if (mark.unit && mark.unit.kind === "dragon") {
			hurtUnit(raid, mark.unit, u.dmg, true);
			spark(raid, mark.x, mark.y, 5);
		} else if (mark.building && d < 90) {
			hurtBuilding(raid, mark.building, u.dmg);
			spark(raid, mark.x, mark.y, 4);
		} else {
			const splash = mark.wall ? 26 : mark.building ? 18 : 16;
			fireShot(raid, u.x, u.y, mark.x, mark.y, u.dmg, splash, true, true, "atk", false);
		}
	}
	return;
}
if (u.kind === "beast") {
	if (order === "tower" && followEngine(raid, u, ["tower"], dt)) return;
	if (order === "gate") {
		if (followEngine(raid, u, ["ram"], dt)) return;
		const g = nearestGate(raid, u.x, u.y);
		if (g) {
			steerToWall(raid, u, g, dt);
			return;
		}
		if (fightIfNear(raid, u)) return;
		driveKeep(raid, u, dt);
		return;
	}
	const punch = nearestWeakWall(raid, u.x, u.y);
	if (punch && !villageInner(u.x, u.y, raid) && (punch.hp / punch.max <= .85 || dist(u.x, u.y, wallCenter(punch).x, wallCenter(punch).y) < 110)) {
		steerToWall(raid, u, punch, dt);
		return;
	}
	if (fightIfNear(raid, u)) return;
	const g = nearestGate(raid, u.x, u.y);
	if (g && order !== "wall") {
		steerToWall(raid, u, g, dt);
		return;
	}
	driveKeep(raid, u, dt);
	return;
}
if (u.kind === "levy" || u.kind === "knight") {
	if (order === "tower") {
		if (followEngine(raid, u, ["tower"], dt)) return;
		if (fightIfNear(raid, u)) return;
		driveKeep(raid, u, dt);
		return;
	}
	if (order === "ladder") {
		if (followEngine(raid, u, ["ladder"], dt)) return;
		const climb = raid.walls.find((w) => w.hp > 0 && w.climb);
		if (climb && !villageInner(u.x, u.y, raid)) {
			steerToWall(raid, u, climb, dt);
			return;
		}
		if (fightIfNear(raid, u)) return;
		const wall = nearestWall(raid, u.x, u.y, true, false);
		if (wall && !villageInner(u.x, u.y, raid)) {
			steerToWall(raid, u, wall, dt);
			return;
		}
		driveKeep(raid, u, dt);
		return;
	}
	if (followEngine(raid, u, ["ram"], dt)) return;
	if (fightIfNear(raid, u)) return;
	const gate = nearestGate(raid, u.x, u.y);
	if (gate && !villageInner(u.x, u.y, raid)) {
		steerToWall(raid, u, gate, dt);
		return;
	}
	if (u.kind === "knight") {
		const prey = nearestKindFoe(raid, u, "levy");
		if (prey) {
			if (dist(u.x, u.y, prey.x, prey.y) <= u.range + prey.radius) {
				if (u.cd <= 0) strikeFoe(raid, u, prey);
			} else moveToward(u, prey.x, prey.y, dt, raid);
			return;
		}
	}
	driveKeep(raid, u, dt);
	return;
}
if (u.kind === "ram") {
	const g = nearestGate(raid, u.x, u.y);
	if (g) {
		steerToWall(raid, u, g, dt);
		return;
	}
	driveKeep(raid, u, dt);
	return;
}
if (u.kind === "ladder" || u.kind === "tower") {
	const w = nearestWall(raid, u.x, u.y, u.kind === "ladder", false);
	if (w) {
		steerToWall(raid, u, w, dt);
		return;
	}
	driveKeep(raid, u, dt);
	return;
}
if (fightIfNear(raid, u)) return;
const b = pickBuilding(raid, u);
if (!b) return;
if (inRangeB(u, b, raid)) {
	if (u.cd <= 0) strikeTarget(raid, u);
} else moveToward(u, b.x, b.y, dt, raid);
}
function closestAtk(raid, x, y, air, ground, vsDragon = false) {
let best = null;
let bestD = 1e9;
const list = raid.liveAtk ?? raid.units;
for (const u of list) {
	if (u.side !== "atk" || u.hp <= 0 || u.planted) continue;
	if (u.air && !air) continue;
	if (!u.air && !ground) continue;
	if (u.kind === "dragon" && !vsDragon) continue;
	const d = dist(x, y, u.x, u.y);
	if (d < bestD) {
		bestD = d;
		best = u;
	}
}
return best;
}
function tickDefenses(raid, dt) {
for (const b of raid.buildings) {
	if (b.hp <= 0 || b.dmg <= 0) continue;
	b.flash = Math.max(0, b.flash - dt);
	b.cdLeft -= dt;
	if (b.cdLeft > 0) continue;
	const mark = closestAtk(raid, b.x, b.y, b.hitsAir, b.hitsGround, b.kind === "scorpion");
	if (!mark) continue;
	if (dist(b.x, b.y, mark.x, mark.y) > b.range + mark.radius) continue;
	b.cdLeft = b.cd;
	fireShot(raid, b.x, b.y, mark.x, mark.y, b.dmg, 0, b.hitsAir, b.hitsGround, "def", b.kind === "scorpion");
}
}
function tickShots(raid, dt) {
const next = [];
const atk = raid.liveAtk ?? raid.units;
const def = raid.liveDef ?? raid.units;
for (const s of raid.shots) {
	s.x += s.vx * dt;
	s.y += s.vy * dt;
	s.ttl -= dt;
	let hit = false;
	const foes = s.side === "atk" ? def : atk;
	if (s.vsDragon && s.air) for (const u of foes) {
		if (u.hp <= 0 || !u.air) continue;
		if (dist(s.x, s.y, u.x, u.y) <= u.radius + 6) {
			hurtUnit(raid, u, s.dmg, true);
			hit = true;
			break;
		}
	}
	if (!hit && s.ground) for (const u of foes) {
		if (u.hp <= 0 || u.air) continue;
		if (dist(s.x, s.y, u.x, u.y) <= u.radius + 4) {
			hurtUnit(raid, u, s.dmg, s.vsDragon);
			if (s.splash > 0) {
				for (const o of foes) {
					if (o.hp <= 0 || o === u) continue;
					if (dist(s.x, s.y, o.x, o.y) <= s.splash) hurtUnit(raid, o, s.dmg * .45, s.vsDragon);
				}
				if (s.side === "atk") {
					for (const w of raid.walls) {
						if (w.hp <= 0) continue;
						const c = wallCenter(w);
						if (dist(s.x, s.y, c.x, c.y) <= s.splash) hurtWall(raid, w, s.dmg * .7);
					}
					for (const b of raid.buildings) {
						if (b.hp <= 0) continue;
						if (dist(s.x, s.y, b.x, b.y) <= s.splash + b.r * .4) hurtBuilding(raid, b, s.dmg * .5);
					}
				}
			}
			hit = true;
			break;
		}
	}
	if (!hit && s.air) for (const u of foes) {
		if (u.hp <= 0 || !u.air) continue;
		if (dist(s.x, s.y, u.x, u.y) <= u.radius + 6) {
			hurtUnit(raid, u, s.dmg, s.vsDragon);
			hit = true;
			break;
		}
	}
	if (!hit && s.side === "atk" && s.ground && s.splash <= 0) for (const b of raid.buildings) {
		if (b.hp <= 0) continue;
		if (dist(s.x, s.y, b.x, b.y) <= b.r + 6) {
			hurtBuilding(raid, b, s.dmg);
			hit = true;
			break;
		}
	}
	if (!hit && s.side === "atk" && s.ground && s.splash <= 0) for (const w of raid.walls) {
		if (w.hp <= 0) continue;
		if (s.x >= w.x - 3 && s.y >= w.y - 3 && s.x <= w.x + w.w + 3 && s.y <= w.y + w.h + 3) {
			hurtWall(raid, w, s.dmg);
			hit = true;
			break;
		}
	}
	if (!hit && s.ttl <= 0) {
		for (const u of foes) {
			if (u.hp <= 0) continue;
			if (u.air && !s.air) continue;
			if (!u.air && !s.ground) continue;
			if (dist(s.x, s.y, u.x, u.y) <= u.radius + 8 + (s.splash || 0) * .25) {
				hurtUnit(raid, u, s.dmg, s.vsDragon);
				if (s.splash > 0) for (const o of foes) {
					if (o.hp <= 0 || o === u) continue;
					if (dist(s.x, s.y, o.x, o.y) <= s.splash) hurtUnit(raid, o, s.dmg * .45, s.vsDragon);
				}
				hit = true;
				break;
			}
		}
	}
	if (!hit && s.ttl <= 0 && s.side === "atk" && s.ground) {
		for (const b of raid.buildings) {
			if (b.hp <= 0) continue;
			if (dist(s.x, s.y, b.x, b.y) <= b.r + 10 + (s.splash || 0) * .3) {
				hurtBuilding(raid, b, s.dmg);
				hit = true;
				if (!s.splash) break;
			}
		}
		if (!hit || s.splash > 0) for (const w of raid.walls) {
			if (w.hp <= 0) continue;
			const c = wallCenter(w);
			if (dist(s.x, s.y, c.x, c.y) <= Math.max(w.w, w.h) * .5 + (s.splash || 0)) {
				hurtWall(raid, w, s.dmg);
				hit = true;
				if (!s.splash) break;
			}
		}
	}
	if (!hit && s.ttl > 0) next.push(s);
}
raid.shots = next;
}
function tickSparks(raid, dt) {
const next = [];
for (const s of raid.sparks) {
	s.x += s.vx * dt;
	s.y += s.vy * dt;
	s.vy += 40 * dt;
	s.life -= dt;
	if (s.life > 0) next.push(s);
}
raid.sparks = next;
}
function maybeEnd(raid) {
if (raid.phase === "over") return;
updateStars(raid);
const attackers = raid.liveAtk ?? raid.units.filter((u) => u.side === "atk" && u.hp > 0 && !u.planted);
const stockLeft = raidKindsLeft(raid).length > 0;
if (raid.destruction >= 100) {
	raid.phase = "over";
	raid.log.push("The village is razed.");
	return;
}
if (raid.phase === "fight" && raid.timeLeft <= 0) {
	raid.phase = "over";
	raid.log.push(raid.keepDestroyed ? "The keep is down — time." : "The assault runs out of time.");
	return;
}
if (raid.phase === "fight" && attackers.length < 1 && !stockLeft) {
	raid.phase = "over";
	raid.log.push(raid.keepDestroyed ? "The keep is down." : "The host is spent.");
}
}
function raidOver(r) {
return r.phase === "over";
}
export function stepRaid(raid: RaidState, dt: number): RaidState {
if (raidOver(raid)) return raid;
if (raid.phase === "deploy") return raid;
const t = Math.min(.1, Math.max(0, dt)) * (raid.timeScale || 1);
if (t <= 0) return raid;
if (raid.walkDirty) rebuildWalk(raid);
if (raid.phase === "fight") raid.timeLeft = Math.max(0, raid.timeLeft - t);
let acc = t;
while (acc > 0 && !raidOver(raid)) {
	const s = Math.min(STEP, acc);
	acc -= s;
	refreshLive(raid);
	tickDefenses(raid, s);
	for (const u of raid.units) steerUnit(raid, u, s);
	separateUnits(raid);
	tickShots(raid, s);
	tickSparks(raid, s);
	raid.trauma = Math.max(0, raid.trauma - s * 1.8);
	maybeEnd(raid);
}
updateStars(raid);
return raid;
}
export function runRaid(raid: RaidState, maxSeconds = RAID_TIME + 40): RaidState {
if (raid.phase === "deploy") {
	autoDeployAll(raid);
	for (const u of raid.units) if (u.side === "atk") u.held = false;
	beginAssault(raid);
}
raid.timeScale = 1;
let left = maxSeconds;
while (raid.phase !== "over" && left > 0) {
	stepRaid(raid, STEP);
	left -= STEP;
}
if (raid.phase !== "over") {
	raid.phase = "over";
	raid.log.push("The field is decided.");
}
updateStars(raid);
return raid;
}
export function raidWinner(raid: RaidState): BattleSide | null {
if (raid.phase !== "over") return null;
return raid.keepDestroyed ? "atk" : "def";
}
function countKind(raid, side, kind) {
return raid.units.filter((u) => u.side === side && u.kind === kind && u.hp > 0 && !u.planted).length;
}
export function addHost(a: HostForce, b: HostForce): HostForce {
return {
	levy: (a.levy | 0) + (b.levy | 0),
	bowmen: (a.bowmen ?? 0) + (b.bowmen ?? 0),
	knights: (a.knights | 0) + (b.knights | 0),
	dragons: (a.dragons | 0) + (b.dragons | 0),
	beasts: (a.beasts | 0) + (b.beasts | 0)
};
}
export function subHost(a: HostForce, b: HostForce): HostForce {
return {
	levy: Math.max(0, (a.levy | 0) - (b.levy | 0)),
	bowmen: Math.max(0, (a.bowmen ?? 0) - (b.bowmen ?? 0)),
	knights: Math.max(0, (a.knights | 0) - (b.knights | 0)),
	dragons: Math.max(0, (a.dragons | 0) - (b.dragons | 0)),
	beasts: Math.max(0, (a.beasts | 0) - (b.beasts | 0))
};
}
export function hostTotal(h: HostForce): number {
return (h.levy | 0) + (h.bowmen ?? 0) + (h.knights | 0) + (h.dragons | 0) + (h.beasts | 0);
}
function atkSurvivors(raid) {
return {
	levy: countKind(raid, "atk", "levy") + (raid.stock.levy || 0),
	bowmen: countKind(raid, "atk", "bowman") + (raid.stock.bowmen || 0),
	knights: countKind(raid, "atk", "knight") + (raid.stock.knights || 0),
	dragons: countKind(raid, "atk", "dragon") + (raid.stock.dragons || 0),
	beasts: countKind(raid, "atk", "beast") + (raid.stock.beasts || 0)
};
}
function defSurvivors(raid) {
return {
	levy: countKind(raid, "def", "levy"),
	bowmen: countKind(raid, "def", "bowman"),
	knights: countKind(raid, "def", "knight"),
	dragons: countKind(raid, "def", "dragon"),
	beasts: livingDefBeasts(raid).length
};
}
export function raidOutcome(raid: RaidState): RaidOutcome {
updateStars(raid);
const winner = raidWinner(raid) ?? "def";
const atkRemain = atkSurvivors(raid);
const defRemain = defSurvivors(raid);
const keep = keepOf(raid);
const keepFrac = keep && keep.max > 0 ? Math.max(0, keep.hp / keep.max) : 0;
const used = {
	rams: raid.deployed.rams,
	catapults: raid.deployed.catapults,
	ladders: raid.deployed.ladders,
	towers: raid.deployed.towers
};
const empty = { ...EMPTY };
if (winner === "atk" && hostTotal(atkRemain) > 0) {
	const captured = { ...defRemain };
	return {
		winner: "atk",
		atkLeft: addHost(atkRemain, captured),
		defLeft: empty,
		captured,
		atk: {
			remaining: atkRemain,
			lost: subHost(raid.force, atkRemain),
			captured
		},
		def: {
			remaining: empty,
			lost: subHost(raid.garrison, captured),
			captured
		},
		stars: raid.stars,
		destruction: raid.destruction,
		used,
		keepDestroyed: raid.keepDestroyed
	};
}
const defLeft = {
	levy: keepFrac > 0 ? Math.max(raid.garrison.levy > 0 ? 1 : 0, Math.ceil(raid.garrison.levy * keepFrac)) : 0,
	bowmen: defRemain.bowmen,
	knights: defRemain.knights,
	dragons: defRemain.dragons,
	beasts: defRemain.beasts
};
return {
	winner: "def",
	atkLeft: atkRemain,
	defLeft,
	captured: empty,
	atk: {
		remaining: atkRemain,
		lost: subHost(raid.force, atkRemain),
		captured: empty
	},
	def: {
		remaining: defLeft,
		lost: subHost(raid.garrison, defLeft),
		captured: empty
	},
	stars: raid.stars,
	destruction: raid.destruction,
	used,
	keepDestroyed: raid.keepDestroyed
};
}
export function setRaidTactic(raid: RaidState, tactic: RaidTactic) {
  raid.tactic = tactic;
  if (!raid.orders) raid.orders = defaultOrders();
  if (!raid.lastOrders) raid.lastOrders = { ...raid.orders };
  if (tactic === "gate") {
    raid.orders.ram = "gate";
    raid.orders.levy = "gate";
    raid.orders.knight = "gate";
    raid.orders.beast = "gate";
  } else if (tactic === "walls") {
    raid.orders.beast = "wall";
    raid.orders.catapult = "wall";
    raid.orders.ladder = "wall";
  } else if (tactic === "keep") {
    raid.orders.dragon = "keep";
  } else if (tactic === "scorpions") {
    raid.orders.dragon = "scorpions";
  }
  for (const k of Object.keys(raid.orders)) {
    if (raid.orders[k] !== "hold") raid.lastOrders[k] = raid.orders[k];
  }
  for (const u of raid.units) {
    if (u.side !== "atk" || u.planted) continue;
    if (raid.orders[u.kind]) u.order = raid.orders[u.kind];
    if (u.kind === "ram") {
      u.pref = "wall";
      continue;
    }
    if (tactic === "keep") u.pref = "keep";
    else if (tactic === "walls" || tactic === "gate") u.pref = "wall";
    else if (tactic === "scorpions") u.pref = "air";
  }
  if (tactic !== "any") {
    const row = RAID_TACTICS.find((t) => t.id === tactic);
    if (row) raid.log.push(`The host is ordered: ${row.label.toLowerCase()}.`);
  }
}

export function raidBusy(raid: RaidState): boolean {
  return raid.phase === "fight";
}
