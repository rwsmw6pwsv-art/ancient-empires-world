import { empireOf } from "./empires";
import { create } from "zustand";
import { playAiTurnsUntilBattle } from "./ai";
import {
  autoVolley,
  battleOutcome,
  battleWinner,
  hostFromSide,
  openBattle,
  strikeBattle,
  type BattleState,
} from "./battle";
import {
  buildCastle,
  buildMarket,
  buildMine,
  buildPort,
  buildShip,
  buildRoad,
  buildFarm,
  commitBattle,
  createNewGame,
  endTurn,
  legalMarchTargets,
  playCard,
  resolveAttack,
  recallOccupiers,
  setMarchFrom,
  trainUnit,
  watchReport,
  worksDefense,
} from "./engine";
import { clearSave, loadGame, saveGame } from "./save";
import type { CardId, Difficulty, EmpireId, GameState, HostForce, JobKind, Opening, UnitKind } from "./types";

interface GameStore {
  state: GameState | null;
  selected: string | null;
  sendLevy: number;
  sendKnights: number;
  sendDragons: number;
  sendBeasts: number;
  pendingOccupy: { from: string; to: string } | null;
  pendingAttack: { from: string; to: string; levy: number; knights: number; dragons: number; beasts: number } | null;
  pendingBattle: BattleState | null;
  pendingWatch: string[] | null;
  newGame: (opts: { empire: EmpireId; difficulty?: Difficulty; opening?: Opening }) => void;
  resume: () => boolean;
  select: (id: string | null) => void;
  focus: (id: string | null) => void;
  setSend: (part: Partial<{ levy: number; knights: number; dragons: number; beasts: number }>) => void;
  train: (kind: UnitKind) => void;
  build: (kind: JobKind) => void;
  march: () => void;
  play: (card: CardId) => void;
  occupyHold: () => void;
  occupyRecall: (recall: { levy: number; knights: number; dragons: number; beasts: number; ships?: number }) => void;
  confirmAttack: () => void;
  cancelAttack: () => void;
  battleStrike: (attackerId: string, targetId: string) => void;
  battleAuto: () => void;
  battleFinish: () => void;
  battleCancel: () => void;
  dismissWatch: () => void;
  finishTurn: () => void;
  abandon: () => void;
}

function persist(state: GameState) {
  saveGame(state);
  return state;
}

