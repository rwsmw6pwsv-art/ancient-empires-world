import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BattleScreen } from "./BattleScreen";
import { Button, buttonVariants } from "@/components/ui/button";
import { Hint } from "./Hint";
import {
  CITY_PRESETS,
  DRILL_DEFAULT,
  HOST_PRESETS,
  drillFoeOf,
  openDrillRaid,
  type DrillSetup,
} from "@/lib/game/drill";
import {
  DEFENSE_HINT,
  DEFENSE_LABEL,
  MOAT_STEPS,
  SCORPION_STEPS,
  TOWER_STEPS,
  WALL_STEPS,
  type DefenseKind,
} from "@/lib/game/defense";
import { EMPIRE_LIST } from "@/lib/game/empires";
import { beastOf } from "@/lib/game/landscape";
import { CONTINENT_NAMES, UNIT_CAP, type GameState, type HostForce, type SiegeStock } from "@/lib/game/types";
import type { RaidState } from "@/lib/game/raid";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sfx";
import { ScreenGate } from "./LoadingScreen";
import { KingPick } from "./KingPick";
import { DefenseMark } from "./Cost";

const DRAGON_STEPS = ["Trained (50)", "Special (50–75)", "Rare (75–100)"] as const;

function RankSlider({
  label,
  hint,
  value,
  max,
  steps,
  onChange,
  mark,
}: {
  label: string;
  hint: string;
  value: number;
  max: number;
  steps: readonly string[];
  onChange: (n: number) => void;
  mark?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <Hint text={hint} />
          {mark}
          <span className="font-medium text-fg">{label}</span>
        </span>
        <span className="text-muted">{steps[value] ?? "None"}</span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          sfx("tick");
          onChange(Number(e.target.value));
        }}
      />
    </label>
  );
}

function CountSlider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="w-20 shrink-0 text-fg">{label}</span>
      <input
        className="flex-1"
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          sfx("tick");
          onChange(Number(e.target.value));
        }}
      />
      <span className="w-10 text-right tabular-nums text-muted">{value}</span>
    </label>
  );
}

