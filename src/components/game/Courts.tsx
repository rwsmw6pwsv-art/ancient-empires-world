import { Crown } from "lucide-react";
import { empireOf } from "@/lib/game/empires";
import { RANK_HINT, RANK_KEYS, RANK_LABEL, rankPlayers, type RankKey } from "@/lib/game/engine";
import { GAME_TAGLINE, type GameState } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { Hint } from "./Hint";
import { cn } from "@/lib/utils";

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const SHORT: Record<RankKey, string> = {
  merchant: "Mer",
  trader: "Trd",
  popular: "Pop",
  protector: "Pro",
  warlord: "War",
  colonizer: "Col",
  emperor: "Emp",
};

export function CourtsSheet({ state, onClose }: { state: GameState; onClose: () => void }) {
  const rows = rankPlayers(state);
  const you = rows.find((r) => r.id === 0);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="courts-title"
      onClick={onClose}
    >
      <div
        className="panel courts-sheet watch-enter w-full max-w-lg p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xs tracking-[0.22em] text-muted uppercase">Courts of the age</p>
            <h2 id="courts-title" className="mt-1 font-display text-2xl text-fg">
              Empire ranks
            </h2>
            <p className="mt-1 text-sm text-muted">{GAME_TAGLINE}. Level follows overall score.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {you ? (
          <div className={cn("courts-you mt-4 empire-" + you.empire)}>
            <p className="font-display text-sm">
              {empireOf(you.empire).name}
              <span className="text-muted">
                {" "}
                · Lv {you.level} · {ordinal(you.ranks.overall)} overall
              </span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {RANK_KEYS.map((key) => (
                <li key={key} title={RANK_HINT[key]}>
                  {RANK_LABEL[key]} {ordinal(you.ranks[key])}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="courts-table-wrap mt-4">
          <table className="courts-table">
            <thead>
              <tr>
                <th className="text-left">Empire</th>
                <th>Lv</th>
                <th>#</th>
                {RANK_KEYS.map((key) => (
                  <th key={key} title={RANK_HINT[key]}>
                    {SHORT[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const house = empireOf(row.empire);
                const mine = row.id === 0;
                return (
                  <tr key={row.id} className={cn("empire-" + row.empire, mine && "is-you")}>
                    <td className="courts-name">
                      {house.name}
                      {mine ? <span className="text-muted"> · you</span> : null}
                    </td>
                    <td className="tabular-nums">{row.level}</td>
                    <td className="tabular-nums">{row.ranks.overall}</td>
                    {RANK_KEYS.map((key) => (
                      <td key={key} className="tabular-nums">
                        {row.ranks[key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CourtsButton({ onOpen, level, rank }: { onOpen: () => void; level: number; rank: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Hint
        align="end"
        text="Open the courts — overall level and ranks as Merchant, Trader, Popular, Protector, Warlord, Colonizer and Emperor."
      />
      <button type="button" className="courts-chip" onClick={onOpen}>
        <Crown className="size-3.5" aria-hidden />
        Lv {level} · {ordinal(rank)}
      </button>
    </span>
  );
}
