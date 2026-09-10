import { useState } from "react";
import { empireOf } from "@/lib/game/empires";
import { foodNeed, incomeFor, ownedIds, rankPlayers, realmPopulation, upkeepFor } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { DIFFICULTIES } from "@/lib/game/campaign";
import { PROP_SRC } from "@/lib/game/landscape";
import { Button } from "@/components/ui/button";
import { ResourceMark } from "./Cost";
import { Hint } from "./Hint";
import { CourtsButton, CourtsSheet } from "./Courts";

export function Hud({ state, onEnd, onQuit }: { state: GameState; onEnd: () => void; onQuit: () => void }) {
  const [courts, setCourts] = useState(false);
  const human = state.players[0]!;
  const house = empireOf(human.empire);
  const inc = incomeFor(state, 0);
  const up = upkeepFor(state, 0);
  const lands = ownedIds(state, 0).length;
  const pop = realmPopulation(state, 0);
  const grain = foodNeed(state, 0);
  const you = rankPlayers(state).find((r) => r.id === 0);
  const caps = you?.capitals ?? 0;
  const whose = state.players[state.clock.currentPlayer]!;
  const myTurn = whose.id === 0 && state.phase === "play";
  const age = DIFFICULTIES.find((d) => d.id === state.difficulty)?.label ?? "Medium";

  return (
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-base leading-tight tracking-wide sm:text-lg">
            Ancient Empires of Dragon Kings
          </h1>
          <p className={`truncate text-xs empire-${whose.empire}`}>
            {myTurn ? `Your watch — ${house.name}` : `${empireOf(whose.empire).name}’s watch`}
            <span className="text-muted">
              {" "}
              · {age} · Turn {state.clock.turn} · {caps} {caps === 1 ? "capital" : "capitals"} · {lands}{" "}
              {lands === 1 ? "land" : "lands"} · {pop} {pop === 1 ? "citizen" : "citizens"}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Hint align="end" text="Write the age and return to the title. Resume from there, or open Battle Training." />
            <Button size="sm" variant="ghost" onClick={onQuit}>
              Save and leave
            </Button>
          </span>
          <span className="inline-flex items-center gap-1">
            <Hint align="end" text="End your watch. The other empires act, then a watch report opens." />
            <Button size="sm" disabled={!myTurn} onClick={onEnd}>
              End watch
            </Button>
          </span>
        </div>
      </div>
      <div className="hud-treasury">
        {you ? <CourtsButton onOpen={() => setCourts(true)} level={you.level} rank={you.ranks.overall} /> : null}
        <ResourceMark kind="gold" amount={human.gold} labeled />
        <ResourceMark kind="silver" amount={human.silver} labeled />
        <ResourceMark kind="food" amount={human.food} labeled />
        <ResourceMark kind="metal" amount={human.metal} labeled />
        <ResourceMark kind="wood" amount={human.wood} labeled />
        <ResourceMark kind="stone" amount={human.stone} labeled />
        {human.flame ? (
          <span className="inline-flex items-center gap-1 text-xs" title="Whale oil — fire arrows, flaming swords, flaming spears">
            <img src={PROP_SRC.whale} alt="" className="hud-icon" />
            <span className="hud-res-name">Flame</span>
          </span>
        ) : null}
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
      {courts ? <CourtsSheet state={state} onClose={() => setCourts(false)} /> : null}
    </header>
  );
}