export const useGame = create<GameStore>((set, get) => ({
  state: null,
  selected: null,
  sendLevy: 1,
  sendKnights: 0,
  sendDragons: 0,
  sendBeasts: 0,
  pendingOccupy: null,
  pendingAttack: null,
  pendingBattle: null,
  pendingWatch: null,
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
      sendLevy: t ? Math.max(1, t.levy) : 1,
      sendKnights: 0,
      sendDragons: 0,
      sendBeasts: 0,
      pendingOccupy: null,
      pendingAttack: null,
  pendingBattle: null,
      pendingWatch: null,
    });
  },
  resume: () => {
    const loaded = loadGame();
    if (!loaded) return false;
    const cap = empireOf(loaded.players[0]!.empire).capitol;
    set({
      state: setMarchFrom(loaded, cap),
      selected: cap,
      sendLevy: loaded.territories[cap]?.levy ?? 1,
      sendKnights: 0,
      sendDragons: 0,
      sendBeasts: 0,
      pendingOccupy: null,
      pendingAttack: null,
  pendingBattle: null,
      pendingWatch: null,
    });
    return true;
  },
  select: (id) => {
    const { state, sendLevy, sendKnights, sendDragons, sendBeasts } = get();
    if (!state || !id) {
      set({ selected: id, state: state ? setMarchFrom(state, null) : state, pendingAttack: null });
      return;
    }
    const human = state.players[0]!;
    if (
      state.marchFrom &&
      id !== state.marchFrom &&
      state.clock.currentPlayer === 0 &&
      legalMarchTargets(state, state.marchFrom).includes(id)
    ) {
      const fromId = state.marchFrom;
      const fromTerr = state.territories[fromId]!;
      const levy = Math.min(sendLevy, fromTerr.levy);
      const knights = Math.min(sendKnights, fromTerr.knights);
      const dragons = Math.min(sendDragons, fromTerr.dragons);
      const beasts = Math.min(sendBeasts, fromTerr.beasts ?? 0);
      if (levy + knights + dragons + beasts < 1) return;
      set({
        selected: id,
        pendingAttack: {
          from: fromId,
          to: id,
          levy,
          knights,
          dragons,
          beasts,
        },
      });
      return;
    }
    const t = state.territories[id];
    if (t && t.owner === human.id && state.clock.currentPlayer === 0) {
      const next = persist(setMarchFrom(state, id));
      set({
        selected: id,
        state: next,
        sendLevy: Math.max(1, t.levy),
        sendKnights: 0,
        sendDragons: 0,
        sendBeasts: t.beasts ?? 0,
        pendingAttack: null,
  pendingBattle: null,
      });
      return;
    }
    set({ selected: id });
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
        sendLevy: Math.max(1, t.levy),
        sendKnights: 0,
        sendDragons: 0,
        sendBeasts: t.beasts ?? 0,
      });
      return;
    }
    set({ selected: id, state: persist(setMarchFrom(state, null)) });
  },
  setSend: (part) => {
    set((s) => ({
      sendLevy: part.levy ?? s.sendLevy,
      sendKnights: part.knights ?? s.sendKnights,
      sendDragons: part.dragons ?? s.sendDragons,
      sendBeasts: part.beasts ?? s.sendBeasts,
    }));
  },
  train: (kind) => {
    const { state, selected } = get();
    if (!state || !selected) return;
    set({ state: persist(trainUnit(state, selected, kind)) });
  },
  build: (kind) => {
    const { state, selected } = get();
    if (!state || !selected) return;
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
                  : buildShip;
    set({ state: persist(fn(state, selected)) });
  },
  march: () => {
    const { state, selected, sendLevy, sendKnights, sendDragons, sendBeasts } = get();
    if (!state || !selected || !state.marchFrom) return;
    const next = resolveAttack(state, state.marchFrom, selected, {
      levy: sendLevy,
      knights: sendKnights,
      dragons: sendDragons,
      beasts: sendBeasts,
    });
    set({ state: persist(next), sendLevy: 1, sendKnights: 0, sendDragons: 0, sendBeasts: 0 });
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
      sendLevy: Math.max(1, t?.levy ?? 1),
      sendKnights: 0,
      sendDragons: 0,
      sendBeasts: 0,
    });
  },
  confirmAttack: () => {
    const { state, pendingAttack } = get();
    if (!state || !pendingAttack) return;
    const fromId = pendingAttack.from;
    const toId = pendingAttack.to;
    const dest = state.territories[toId]!;
    const force: HostForce = {
      levy: pendingAttack.levy,
      knights: pendingAttack.knights,
      dragons: pendingAttack.dragons,
      beasts: pendingAttack.beasts,
    };
    if (dest.owner === 0) {
      const next = persist(resolveAttack(state, fromId, toId, force));
      set({
        state: setMarchFrom(next, toId),
        selected: toId,
        sendLevy: Math.max(1, next.territories[toId]!.levy),
        sendKnights: 0,
        sendDragons: 0,
        sendBeasts: 0,
        pendingAttack: null,
        pendingBattle: null,
        pendingOccupy: null,
      });
      return;
    }
    const battle = openBattle(state, fromId, toId, force, "atk", worksDefense(dest));
    if (!battle) return;
    set({ pendingAttack: null, pendingBattle: battle, selected: toId });
  },
  cancelAttack: () => {
    const { pendingAttack } = get();
    set({ pendingAttack: null, selected: pendingAttack?.from ?? null });
  },
  battleStrike: (attackerId, targetId) => {
    const { pendingBattle } = get();
    if (!pendingBattle) return;
    set({ pendingBattle: strikeBattle(pendingBattle, attackerId, targetId) });
  },
  battleAuto: () => {
    const { pendingBattle } = get();
    if (!pendingBattle) return;
    set({ pendingBattle: autoVolley(pendingBattle) });
  },
  battleFinish: () => {
    const { state, pendingBattle } = get();
    if (!state || !pendingBattle) return;
    const winner = battleWinner(pendingBattle);
    if (!winner) return;
    const { atkLeft, defLeft } = battleOutcome(pendingBattle);
    const fromId = pendingBattle.fromId;
    const toId = pendingBattle.toId;
    const humanAttack = pendingBattle.humanSide === "atk";
    let next = commitBattle(state, fromId, toId, pendingBattle.force, atkLeft, defLeft);
    const captured = next.territories[toId]?.owner === 0;
    let more = { state: next, battle: null as BattleState | null };
    if (!next.players[next.clock.currentPlayer]!.human) {
      more = playAiTurnsUntilBattle(next);
      next = more.state;
    }
    const cap = empireOf(next.players[0]!.empire).capitol;
    const ownedCap = next.territories[cap]?.owner === 0 ? cap : null;
    const occupy = humanAttack && captured && winner === "atk";
    set({
      state: persist(occupy ? setMarchFrom(next, toId) : ownedCap ? setMarchFrom(next, ownedCap) : next),
      selected: occupy ? toId : ownedCap,
      sendLevy: occupy
        ? Math.max(1, next.territories[toId]!.levy)
        : ownedCap
          ? Math.max(1, next.territories[ownedCap]!.levy)
          : 1,
      sendKnights: 0,
      sendDragons: 0,
      sendBeasts: 0,
      pendingBattle: more.battle,
      pendingAttack: null,
      pendingOccupy: occupy ? { from: fromId, to: toId } : null,
      pendingWatch: null,
    });
  },
  battleCancel: () => {
    const { state, pendingBattle } = get();
    if (!state || !pendingBattle || pendingBattle.humanSide !== "atk") return;
    if (pendingBattle.strikes < 1) {
      set({ pendingBattle: null, selected: pendingBattle.fromId });
      return;
    }
    const atkLeft = hostFromSide(pendingBattle.stacks, "atk");
    const defLeft = hostFromSide(pendingBattle.stacks, "def");
    const next = persist(commitBattle(state, pendingBattle.fromId, pendingBattle.toId, pendingBattle.force, atkLeft, defLeft));
    set({
      state: next,
      selected: pendingBattle.fromId,
      pendingBattle: null,
      sendLevy: Math.max(1, next.territories[pendingBattle.fromId]?.levy ?? 1),
      sendKnights: 0,
      sendDragons: 0,
      sendBeasts: 0,
    });
  },
  dismissWatch: () => set({ pendingWatch: null }),
  finishTurn: () => {
    const { state } = get();
    if (!state) return;
    const before = state;
    let next = endTurn(state);
    const paused = playAiTurnsUntilBattle(next);
    next = paused.state;
    const cap = empireOf(next.players[0]!.empire).capitol;
    const ownedCap = next.territories[cap]?.owner === 0 ? cap : null;
    const report = watchReport(before, next);
    set({
      state: persist(ownedCap ? setMarchFrom(next, ownedCap) : next),
      selected: ownedCap,
      sendLevy: ownedCap ? Math.max(1, next.territories[ownedCap]!.levy) : 1,
      sendKnights: 0,
      sendDragons: 0,
      sendBeasts: 0,
      pendingOccupy: null,
      pendingAttack: null,
      pendingBattle: paused.battle,
      pendingWatch: paused.battle ? null : report.length ? report : null,
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
    });
  },
}));
