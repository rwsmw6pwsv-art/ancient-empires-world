import { empireOf } from "@/lib/game/empires";
import type { GameState } from "@/lib/game/types";
import { Button } from "@/components/ui/button";

export function EndScreen({ state, onMenu }: { state: GameState; onMenu: () => void }) {
  const winner = state.winner != null ? state.players[state.winner] : null;
  const house = winner ? empireOf(winner.empire) : null;
  const youWin = state.winner === 0;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/80 p-4">
      <div className="panel max-w-md p-8 text-center">
        <p className="font-display text-xs tracking-[0.22em] text-muted uppercase">{youWin ? "Triumph" : "Fall"}</p>
        <h2 className="mt-3 font-display text-3xl">{house ? `${house.name} prevails` : "The age closes"}</h2>
        <p className="mt-3 text-sm text-muted">
          {youWin
            ? "Six continents ends the age at once. Otherwise continents count first, then provinces."
            : "Another court holds more continents — or more provinces if the continents were tied."}
        </p>
        <p className="mt-2 text-xs text-muted">{state.log.at(-1)}</p>
        <Button className="mt-6 w-full" onClick={onMenu}>
          Return to the houses
        </Button>
      </div>
    </div>
  );
}
