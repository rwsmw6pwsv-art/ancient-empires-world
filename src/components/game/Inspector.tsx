import { useState } from "react";
import { empireOf } from "@/lib/game/empires";
import { canRaiseSiege, cityWatch, defenseStrength, forceStrength, fortOf, hasKindJob, hostDefense, houseOfLand, isPlayerOwner, jobsAt, jobsOfKind, legalMarchTargets, marchesFrom, oddsLabel, shipsCap, siegeTargetOf, siegeTurnsFor, standing, warshipsCap, worksCost, worksRank, beastOfLand, beastOfTerritory } from "@/lib/game/engine";
import type { EmpireId, GameState, Job, JobKind, UnitKind } from "@/lib/game/types";
import { CAPITOL, CONTINENT_NAMES, FORT_CAP, FORT_LABEL, SIEGE_CAP, SIEGE_KINDS, SIEGE_LABEL, UNIT_COST, UNIT_LABEL, UNIT_TURNS, WARSHIP_COST, WARSHIP_TURNS, WORKS_CAP, isSiegeKind, isTrainKind } from "@/lib/game/types";
import { TERRITORY_BY_ID, seaNeighbors } from "@/lib/game/world";
import { hexNeighbors } from "@/lib/game/globe";
import { landscapeOf, BEAST_SRC, CAPITAL_SRC, FAUNA_LABEL, PROP_SRC, RESOURCE_LABEL, TERRAIN_LABEL, WONDER_LABEL } from "@/lib/game/landscape";
import { isWater, placeName, seaYieldOf, SEA_YIELD_LABEL, WATER_BY_ID } from "@/lib/game/waters";
import {
  DEFENSE_HINT,
  DEFENSE_KINDS,
  DEFENSE_LABEL,
  currentDefenseLabel,
  defenseRank,
  isDefenseKind,
  nextDefenseLabel,
  type DefenseKind,
} from "@/lib/game/defense";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sfx";
import { CostRow, HostStrip, ResourceDot, SiegeMark, UnitMark, WorkMark, DefenseMark } from "./Cost";
import { Hint } from "./Hint";

export type ActionKind = "train" | "march" | "build" | "defend";

const TRAIN_HINT = {
  levy: "Raise a warrior. Best in the melee. Attack 2, defence 1. Gold and metal. Takes 1 watch. Silver wages with the rest of the infantry.",
  bowman: "Raise an archer. Fragile if hit, long range. On a keep they rain arrows on attackers. Gold, timber and metal. Takes 1 watch.",
  knight: "Raise a mounted knight. Most effective riding warriors down. Attack 2, defence 2. Gold and metal. Takes 2 watches.",
  dragon: "Raise a dragon at a capital only. It burns scorpions first, then gates, towers, beasts, knights, archers and warriors. It circles the city — it does not flee the field. Only another dragon or a scorpion can wound it. 25 gold. Takes 5 watches. No house cap — the purse and the watches are the limit.",
} as const;

const WARSHIP_HINT =
  "Frame a warship at a harbour. It carries a host across water and fights rival fleets. If it is sunk the army aboard is sunk. Gold, timber and metal. Takes 2 watches. Several may share the same waters.";

const BUILD_HINT: Record<string, string> = {
  port: "A harbour on the coast. Pays trade, and can be improved twice with gold for more trade.",
  castle: "Camps you take have no walls. Raise wooden walls, then stone walls, then a wooden keep, then a stone keep. Capitals start with stone walls.",
  market: "A trade post. Improve with gold up to rank III for more trade.",
  mine: "Inland goldworks. Improve with gold to raise tribute and silver from silver veins.",
  ship: "Lay a ship at a harbour. Improved harbours hold more (2 / 4 / 6). A ship occupies neighbouring waters and gathers fish, shellfish, whales or lost treasure each watch.",
  road: "Pave this land. A trade route forms with every neighbouring paved city you hold, and pays gold each watch.",
  farm: "Sow fields or fisheries. Pays food each watch. Improve with gold. Citizens starve without enough grain.",
  ram: "Timber a ram while a neighbour is under siege. Free. Up to five. The first takes one watch; each extra ram takes longer.",
  catapult: "Frame a catapult while a neighbour is under siege. Free. Up to five. The first takes five watches; a battery takes a long siege. After a breach they chew towers.",
  ladder: "Cut ladders while a neighbour is under siege. Free. Up to five. The first takes one watch; each extra set takes longer.",
  tower: "Raise a siege tower while a neighbour is under siege. Free. Up to five. The first takes three watches; each extra tower takes longer. It carries warriors, knights or beasts over the wall.",
  scorpion: "Raise a scorpion on the walls. The only ground engine that can wound a dragon. Gold, timber and metal.",
  walls: "Inner walls. Attackers smash a closed gate or a breach to enter. Wood, then stone, then high, giant and colossal stone.",
  "outer-walls": "First ring. Slows the host before they reach the inner walls.",
  "keep-works": "Holds stores and the last garrison until the walls fall.",
  towers: "Archers fill the gate-towers first, then the other towers. If a tower falls, its watch dies with it.",
  moats: "Slows attackers and cuts their range and blows. Single, then dual, then a third around the keep.",
};

const CARD_HINT: Record<string, string> = {
  levy: "Call two warriors in this city at once.",
  forge: "Gain 4 gold, 2 stone and 2 metal.",
  tide: "Gain 4 timber.",
  raid: "Strike two from a selected enemy host.",
  wall: "Raise the next fort here at once: wooden walls, stone walls, wooden keep, then stone keep.",
};

function workGlyph(kind: JobKind): "port" | "castle" | "market" | "mine" | "ship" | "warship" | "road" | "farm" | "walls" {
  if (kind === "ship") return "ship";
  if (kind === "warship") return "warship";
  if (kind === "castle") return "walls";
  if (kind === "port" || kind === "market" || kind === "mine" || kind === "road" || kind === "farm") return kind;
  return "walls";
}

function jobTitle(state: GameState, job: Job): string {
  if (job.kind === "beast") {
    return beastOfLand(job.territoryId).name;
  }
  if (job.kind === "warship") return "Warship";
  if (isTrainKind(job.kind)) return UNIT_LABEL[job.kind];
  if (job.kind === "castle") return "Walls";
  if (isDefenseKind(job.kind)) return DEFENSE_LABEL[job.kind];
  if (isSiegeKind(job.kind)) return SIEGE_LABEL[job.kind];
  return job.kind.charAt(0).toUpperCase() + job.kind.slice(1);
}

