import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Footprints, Hammer, Swords } from "lucide-react";
import { legalMarchTargets } from "@/lib/game/engine";
import { useGame } from "@/lib/game/store";
import type { Difficulty, EmpireId, Opening } from "@/lib/game/types";
import { HOUSES } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { EndScreen } from "./EndScreen";
import { Hud } from "./Hud";
import { ActionSheet, AttackPreview, OccupySheet, WatchReport, type ActionKind, ProvinceBanner } from "./Inspector";
import { WorldMap } from "./WorldMap";
import { Hint } from "./Hint";

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
    sendKnights,
    sendDragons,
    sendBeasts,
    pendingOccupy,
    pendingAttack,
    pendingWatch,
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
    cancelAttack,
    dismissWatch,
    finishTurn,
    abandon,
  } = useGame();
  const [action, setAction] = useState<ActionKind | null>(null);

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empire, difficulty, opening]);

  if (!state) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        Drawing the world…
      </main>
    );
  }

  const from = state.marchFrom;
  const targets = from && action === "march" ? legalMarchTargets(state, from) : [];

  function handleSelect(id: string) {
    if (action === "march") select(id);
    else focus(id);
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <div className="shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
        <Hud
          state={state}
          onEnd={finishTurn}
          onQuit={() => {
            abandon();
            nav({ to: "/" });
          }}
        />
      </div>
      <div className="relative min-h-0 flex-1 px-3 pt-2 sm:px-4">
        <WorldMap
          state={state}
          selected={selected}
          targets={targets}
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
        {pendingAttack ? (
          <div className="absolute inset-x-3 bottom-2 z-20 sm:inset-x-4">
            <AttackPreview
              state={state}
              fromId={pendingAttack.from}
              toId={pendingAttack.to}
              levy={pendingAttack.levy}
              knights={pendingAttack.knights}
              dragons={pendingAttack.dragons}
              beasts={pendingAttack.beasts}
              onContinue={confirmAttack}
              onCancel={cancelAttack}
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
            <WatchReport lines={pendingWatch} onDismiss={dismissWatch} />
          </div>
        ) : action ? (
          <div className="absolute inset-x-3 bottom-2 z-20 sm:inset-x-4">
            <ActionSheet
              action={action}
              state={state}
              selected={selected}
              sendLevy={sendLevy}
              sendKnights={sendKnights}
              sendDragons={sendDragons}
              sendBeasts={sendBeasts}
              onSend={setSend}
              onTrain={train}
              onBuild={build}
              onPlay={play}
              onMarchTo={select}
            />
          </div>
        ) : null}
      </div>
      <nav className="grid shrink-0 grid-cols-3 gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        {(
          [
            ["train", "Train", Swords, "Raise men (1/1), knights (2/2), or one dragon (25/25) in the selected city. House beasts hunt (13–16 attack, 3 silver wages) and raise only at your capital."],
            ["march", "March", Footprints, "Set the host, then tap a neighbour to attack or reinforce."],
            ["build", "Build", Hammer, "Raise a port, mine, market, walls or ship in the selected land."],
          ] as const
        ).map(([id, label, Icon, hint]) => (
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
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          </div>
        ))}
      </nav>
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
  );
}
