import { Footprints, Hammer, Shield, Swords } from "lucide-react";
import { BATTLE_UNIT_SRC, DEFENSE_SRC, PROP_SRC, RESOURCE_TINT, SIEGE_SRC, fortProp } from "@/lib/game/landscape";
import type { DefenseKind } from "@/lib/game/defense";
import type { SiegeKind, UnitKind } from "@/lib/game/types";
import { SIEGE_LABEL, UNIT_LABEL_PLURAL } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const RES_CLASS = {
  gold: "res-gold",
  silver: "res-silver",
  wood: "res-wood",
  stone: "res-stone",
  metal: "res-metal",
  food: "res-food",
} as const;

const RES_SRC: Record<keyof typeof RES_CLASS, string> = {
  gold: PROP_SRC.gold,
  silver: PROP_SRC.silver,
  wood: PROP_SRC.wood,
  stone: PROP_SRC.stone,
  metal: PROP_SRC.metal,
  food: PROP_SRC.farm,
};

const RES_NAME = {
  gold: "Gold",
  silver: "Silver",
  food: "Food",
  wood: "Wood",
  metal: "Metal",
  stone: "Stone",
} as const;

export function ResourceMark({
  kind,
  amount,
  compact,
  labeled,
}: {
  kind: "gold" | "silver" | "wood" | "stone" | "metal" | "food";
  amount?: number;
  compact?: boolean;
  labeled?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", RES_CLASS[kind], labeled && "hud-res")}>
      <img src={RES_SRC[kind]} alt="" className="hud-icon" />
      {labeled || !compact ? <span className={labeled ? "hud-res-name" : "opacity-80"}>{RES_NAME[kind]}</span> : <span className="sr-only">{RES_NAME[kind]}</span>}
      {amount === undefined ? null : <span className="font-medium text-fg">{amount}</span>}
    </span>
  );
}

export function CostRow({
  gold = 0,
  silver = 0,
  wood = 0,
  stone = 0,
  metal = 0,
  food = 0,
  className,
}: {
  gold?: number;
  silver?: number;
  wood?: number;
  stone?: number;
  metal?: number;
  food?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs", className)}>
      {gold > 0 ? <ResourceMark kind="gold" amount={gold} compact /> : null}
      {silver > 0 ? <ResourceMark kind="silver" amount={silver} compact /> : null}
      {food > 0 ? <ResourceMark kind="food" amount={food} compact /> : null}
      {metal > 0 ? <ResourceMark kind="metal" amount={metal} compact /> : null}
      {wood > 0 ? <ResourceMark kind="wood" amount={wood} compact /> : null}
      {stone > 0 ? <ResourceMark kind="stone" amount={stone} compact /> : null}
    </span>
  );
}

