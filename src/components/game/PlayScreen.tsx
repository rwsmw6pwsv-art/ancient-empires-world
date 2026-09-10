import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { legalMarchTargets } from "@/lib/game/engine";
import { useGame } from "@/lib/game/store";
import type { Difficulty, EmpireId, Opening } from "@/lib/game/types";
import { HOUSES } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { EndScreen } from "./EndScreen";
import { BattleScreen } from "./BattleScreen";
import { Hud } from "./Hud";
import { ActionSheet, AttackPreview, OccupySheet, WatchReport, type ActionKind, ProvinceBanner } from "./Inspector";
import { WorldMap } from "./WorldMap";
import { ActionIcon } from "./Cost";
import { Hint } from "./Hint";
import { LoadingScreen, ScreenGate } from "./LoadingScreen";

export function PlayScreen({
  empire,
  difficulty,
  opening,
}: {
  empire: string;
  difficulty: string;
  opening: string;
}) {
  const nav = useNavigate();
  const {
    state,
    selected,
    sendLevy,
    sendBowmen,
    sendKnights,
    sendDragons,
    sendBeasts,
    sendRams,
    sendCatapults,
    sendLadders,
    sendTowers,
    pendingOccupy,
    pendingAttack,
    pendingBattle,
    pendingWatch,
    fx,
    newGame,
    resume,
    select,
    focus,
    setSend,
    train,
    build,
    play,
    occupyHold,
    occupyRecall,
    confirmAttack,
    laySiege,
    cancelAttack,
    cancelJob,
    cancelMarch,
    battleFinish,
    battleCancel,
    dismissWatch,
    finishTurn,
    leave,
    abandon,
  } = useGame();
  const [action, setAction] = useState<ActionKind | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!fx.length) return;
    const t = window.setTimeout(() => useGame.setState({ fx: [] }), 1400);
    return () => window.clearTimeout(t);
  }, [fx]);

  useEffect(() => {
    setBootError(null);
    try {
      if (empire === "resume") {
        if (!resume()) nav({ to: "/" });
        return;
      }
      if (!(HOUSES as readonly string[]).includes(empire)) {
        nav({ to: "/" });
        return;
      }
      newGame({
        empire: empire as EmpireId,
        difficulty: (["easy", "normal", "hard"].includes(difficulty) ? difficulty : "normal") as Difficulty,
        opening: "capital" as Opening,
      });
    } catch (err) {
      setBootError(err instanceof Error ? err.message : "The world failed to open.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empire, difficulty, opening]);

  if (bootError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
        <p className="font-display text-xl">The world would not open</p>
        <p className="max-w-md text-sm text-muted">{bootError}</p>
        <button type="button" className="text-sm underline" onClick={() => nav({ to: "/" })}>
          Return to the empires
        </button>
      </main>
    );
  }

  if (!state) {
    if (leaving.current) return null;
    return <LoadingScreen label="Generating the world" wait />;
  }

  const from = state.marchFrom;
  const marchTargets = from && action === "march" ? legalMarchTargets(state, from) : [];
  const targets = pendingAttack ? Array.from(new Set([...marchTargets, pendingAttack.to])) : marchTargets;

  function handleSelect(id: string) {
    if (!state) return;
    const t = state.territories[id];
    const campId = t?.besiegedFrom;
    const ourSiege = Boolean(campId && state.territories[campId]?.owner === 0);
    if (action === "march" || pendingAttack || ourSiege) select(id);
    else focus(id);
  }

  return (
    <ScreenGate pack="play" label="Generating the world">
    <main className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <div className="shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
        <Hud
          state={state}
          onEnd={finishTurn}
          onQuit={() => {
            leaving.current = true;
            leave();
            void nav({ to: "/" });
          }}
        />
      </div>
      <div className="relative min-h-0 flex-1 px-3 pt-2 sm:px-4">
        <WorldMap
          state={state}
          selected={selected}
          targets={targets}
          fx={fx}
          onSelect={handleSelect}
          onTap={(id) => {
            if (pendingAttack) {
              if (!id) cancelAttack();
              return;
            }
            if (pendingOccupy) occupyHold();
            if (pendingWatch) dismissWatch();
            if (
              action === "march" &&
              id &&
              from &&
              legalMarchTargets(state, from).includes(id)
            ) {
              return;
            }
            setAction(null);
          }}
        />
        <div className="pointer-events-none absolute left-5 top-4 right-5 z-10 sm:left-6 sm:right-auto">
          <ProvinceBanner state={state} selected={selected} />
        </div>
        {fx.some((e) => e.text) ? (
          <div className="pointer-events-none absolute inset-x-8 top-16 z-20 flex flex-col items-center gap-1 sm:top-20">
            {fx
              .filter((e) => e.text)
              .slice(-3)
              .map((e, i) => (
                <p key={`${e.type}-${e.toId}-${i}`} className="fx-toast">
                  {e.text}
                </p>
              ))}
          </div>
        ) : null}
        {pendingAttack && !pendingBattle ? (
          <div className="absolute inset-x-3 bottom-2 z-20 sm:inset-x-4">
            <AttackPreview
              state={state}
              fromId={pendingAttack.from}
              toId={pendingAttack.to}
              levy={pendingAttack.levy}
              bowmen={pendingAttack.bowmen}
              knights={pendingAttack.knights}
              dragons={pendingAttack.dragons}
              beasts={pendingAttack.beasts}
              rams={pendingAttack.rams}
              catapults={pendingAttack.catapults}
              ladders={pendingAttack.ladders}
              towers={pendingAttack.towers}
              onContinue={confirmAttack}
              onSiege={laySiege}
              onCancel={cancelAttack}
              onBuild={build}
              onSend={setSend}
              onCancelJob={cancelJob}
            />
          </div>
        ) : pendingOccupy ? (
          <div className="absolute inset-x-3 bottom-2 z-20 sm:inset-x-4">
            <OccupySheet
              state={state}
              fromId={pendingOccupy.from}
              toId={pendingOccupy.to}
              onHold={occupyHold}
              onRecall={occupyRecall}
            />
          </div>
        ) : pendingWatch ? (
          <div className="absolute inset-x-3 bottom-2 z-20 sm:inset-x-4">
            <WatchReport lines={pendingWatch.lines} shifts={pendingWatch.shifts} onDismiss={dismissWatch} />
          </div>
        ) : action ? (
          <div className="absolute inset-x-3 bottom-2 z-20 sm:inset-x-4">
            <ActionSheet
              action={action}
              state={state}
              selected={selected}
              sendLevy={sendLevy}
              sendBowmen={sendBowmen}
              sendKnights={sendKnights}
              sendDragons={sendDragons}
              sendBeasts={sendBeasts}
              sendRams={sendRams}
              sendCatapults={sendCatapults}
              sendLadders={sendLadders}
              sendTowers={sendTowers}
              onSend={setSend}
              onTrain={train}
              onBuild={build}
              onPlay={play}
              onMarchTo={select}
              onCancelJob={cancelJob}
              onCancelMarch={cancelMarch}
            />
          </div>
        ) : null}
      </div>
      {!pendingBattle ? (
        <nav className="grid shrink-0 grid-cols-2 gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:grid-cols-4 sm:px-4">
          {(
            [
              ["train", "Train", "Raise warriors, archers and knights anywhere you hold. Beasts on that region's lands. Dragons only at a capital. Warships at a harbour."],
              ["march", "Move", "Move the host to a neighbour. On waters, sail the fleet or disembark the army onto land."],
              ["build", "Build", "Ports, mines, markets, farms, roads and ships."],
              ["defend", "Defend", "Walls, outer walls, keep, towers, moats and scorpions — the city ring."],
            ] as const
          ).map(([id, label, hint]) => (
            <div key={id} className="flex items-center gap-1">
              <Hint text={hint} />
              <button
                type="button"
                onClick={() => {
                  if (id === "march" && selected && state.territories[selected]?.owner === 0) {
                    focus(selected);
                  }
                  setAction((cur) => (cur === id ? null : id));
                }}
                className={cn(
                  "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-raised text-sm font-medium transition-[filter,background-color,box-shadow] duration-100",
                  action === id && "border-fg bg-surface text-fg",
                )}
              >
                <ActionIcon kind={id} />
                {label}
              </button>
            </div>
          ))}
        </nav>
      ) : null}
      {pendingBattle ? (
        <BattleScreen
          state={state}
          battle={pendingBattle}
          onFinish={battleFinish}
          onCancel={battleCancel}
        />
      ) : null}
      {state.phase === "gameover" ? (
        <EndScreen
          state={state}
          onMenu={() => {
            abandon();
            nav({ to: "/" });
          }}
        />
      ) : null}
    </main>
    </ScreenGate>
  );
}
