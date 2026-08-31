import { Anvil, Coins, Gem, Mountain, TreePine, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResourceMark({
  kind,
  amount,
  compact,
}: {
  kind: "gold" | "silver" | "wood" | "stone" | "metal" | "food";
  amount?: number;
  compact?: boolean;
}) {
  const Icon =
    kind === "gold"
      ? Coins
      : kind === "silver"
        ? Gem
        : kind === "food"
          ? Wheat
          : kind === "wood"
            ? TreePine
            : kind === "metal"
              ? Anvil
              : Mountain;
  const name =
    kind === "gold"
      ? "Gold"
      : kind === "silver"
        ? "Silver"
        : kind === "food"
          ? "Food"
          : kind === "wood"
            ? "Wood"
            : kind === "metal"
              ? "Metal"
              : "Stone";
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Icon className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      {compact ? <span className="sr-only">{name}</span> : <span className="text-muted">{name}</span>}
      {amount === undefined ? null : <span>{amount}</span>}
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
      {gold > 0 ? <ResourceMark kind="gold" amount={gold} /> : null}
      {silver > 0 ? <ResourceMark kind="silver" amount={silver} /> : null}
      {food > 0 ? <ResourceMark kind="food" amount={food} /> : null}
      {metal > 0 ? <ResourceMark kind="metal" amount={metal} /> : null}
      {wood > 0 ? <ResourceMark kind="wood" amount={wood} /> : null}
      {stone > 0 ? <ResourceMark kind="stone" amount={stone} /> : null}
    </span>
  );
}