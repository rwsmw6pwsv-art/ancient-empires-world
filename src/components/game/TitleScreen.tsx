import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EMPIRE_LIST } from "@/lib/game/empires";
import { beastOf } from "@/lib/game/landscape";
import { DIFFICULTIES, OPENINGS, playHref } from "@/lib/game/campaign";
import { type Difficulty, type EmpireId } from "@/lib/game/types";
import { hasSave } from "@/lib/game/save";
import { Button } from "@/components/ui/button";
import { HowTo } from "./HowTo";
import { cn } from "@/lib/utils";

export function TitleScreen() {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [empire, setEmpire] = useState<EmpireId>("babylon");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [help, setHelp] = useState(false);
  const canResume = typeof window !== "undefined" && hasSave();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/ae-title.js";
    script.async = true;
    document.body.appendChild(script);
    const id = window.setTimeout(() => {
      const paint = (window as unknown as { mountAeTitle?: (c: HTMLCanvasElement) => void }).mountAeTitle;
      if (canvasRef.current && paint) paint(canvasRef.current);
    }, 80);
    return () => {
      window.clearTimeout(id);
      script.remove();
    };
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <canvas
        id="ae-title"
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 pb-24 sm:px-8 sm:py-12">
        <header className="reveal">
          <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">Ancient Empires</h1>
          <div className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-muted sm:text-base">
            <p>
              The world is still young. Twelve empires stand at the edge of history. Eight continents wait to be
              claimed.
            </p>
            <p>
              You start with a capital and nothing else. Beyond your city, the land belongs to tribes — scattered,
              fierce, and unclaimed. Expand, absorb, and outlast the other eleven.
            </p>
            <p>
              Lock five continents and the age is yours at once. If no court holds five before turn 200, the most
              continents writes the chronicle, and the most provinces if continents are tied.
            </p>
          </div>
        </header>

        <section>
          <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">Choose an empire</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {EMPIRE_LIST.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEmpire(e.id)}
                className={cn(
                  "empire-" + e.id,
                  "rounded-[var(--radius-md)] border border-border bg-raised/80 p-3 text-left transition-colors",
                  empire === e.id && "border-fg bg-surface",
                )}
              >
                <span className="house-swatch mb-2 block h-1.5 w-8 rounded-full" />
                <span className="block font-display text-sm">{e.name}</span>
                <span className="mt-1 block text-xs tabular-nums text-fg">
                  {beastOf(e.id).name} · {beastOf(e.id).atk} dmg · {beastOf(e.id).def} hp · {beastOf(e.id).cost} gold
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted line-clamp-3">{e.blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">Difficulty</p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Button
                key={d.id}
                type="button"
                size="sm"
                variant={difficulty === d.id ? "primary" : "secondary"}
                onClick={() => setDifficulty(d.id)}
              >
                {d.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{DIFFICULTIES.find((d) => d.id === difficulty)?.blurb}</p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="sm:min-w-52"
            onClick={() => nav(playHref(empire, difficulty, OPENINGS[0]!.id))}
          >
            Begin the age
          </Button>
          {canResume ? (
            <Button
              size="lg"
              variant="secondary"
              onClick={() =>
                nav({
                  to: "/play/$empire/$difficulty/$opening",
                  params: { empire: "resume", difficulty: "normal", opening: "capital" },
                })
              }
            >
              Resume
            </Button>
          ) : null}
          <Button size="lg" variant="ghost" onClick={() => setHelp(true)}>
            How to play
          </Button>
        </div>
      </div>
      {help ? <HowTo onClose={() => setHelp(false)} /> : null}
    </main>
  );
}
