import { Footprints, Hammer, Swords, Users } from "lucide-react";
import { BATTLE_UNIT_SRC, PROP_SRC, RESOURCE_TINT } from "@/lib/game/landscape";
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
}: {
  kind: "gold" | "silver" | "wood" | "stone" | "metal" | "food";
  amount?: number;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", RES_CLASS[kind])}>
      <img src={RES_SRC[kind]} alt="" className="hud-icon" />
      {compact ? <span className="sr-only">{RES_NAME[kind]}</span> : <span className="opacity-80">{RES_NAME[kind]}</span>}
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
  kind: "levy" | "knight" | "dragon" | "beast";
  amount?: number;
  beastSrc?: string | null;
  beastName?: string;
}) {
  const label = kind === "levy" ? "Men" : kind === "knight" ? "Knights" : kind === "dragon" ? "Dragons" : (beastName ?? "Beasts");
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", `unit-${kind}`)}>
      {kind === "levy" ? (
        <Users className="size-3.5 shrink-0" aria-hidden="true" />
      ) : kind === "knight" ? (
        <img src={PROP_SRC.knight} alt="" className="hud-icon hud-icon-knight" />
      ) : kind === "dragon" ? (
        <img src={PROP_SRC.dragon} alt="" className="hud-icon" />
      ) : beastSrc ? (
        <img src={beastSrc} alt="" className="hud-icon" />
      ) : (
        <Swords className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
      {amount === undefined ? null : <span className="font-medium text-fg">{amount}</span>}
    </span>
  );
}

export function WorkMark({ kind }: { kind: "port" | "castle" | "market" | "mine" | "ship" | "road" | "farm" | "walls" }) {
  const src =
    kind === "port"
      ? PROP_SRC.port
      : kind === "castle" || kind === "walls"
        ? PROP_SRC.walls
        : kind === "market"
          ? PROP_SRC.market
          : kind === "mine"
            ? PROP_SRC.mine
            : kind === "farm"
              ? PROP_SRC.farm
              : kind === "road"
                ? PROP_SRC.road
                : PROP_SRC.port;
  return <img src={src} alt="" className="hud-icon" />;
}

export function ActionIcon({ kind, className }: { kind: "train" | "march" | "build"; className?: string }) {
  const Icon = kind === "train" ? Swords : kind === "march" ? Footprints : Hammer;
  return <Icon className={cn("size-4", `act-${kind}`, className)} aria-hidden="true" />;
}

export function ResourceDot({ kind }: { kind: keyof typeof RESOURCE_TINT }) {
  return <img src={RES_SRC[kind]} alt="" className="hud-icon" />;
}

export function HostStrip({
  levy = 0,
  knights = 0,
  dragons = 0,
  beasts = 0,
  beastSrc,
  beastName = "Beasts",
  large,
}: {
  levy?: number;
  knights?: number;
  dragons?: number;
  beasts?: number;
  beastSrc?: string | null;
  beastName?: string;
  large?: boolean;
}) {
  const tiles: { src: string; n: number; label: string; cover: boolean }[] = [
    { src: BATTLE_UNIT_SRC.levy, n: levy, label: "Men", cover: true },
    { src: PROP_SRC.knight, n: knights, label: "Knights", cover: false },
    { src: beastSrc || PROP_SRC.dragon, n: beasts, label: beastName, cover: !beastSrc },
    { src: BATTLE_UNIT_SRC.dragon, n: dragons, label: "Dragons", cover: true },
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