export function DrillScreen() {
  const [setup, setSetup] = useState<DrillSetup>(DRILL_DEFAULT);
  const [session, setSession] = useState<{ state: GameState; raid: RaidState } | null>(null);
  const beast = beastOf(setup.empire);
  const chosen = EMPIRE_LIST.find((e) => e.id === setup.empire)!;
  const foeId = drillFoeOf(setup);
  const rival = EMPIRE_LIST.find((e) => e.id === foeId)!;
  const rivalBeast = beastOf(foeId);

  function patch(part: Partial<DrillSetup>) {
    setSetup((s) => ({ ...s, ...part }));
  }
  function patchForce(part: Partial<HostForce>) {
    setSetup((s) => ({ ...s, force: { ...s.force, ...part } }));
  }
  function patchGarrison(part: Partial<HostForce>) {
    setSetup((s) => ({ ...s, garrison: { ...s.garrison, ...part } }));
  }
  function patchSiege(part: Partial<SiegeStock>) {
    setSetup((s) => ({ ...s, siege: { ...s.siege, ...part } }));
  }

  if (session) {
    return (
      <BattleScreen
        state={session.state}
        battle={session.raid}
        onFinish={() => setSession(null)}
        onCancel={() => setSession(null)}
        allowAbort
      />
    );
  }

  return (
    <ScreenGate pack="drill" label="Preparing the battle">
    <main className="relative h-dvh overflow-y-auto overflow-x-hidden bg-bg text-fg">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 pb-28 sm:px-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-muted uppercase">The yard</p>
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Battle Training</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Practise a raid off the campaign. Choose attack or defence, pick the houses, set the city ring, then give orders before the charge.
            </p>
          </div>
          <Link to="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Back to the empires
          </Link>
        </header>

        <section className="panel space-y-3 p-4">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">You are</p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={setup.side === "atk" ? "primary" : "secondary"}
              onClick={() => {
                sfx("tick");
                patch({ side: "atk" });
              }}
            >
              Attack
            </Button>
            <Button
              size="sm"
              variant={setup.side === "def" ? "primary" : "secondary"}
              onClick={() => {
                sfx("tick");
                patch({ side: "def" });
              }}
            >
              Defence
            </Button>
          </div>
          <p className="text-xs text-muted">
            {setup.side === "atk"
              ? "You bring the host and engines. Place the first wave, set orders, then charge."
              : "You hold the city. Place the garrison inside the walls. Split how many hold the gate, ride the first breach, or protect the keep. Dragons can hunt theirs, hold the gate, cover a hole, or guard the citadel. The keep must fall for the assault to take the land."}
          </p>
        </section>

        <section>
          <p className="mb-2 text-xs tracking-[0.18em] text-muted uppercase">Your empire</p>
          <div className="king-roster">
            <KingPick empire={chosen} selected />
          </div>
          <p className="mt-3 mb-2 text-xs tracking-[0.18em] text-muted uppercase">Choose another Dragon King</p>
          <div className="king-roster">
            {EMPIRE_LIST.filter((e) => e.id !== setup.empire).map((e) => (
              <KingPick
                key={e.id}
                empire={e}
                onPick={(id) => {
                  patch({
                    empire: id,
                    foe: setup.foe === id || foeId === id ? (id === "egypt" ? "sumer" : "egypt") : foeId,
                  });
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {chosen.name} · {beast.name} of {CONTINENT_NAMES[chosen.region]}. Attack {beast.atk}, strength {beast.strength}, speed {beast.speed}, health {beast.health}, range {beast.range}.
          </p>
        </section>

        <section>
          <p className="mb-2 text-xs tracking-[0.18em] text-muted uppercase">Opposition</p>
          <div className="king-roster">
            {EMPIRE_LIST.filter((e) => e.id !== setup.empire).map((e) => (
              <KingPick
                key={e.id}
                empire={e}
                selected={foeId === e.id}
                onPick={(id) => {
                  patch({ foe: id });
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {setup.side === "atk"
              ? `You strike the seat of ${rival.name} — ${rivalBeast.name} of ${CONTINENT_NAMES[rival.region]}.`
              : `${rival.name} falls on your seat — ${rivalBeast.name} of ${CONTINENT_NAMES[rival.region]}.`}
          </p>
        </section>

        <section className="panel space-y-3 p-4">
          <p className="text-[10px] tracking-[0.16em] text-muted uppercase">City defence</p>
          <p className="text-xs text-muted">Separate from mines, farms and ports. End goal: a concentric ring city with moats, inner and outer walls, a keep, towers and bridges.</p>
          <div className="flex flex-wrap gap-1.5">
            {CITY_PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant="secondary"
                onClick={() => {
                  sfx("tick");
                  patch(p.patch);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["walls", setup.walls, 5, WALL_STEPS, (n: number) => patch({ walls: n })],
                ["outer-walls", setup.outer, 5, WALL_STEPS, (n: number) => patch({ outer: n })],
                ["keep-works", setup.keep, 5, WALL_STEPS, (n: number) => patch({ keep: n })],
                ["towers", setup.towers, 5, TOWER_STEPS, (n: number) => patch({ towers: n })],
                ["moats", setup.moats, 3, MOAT_STEPS, (n: number) => patch({ moats: n })],
                ["scorpion", setup.scorpions, 5, SCORPION_STEPS, (n: number) => patch({ scorpions: n })],
              ] as [DefenseKind, number, number, readonly string[], (n: number) => void][]
            ).map(([kind, value, max, steps, onChange]) => (
              <RankSlider
                key={kind}
                label={DEFENSE_LABEL[kind]}
                hint={DEFENSE_HINT[kind]}
                value={value}
                max={max}
                steps={steps}
                onChange={onChange}
                mark={<DefenseMark kind={kind} />}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="panel space-y-3 p-4">
            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">{setup.side === "atk" ? "Your host" : "The assault"}</p>
            <div className="flex flex-wrap gap-1.5">
              {HOST_PRESETS.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    sfx("tick");
                    patch({ force: p.force, siege: p.siege });
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <CountSlider label="Warriors" value={setup.force.levy} max={UNIT_CAP.levy} onChange={(n) => patchForce({ levy: n })} />
            <CountSlider label="Archers" value={setup.force.bowmen ?? 0} max={UNIT_CAP.bowman} onChange={(n) => patchForce({ bowmen: n })} />
            <CountSlider label="Knights" value={setup.force.knights} max={UNIT_CAP.knight} onChange={(n) => patchForce({ knights: n })} />
            <CountSlider label={setup.side === "atk" ? beast.name : rivalBeast.name} value={setup.force.beasts} max={UNIT_CAP.beast} onChange={(n) => patchForce({ beasts: n })} />
            <CountSlider label="Dragons" value={setup.force.dragons} max={8} onChange={(n) => patchForce({ dragons: n })} />
            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">Siege</p>
            <CountSlider label="Ram" value={setup.siege.rams} max={5} onChange={(n) => patchSiege({ rams: n })} />
            <CountSlider label="Ladders" value={setup.siege.ladders} max={5} onChange={(n) => patchSiege({ ladders: n })} />
            <CountSlider label="Siege tower" value={setup.siege.towers} max={5} onChange={(n) => patchSiege({ towers: n })} />
            <CountSlider label="Catapult" value={setup.siege.catapults} max={5} onChange={(n) => patchSiege({ catapults: n })} />
            <RankSlider
              label="Dragon"
              hint="Trained dragons are fifty across the board. A special dragon wakes on a taken capital. A rare dragon wakes when a region locks. Only dragons or scorpions wound dragons."
              value={setup.dragonTier - 1}
              max={2}
              steps={DRAGON_STEPS}
              onChange={(n) => patch({ dragonTier: (n + 1) as 1 | 2 | 3 })}
            />
          </section>

          <section className="panel space-y-3 p-4">
            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">{setup.side === "atk" ? "Garrison" : "Your garrison"}</p>
            <p className="text-xs text-muted">
              {setup.side === "atk"
                ? "Who holds the ring. Archers stand the towers. Scorpions watch the sky."
                : "You hold the ring. Set orders on the field before they charge. Knights start around the city. A dragon starts over the keep."}
            </p>
            <CountSlider label="Warriors" value={setup.garrison.levy} max={UNIT_CAP.levy} onChange={(n) => patchGarrison({ levy: n })} />
            <CountSlider label="Archers" value={setup.garrison.bowmen ?? 0} max={UNIT_CAP.bowman} onChange={(n) => patchGarrison({ bowmen: n })} />
            <CountSlider label="Knights" value={setup.garrison.knights} max={UNIT_CAP.knight} onChange={(n) => patchGarrison({ knights: n })} />
            <CountSlider label={setup.side === "def" ? beast.name : "Beasts"} value={setup.garrison.beasts} max={UNIT_CAP.beast} onChange={(n) => patchGarrison({ beasts: n })} />
            <CountSlider label="Dragons" value={setup.garrison.dragons} max={4} onChange={(n) => patchGarrison({ dragons: n })} />
            <div className="rounded-[var(--radius-sm)] border border-border bg-raised/60 p-3 text-xs text-muted">
              <p className="font-medium text-fg">On the field</p>
              <p className="mt-1">Gate — rams and the host take the bridges. Walls — beasts punch a breach. Keep — drive for the citadel. Scorpions — burn the batteries before the dragon flies.</p>
              <p className="mt-1">Moats slow the host and cut their range. Only a dragon or a scorpion wounds a dragon.</p>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            size="lg"
            className="sm:min-w-52"
            onClick={() => {
              const opened = openDrillRaid(setup);
              if (!opened) return;
              sfx("ok");
              setSession(opened);
            }}
          >
            Open the field
          </Button>
          <p className="text-xs text-muted">Nothing is spent. This yard does not touch the campaign save.</p>
        </div>
      </div>
    </main>
    </ScreenGate>
  );
}