export function UnitMark({
  kind,
  amount,
  beastSrc,
  beastName,
}: {
  kind: UnitKind;
  amount?: number;
  beastSrc?: string | null;
  beastName?: string;
}) {
  const label = kind === "beast" ? (beastName ?? "Beasts") : UNIT_LABEL_PLURAL[kind];
  const src =
    kind === "levy"
      ? BATTLE_UNIT_SRC.levy
      : kind === "bowman"
        ? BATTLE_UNIT_SRC.bowman
        : kind === "knight"
          ? PROP_SRC.knight
          : kind === "dragon"
            ? PROP_SRC.dragon
            : beastSrc;
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", `unit-${kind}`)}>
      {src ? (
        <img src={src} alt="" className={cn("hud-icon", kind === "knight" && "hud-icon-knight", (kind === "levy" || kind === "bowman") && "object-cover")} />
      ) : (
        <Swords className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
      {amount === undefined ? null : <span className="font-medium text-fg">{amount}</span>}
    </span>
  );
}

export function WorkMark({ kind, fort }: { kind: "port" | "castle" | "market" | "mine" | "ship" | "warship" | "road" | "farm" | "walls"; fort?: number }) {
  const src =
    kind === "port"
      ? PROP_SRC.port
      : kind === "castle" || kind === "walls"
        ? fortProp(fort ?? (kind === "castle" ? 4 : 2))
        : kind === "market"
          ? PROP_SRC.market
          : kind === "mine"
            ? PROP_SRC.mine
            : kind === "farm"
              ? PROP_SRC.farm
              : kind === "road"
                ? PROP_SRC.road
                : kind === "warship"
                  ? PROP_SRC.warship
                  : kind === "ship"
                    ? PROP_SRC.ship
                    : PROP_SRC.port;
  return <img src={src} alt="" className="hud-icon" />;
}

export function DefenseMark({ kind }: { kind: DefenseKind }) {
  return <img src={DEFENSE_SRC[kind]} alt="" className="hud-icon hud-icon-defense" />;
}

export function ActionIcon({ kind, className }: { kind: "train" | "march" | "build" | "defend"; className?: string }) {
  const Icon = kind === "train" ? Swords : kind === "march" ? Footprints : kind === "defend" ? Shield : Hammer;
  return <Icon className={cn("size-4", `act-${kind}`, className)} aria-hidden="true" />;
}

export function ResourceDot({ kind }: { kind: keyof typeof RESOURCE_TINT }) {
  return <img src={RES_SRC[kind]} alt="" className="hud-icon" />;
}

export function SiegeMark({ kind, amount }: { kind: SiegeKind; amount?: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <img src={SIEGE_SRC[kind]} alt="" className="hud-icon object-cover" />
      {amount === undefined ? null : (
        <>
          <span className="sr-only">{SIEGE_LABEL[kind]}</span>
          <span className="font-medium text-fg">{amount}</span>
        </>
      )}
    </span>
  );
}

export function HostStrip({
  levy = 0,
  bowmen = 0,
  knights = 0,
  dragons = 0,
  beasts = 0,
  rams = 0,
  catapults = 0,
  ladders = 0,
  towers = 0,
  beastSrc,
  beastName = "Beasts",
  large,
}: {
  levy?: number;
  bowmen?: number;
  knights?: number;
  dragons?: number;
  beasts?: number;
  rams?: number;
  catapults?: number;
  ladders?: number;
  towers?: number;
  beastSrc?: string | null;
  beastName?: string;
  large?: boolean;
}) {
  const tiles: { src: string; n: number; label: string; cover: boolean }[] = [
    { src: BATTLE_UNIT_SRC.levy, n: levy, label: UNIT_LABEL_PLURAL.levy, cover: true },
    { src: BATTLE_UNIT_SRC.bowman, n: bowmen, label: UNIT_LABEL_PLURAL.bowman, cover: true },
    { src: PROP_SRC.knight, n: knights, label: "Knights", cover: false },
    { src: beastSrc || PROP_SRC.dragon, n: beasts, label: beastName, cover: !beastSrc },
    { src: BATTLE_UNIT_SRC.dragon, n: dragons, label: "Dragons", cover: true },
    { src: SIEGE_SRC.ram, n: rams, label: "Ram", cover: true },
    { src: SIEGE_SRC.tower, n: towers, label: "Siege tower", cover: true },
    { src: SIEGE_SRC.ladder, n: ladders, label: "Ladders", cover: true },
    { src: SIEGE_SRC.catapult, n: catapults, label: "Catapult", cover: true },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tiles.map((t) =>
        t.n > 0 ? (
          <span
            key={t.label}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-raised/80 px-1 py-0.5"
            title={`${t.n} ${t.label}`}
          >
            <img
              src={t.src}
              alt=""
              className={cn("host-portrait", large && "is-lg", !t.cover && "object-contain")}
            />
            <span className="pr-0.5 text-xs font-medium tabular-nums text-fg">{t.n}</span>
          </span>
        ) : null,
      )}
    </div>
  );
}