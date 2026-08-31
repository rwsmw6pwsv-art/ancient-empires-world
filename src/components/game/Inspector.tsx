import { useState } from "react";
import { empireOf } from "@/lib/game/empires";
import { constructionBusy, defenseStrength, forceStrength, hasJob, hostAttack, hostDefense, legalMarchTargets, oddsLabel, shipsCap, standing, worksCost, worksRank } from "@/lib/game/engine";
import type { EmpireId, GameState, JobKind, UnitKind } from "@/lib/game/types";
import { CAPITOL, CONTINENT_NAMES, UNIT_COST, WORKS_CAP } from "@/lib/game/types";
import { TERRITORY_BY_ID, seaNeighbors } from "@/lib/game/world";
import { landscapeOf, beastOf, FAUNA_LABEL, RESOURCE_LABEL, TERRAIN_LABEL, WONDER_LABEL } from "@/lib/game/landscape";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sfx";
import { CostRow } from "./Cost";
import { Hint } from "./Hint";

export type ActionKind = "train" | "march" | "build";

const TRAIN_HINT = {
  levy: "Raise men here. Attack 1, defence 1. Costs gold and metal. One silver wage per two men, at least one while they stand.",
  knight: "Raise a knight here. Attack 2, defence 2. Costs gold and metal.",
  dragon: "Raise a dragon here. Attack 25, defence 25. Costs 25 gold. One dragon per province.",
} as const;

const BUILD_HINT: Record<string, string> = {
  port: "A harbour on the coast. Pays trade, and can be improved twice with gold for more trade.",
  castle: "Raise walls around this city (+12 defence). Improve them with gold into a keep, then a citadel.",
  market: "A trade post. Improve with gold up to rank III for more trade.",
  mine: "Inland goldworks. Improve with gold to raise tribute and silver from silver veins.",
  ship: "Lay another keel. Improved harbours hold more (2 / 4 / 6). Each ship sails with a column, pays two trade gold, and lets this harbour strike the sea again the same watch.",
  road: "Pave this land. A trade route forms with every neighbouring paved city you hold, and pays gold each watch.",
  farm: "Sow fields or fisheries. Pays food each watch. Improve with gold. Citizens starve without enough grain.",
};

const CARD_HINT: Record<string, string> = {
  levy: "Call two men in this city at once.",
  forge: "Gain 4 gold, 2 stone and 2 metal.",
  tide: "Gain 4 timber.",
  raid: "Strike two from a selected enemy host.",
  wall: "Raise walls here at once.",
};

export function ProvinceBanner({ state, selected }: { state: GameState; selected: string | null }) {
  if (!selected) {
    return (
      <div className="pointer-events-none rounded-[var(--radius-md)] border border-border bg-surface/85 px-3 py-2 text-xs text-muted backdrop-blur-sm">
        Tap a province.
      </div>
    );
  }
  const meta = TERRITORY_BY_ID[selected]!;
  const t = state.territories[selected]!;
  const ownerLabel =
    t.owner === "barbarian" ? "Independent tribes" : empireOf(state.players[t.owner]!.empire).name;
  const land = landscapeOf(selected);
  const isCap = Object.values(CAPITOL).includes(selected);
  const capHouse = isCap ? Object.entries(CAPITOL).find(([, id]) => id === selected)?.[0] : null;
  const ownerBeast = t.owner === "barbarian" ? null : beastOf(state.players[t.owner]!.empire);
  const beastName = ownerBeast?.name ?? "Beasts";
  return (
    <div className="pointer-events-none max-w-md rounded-[var(--radius-md)] border border-border bg-surface/90 px-3 py-2 backdrop-blur-sm">
      <p className="font-display text-sm tracking-wide uppercase">{meta.name}</p>
      <p className="text-xs text-muted">
        {CONTINENT_NAMES[meta.continent]}
        {capHouse ? ` · capital of ${empireOf(capHouse as EmpireId).name}` : ` · ${ownerLabel}`}
      </p>
      <p className="mt-1 text-xs tabular-nums text-fg">
        Attack {hostAttack(state, t)} · Defence {hostDefense(state, t)} · Men {t.levy} · Knights {t.knights} ·{" "}
        {beastName} {t.beasts ?? 0} · Dragons {t.dragons} · Host {standing(t)} · Citizens {t.population ?? 0}
      </p>
      <p className="text-xs text-muted">
        {TERRAIN_LABEL[land.terrain]}
        {t.owner !== "barbarian" ? " · City" : ""}
        {t.castle ? ` · Walls${worksRank(t, "castle") > 1 ? ` ${"I".repeat(worksRank(t, "castle"))}` : ""}` : ""}
        {t.market ? ` · Market${worksRank(t, "market") > 1 ? ` ${"I".repeat(worksRank(t, "market"))}` : ""}` : ""}
        {t.port ? ` · Port${worksRank(t, "port") > 1 ? ` ${"I".repeat(worksRank(t, "port"))}` : ""} · ${t.ships} ships` : t.mine ? ` · Mine${worksRank(t, "mine") > 1 ? ` ${"I".repeat(worksRank(t, "mine"))}` : ""}` : ""}
        {t.road ? " · Road" : ""}
        {t.farm ? ` · Farm${worksRank(t, "farm") > 1 ? ` ${"I".repeat(worksRank(t, "farm"))}` : ""}` : ""}
      </p>
      {land.wonder ? <p className="text-xs text-fg">{WONDER_LABEL[land.wonder]}</p> : null}
      {land.fauna ? <p className="text-xs text-muted">{FAUNA_LABEL[land.fauna]} roam here</p> : null}
      {t.owner === "barbarian" ? (
        <p className="text-xs text-muted">
          {t.pressure > 0
            ? "Camp is reeling from a raid."
            : t.castle || t.knights
              ? "Palisaded camp — will raid neighbouring empires if left."
              : "Stout camp — will raid neighbouring empires if left."}
        </p>
      ) : null}
      {isCap ? <p className="text-xs text-muted">Capital mint — pays silver each watch</p> : null}
      {land.resource ? (
        <p className="text-xs text-muted">
          rich in {RESOURCE_LABEL[land.resource]}
          {t.market || t.port ? " · trade bonus" : " · raise a market or port to trade it"}
        </p>
      ) : null}
    </div>
  );
}

