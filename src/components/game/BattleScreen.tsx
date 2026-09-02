import { useEffect, useState } from "react";
import { Swords } from "lucide-react";
import { empireOf } from "@/lib/game/empires";
import {
  BATTLE_SLASH_SRC,
  BATTLE_UNIT_SRC,
  BEAST_SRC,
  TERRAIN_TEXTURE,
  beastOf,
  landscapeOf,
} from "@/lib/game/landscape";
import {
  battleWinner,
  living,
  livingCount,
  readyFighters,
  strikeOdds,
  type BattleStack,
  type BattleState,
} from "@/lib/game/battle";
import type { GameState, UnitKind } from "@/lib/game/types";
import { TERRITORY_BY_ID } from "@/lib/game/world";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

function portraitFor(kind: UnitKind, beastSrc: string | null) {
  if (kind === "beast") return beastSrc;
  if (kind === "levy") return BATTLE_UNIT_SRC.levy;
  if (kind === "knight") return BATTLE_UNIT_SRC.knight;
  return BATTLE_UNIT_SRC.dragon;
}

export function BattleScreen({
  state,
  battle,
  onStrike,
  onAuto,
  onFinish,
  onCancel,
}: {
  state: GameState;
  battle: BattleState;
  onStrike: (attackerId: string, targetId: string) => void;
  onAuto: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [fx, setFx] = useState<{ atk: string; def: string; pop: string } | null>(null);
  const [shake, setShake] = useState(false);
  const winner = battleWinner(battle);
  const yours = living(battle.stacks, battle.humanSide);
  const foes = living(battle.stacks, battle.humanSide === "atk" ? "def" : "atk");
  const ready = readyFighters(battle);
  const fromMeta = TERRITORY_BY_ID[battle.fromId]!;
  const toMeta = TERRITORY_BY_ID[battle.toId]!;
  const from = state.territories[battle.fromId]!;
  const to = state.territories[battle.toId]!;
  const atkHouse = from.owner === "barbarian" ? null : empireOf(state.players[from.owner]!.empire);
  const defHouse = to.owner === "barbarian" ? null : empireOf(state.players[to.owner]!.empire);
  const yourHouse = battle.humanSide === "atk" ? atkHouse : defHouse;
  const foeHouse = battle.humanSide === "atk" ? defHouse : atkHouse;
  const yourBeast = yourHouse ? beastOf(yourHouse.id) : null;
  const foeBeast = foeHouse ? beastOf(foeHouse.id) : null;
  const striker = yours.find((s) => s.id === picked) ?? null;
  const terrain = landscapeOf(battle.toId).terrain;
  const ground = TERRAIN_TEXTURE[terrain] ?? TERRAIN_TEXTURE.grass;
  const lastLog = battle.log[battle.log.length - 1];
  const routed = battle.routed
    ? battle.routed === battle.humanSide
      ? "Your host breaks."
      : "They break and flee."
    : null;

  useEffect(() => {
    if (!fx) return;
    const t = window.setTimeout(() => setFx(null), 520);
    return () => window.clearTimeout(t);
  }, [fx]);

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 360);
    return () => window.clearTimeout(t);
  }, [shake]);

  useEffect(() => {
    if (winner && battle.routed) sfx("rout");
  }, [winner, battle.routed]);

  function pick(id: string, mine: boolean) {
    if (winner) return;
    if (mine) {
      const f = battle.stacks.find((x) => x.id === id);
      if (!f || f.exhausted) return;
      sfx("tick");
      setPicked(id);
      return;
    }
    if (!picked) return;
    sfx("clash");
    setFx({ atk: picked, def: id, pop: lastHitLabel(battle, id) });
    setShake(true);
    onStrike(picked, id);
    setPicked(null);
  }

  return (
    <div className="battle-root">
      <img src={ground} alt="" className="battle-terrain" />
      <div className="battle-dust" />
      <div className="battle-vignette" />
      <div className={cn("battle-sheet", shake && "is-shake")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-muted uppercase">The field · {toMeta.name}</p>
            <h2 className="font-display text-xl text-fg">
              {fromMeta.name} → {toMeta.name}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {winner
                ? (routed ?? (winner === battle.humanSide ? "The field is yours." : "The host is broken."))
                : picked
                  ? "Tap an enemy to strike. They answer once."
                  : "Tap a host, then a mark. Survivors rest; then they volley back."}
            </p>
          </div>
          <Swords className="size-5 shrink-0 text-muted" />
        </div>

        {battle.fortMax > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
              Walls · {battle.fortHp}/{battle.fortMax}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <div
                className="battle-walls-fill"
                style={{ width: `${battle.fortMax ? (100 * battle.fortHp) / battle.fortMax : 0}%` }}
              />
            </div>
          </div>
        ) : null}

        <HostRow
          title={foeHouse?.name ?? "Independent tribes"}
          stacks={foes}
          count={livingCount(battle.stacks, battle.humanSide === "atk" ? "def" : "atk")}
          beastSrc={foeBeast ? BEAST_SRC[foeBeast.id] : null}
          selected={null}
          striker={striker}
          fx={fx}
          onPick={(id) => pick(id, false)}
          clickable={!winner && Boolean(picked)}
          enemy
          walls={battle.humanSide === "atk" && battle.fortHp > 0}
        />

        <p className="min-h-8 text-center font-display text-sm text-fg">{lastLog}</p>

        <HostRow
          title={yourHouse?.name ?? "Your host"}
          stacks={yours}
          count={livingCount(battle.stacks, battle.humanSide)}
          beastSrc={yourBeast ? BEAST_SRC[yourBeast.id] : null}
          selected={picked}
          striker={null}
          fx={fx}
          onPick={(id) => pick(id, true)}
          clickable={!winner}
          enemy={false}
          walls={false}
        />

        <div className="flex flex-wrap items-center gap-2">
          {winner ? (
            <Button className="flex-1" onClick={onFinish}>
              Leave the field
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={!ready.length}
                onClick={() => {
                  sfx("clash");
                  setPicked(null);
                  setShake(true);
                  onAuto();
                }}
              >
                Captains, take them
              </Button>
              {battle.humanSide === "atk" ? (
                <Button variant="ghost" onClick={onCancel}>
                  Fall back
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function lastHitLabel(battle: BattleState, targetId: string) {
  const t = battle.stacks.find((s) => s.id === targetId);
  return t ? `×${t.count}` : "";
}

function HostRow({
  title,
  stacks,
  count,
  beastSrc,
  selected,
  striker,
  fx,
  onPick,
  clickable,
  enemy,
  walls,
}: {
  title: string;
  stacks: BattleStack[];
  count: number;
  beastSrc: string | null;
  selected: string | null;
  striker: BattleStack | null;
  fx: { atk: string; def: string; pop: string } | null;
  onPick: (id: string) => void;
  clickable: boolean;
  enemy: boolean;
  walls: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] tracking-[0.16em] text-muted uppercase">
        {title} · {count}
      </p>
      {stacks.length === 0 ? (
        <p className="text-sm text-muted">None stand.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {stacks.map((f) => {
            const odds = striker ? strikeOdds(striker.atk, f.def) : null;
            const src = portraitFor(f.kind, beastSrc);
            return (
              <button
                key={f.id}
                type="button"
                disabled={!clickable || (f.exhausted && !enemy)}
                onClick={() => onPick(f.id)}
                className={cn(
                  "battle-card",
                  selected === f.id && "is-picked",
                  f.exhausted && !enemy && "is-rest",
                  fx?.atk === f.id && "is-lunge",
                  fx?.def === f.id && "is-hit",
                )}
              >
                {src ? <img src={src} alt="" className="battle-portrait" /> : null}
                {fx?.def === f.id ? <img src={BATTLE_SLASH_SRC} alt="" className="battle-slash" /> : null}
                {fx?.def === f.id ? <span className="battle-pop">{fx.pop}</span> : null}
                <span className="battle-card-meta">
                  <span className="block font-display text-xs text-fg">
                    {f.name} ×{f.count}
                  </span>
                  <span className="tabular-nums text-muted">
                    {f.atk}/{f.def} · {f.hp - f.wounds}/{f.hp}
                  </span>
                  {f.exhausted && !enemy ? <span className="block text-muted">rest</span> : null}
                  {odds ? (
                    <span
                      className={cn(
                        "block",
                        odds === "likely" ? "text-fg" : odds === "desperate" ? "text-danger" : "text-muted",
                      )}
                    >
                      {walls && odds !== "desperate" ? `${odds} · walls` : odds}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}