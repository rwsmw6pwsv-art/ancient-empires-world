import { empireOf } from "./empires";
import { create } from "zustand";
import { playAiTurnsUntilBattle } from "./ai";
import { openRaid, type RaidOutcome, type RaidState } from "./raid";
import {
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildShip,
  buildRoad,
  buildFarm,
  buildSiege,
  buildScorpion,
  beginSiege,
  abortArrival,
  commitBattle,
  consumeSiege,
  createNewGame,
  drainEvents,
  endTurn,
  fortOf,
  issueMarch,
  legalMarchTargets,
  playCard,
  popArrival,
  resolveAttack,
  recallOccupiers,
  setMarchFrom,
  settleArrival,
  siegeBringOf,
  trainUnit,
  watchReport,
  cancelJob as haltJob,
  cancelMarch as haltMarch,
} from "./engine";
import { TERRITORY_BY_ID } from "./world";
import { clearSave, loadGame, saveGame } from "./save";
import { sfx } from "@/lib/sfx";
import { FORT_LABEL, UNIT_LABEL, UNIT_TURNS, isSiegeKind, type CardId, type Difficulty, type EmpireId, type GameState, type HostForce, type JobKind, type MarchOrder, type Opening, type PulseEvent, type UnitKind } from "./types";

type SendPart = {
  levy: number;
  bowmen: number;
  knights: number;
  dragons: number;
  beasts: number;
  rams: number;
  catapults: number;
  ladders: number;
  towers: number;
};

type PendingAttack = {
  from: string;
  to: string;
  levy: number;
  bowmen: number;
  knights: number;
  dragons: number;
  beasts: number;
  rams: number;
  catapults: number;
  ladders: number;
  towers: number;
};

interface GameStore {
  state: GameState | null;
  selected: string | null;
  sendLevy: number;
  sendBowmen: number;
  sendKnights: number;
  sendDragons: number;
  sendBeasts: number;
  sendRams: number;
  sendCatapults: number;
  sendLadders: number;
  sendTowers: number;
  pendingOccupy: { from: string; to: string } | null;
  pendingAttack: PendingAttack | null;
  pendingBattle: RaidState | null;
  pendingArrival: MarchOrder | null;
  pendingWatch: string[] | null;
  fx: PulseEvent[];
  newGame: (opts: { empire: EmpireId; difficulty?: Difficulty; opening?: Opening }) => void;
  resume: () => boolean;
  select: (id: string | null) => void;
  focus: (id: string | null) => void;
  setSend: (part: Partial<SendPart>) => void;
  train: (kind: UnitKind) => void;
  build: (kind: JobKind) => void;
  cancelJob: (jobId: string) => void;
  cancelMarch: (marchId: string) => void;
  march: () => void;
  play: (card: CardId) => void;
  occupyHold: () => void;
  occupyRecall: (recall: { levy: number; bowmen: number; knights: number; dragons: number; beasts: number; ships?: number }) => void;
  confirmAttack: () => void;
  laySiege: () => void;
  cancelAttack: () => void;
  battleFinish: (outcome: RaidOutcome) => void;
  battleCancel: (outcome: RaidOutcome | null) => void;
  dismissWatch: () => void;
  finishTurn: () => void;
  abandon: () => void;
}

function persist(state: GameState) {
  saveGame(state);
  return state;
}

function siegeFrom(t: { rams?: number; catapults?: number; ladders?: number; towers?: number }) {
  return siegeBringOf(t as Parameters<typeof siegeBringOf>[0]);
}

function resetSend(t: { levy: number; bowmen?: number; beasts?: number; rams?: number; catapults?: number; ladders?: number; towers?: number } | undefined) {
  const gear = t ? siegeFrom(t) : { rams: 0, catapults: 0, ladders: 0, towers: 0 };
  return {
    sendLevy: Math.max(1, t?.levy ?? 1),
    sendBowmen: t?.bowmen ?? 0,
    sendKnights: 0,
    sendDragons: 0,
    sendBeasts: t?.beasts ?? 0,
    sendRams: gear.rams,
    sendCatapults: gear.catapults,
    sendLadders: gear.ladders,
    sendTowers: gear.towers,
  };
}

