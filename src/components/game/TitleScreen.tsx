import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { EMPIRE_LIST } from "@/lib/game/empires";
import { beastOf } from "@/lib/game/landscape";
import { DIFFICULTIES, OPENINGS, playHref } from "@/lib/game/campaign";
import { CONTINENT_NAMES, GAME_TAGLINE, type Difficulty, type EmpireId } from "@/lib/game/types";
import { hasSave } from "@/lib/game/save";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScreenGate } from "./LoadingScreen";
import { KingPick } from "./KingPick";

const HowTo = lazy(() => import("./HowTo").then((m) => ({ default: m.HowTo })));

function paintMeridians(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 2 || h < 2) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(203,191,170,0.12)";
  ctx.lineWidth = 1;
  const cx = w * 0.72;
  const cy = h * 0.42;
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, 28 * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(t) * 180, cy + Math.sin(t) * 180);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(195,146,42,0.28)";
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.stroke();
}

export function TitleScreen() {
  return (
    <ScreenGate pack="title" label="Loading the game">
      <TitleReady />
    </ScreenGate>
  );
}

function TitleReady() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [empire, setEmpire] = useState<EmpireId>("asgard");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [help, setHelp] = useState(false);
  const [canResume, setCanResume] = useState(() => typeof window !== "undefined" && hasSave());
  const chosen = EMPIRE_LIST.find((e) => e.id === empire)!;
  const chosenBeast = beastOf(empire);
  const start = playHref(empire, difficulty, OPENINGS[0]!.id);
  const chosenRegion = CONTINENT_NAMES[chosen.region];
  const others = EMPIRE_LIST.filter((e) => e.id !== empire);

  useEffect(() => {
    const refresh = () => setCanResume(hasSave());
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => paintMeridians(canvas);
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return (
    <main className="relative h-dvh overflow-y-auto overflow-x-hidden bg-bg text-fg">
      <canvas
        id="ae-title"
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-5 px-4 py-4 sm:gap-8 sm:px-8 sm:py-8">
        <header className="title-hero reveal">
          <img
            src="/map/title-dragon.jpg?v=globe"
            alt=""
            width={1728}
            height={1152}
            decoding="async"
            className="title-hero-art"
          />
          <div className="title-hero-veil" aria-hidden="true" />
          <div className="title-hero-body">
            <div className="title-hero-copy">
              <div className="title-hero-lead">
                <p className="text-[10px] tracking-[0.22em] text-muted uppercase">{GAME_TAGLINE}</p>
                <h1 className="font-display text-3xl leading-[0.95] tracking-tight sm:text-4xl lg:text-5xl">
                  Ancient Empires
                  <span className="title-hero-of">of Dragon Kings</span>
                </h1>
                <p className="title-hero-reign">
                  {chosen.name}
                  <span className="text-muted">
                    {" "}
                    · {chosenRegion} · {chosenBeast.name}
                  </span>
                </p>
              </div>
              <div className="king-roster">
                <KingPick empire={chosen} selected />
              </div>
              <div className="title-hero-picks">
                <div className="title-hero-diffs" role="group" aria-label="Difficulty">
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
                <div className="title-hero-actions">
                  <Link to={start.to} params={start.params} className={cn(buttonVariants({ size: "sm" }), "title-hero-begin")}>
                    Begin the age
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setHelp(true)}>
                    How to play
                  </Button>
                  {canResume ? (
                    <Link
                      to="/play/$empire/$difficulty/$opening"
                      params={{ empire: "resume", difficulty: "normal", opening: "capital" }}
                      className={buttonVariants({ size: "sm", variant: "secondary" })}
                    >
                      Resume
                    </Link>
                  ) : null}
                  <Link to="/drill" className={buttonVariants({ size: "sm", variant: "secondary" })}>
                    Battle Training
                  </Link>
                </div>
              </div>
            </div>
            <div className="title-hero-dragon" aria-hidden="true" />
          </div>
        </header>

        <section>
          <p className="mb-2 text-xs tracking-[0.18em] text-muted uppercase">Choose another Dragon King</p>
          <div className="king-roster">
            {others.map((e) => (
              <KingPick key={e.id} empire={e} onPick={setEmpire} />
            ))}
          </div>
        </section>
      </div>
      {help ? (
        <Suspense fallback={null}>
          <HowTo onClose={() => setHelp(false)} />
        </Suspense>
      ) : null}
    </main>
  );
}