export function ActionSheet({
  action,
  state,
  selected,
  sendLevy,
  sendKnights,
  sendDragons,
  sendBeasts,
  onSend,
  onTrain,
  onBuild,
  onPlay,
  onMarchTo,
}: {
  action: ActionKind;
  state: GameState;
  selected: string | null;
  sendLevy: number;
  sendKnights: number;
  sendDragons: number;
  sendBeasts: number;
  onSend: (part: Partial<{ levy: number; knights: number; dragons: number; beasts: number }>) => void;
  onTrain: (kind: UnitKind) => void;
  onBuild: (kind: JobKind) => void;
  onPlay: (card: "levy" | "forge" | "tide" | "raid" | "wall") => void;
  onMarchTo: (id: string) => void;
}) {
  if (!selected) {
    return (
      <div className="panel p-4 text-sm text-muted">
        Select one of your provinces, then {action}.
      </div>
    );
  }
  const meta = TERRITORY_BY_ID[selected]!;
  const t = state.territories[selected]!;
  const human = state.players[0]!;
  const mine = t.owner === 0 && state.clock.currentPlayer === 0 && state.phase === "play";
  const busy = constructionBusy(state, selected);
  const job = hasJob(state, selected);
  const isCap = Object.values(CAPITOL).includes(selected);

  if (!mine) {
    return (
      <div className="panel p-4 text-sm text-muted">
        {t.owner === 0 ? "Wait for your watch." : "This land is not yours. March from a province you hold."}
      </div>
    );
  }

  if (action === "train") {
    return (
      <div className="panel action-sheet flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Train</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["levy", "knight", "dragon"] as const).map((kind) => (
            <div key={kind} className="flex items-center gap-1">
              <Hint text={TRAIN_HINT[kind]} />
              <Button
                size="sm"
                variant="secondary"
                className="h-9 flex-1 justify-between px-2"
                disabled={kind === "dragon" && t.dragons >= 1}
                onClick={() => onTrain(kind)}
              >
                <span>{kind === "levy" ? "Men" : kind[0]!.toUpperCase() + kind.slice(1)}</span>
                <CostRow {...UNIT_COST[kind]} />
              </Button>
            </div>
          ))}
          {isCap ? (
            <div className="flex items-center gap-1">
              <Hint
                text={`Raise ${beastOf(human.empire).name} at the capital only. Attack ${beastOf(human.empire).atk}, defence ${beastOf(human.empire).def}, ${beastOf(human.empire).cost} gold, 3 silver wages. Hunters — send them, do not park them.`}
              />
              <Button size="sm" variant="secondary" className="h-9 flex-1 justify-between px-2" onClick={() => onTrain("beast")}>
                <span>{beastOf(human.empire).name}</span>
                <CostRow gold={beastOf(human.empire).cost} />
              </Button>
            </div>
          ) : null}
        </div>
        {human.cards.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {human.cards.map((c, i) => (
              <span key={`${c}-${i}`} className="inline-flex items-center gap-1">
                <Hint text={CARD_HINT[c] ?? "Play this card."} />
                <Button size="sm" variant="ghost" onClick={() => onPlay(c)}>
                  {c === "levy" ? "men" : c}
                </Button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (action === "build") {
    const rankOf = (kind: JobKind) => worksRank(t, kind);
    const labelOf = (kind: JobKind, base: string) => {
      const r = rankOf(kind);
      if (kind === "castle") {
        if (r >= WORKS_CAP) return "Citadel";
        if (r === 2) return "Citadel";
        if (r === 1) return "Keep";
        return "Walls";
      }
      if (r >= WORKS_CAP) return `${base} III`;
      if (r > 0) return `Improve ${base}`;
      return base;
    };
    const jobs: { kind: JobKind; label: string; disabled: boolean }[] = [
      { kind: "port", label: labelOf("port", "Port"), disabled: !meta.coastal || rankOf("port") >= WORKS_CAP || busy },
      { kind: "castle", label: labelOf("castle", "Walls"), disabled: rankOf("castle") >= WORKS_CAP || busy },
      { kind: "market", label: labelOf("market", "Market"), disabled: rankOf("market") >= WORKS_CAP || busy },
      { kind: "mine", label: labelOf("mine", "Mine"), disabled: meta.coastal || rankOf("mine") >= WORKS_CAP || busy },
      { kind: "ship", label: t.ships > 0 ? "Keel" : "Ship", disabled: !meta.coastal || !t.port || busy || t.ships >= shipsCap(t) },
      { kind: "road", label: "Road", disabled: t.road || busy },
      { kind: "farm", label: labelOf("farm", "Farm"), disabled: rankOf("farm") >= WORKS_CAP || busy },
    ];
    return (
      <div className="panel action-sheet flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Build</p>
        <div className="grid grid-cols-2 gap-1.5">
          {jobs.map((j) => (
            <div key={j.kind} className="flex items-center gap-1">
              <Hint text={BUILD_HINT[j.kind] ?? "Begin these works."} />
              <Button
                size="sm"
                variant="secondary"
                className="h-9 flex-1 justify-between px-2"
                disabled={j.disabled}
                onClick={() => onBuild(j.kind)}
              >
                <span>{j.label}</span>
                <CostRow {...worksCost(human, j.kind, t)} />
              </Button>
            </div>
          ))}
        </div>
        {job ? <p className="text-[10px] text-muted">Works underway.</p> : null}
      </div>
    );
  }

  const dests = legalMarchTargets(state, selected);
  const friends = dests.filter((id) => state.territories[id]!.owner === 0);
  const sent = sendLevy + sendKnights + sendDragons + sendBeasts;
  const available = t.levy + t.knights + t.dragons + (t.beasts ?? 0);
  const stay = available - sent;

  return (
    <div className="panel action-sheet space-y-1.5">
      <p className="flex items-center gap-2 text-[10px] tracking-[0.16em] text-muted uppercase">
        March
        <Hint text="Set how many march, then tap a neighbour on the map, or reinforce a city you hold." />
      </p>
      <p className="text-xs tabular-nums text-fg">
        Selected {sent} of {available}
        <span className="text-muted"> · {stay} stay</span>
      </p>
      <label className="flex items-center justify-between gap-2 text-xs">
        Men
        <input
          className="flex-1"
          type="range"
          min={0}
          max={t.levy}
          value={sendLevy}
          onChange={(e) => {
            sfx("tick");
            onSend({ levy: Number(e.target.value) });
          }}
        />
        <span className="w-10 text-right tabular-nums">
          {sendLevy}/{t.levy}
        </span>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        Knights
        <input
          className="flex-1"
          type="range"
          min={0}
          max={t.knights}
          value={sendKnights}
          onChange={(e) => {
            sfx("tick");
            onSend({ knights: Number(e.target.value) });
          }}
        />
        <span className="w-10 text-right tabular-nums">
          {sendKnights}/{t.knights}
        </span>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        {beastOf(human.empire).name}
        <input
          className="flex-1"
          type="range"
          min={0}
          max={t.beasts ?? 0}
          value={sendBeasts}
          onChange={(e) => {
            sfx("tick");
            onSend({ beasts: Number(e.target.value) });
          }}
        />
        <span className="w-10 text-right tabular-nums">
          {sendBeasts}/{t.beasts ?? 0}
        </span>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        Dragons
        <input
          className="flex-1"
          type="range"
          min={0}
          max={t.dragons}
          value={sendDragons}
          onChange={(e) => {
            sfx("tick");
            onSend({ dragons: Number(e.target.value) });
          }}
        />
        <span className="w-10 text-right tabular-nums">
          {sendDragons}/{t.dragons}
        </span>
      </label>
      {friends.length ? (
        <div className="flex flex-wrap gap-1">
          {friends.map((id) => (
            <Button
              key={id}
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={sent < 1}
              onClick={() => onMarchTo(id)}
            >
              Reinforce {TERRITORY_BY_ID[id]!.name}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted">Tap a neighbour on the map to attack.</p>
      )}
    </div>
  );
}

export function OccupySheet({
  state,
  fromId,
  toId,
  onHold,
  onRecall,
}: {
  state: GameState;
  fromId: string;
  toId: string;
  onHold: () => void;
  onRecall: (recall: { levy: number; knights: number; dragons: number; beasts: number; ships?: number }) => void;
}) {
  const to = state.territories[toId]!;
  const fromMeta = TERRITORY_BY_ID[fromId]!;
  const toMeta = TERRITORY_BY_ID[toId]!;
  const maxLevy = Math.max(0, to.levy - 1);
  const [mode, setMode] = useState<"hold" | "send">("hold");
  const [levy, setLevy] = useState(maxLevy);
  const [knights, setKnights] = useState(to.knights);
  const [dragons, setDragons] = useState(to.dragons);
  const [beasts, setBeasts] = useState(to.beasts ?? 0);
  const canSailHome = (to.ships ?? 0) > 0 && seaNeighbors(toId).includes(fromId);
  const [sailHome, setSailHome] = useState(canSailHome);
  const beastName = beastOf(state.players[0]!.empire).name;
  const sending = levy + knights + dragons + beasts;
  return (
    <div className="panel action-sheet space-y-1.5">
      <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Occupy {toMeta.name}</p>
      <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-sm)] border border-border p-0.5">
        <button
          type="button"
          className={`h-8 rounded-[calc(var(--radius-sm)-2px)] text-xs ${mode === "hold" ? "bg-raised text-fg" : "text-muted"}`}
          onClick={() => setMode("hold")}
        >
          Hold
        </button>
        <button
          type="button"
          className={`h-8 rounded-[calc(var(--radius-sm)-2px)] text-xs ${mode === "send" ? "bg-raised text-fg" : "text-muted"}`}
          onClick={() => setMode("send")}
        >
          Send home
        </button>
      </div>
      {mode === "hold" ? (
        <p className="text-xs text-muted">The whole host stays in {toMeta.name}.</p>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-muted">How many return to {fromMeta.name}. At least one man stays.</p>
          <p className="text-xs tabular-nums text-fg">
            Sending {levy + knights + dragons + beasts} of {maxLevy + to.knights + to.dragons + (to.beasts ?? 0)}
            <span className="text-muted"> · rest stay</span>
          </p>
          <label className="flex items-center justify-between gap-2 text-xs">
            Men
            <input
              className="flex-1"
              type="range"
              min={0}
              max={maxLevy}
              value={levy}
              onChange={(e) => {
                sfx("tick");
                setLevy(Number(e.target.value));
              }}
            />
            <span className="w-10 text-right tabular-nums">
              {levy}/{maxLevy}
            </span>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs">
            Knights
            <input
              className="flex-1"
              type="range"
              min={0}
              max={to.knights}
              value={knights}
              onChange={(e) => {
                sfx("tick");
                setKnights(Number(e.target.value));
              }}
            />
            <span className="w-10 text-right tabular-nums">
              {knights}/{to.knights}
            </span>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs">
            {beastName}
            <input
              className="flex-1"
              type="range"
              min={0}
              max={to.beasts ?? 0}
              value={beasts}
              onChange={(e) => {
                sfx("tick");
                setBeasts(Number(e.target.value));
              }}
            />
            <span className="w-10 text-right tabular-nums">
              {beasts}/{to.beasts ?? 0}
            </span>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs">
            Dragons
            <input
              className="flex-1"
              type="range"
              min={0}
              max={to.dragons}
              value={dragons}
              onChange={(e) => {
                sfx("tick");
                setDragons(Number(e.target.value));
              }}
            />
            <span className="w-10 text-right tabular-nums">
              {dragons}/{to.dragons}
            </span>
          </label>
          {canSailHome ? (
            <label className="flex items-center gap-2 text-xs text-fg">
              <input
                type="checkbox"
                checked={sailHome && sending > 0}
                disabled={sending < 1}
                onChange={(e) => setSailHome(e.target.checked)}
              />
              Sail the keel home with them
            </label>
          ) : null}
        </div>
      )}
      <div className="flex items-center gap-1">
        <Hint
          text={
            mode === "hold"
              ? "Leave the surviving host and the keel in the new city."
              : canSailHome
                ? "Send the numbers on the sliders back. Tick the box to sail the keel home with them, or leave it berthed here."
                : "Send the numbers on the sliders back to the city they marched from."
          }
        />
        <Button
          size="sm"
          className="h-9 flex-1"
          onClick={() =>
            mode === "hold"
              ? onHold()
              : onRecall({ levy, knights, dragons, beasts, ships: sailHome && sending > 0 ? 1 : 0 })
          }
        >
          {mode === "hold" ? "Hold the city" : "Send them home"}
        </Button>
      </div>
    </div>
  );
}

function hostLine(force: { levy: number; knights: number; dragons: number; beasts?: number }, beastName: string) {
  const beasts = force.beasts ?? 0;
  return `Men ${force.levy} · Knights ${force.knights} · ${beastName} ${beasts} · Dragons ${force.dragons}`;
}

export function AttackPreview({
  state,
  fromId,
  toId,
  levy,
  knights,
  dragons,
  beasts,
  onContinue,
  onCancel,
}: {
  state: GameState;
  fromId: string;
  toId: string;
  levy: number;
  knights: number;
  dragons: number;
  beasts: number;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const fromMeta = TERRITORY_BY_ID[fromId]!;
  const toMeta = TERRITORY_BY_ID[toId]!;
  const fromTerr = state.territories[fromId]!;
  const dest = state.territories[toId]!;
  const force = { levy, knights, dragons, beasts };
  const atkBeast = fromTerr.owner === "barbarian" ? null : beastOf(state.players[fromTerr.owner]!.empire);
  const defBeast = dest.owner === "barbarian" ? null : beastOf(state.players[dest.owner]!.empire);
  const atk = forceStrength(force, atkBeast?.atk ?? 0);
  const def = defenseStrength(dest, defBeast?.def ?? 0);
  const atkBeastName = atkBeast?.name ?? "Beasts";
  const defBeastName = defBeast?.name ?? "Beasts";
  const friendly = dest.owner === 0;
  const defender =
    dest.owner === "barbarian"
      ? "Independent tribes"
      : empireOf(state.players[dest.owner]!.empire).name;
  return (
    <div className="panel action-sheet space-y-2">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">{friendly ? "Move host" : "Attack preview"}</p>
      <p className="font-display text-lg text-fg">
        {fromMeta.name} → {toMeta.name}
      </p>
      {friendly ? (
        <div className="space-y-1 text-sm">
          <p className="text-fg">{hostLine(force, atkBeastName)}</p>
          <p className="text-xs text-muted">
            Strength {atk} · joins the {standing(dest)} already in {toMeta.name}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">Attackers</p>
            <p className="mt-1 text-fg">{hostLine(force, atkBeastName)}</p>
            <p className="text-xs text-muted">Attack {atk}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.14em] text-muted uppercase">Defenders</p>
            <p className="mt-1 text-fg">{defender}</p>
            <p className="text-xs text-muted">{hostLine(dest, defBeastName)}</p>
            <p className="text-xs text-muted">
              Defence {def}
              {dest.castle ? " · walls" : dest.owner === "barbarian" ? " · camp" : " · city"}
            </p>
          </div>
        </div>
      )}
      <p className="text-sm text-fg">{friendly ? "The host will join this city." : oddsLabel(atk, def)}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1">
          <Hint text={friendly ? "Leave the host where it is." : "Do not march. The host stays in the city they are in."} />
          <Button size="md" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Hint text={friendly ? "Move the host into this city." : "Resolve the fight with the attacking host shown."} />
          <Button size="md" className="flex-1" onClick={onContinue}>
            {friendly ? "Move" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WatchReport({ lines, onDismiss }: { lines: string[]; onDismiss: () => void }) {
  return (
    <div className="panel action-sheet max-h-[36vh] space-y-2">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Watch report</p>
      <ul className="space-y-1.5 text-sm text-fg">
        {lines.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Hint text="Dismiss the report and play your watch." />
        <Button className="flex-1" size="md" onClick={onDismiss}>
          To the map
        </Button>
      </div>
    </div>
  );
}