function composeAttack(
  fromTerr: {
    levy: number;
    bowmen?: number;
    knights: number;
    dragons: number;
    beasts?: number;
    rams?: number;
    catapults?: number;
    ladders?: number;
    towers?: number;
  },
  fromId: string,
  toId: string,
  send: SendPart,
): PendingAttack {
  return {
    from: fromId,
    to: toId,
    levy: Math.min(send.levy, fromTerr.levy),
    bowmen: Math.min(send.bowmen, fromTerr.bowmen ?? 0),
    knights: Math.min(send.knights, fromTerr.knights),
    dragons: Math.min(send.dragons, fromTerr.dragons),
    beasts: Math.min(send.beasts, fromTerr.beasts ?? 0),
    rams: Math.min(send.rams, fromTerr.rams ?? 0),
    catapults: Math.min(send.catapults, fromTerr.catapults ?? 0),
    ladders: Math.min(send.ladders, fromTerr.ladders ?? 0),
    towers: Math.min(send.towers, fromTerr.towers ?? 0),
  };
}

export const useGame = create<GameStore>((set, get) => ({
  state: null,
  selected: null,
  sendLevy: 1,
  sendBowmen: 0,
  sendKnights: 0,
  sendDragons: 0,
  sendBeasts: 0,
  sendRams: 0,
  sendCatapults: 0,
  sendLadders: 0,
  sendTowers: 0,
  pendingOccupy: null,
  pendingAttack: null,
  pendingBattle: null,
  pendingArrival: null,
  pendingWatch: null,
  fx: [],
  newGame: (opts) => {
    const state = createNewGame(opts);
    clearSave();
    const cap = empireOf(opts.empire).capitol;
    const ready = setMarchFrom(state, cap);
    const t = ready.territories[cap];
    saveGame(ready);
    set({
      state: ready,
      selected: cap,
      ...resetSend(t),
      pendingOccupy: null,
      pendingAttack: null,
      pendingBattle: null,
      pendingArrival: null,
      pendingWatch: [
        "Watch 1 begins.",
        "Stone walls hold your seat. Every other land wakes behind wooden palisades.",
        "Training and marches take a watch. You may send several columns in the same watch.",
      ],
      fx: [],
    });
  },
  resume: () => {
    const loaded = loadGame();
    if (!loaded) return false;
    const cap = empireOf(loaded.players[0]!.empire).capitol;
    set({
      state: setMarchFrom(loaded, cap),
      selected: cap,
      ...resetSend(loaded.territories[cap]),
      pendingOccupy: null,
      pendingAttack: null,
      pendingBattle: null,
      pendingArrival: null,
      pendingWatch: null,
      fx: [],
    });
    return true;
  },
  select: (id) => {
    const s = get();
    const { state, sendLevy, sendBowmen, sendKnights, sendDragons, sendBeasts, sendRams, sendCatapults, sendLadders, sendTowers } = s;
    if (!state || !id) {
      set({ selected: id, state: state ? setMarchFrom(state, null) : state, pendingAttack: null });
      return;
    }
    const human = state.players[0]!;
    const t = state.territories[id];
    if (!t) return;
    const send: SendPart = {
      levy: sendLevy,
      bowmen: sendBowmen,
      knights: sendKnights,
      dragons: sendDragons,
      beasts: sendBeasts,
      rams: sendRams,
      catapults: sendCatapults,
      ladders: sendLadders,
      towers: sendTowers,
    };
    const campId = t.besiegedFrom;
    const camp = campId ? state.territories[campId] : null;
    if (campId && camp && camp.owner === human.id && state.clock.currentPlayer === 0 && campId !== id) {
      const ready = resetSend(camp);
      set({
        selected: campId,
        pendingAttack: composeAttack(camp, campId, id, {
          levy: ready.sendLevy,
          bowmen: ready.sendBowmen,
          knights: ready.sendKnights,
          dragons: ready.sendDragons,
          beasts: ready.sendBeasts,
          rams: ready.sendRams,
          catapults: ready.sendCatapults,
          ladders: ready.sendLadders,
          towers: ready.sendTowers,
        }),
        state: persist(setMarchFrom(state, campId)),
        ...ready,
      });
      return;
    }
    if (
      state.marchFrom &&
      id !== state.marchFrom &&
      state.clock.currentPlayer === 0 &&
      legalMarchTargets(state, state.marchFrom).includes(id)
    ) {
      const fromId = state.marchFrom;
      const fromTerr = state.territories[fromId]!;
      const payload = composeAttack(fromTerr, fromId, id, send);
      const troops = payload.levy + payload.bowmen + payload.knights + payload.dragons + payload.beasts;
      if (troops < 1 && t.besiegedFrom !== fromId) return;
      set({
        selected: fromId,
        pendingAttack: payload,
      });
      return;
    }
    if (t.owner === human.id && state.clock.currentPlayer === 0) {
      const next = persist(setMarchFrom(state, id));
      set({
        selected: id,
        state: next,
        ...resetSend(t),
        pendingAttack: null,
        pendingBattle: null,
      });
      return;
    }
    set({ selected: id, pendingAttack: null });
  },
  focus: (id) => {
    const { state } = get();
    if (!state || !id) {
      set({ selected: id, state: state ? persist(setMarchFrom(state, null)) : state });
      return;
    }
    const t = state.territories[id];
    const human = state.players[0]!;
    if (t && t.owner === human.id && state.clock.currentPlayer === 0) {
      set({
        selected: id,
        state: persist(setMarchFrom(state, id)),
        ...resetSend(t),
      });
      return;
    }
    set({ selected: id, state: persist(setMarchFrom(state, null)) });
  },
  setSend: (part) => {
    set((s) => {
      const next = {
        sendLevy: part.levy ?? s.sendLevy,
        sendBowmen: part.bowmen ?? s.sendBowmen,
        sendKnights: part.knights ?? s.sendKnights,
        sendDragons: part.dragons ?? s.sendDragons,
        sendBeasts: part.beasts ?? s.sendBeasts,
        sendRams: part.rams ?? s.sendRams,
        sendCatapults: part.catapults ?? s.sendCatapults,
        sendLadders: part.ladders ?? s.sendLadders,
        sendTowers: part.towers ?? s.sendTowers,
      };
      const attack = s.pendingAttack
        ? {
            ...s.pendingAttack,
            levy: part.levy ?? s.pendingAttack.levy,
            bowmen: part.bowmen ?? s.pendingAttack.bowmen,
            knights: part.knights ?? s.pendingAttack.knights,
            dragons: part.dragons ?? s.pendingAttack.dragons,
            beasts: part.beasts ?? s.pendingAttack.beasts,
            rams: part.rams ?? s.pendingAttack.rams,
            catapults: part.catapults ?? s.pendingAttack.catapults,
            ladders: part.ladders ?? s.pendingAttack.ladders,
            towers: part.towers ?? s.pendingAttack.towers,
          }
        : s.pendingAttack;
      return { ...next, pendingAttack: attack };
    });
  },
  train: (kind) => {
    const { state, selected } = get();
    if (!state || !selected) return;
    const next = trainUnit(state, selected, kind);
    if (next === state) return;
    const wait = UNIT_TURNS[kind];
    sfx("ok");
    set({
      state: persist(next),
      fx: [
        {
          type: "train",
          player: 0,
          toId: selected,
          kind,
          text: `${UNIT_LABEL[kind]} drilling — ${wait} ${wait === 1 ? "watch" : "watches"}.`,
        },
      ],
    });
  },
  build: (kind) => {
    const { state, selected, pendingAttack } = get();
    const site = isSiegeKind(kind) && pendingAttack ? pendingAttack.from : selected;
    if (!state || !site) return;
    const fn =
      kind === "port"
        ? buildPort
        : kind === "mine"
          ? buildMine
          : kind === "castle"
            ? buildCastle
            : kind === "market"
              ? buildMarket
              : kind === "road"
                ? buildRoad
                : kind === "farm"
                  ? buildFarm
                  : kind === "scorpion"
                    ? buildScorpion
                  : isSiegeKind(kind)
                    ? (s: GameState, id: string) => buildSiege(s, id, kind)
                    : buildShip;
    const next = fn(state, site);
    if (next === state) return;
    const job = next.jobs.find((j) => j.territoryId === site && j.kind === kind);
    const wait = job?.remaining ?? 1;
    const label =
      kind === "castle"
        ? (FORT_LABEL[Math.min(4, fortOf(state.territories[site]!) + 1)] ?? "Walls")
        : kind === "tower"
          ? "Siege tower"
          : kind.charAt(0).toUpperCase() + kind.slice(1);
    sfx("ok");
    set({
      state: persist(next),
      fx: [
        {
          type: "build",
          player: 0,
          toId: site,
          kind,
          text: `${label} raising — ${wait} ${wait === 1 ? "watch" : "watches"}.`,
        },
      ],
    });
  },
  cancelJob: (jobId) => {
    const { state } = get();
    if (!state) return;
    const next = haltJob(state, jobId);
    if (next === state) return;
    sfx("tick");
    set({ state: persist(next) });
  },
  cancelMarch: (marchId) => {
    const { state, selected } = get();
    if (!state) return;
    const next = haltMarch(state, marchId);
    if (next === state) return;
    sfx("tick");
    set({
      state: persist(next),
      ...(selected ? resetSend(next.territories[selected]) : {}),
    });
  },
  march: () => {
    const { state, selected, sendLevy, sendBowmen, sendKnights, sendDragons, sendBeasts } = get();
    if (!state || !selected || !state.marchFrom) return;
    const next = resolveAttack(state, state.marchFrom, selected, {
      levy: sendLevy,
      bowmen: sendBowmen,
      knights: sendKnights,
      dragons: sendDragons,
      beasts: sendBeasts,
    });
    set({ state: persist(next), ...resetSend(next.territories[selected]) });
  },
  play: (card) => {
    const { state, selected } = get();
    if (!state) return;
    set({ state: persist(playCard(state, card, selected ?? undefined)), pendingOccupy: null });
  },
  occupyHold: () => set({ pendingOccupy: null }),
  occupyRecall: (recall) => {
    const { state, pendingOccupy } = get();
    if (!state || !pendingOccupy) return;
    const next = persist(recallOccupiers(state, pendingOccupy.from, pendingOccupy.to, recall));
    const t = next.territories[pendingOccupy.to];
    set({
      state: next,
      pendingOccupy: null,
      selected: pendingOccupy.to,
      ...resetSend(t),
    });
  },
  confirmAttack: () => {
    const { state, pendingAttack } = get();
    if (!state || !pendingAttack) return;
    const fromId = pendingAttack.from;
    const toId = pendingAttack.to;
    const force: HostForce = {
      levy: pendingAttack.levy,
      bowmen: pendingAttack.bowmen,
      knights: pendingAttack.knights,
      dragons: pendingAttack.dragons,
      beasts: pendingAttack.beasts,
    };
    const next = issueMarch(state, fromId, toId, force, {
      rams: pendingAttack.rams,
      catapults: pendingAttack.catapults,
      ladders: pendingAttack.ladders,
      towers: pendingAttack.towers,
    });
    if (next === state) return;
    sfx("ok");
    set({
      state: persist(setMarchFrom(next, fromId)),
      selected: fromId,
      ...resetSend(next.territories[fromId]),
      pendingAttack: null,
      pendingBattle: null,
      pendingOccupy: null,
      fx: (next.events ?? []).filter((e) => e.type === "march").slice(-3),
    });
  },
  laySiege: () => {
    const { state, pendingAttack } = get();
    if (!state || !pendingAttack) return;
    const dest = state.territories[pendingAttack.to]!;
    if (dest.owner === 0) return;
    const next = persist(beginSiege(state, pendingAttack.from, pendingAttack.to));
    if (next === state) return;
    const place = TERRITORY_BY_ID[pendingAttack.to]?.name ?? "the city";
    sfx("ok");
    set({
      state: setMarchFrom(next, pendingAttack.from),
      pendingAttack,
      selected: pendingAttack.from,
      ...resetSend(next.territories[pendingAttack.from]),
      fx: [
        {
          type: "build",
          player: 0,
          fromId: pendingAttack.from,
          toId: pendingAttack.to,
          kind: "ram",
          text: `Siege of ${place} begins. Raise rams, ladders, towers and catapults here.`,
        },
      ],
    });
  },
  cancelAttack: () => {
    const { pendingAttack } = get();
    set({ pendingAttack: null, selected: pendingAttack?.from ?? null });
  },
  battleFinish: (outcome) => {
    const { state, pendingBattle, pendingArrival } = get();
    if (!state || !pendingBattle) return;
    const fromId = pendingBattle.fromId;
    const toId = pendingBattle.toId;
    const humanAttack = pendingBattle.humanSide === "atk";
    const order = pendingArrival ?? (state.arrivals ?? []).find((a) => a.from === fromId && a.to === toId) ?? null;
    let next = consumeSiege(state, fromId, outcome.used);
    if (order) {
      next = settleArrival(next, order, outcome.atkLeft, outcome.defLeft);
    } else {
      next = commitBattle(next, fromId, toId, pendingBattle.force, outcome.atkLeft, outcome.defLeft);
    }
    const captured = next.territories[toId]?.owner === 0;
    let more = { state: next, battle: null as RaidState | null };
    if (!next.players[next.clock.currentPlayer]!.human) {
      more = playAiTurnsUntilBattle(next);
      next = more.state;
    }
    const cap = empireOf(next.players[0]!.empire).capitol;
    const ownedCap = next.territories[cap]?.owner === 0 ? cap : null;
    const occupy = humanAttack && captured && outcome.winner === "atk";
    const nextIncoming = (next.arrivals ?? [])[0] ?? null;
    set({
      state: persist(occupy ? setMarchFrom(next, toId) : ownedCap ? setMarchFrom(next, ownedCap) : next),
      selected: occupy ? toId : ownedCap,
      ...(occupy ? resetSend(next.territories[toId]) : resetSend(ownedCap ? next.territories[ownedCap] : undefined)),
      pendingBattle: more.battle,
      pendingArrival: more.battle ? (next.arrivals ?? [])[0] ?? null : nextIncoming && next.clock.currentPlayer === 0 ? nextIncoming : null,
      pendingAttack: null,
      pendingOccupy: occupy ? { from: fromId, to: toId } : null,
      pendingWatch: null,
    });
  },
  battleCancel: (outcome) => {
    const { state, pendingBattle, pendingArrival } = get();
    if (!state || !pendingBattle || pendingBattle.humanSide !== "atk") return;
    if (!outcome) {
      if (pendingArrival) {
        const next = persist(abortArrival(state, pendingArrival));
        set({
          state: next,
          pendingBattle: null,
          pendingArrival: null,
          selected: pendingBattle.fromId,
          ...resetSend(next.territories[pendingBattle.fromId]),
        });
        return;
      }
      set({ pendingBattle: null, pendingArrival: null, selected: pendingBattle.fromId });
      return;
    }
    const order = pendingArrival ?? (state.arrivals ?? []).find((a) => a.from === pendingBattle.fromId && a.to === pendingBattle.toId) ?? null;
    let next = consumeSiege(state, pendingBattle.fromId, outcome.used);
    if (order) next = persist(settleArrival(next, order, outcome.atkLeft, outcome.defLeft));
    else next = persist(commitBattle(next, pendingBattle.fromId, pendingBattle.toId, pendingBattle.force, outcome.atkLeft, outcome.defLeft));
    set({
      state: next,
      selected: pendingBattle.fromId,
      pendingBattle: null,
      pendingArrival: null,
      ...resetSend(next.territories[pendingBattle.fromId]),
    });
  },
  dismissWatch: () => {
    const { state } = get();
    const incoming = state ? popArrival(state) : null;
    if (!state || !incoming) {
      set({ pendingWatch: null });
      return;
    }
    const side = incoming.player === 0 ? "atk" : "def";
    const battle = openRaid(
      state,
      incoming.from,
      incoming.to,
      { levy: incoming.levy, bowmen: incoming.bowmen, knights: incoming.knights, dragons: incoming.dragons, beasts: incoming.beasts },
      { rams: incoming.rams, catapults: incoming.catapults, ladders: incoming.ladders, towers: incoming.towers },
      side,
    );
    set({ pendingWatch: null, pendingBattle: battle, pendingArrival: incoming, selected: incoming.to });
  },
  finishTurn: () => {
    const { state } = get();
    if (!state) return;
    const before = state;
    let next = endTurn(state);
    const paused = playAiTurnsUntilBattle(next);
    next = paused.state;
    const drained = drainEvents(next, 0);
    next = drained.next;
    const cap = empireOf(next.players[0]!.empire).capitol;
    const ownedCap = next.territories[cap]?.owner === 0 ? cap : null;
    const report = watchReport(before, { ...next, events: drained.events });
    set({
      state: persist(ownedCap ? setMarchFrom(next, ownedCap) : next),
      selected: ownedCap,
      ...resetSend(ownedCap ? next.territories[ownedCap] : undefined),
      pendingOccupy: null,
      pendingAttack: null,
      pendingBattle: paused.battle,
      pendingArrival: paused.battle ? (next.arrivals ?? [])[0] ?? null : null,
      pendingWatch: paused.battle ? null : report,
      fx: drained.events.map((e) => ({ ...e, text: "" })),
    });
  },
  abandon: () => {
    clearSave();
    set({
      state: null,
      selected: null,
      pendingOccupy: null,
      pendingAttack: null,
      pendingBattle: null,
      pendingWatch: null,
      pendingArrival: null,
      fx: [],
    });
  },
}));
