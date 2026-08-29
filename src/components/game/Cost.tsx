import { Anvil, Coins, Mountain, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResourceMark({
  kind,
  amount,
  compact,
}: {
  kind: "gold" | "wood" | "stone" | "metal";
  amount?: number;
  compact?: boolean;
}) {
  const Icon = kind === "gold" ? Coins : kind === "wood" ? TreePine : kind === "metal" ? Anvil : Mountain;
  const name = kind === "gold" ? "Gold" : kind === "wood" ? "Wood" : kind === "metal" ? "Metal" : "Stone";
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
  wood = 0,
  stone = 0,
  metal = 0,
  className,
}: {
  gold?: number;
  wood?: number;
  stone?: number;
  metal?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs", className)}>
      {gold > 0 ? <ResourceMark kind="gold" amount={gold} /> : null}
      {metal > 0 ? <ResourceMark kind="metal" amount={metal} /> : null}
      {wood > 0 ? <ResourceMark kind="wood" amount={wood} /> : null}
      {stone > 0 ? <ResourceMark kind="stone" amount={stone} /> : null}
    </span>
  );
}