function JobTrack({
  label,
  remaining,
  total,
  onCancel,
}: {
  label: string;
  remaining: number;
  total: number;
  onCancel?: () => void;
}) {
  const span = Math.max(1, total || remaining);
  const pct = Math.max(12, Math.round((remaining / span) * 100));
  const wait = remaining === 1 ? "1 watch" : `${remaining} watches`;
  return (
    <div className="job-bar">
      <div className="job-bar-head">
        <span>
          {label} · {wait} left
        </span>
        {onCancel ? (
          <button type="button" className="job-bar-stop" onClick={onCancel}>
            Stop
          </button>
        ) : null}
      </div>
      <div
        className="job-bar-track"
        role="progressbar"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={span}
        aria-label={`${label} ${wait} left`}
      >
        <div className="job-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ProvinceBanner({ state, selected }: { state: GameState; selected: string | null }) {
  if (!selected) {
    return (
      <div className="pointer-events-none rounded-[var(--radius-md)] border border-border bg-surface/85 px-3 py-2 text-xs text-muted backdrop-blur-sm">
        Tap a province.
      </div>
    );
  }
  const meta = TERRITORY_BY_ID[selected];
  const t = state.territories[selected];
  if (!t) return null;
  if (isWater(selected)) {
    const yieldKind = seaYieldOf(selected);
    const ownerLabel =
      t.owner === "open"
        ? "Open waters"
        : t.owner === "barbarian"
          ? "Independent tribes"
          : isPlayerOwner(t.owner)
            ? empireOf(state.players[t.owner]!.empire).name
            : "Waters";
    const hp = hostDefense(state, t);
    const detail = [
      WATER_BY_ID[selected]?.near ? "Near land" : "Deep ocean",
      yieldKind ? SEA_YIELD_LABEL[yieldKind] : null,
      t.owner === "open" ? "No occupier. Sail a ship here to gather the yield next watch." : `${ownerLabel} holds these waters.`,
      (t.ships ?? 0) > 0 ? `${t.ships} ${t.ships === 1 ? "ship" : "ships"}` : null,
      (t.warships ?? 0) > 0 ? `${t.warships} ${t.warships === 1 ? "warship" : "warships"}` : null,
      t.owner !== "open" ? `defence ${hp}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="max-w-[16rem] rounded-[var(--radius-md)] border border-border bg-surface/90 px-2.5 py-1.5 backdrop-blur-sm sm:max-w-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-sm tabular-nums tracking-wide">{placeName(selected)}</p>
            <p className="truncate text-[11px] text-muted">Waters · {ownerLabel}</p>
          </div>
          <span className="pointer-events-auto mt-0.5 shrink-0">
            <Hint text={detail} />
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {(t.ships ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <WorkMark kind="ship" />
              <span className="font-medium text-fg">{t.ships}</span>
            </span>
          ) : null}
          {(t.warships ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <WorkMark kind="warship" />
              <span className="font-medium text-fg">{t.warships}</span>
            </span>
          ) : null}
          {t.levy > 0 ? <UnitMark kind="levy" amount={t.levy} /> : null}
          {(t.bowmen ?? 0) > 0 ? <UnitMark kind="bowman" amount={t.bowmen} /> : null}
          {t.knights > 0 ? <UnitMark kind="knight" amount={t.knights} /> : null}
          {t.dragons > 0 ? <UnitMark kind="dragon" amount={t.dragons} /> : null}
          {yieldKind ? <img src={PROP_SRC[yieldKind]} alt="" className="hud-icon" title={SEA_YIELD_LABEL[yieldKind]} /> : null}
        </p>
        {jobsAt(state, selected).map((job) => (
          <JobTrack key={job.id} label={jobTitle(state, job)} remaining={job.remaining} total={job.total || job.remaining} />
        ))}
        {marchesFrom(state, selected).map((m) => (
          <JobTrack key={m.id} label={`Moving to ${placeName(m.to)}`} remaining={m.remaining} total={1} />
        ))}
      </div>
    );
  }
  if (!meta) return null;
  const ownerLabel =
    t.owner === "open"
      ? "Open waters"
      : t.owner === "barbarian"
        ? "Independent tribes"
        : empireOf(state.players[t.owner]!.empire).name;
  const land = landscapeOf(selected);
  const isCap = Object.values(CAPITOL).includes(selected);
  const capHouse = isCap ? Object.entries(CAPITOL).find(([, id]) => id === selected)?.[0] : null;
  const ownerBeast = (t.beasts ?? 0) > 0 ? beastOfTerritory(t) : t.owner === "barbarian" ? beastOfLand(selected) : beastOfLand(selected);
  const beastName = ownerBeast.name;
  const works = [
    t.castle || fortOf(t) > 0 ? FORT_LABEL[fortOf(t)] : null,
    defenseRank(t, "walls") > 0 ? `Walls ${currentDefenseLabel(t, "walls")}` : null,
    defenseRank(t, "outer-walls") > 0 ? `Outer ${currentDefenseLabel(t, "outer-walls")}` : null,
    defenseRank(t, "keep-works") > 0 ? `Keep ${currentDefenseLabel(t, "keep-works")}` : null,
    defenseRank(t, "towers") > 0 ? currentDefenseLabel(t, "towers") : null,
    defenseRank(t, "moats") > 0 ? currentDefenseLabel(t, "moats") : null,
    defenseRank(t, "scorpion") > 0 ? currentDefenseLabel(t, "scorpion") : null,
    t.market ? `Market${worksRank(t, "market") > 1 ? ` ${"I".repeat(worksRank(t, "market"))}` : ""}` : null,
    t.port ? `Port${worksRank(t, "port") > 1 ? ` ${"I".repeat(worksRank(t, "port"))}` : ""} · ${t.ships} ships` : null,
    t.mine ? `Mine${worksRank(t, "mine") > 1 ? ` ${"I".repeat(worksRank(t, "mine"))}` : ""}` : null,
    t.road ? "Road" : null,
    t.farm ? `Farm${worksRank(t, "farm") > 1 ? ` ${"I".repeat(worksRank(t, "farm"))}` : ""}` : null,
  ].filter(Boolean);
  const detail = [
    TERRAIN_LABEL[land.terrain],
    t.owner !== "barbarian" ? "City" : null,
    ...works,
    land.wonder ? WONDER_LABEL[land.wonder] : null,
    land.fauna ? `${FAUNA_LABEL[land.fauna]} roam here` : null,
    t.owner === "barbarian"
      ? t.pressure > 0
        ? "Camp is reeling from a raid."
        : fortOf(t) >= 1
          ? "Palisaded camp — will raid neighbouring empires if left."
          : "Stout camp — will raid neighbouring empires if left."
      : null,
    isCap ? "Capital mint — pays silver each watch" : null,
    cityWatch(t) > 0 ? `city watch of ${cityWatch(t)} holds the walls` : null,
    land.resource
      ? `abundance of ${RESOURCE_LABEL[land.resource]} — pays extra each watch${t.market || t.port ? " · trade bonus" : ""}`
      : "pays a little of every yield",
    t.besiegedFrom ? `Under siege from ${TERRITORY_BY_ID[t.besiegedFrom]?.name ?? "a neighbour"}` : null,
    siegeTargetOf(state, selected) ? `Sieging ${TERRITORY_BY_ID[siegeTargetOf(state, selected)!]!.name}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-[16rem] rounded-[var(--radius-md)] border border-border bg-surface/90 px-2.5 py-1.5 backdrop-blur-sm sm:max-w-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm tabular-nums tracking-wide">{meta.name}</p>
          <p className="truncate text-[11px] text-muted">
            {CONTINENT_NAMES[meta.continent]}
            {capHouse ? ` · ${empireOf(capHouse as EmpireId).name}` : ` · ${ownerLabel}`}
          </p>
        </div>
        <span className="pointer-events-auto mt-0.5 shrink-0">
          <Hint text={detail} />
        </span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <UnitMark kind="levy" amount={t.levy} />
        <UnitMark kind="bowman" amount={t.bowmen ?? 0} />
        <UnitMark kind="knight" amount={t.knights} />
        <UnitMark kind="beast" amount={t.beasts ?? 0} beastName={beastName} beastSrc={BEAST_SRC[ownerBeast.id]} />
        <UnitMark kind="dragon" amount={t.dragons} />
        {t.castle || fortOf(t) > 0 ? <WorkMark kind="walls" fort={fortOf(t)} /> : null}
        {t.port ? <WorkMark kind="port" /> : null}
        {t.mine ? <WorkMark kind="mine" /> : null}
        {t.farm ? <WorkMark kind="farm" /> : null}
        {t.market ? <WorkMark kind="market" /> : null}
        {t.road ? <WorkMark kind="road" /> : null}
        {(t.rams ?? 0) > 0 ? <SiegeMark kind="ram" amount={t.rams} /> : null}
        {(t.towers ?? 0) > 0 ? <SiegeMark kind="tower" amount={t.towers} /> : null}
        {(t.ladders ?? 0) > 0 ? <SiegeMark kind="ladder" amount={t.ladders} /> : null}
        {(t.catapults ?? 0) > 0 ? <SiegeMark kind="catapult" amount={t.catapults} /> : null}
        {(t.scorpions ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1 tabular-nums" title="Scorpions">
            <img src={PROP_SRC.scorpion} alt="" className="hud-icon object-cover" />
            <span className="font-medium text-fg">{t.scorpions}</span>
          </span>
        ) : null}
        {land.resource ? <ResourceDot kind={land.resource} /> : null}
      </p>
      {jobsAt(state, selected).map((job) => (
        <JobTrack key={job.id} label={jobTitle(state, job)} remaining={job.remaining} total={job.total || job.remaining} />
      ))}
      {marchesFrom(state, selected).map((m) => (
        <JobTrack
          key={m.id}
          label={`Moving to ${placeName(m.to)}`}
          remaining={m.remaining}
          total={1}
        />
      ))}
    </div>
  );
}

export function ActionSheet({
  action,
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
  onSend,
  onTrain,
  onBuild,
  onPlay,
  onMarchTo,
  onCancelJob,
  onCancelMarch,
}: {
  action: ActionKind;
  state: GameState;
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
  onSend: (part: Partial<{
    levy: number;
    bowmen: number;
    knights: number;
    dragons: number;
    beasts: number;
    rams: number;
    catapults: number;
    ladders: number;
    towers: number;
  }>) => void;
  onTrain: (kind: UnitKind) => void;
  onBuild: (kind: JobKind) => void;
  onPlay: (card: "levy" | "forge" | "tide" | "raid" | "wall") => void;
  onMarchTo: (id: string) => void;
  onCancelJob?: (jobId: string) => void;
  onCancelMarch?: (marchId: string) => void;
}) {
  const [embarkId, setEmbarkId] = useState<string | null>(null);
  if (!selected) {
    return (
      <div className="panel p-4 text-sm text-muted">
        Select one of your provinces, then {action === "march" ? "move" : action}.
      </div>
    );
  }
  const water = isWater(selected);
  const meta = TERRITORY_BY_ID[selected];
  const t = state.territories[selected]!;
  const human = state.players[0]!;
  const mine = t.owner === 0 && state.clock.currentPlayer === 0 && state.phase === "play";
  const isCap = Object.values(CAPITOL).includes(selected);
  const cityJobs = jobsAt(state, selected);
  const cityMarches = marchesFrom(state, selected);
  const haltJob = mine && onCancelJob ? onCancelJob : undefined;
  const haltMarch = mine && onCancelMarch ? onCancelMarch : undefined;

  if (!mine) {
    return (
      <div className="panel action-sheet flex flex-col gap-1.5 text-sm text-muted">
        <p>
          {t.owner === 0
            ? "Wait for your watch."
            : water
              ? t.owner === "open"
                ? "Open waters. Sail a ship from a harbour to occupy them."
                : "These waters are not yours. Move from a harbour or a fleet you hold."
              : "This land is not yours. Move from a province you hold."}
        </p>
        {cityJobs.map((job) => (
          <JobTrack key={job.id} label={jobTitle(state, job)} remaining={job.remaining} total={job.total || job.remaining} />
        ))}
        {cityMarches.map((m) => (
          <JobTrack
            key={m.id}
            label={`Moving to ${placeName(m.to)}`}
            remaining={m.remaining}
            total={1}
          />
        ))}
      </div>
    );
  }

  if (action === "train") {
    if (water) {
      return (
        <div className="panel action-sheet flex flex-col gap-1.5 text-sm text-muted">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Train</p>
          <p>Frame warships at a harbour. Waters hold the fleet that sails from there.</p>
        </div>
      );
    }
    return (
      <div className="panel action-sheet flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Train</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["levy", "bowman", "knight", "dragon"] as const).map((kind) => (
            <div key={kind} className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Hint text={TRAIN_HINT[kind]} />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 flex-1 justify-between px-2"
                  disabled={kind === "dragon" && (!isCap || hasKindJob(state, selected, "dragon"))}
                  data-sfx="skip"
                  onClick={() => onTrain(kind)}
                >
                  <span className="inline-flex items-center gap-1">
                    <UnitMark kind={kind} />
                    <span>{UNIT_LABEL[kind]}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CostRow {...UNIT_COST[kind]} />
                    <span className="text-[10px] text-muted">{UNIT_TURNS[kind]}w</span>
                  </span>
                </Button>
              </div>
              {jobsOfKind(state, selected, kind).map((job) => (
                <JobTrack
                  key={job.id}
                  label={jobTitle(state, job)}
                  remaining={job.remaining}
                  total={job.total || job.remaining}
                  onCancel={haltJob ? () => haltJob(job.id) : undefined}
                />
              ))}
            </div>
          ))}
          {(() => {
            const busy = hasKindJob(state, selected, "warship");
            const full = (t.warships ?? 0) + jobsOfKind(state, selected, "warship").length >= warshipsCap(t);
            return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Hint text={WARSHIP_HINT} />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 flex-1 justify-between px-2"
                  disabled={!meta?.coastal || !t.port || busy || full}
                  data-sfx="skip"
                  onClick={() => onBuild("warship")}
                >
                  <span className="inline-flex items-center gap-1">
                    <WorkMark kind="warship" />
                    <span>Warship</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CostRow {...WARSHIP_COST} />
                    <span className="text-[10px] text-muted">{WARSHIP_TURNS}w</span>
                  </span>
                </Button>
              </div>
              {jobsOfKind(state, selected, "warship").map((job) => (
                <JobTrack
                  key={job.id}
                  label={jobTitle(state, job)}
                  remaining={job.remaining}
                  total={job.total || job.remaining}
                  onCancel={haltJob ? () => haltJob(job.id) : undefined}
                />
              ))}
            </div>
            );
          })()}
          {(() => {
            const landBeast = beastOfLand(selected);
            const rival = houseOfLand(selected) !== human.empire;
            return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Hint
                  text={`Raise ${landBeast.name} on ${CONTINENT_NAMES[meta?.continent ?? "eu"]} lands${rival ? " — this is a rival region's host" : ""}. Attack ${landBeast.atk}, defence ${landBeast.def}, ${landBeast.cost} gold, 3 silver wages. Takes 3 watches. Occupy a rival region to train their beasts there only. Hunters — send them, do not park them.`}
                />
                <Button size="sm" variant="secondary" className="h-9 flex-1 justify-between px-2" data-sfx="skip" onClick={() => onTrain("beast")}>
                  <span className="inline-flex items-center gap-1">
                    <UnitMark kind="beast" beastSrc={BEAST_SRC[landBeast.id]} beastName={landBeast.name} />
                    <span>{landBeast.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CostRow gold={landBeast.cost} />
                    <span className="text-[10px] text-muted">3w</span>
                  </span>
                </Button>
              </div>
              {jobsOfKind(state, selected, "beast").map((job) => (
                <JobTrack
                  key={job.id}
                  label={jobTitle(state, job)}
                  remaining={job.remaining}
                  total={job.total || job.remaining}
                  onCancel={haltJob ? () => haltJob(job.id) : undefined}
                />
              ))}
            </div>
            );
          })()}
        </div>
        {human.cards.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {human.cards.map((c, i) => (
              <span key={`${c}-${i}`} className="inline-flex items-center gap-1">
                <Hint text={CARD_HINT[c] ?? "Play this card."} />
                <Button size="sm" variant="ghost" onClick={() => onPlay(c)}>
                  {c === "levy" ? "warriors" : c}
                </Button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (action === "defend") {
    if (water) {
      return (
        <div className="panel action-sheet flex flex-col gap-1.5 text-sm text-muted">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">City defence</p>
          <p>Waters have no walls. Warships hold the hex — each adds defence, same as a city watch.</p>
        </div>
      );
    }
    return (
      <div className="panel action-sheet flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.16em] text-muted uppercase">City defence</p>
        <p className="text-[11px] text-muted">Walls, moats, towers and scorpions — separate from mines, farms and ports.</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {DEFENSE_KINDS.map((kind) => {
            const rank = defenseRank(t, kind);
            const cap = kind === "moats" ? 3 : 5;
            const done = rank >= cap;
            const busy = hasKindJob(state, selected, kind);
            return (
              <div key={kind} className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Hint text={DEFENSE_HINT[kind]} />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-auto min-h-9 flex-1 justify-between px-2 py-1.5 text-left"
                    disabled={done || busy}
                    data-sfx="skip"
                    onClick={() => onBuild(kind)}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <DefenseMark kind={kind} />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{DEFENSE_LABEL[kind]}</span>
                        <span className="text-[10px] text-muted">
                          {currentDefenseLabel(t, kind)}
                          {done ? "" : ` → ${nextDefenseLabel(t, kind)}`}
                        </span>
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      {done ? (
                        <span className="text-[10px] text-muted">Max</span>
                      ) : (
                        <CostRow {...worksCost(human, kind, t)} />
                      )}
                    </span>
                  </Button>
                </div>
                {jobsOfKind(state, selected, kind).map((job) => (
                  <JobTrack
                    key={job.id}
                    label={jobTitle(state, job)}
                    remaining={job.remaining}
                    total={job.total || job.remaining}
                    onCancel={haltJob ? () => haltJob(job.id) : undefined}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (action === "build") {
    if (water) {
      return (
        <div className="panel action-sheet flex flex-col gap-1.5 text-sm text-muted">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Build</p>
          <p>Ships and warships are laid at a harbour, then sailed onto these waters.</p>
        </div>
      );
    }
    const rankOf = (kind: JobKind) => worksRank(t, kind);
    const sieging = canRaiseSiege(state, selected);
    const mark = siegeTargetOf(state, selected);
    const labelOf = (kind: JobKind, base: string) => {
      const r = rankOf(kind);
      if (kind === "castle") {
        const f = fortOf(t);
        if (f >= FORT_CAP) return FORT_LABEL[FORT_CAP];
        return FORT_LABEL[f + 1] ?? "Wooden walls";
      }
      if (r >= WORKS_CAP) return `${base} III`;
      if (r > 0) return `Improve ${base}`;
      return base;
    };
    const jobs: { kind: JobKind; label: string; disabled: boolean }[] = [
      { kind: "port", label: labelOf("port", "Port"), disabled: !meta?.coastal || rankOf("port") >= WORKS_CAP || hasKindJob(state, selected, "port") },
      { kind: "market", label: labelOf("market", "Market"), disabled: rankOf("market") >= WORKS_CAP || hasKindJob(state, selected, "market") },
      { kind: "mine", label: labelOf("mine", "Mine"), disabled: Boolean(meta?.coastal) || rankOf("mine") >= WORKS_CAP || hasKindJob(state, selected, "mine") },
      { kind: "ship", label: "Ship", disabled: !meta?.coastal || !t.port || t.ships + jobsOfKind(state, selected, "ship").length >= shipsCap(t) },
      { kind: "road", label: "Road", disabled: t.road || hasKindJob(state, selected, "road") },
      { kind: "farm", label: labelOf("farm", "Farm"), disabled: rankOf("farm") >= WORKS_CAP || hasKindJob(state, selected, "farm") },
    ];
    const works = jobs.filter((j) => !isSiegeKind(j.kind));
    const row = (list: typeof jobs) =>
      list.map((j) => (
        <div key={j.kind} className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <Hint text={BUILD_HINT[j.kind] ?? "Begin these works."} />
            <Button
              size="sm"
              variant="secondary"
              className="h-9 flex-1 justify-between px-2"
              disabled={j.disabled}
              data-sfx="skip"
              onClick={() => onBuild(j.kind)}
            >
              <span className="inline-flex items-center gap-1">
                {j.kind === "ram" || j.kind === "catapult" || j.kind === "ladder" || j.kind === "tower" ? (
                  <SiegeMark kind={j.kind} />
                ) : j.kind === "scorpion" ? (
                  <img src={PROP_SRC.scorpion} alt="" className="hud-icon object-cover" />
                ) : (
                  <WorkMark kind={workGlyph(j.kind)} fort={j.kind === "castle" ? fortOf(t) + 1 : undefined} />
                )}
                <span>{j.label}</span>
              </span>
              {isSiegeKind(j.kind) ? (
                <span className="text-[10px] text-muted">{siegeTurnsFor(t, j.kind, jobsOfKind(state, selected, j.kind).length)} {siegeTurnsFor(t, j.kind, jobsOfKind(state, selected, j.kind).length) === 1 ? "watch" : "watches"}</span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <CostRow {...worksCost(human, j.kind, t)} />
                </span>
              )}
            </Button>
          </div>
          {jobsOfKind(state, selected, j.kind).map((job) => (
            <JobTrack
              key={job.id}
              label={jobTitle(state, job)}
              remaining={job.remaining}
              total={job.total || job.remaining}
              onCancel={haltJob ? () => haltJob(job.id) : undefined}
            />
          ))}
        </div>
      ));
    return (
      <div className="panel action-sheet flex flex-col gap-1.5">
        <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Build</p>
        <div className="grid grid-cols-2 gap-1.5">{row(works)}</div>
        {sieging && mark ? (
          <p className="mt-1 text-[10px] text-muted">Siege of {placeName(mark)} is open — raise rams, ladders, towers and catapults on the siege screen.</p>
        ) : null}
      </div>
    );
  }

  const dests = legalMarchTargets(state, selected);
  const waterFriends = dests.filter((id) => isWater(id) && state.territories[id]!.owner === 0);
  const openSeas = dests.filter((id) => isWater(id) && state.territories[id]!.owner === "open");
  const landFriends = dests.filter((id) => !isWater(id) && state.territories[id]!.owner === 0);
  const landMarks = dests.filter((id) => !isWater(id));
  const sent = sendLevy + sendBowmen + sendKnights + sendDragons + sendBeasts;
  const available = t.levy + (t.bowmen ?? 0) + t.knights + t.dragons + (t.beasts ?? 0);
  const stay = available - sent;
  const fleet = (t.ships ?? 0) + (t.warships ?? 0);
  const canSailTroops = (t.warships ?? 0) > 0;
  const disembark = water && embarkId === selected;

  return (
    <div className="panel action-sheet space-y-1.5">
      <p className="flex items-center gap-2 text-[10px] tracking-[0.16em] text-muted uppercase">
        Move
        <Hint
          text={
            water
              ? "Sail the fleet to neighbouring waters. Disembark to pick the host and go ashore. A warship is needed to land the army."
              : "Set how many move, then tap a neighbour. Ships occupy open waters. Warships carry a host across the sea. Columns take a watch to arrive."
          }
        />
      </p>
      {water && !disembark ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-muted">
            {fleet < 1
              ? "No fleet on these waters."
              : "Sail to neighbouring waters. The army stays aboard until you disembark."}
          </p>
          {available > 0 ? (
            <div className="flex items-center gap-1">
              <Hint text="Pick who goes ashore, then tap a neighbouring land. A warship carries them. If it is sunk the army aboard is sunk." />
              <Button
                size="sm"
                variant="secondary"
                className="h-9 flex-1"
                disabled={!canSailTroops}
                onClick={() => {
                  sfx("tick");
                  setEmbarkId(selected);
                  onSend({
                    levy: t.levy,
                    bowmen: t.bowmen ?? 0,
                    knights: t.knights,
                    dragons: t.dragons,
                    beasts: t.beasts ?? 0,
                  });
                }}
              >
                Disembark
              </Button>
            </div>
          ) : null}
          {available > 0 && !canSailTroops ? (
            <p className="text-[10px] text-danger">A warship is needed to land a host from these waters.</p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-xs tabular-nums text-fg">
            Selected {sent} of {available}
            <span className="text-muted"> · {stay} stay</span>
          </p>
          {isCap && stay < 2 ? (
            <p className="text-[10px] text-danger">
              The seat will stand empty. A city watch holds the walls — you will still fight if tribes come.
            </p>
          ) : stay < 1 && !water ? (
            <p className="text-[10px] text-danger">This land will stand empty. Tribes overrun an unwalled host of one.</p>
          ) : null}
          {water && sent > 0 && !canSailTroops ? (
            <p className="text-[10px] text-danger">A warship is needed to carry a host from these waters.</p>
          ) : null}
          {water && disembark ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                onClick={() => {
                  sfx("tick");
                  setEmbarkId(null);
                  onSend({ levy: 0, bowmen: 0, knights: 0, dragons: 0, beasts: 0 });
                }}
              >
                Stay aboard
              </Button>
            </div>
          ) : null}
          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="levy" />
              Warriors
            </span>
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
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="bowman" />
              Archers
            </span>
            <input
              className="flex-1"
              type="range"
              min={0}
              max={t.bowmen ?? 0}
              value={sendBowmen}
              onChange={(e) => {
                sfx("tick");
                onSend({ bowmen: Number(e.target.value) });
              }}
            />
            <span className="w-10 text-right tabular-nums">
              {sendBowmen}/{t.bowmen ?? 0}
            </span>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="knight" />
              Knights
            </span>
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
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="beast" beastSrc={BEAST_SRC[beastOfTerritory(t).id]} beastName={beastOfTerritory(t).name} />
              {beastOfTerritory(t).name}
            </span>
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
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="dragon" />
              Dragons
            </span>
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
          {siegeTargetOf(state, selected) && !water && SIEGE_KINDS.some((k) => (k === "ram" ? t.rams : k === "catapult" ? t.catapults : k === "ladder" ? t.ladders : t.towers) > 0) ? (
            <div className="grid grid-cols-2 gap-1.5">
              {SIEGE_KINDS.map((kind) => {
                const have = kind === "ram" ? t.rams ?? 0 : kind === "catapult" ? t.catapults ?? 0 : kind === "ladder" ? t.ladders ?? 0 : t.towers ?? 0;
                if (have < 1) return null;
                const send =
                  kind === "ram" ? sendRams : kind === "catapult" ? sendCatapults : kind === "ladder" ? sendLadders : sendTowers;
                const key = kind === "ram" ? "rams" : kind === "catapult" ? "catapults" : kind === "ladder" ? "ladders" : "towers";
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`flex h-9 items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-2 text-xs ${
                      send > 0 ? "border-fg bg-raised text-fg" : "border-border text-muted"
                    }`}
                    onClick={() => {
                      sfx("tick");
                      onSend({ [key]: send >= have ? 0 : send + 1 });
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <SiegeMark kind={kind} />
                      {SIEGE_LABEL[kind]}
                    </span>
                    <span className="tabular-nums">{send > 0 ? `brings ${send}` : "leave"}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      )}
      <p className="text-[10px] text-muted">
        {water
          ? disembark
            ? "Tap a neighbouring land, or land at a shore below. They arrive next watch."
            : "Tap neighbouring waters, or sail below. The fleet arrives next watch."
          : "Tap a neighbour on the map. Columns arrive next watch — send several in the same watch if you wish."}
      </p>
      {openSeas.length ? (
        <div className="flex flex-wrap gap-1">
          {openSeas.map((id) => (
            <Button
              key={id}
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={fleet < 1}
              onClick={() => onMarchTo(id)}
            >
              Sail to {placeName(id)}
            </Button>
          ))}
        </div>
      ) : null}
      {waterFriends.length ? (
        <div className="flex flex-wrap gap-1">
          {waterFriends.map((id) => (
            <Button
              key={id}
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={fleet < 1}
              onClick={() => onMarchTo(id)}
            >
              Join {placeName(id)}
            </Button>
          ))}
        </div>
      ) : null}
      {!water && landFriends.length ? (
        <div className="flex flex-wrap gap-1">
          {landFriends.map((id) => (
            <Button
              key={id}
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={sent < 1}
              onClick={() => onMarchTo(id)}
            >
              Reinforce {placeName(id)}
            </Button>
          ))}
        </div>
      ) : null}
      {water && disembark && landMarks.length ? (
        <div className="flex flex-wrap gap-1">
          {landMarks.map((id) => (
            <Button
              key={id}
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={sent < 1 || !canSailTroops}
              onClick={() => onMarchTo(id)}
            >
              {state.territories[id]!.owner === 0 ? `Reinforce ${placeName(id)}` : `Land at ${placeName(id)}`}
            </Button>
          ))}
        </div>
      ) : null}
      {cityMarches.length ? (
        <div className="space-y-1">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">On the move</p>
          {cityMarches.map((m) => (
            <JobTrack
              key={m.id}
              label={`Moving to ${placeName(m.to)}`}
              remaining={m.remaining}
              total={1}
              onCancel={haltMarch ? () => haltMarch(m.id) : undefined}
            />
          ))}
        </div>
      ) : null}
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
  onRecall: (recall: { levy: number; bowmen: number; knights: number; dragons: number; beasts: number; ships?: number }) => void;
}) {
  const to = state.territories[toId]!;
  const fromMeta = TERRITORY_BY_ID[fromId]!;
  const toMeta = TERRITORY_BY_ID[toId]!;
  const maxLevy = Math.max(0, to.levy - 1);
  const [mode, setMode] = useState<"hold" | "send">("hold");
  const [levy, setLevy] = useState(maxLevy);
  const [bowmen, setBowmen] = useState(to.bowmen ?? 0);
  const [knights, setKnights] = useState(to.knights);
  const [dragons, setDragons] = useState(to.dragons);
  const [beasts, setBeasts] = useState(to.beasts ?? 0);
  const canSailHome = (to.ships ?? 0) > 0 && seaNeighbors(toId).includes(fromId);
  const [sailHome, setSailHome] = useState(canSailHome);
  const beastName = beastOfTerritory(to).name;
  const beastSrc = BEAST_SRC[beastOfTerritory(to).id];
  const sending = levy + bowmen + knights + dragons + beasts;
  return (
    <div className="panel action-sheet space-y-1.5">
      <div className="flex items-center gap-2">
        <img src={seatArt(state, toId)} alt="" className="host-portrait is-lg object-contain" />
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Occupy</p>
          <p className="font-display text-sm tracking-wide">{toMeta.name}</p>
        </div>
        {to.castle || fortOf(to) > 0 ? <WorkMark kind="walls" fort={fortOf(to)} /> : null}
        {to.port ? <WorkMark kind="port" /> : null}
      </div>
      <HostStrip levy={to.levy} bowmen={to.bowmen ?? 0} knights={to.knights} dragons={to.dragons} beasts={to.beasts ?? 0} beastSrc={beastSrc} beastName={beastName} />
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
          <p className="text-xs text-muted">How many return to {fromMeta.name}. At least one warrior stays.</p>
          <p className="text-xs tabular-nums text-fg">
            Sending {levy + bowmen + knights + dragons + beasts} of {maxLevy + (to.bowmen ?? 0) + to.knights + to.dragons + (to.beasts ?? 0)}
            <span className="text-muted"> · rest stay</span>
          </p>
          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="levy" />
              Warriors
            </span>
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
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="bowman" />
              Archers
            </span>
            <input
              className="flex-1"
              type="range"
              min={0}
              max={to.bowmen ?? 0}
              value={bowmen}
              onChange={(e) => {
                sfx("tick");
                setBowmen(Number(e.target.value));
              }}
            />
            <span className="w-10 text-right tabular-nums">
              {bowmen}/{to.bowmen ?? 0}
            </span>
          </label>
          <label className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="knight" />
              Knights
            </span>
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
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="beast" beastName={beastName} beastSrc={beastSrc} />
              {beastName}
            </span>
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
            <span className="inline-flex items-center gap-1">
              <UnitMark kind="dragon" />
              Dragons
            </span>
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
              <WorkMark kind="port" />
              Sail the ship home with them
            </label>
          ) : null}
        </div>
      )}
      <div className="flex items-center gap-1">
        <Hint
          text={
            mode === "hold"
              ? "Leave the surviving host and the ship in the new city."
              : canSailHome
                ? "Send the numbers on the sliders back. Tick the box to sail the ship home with them, or leave it berthed here."
                : "Send the numbers on the sliders back to the city they marched from."
          }
        />
        <Button
          size="sm"
          className="h-9 flex-1"
          onClick={() =>
            mode === "hold"
              ? onHold()
              : onRecall({ levy, bowmen, knights, dragons, beasts, ships: sailHome && sending > 0 ? 1 : 0 })
          }
        >
          {mode === "hold" ? "Hold the city" : "Send them home"}
        </Button>
      </div>
    </div>
  );
}

function seatArt(state: GameState, id: string) {
  const t = state.territories[id]!;
  if (isWater(id)) {
    if ((t.warships ?? 0) > 0) return PROP_SRC.warship;
    return PROP_SRC.ship;
  }
  const founder = (Object.entries(CAPITOL) as [EmpireId, string][]).find(([, cap]) => cap === id)?.[0];
  if (founder) return CAPITAL_SRC[founder];
  if (t.owner === "barbarian") return PROP_SRC.camp;
  if (t.castle) return PROP_SRC.city;
  return PROP_SRC.town;
}

export function AttackPreview({
  state,
  fromId,
  toId,
  levy,
  bowmen = 0,
  knights,
  dragons,
  beasts,
  rams = 0,
  catapults = 0,
  ladders = 0,
  towers = 0,
  onContinue,
  onSiege,
  onCancel,
  onBuild,
  onSend,
  onCancelJob,
}: {
  state: GameState;
  fromId: string;
  toId: string;
  levy: number;
  bowmen?: number;
  knights: number;
  dragons: number;
  beasts: number;
  rams?: number;
  catapults?: number;
  ladders?: number;
  towers?: number;
  onContinue: () => void;
  onSiege?: () => void;
  onCancel: () => void;
  onBuild?: (kind: JobKind) => void;
  onSend?: (part: Partial<{ rams: number; catapults: number; ladders: number; towers: number }>) => void;
  onCancelJob?: (jobId: string) => void;
}) {
  const fromTerr = state.territories[fromId]!;
  const dest = state.territories[toId]!;
  const destWater = isWater(toId);
  const fromWater = isWater(fromId);
  const force = { levy, bowmen, knights, dragons, beasts };
  const atkBeast = beasts > 0 ? beastOfTerritory(fromTerr) : null;
  const defBeast = (dest.beasts ?? 0) > 0 ? beastOfTerritory(dest) : dest.owner === "barbarian" || destWater ? null : beastOfLand(toId);
  const atk = forceStrength(force, atkBeast?.atk ?? 0);
  const def = defenseStrength(dest, defBeast?.def ?? 0);
  const atkBeastName = atkBeast?.name ?? "Beasts";
  const defBeastName = defBeast?.name ?? "Beasts";
  const atkBeastSrc = atkBeast ? BEAST_SRC[atkBeast.id] : null;
  const defBeastSrc = defBeast ? BEAST_SRC[defBeast.id] : null;
  const friendly = dest.owner === 0;
  const openSea = dest.owner === "open" && destWater;
  const sieging = !friendly && !destWater && dest.besiegedFrom === fromId;
  const haltJob = fromTerr.owner === 0 && state.clock.currentPlayer === 0 && onCancelJob ? onCancelJob : undefined;
  const defender =
    dest.owner === "open"
      ? "Open waters"
      : dest.owner === "barbarian"
        ? "Independent tribes"
        : isPlayerOwner(dest.owner)
          ? empireOf(state.players[dest.owner]!.empire).name
          : "Waters";
  const fromLabel = placeName(fromId);
  const toLabel = placeName(toId);
  const navalFight =
    destWater &&
    isPlayerOwner(dest.owner) &&
    dest.owner !== 0 &&
    ((dest.warships ?? 0) > 0 ||
      hexNeighbors(toId).some((n) => {
        if (!isWater(n)) return false;
        const nb = state.territories[n];
        return Boolean(nb && isPlayerOwner(nb.owner) && nb.owner !== 0 && (nb.warships ?? 0) > 0);
      }));
  const sent = levy + bowmen + knights + dragons + beasts;
  const needWarship = (destWater || fromWater) && sent > 0 && (fromTerr.warships ?? 0) < 1;
  const bringOf = (kind: "ram" | "catapult" | "ladder" | "tower") =>
    kind === "ram" ? rams : kind === "catapult" ? catapults : kind === "ladder" ? ladders : towers;
  const haveOf = (kind: "ram" | "catapult" | "ladder" | "tower") =>
    kind === "ram" ? fromTerr.rams ?? 0 : kind === "catapult" ? fromTerr.catapults ?? 0 : kind === "ladder" ? fromTerr.ladders ?? 0 : fromTerr.towers ?? 0;
  const sendKey = (kind: "ram" | "catapult" | "ladder" | "tower") =>
    kind === "ram" ? "rams" : kind === "catapult" ? "catapults" : kind === "ladder" ? "ladders" : "towers";
  return (
    <div className="panel action-sheet is-battle space-y-2">
      <div className="flex items-center gap-2">
        <img src={seatArt(state, fromId)} alt="" className="host-portrait is-lg object-contain" />
        <p className="min-w-0 flex-1 font-display text-base leading-tight text-fg">
          {fromLabel}
          <span className="mx-1.5 text-muted">→</span>
          {toLabel}
        </p>
        <img src={seatArt(state, toId)} alt="" className="host-portrait is-lg object-contain" />
      </div>
      <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
        {friendly ? "Move host" : openSea ? "Occupy waters" : destWater ? "Naval preview" : sieging ? `Siege of ${toLabel}` : "Battle preview"}
      </p>
      {friendly ? (
        <div className="space-y-1.5 text-sm">
          <HostStrip large levy={levy} bowmen={bowmen} knights={knights} dragons={dragons} beasts={beasts} rams={rams} catapults={catapults} ladders={ladders} towers={towers} beastSrc={atkBeastSrc} beastName={atkBeastName} />
          <p className="text-xs text-muted">
            Strength {atk} · joins the {standing(dest)} already in {toLabel}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1.5">
            <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Attackers</p>
            <HostStrip large levy={levy} bowmen={bowmen} knights={knights} dragons={dragons} beasts={beasts} rams={rams} catapults={catapults} ladders={ladders} towers={towers} beastSrc={atkBeastSrc} beastName={atkBeastName} />
            <p className="text-xs text-muted">Attack {atk}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] tracking-[0.14em] text-muted uppercase">Defenders</p>
            <p className="text-xs text-fg">{defender}</p>
            <HostStrip
              large
              levy={dest.levy}
              bowmen={dest.bowmen ?? 0}
              knights={dest.knights}
              dragons={dest.dragons}
              beasts={dest.beasts ?? 0}
              beastSrc={defBeastSrc}
              beastName={defBeastName}
            />
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted">
              Defence {def}
              {destWater ? (
                <>
                  {(dest.warships ?? 0) > 0 ? <WorkMark kind="warship" /> : <WorkMark kind="ship" />} waters
                </>
              ) : fortOf(dest) > 0 ? (
                <>
                  <WorkMark kind="walls" fort={fortOf(dest)} /> {FORT_LABEL[fortOf(dest)]?.toLowerCase()}
                </>
              ) : dest.owner === "barbarian" ? (
                <>
                  <img src={PROP_SRC.camp} alt="" className="hud-icon" /> camp
                </>
              ) : (
                " city"
              )}
            </p>
          </div>
        </div>
      )}
      {!friendly && !destWater ? (
        <div className="space-y-1.5">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Siege engines</p>
          {sieging ? (
            <p className="text-[10px] text-muted">
              Free while you siege {toLabel}. They take time, not gold.
            </p>
          ) : (
            <p className="text-[10px] text-muted">Lay siege to raise a ram, ladders, a tower or catapult here for free.</p>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {SIEGE_KINDS.map((kind) => {
              const have = haveOf(kind);
              const bring = bringOf(kind);
              const raising = jobsOfKind(state, fromId, kind);
              const capped = have + raising.length >= SIEGE_CAP;
              const wait = siegeTurnsFor(fromTerr, kind, raising.length);
              return (
                <div key={kind} className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border bg-raised/70 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-xs text-fg">
                      <SiegeMark kind={kind} />
                      {SIEGE_LABEL[kind]}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted">{have}/{SIEGE_CAP}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 flex-1 px-2 text-[11px]"
                      disabled={!sieging || !onBuild || capped}
                      data-sfx="skip"
                      onClick={() => onBuild?.(kind)}
                    >
                      {capped ? "Ready" : `Raise ${wait}w`}
                    </Button>
                    {have > 0 && onSend ? (
                      <Button
                        size="sm"
                        variant={bring > 0 ? "primary" : "secondary"}
                        className="h-8 px-2 text-[11px]"
                        onClick={() => {
                          sfx("tick");
                          onSend({ [sendKey(kind)]: bring >= have ? 0 : bring + 1 });
                        }}
                      >
                        {bring > 0 ? `Brings ${bring}` : "Leave"}
                      </Button>
                    ) : null}
                  </div>
                  {raising.map((job) => (
                    <JobTrack
                      key={job.id}
                      label={SIEGE_LABEL[kind]}
                      remaining={job.remaining}
                      total={job.total || job.remaining}
                      onCancel={haltJob ? () => haltJob(job.id) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {needWarship ? (
        <p className="text-[10px] text-danger">A warship is needed to carry a host across these waters.</p>
      ) : null}
      <p className="text-sm text-fg">
        {friendly
          ? destWater
            ? "They join the fleet next watch."
            : "They join this city next watch."
          : openSea
            ? sent > 0
              ? "A warship carries the host onto open waters next watch."
              : "The ship occupies these waters next watch and gathers the yield."
            : destWater
              ? navalFight
                ? `${oddsLabel(atk, def)} Rival warships contest these waters. A sunk warship takes the host aboard.`
                : "No rival warship holds these waters or a neighbour — the fleet takes them next watch."
              : sieging
                ? `${oddsLabel(atk, def)} Assault when you are ready — the raid opens next watch.`
                : `${oddsLabel(atk, def)} They fall on the village next watch.`}
      </p>
      <div className={`grid gap-2 ${friendly || destWater || !onSiege || sieging ? "grid-cols-2" : "grid-cols-3"}`}>
        <div className="flex items-center gap-1">
          <Hint text={friendly || destWater ? "Leave the host where it is." : "Close the preview. The siege holds if you have already laid it."} />
          <Button size="md" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {!friendly && !destWater && onSiege && !sieging ? (
          <div className="flex items-center gap-1">
            <Hint text="Lay siege. Rams, ladders, towers and catapults then raise for free in the attacking city. Catapults weaken the walls from a distance." />
            <Button size="md" variant="secondary" className="flex-1" onClick={onSiege}>
              Lay siege
            </Button>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <Hint
            text={
              destWater
                ? "Sail next watch. A ship gathers the yield. A warship carries the host and fights rival fleets."
                : fromWater
                  ? "They go ashore next watch. A sunk warship takes the army aboard."
                  : friendly
                  ? "Send the host. They arrive next watch."
                  : "Send the host. The raid opens when they arrive next watch."
            }
          />
          <Button size="md" className="flex-1" disabled={needWarship} onClick={onContinue}>
            {sieging ? "Assault" : destWater ? "Sail" : fromWater ? "Land" : "Move"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WatchReport({
  lines,
  onDismiss,
  shifts = [],
}: {
  lines: string[];
  onDismiss: () => void;
  shifts?: string[];
}) {
  return (
    <div className="panel action-sheet watch-sheet watch-enter">
      <p className="text-xs tracking-[0.16em] text-muted uppercase">Your watch begins</p>
      <ul className="watch-sheet-body space-y-1.5 text-sm text-fg">
        {lines.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ul>
      <div className="watch-sheet-foot">
        <div className="watch-sheet-go">
          <span className="inline-flex items-center gap-1">
            <Hint text="Dismiss the report and play your watch." />
            <Button size="sm" onClick={onDismiss}>
              To the map
            </Button>
          </span>
          {shifts.length ? (
            <ul className="watch-ranks">
              {shifts.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
