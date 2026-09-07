import { empireOf } from "@/lib/game/empires";
import { continentsHeld, foodNeed, incomeFor, ownedIds, rankPlayers, realmPopulation, upkeepFor } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { TURN_LIMIT } from "@/lib/game/types";
import { DIFFICULTIES } from "@/lib/game/campaign";
import { Button } from "@/components/ui/button";
import { ResourceMark } from "./Cost";
import { Hint } from "./Hint";

export function Hud({ state, onEnd, onQuit }: { state: GameState; onEnd: () => void; onQuit: () => void }) {
  const human = state.players[0]!;
  const house = empireOf(human.empire);
  const inc = incomeFor(state, 0);
  const up = upkeepFor(state, 0);
  const lands = ownedIds(state, 0).length;
  const pop = realmPopulation(state, 0);
  const grain = foodNeed(state, 0);
  const cont = continentsHeld(state, 0).length;
  const lead = rankPlayers(state)[0];
  const leading = lead && lead.id === 0;
  const whose = state.players[state.clock.currentPlayer]!;
  const myTurn = whose.id === 0 && state.phase === "play";
  const age = DIFFICULTIES.find((d) => d.id === state.difficulty)?.label ?? "Medium";

  return (
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate font-display text-base tracking-wide sm:text-lg">Ancient Empires</h1>
          <p className={`truncate text-xs empire-${whose.empire}`}>
            {myTurn ? `Your watch — ${house.name}` : `${empireOf(whose.empire).name}’s watch`}
            <span className="text-muted">
              {" "}
              · {age} · Turn {state.clock.turn}/{TURN_LIMIT} · {cont} regions · {lands} lands · {pop} citizens
              {leading ? " · leading" : ""}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Hint align="end" text="Abandon this age and return to the title." />
            <Button size="sm" variant="ghost" onClick={onQuit}>
              Resign
            </Button>
          </span>
          <span className="inline-flex items-center gap-1">
            <Hint align="end" text="Pass the court. The other empires act, then a watch report opens." />
            <Button size="sm" disabled={!myTurn} onClick={onEnd}>
              End watch
            </Button>
          </span>
        </div>
      </div>
      <div className="hud-treasury">
        <ResourceMark kind="gold" amount={human.gold} labeled />
        <ResourceMark kind="silver" amount={human.silver} labeled />
        <ResourceMark kind="food" amount={human.food} labeled />
        <ResourceMark kind="metal" amount={human.metal} labeled />
        <ResourceMark kind="wood" amount={human.wood} labeled />
        <ResourceMark kind="stone" amount={human.stone} labeled />
        <span className="hidden items-center gap-1 text-xs md:inline-flex">
          +<ResourceMark kind="gold" amount={inc.gold} compact />
          +<ResourceMark kind="silver" amount={Math.max(0, inc.silver - up.silver)} compact />
          +<ResourceMark kind="food" amount={Math.max(0, inc.food - grain)} compact />
          +<ResourceMark kind="wood" amount={inc.wood} compact />
          +<ResourceMark kind="metal" amount={inc.metal} compact />
          +<ResourceMark kind="stone" amount={inc.stone} compact />
          <span className="text-muted">next tribute</span>
        </span>
      </div>
    </header>
  );
}
