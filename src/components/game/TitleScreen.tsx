import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { EMPIRE_LIST } from "@/lib/game/empires";
import { BEAST_SRC, beastOf } from "@/lib/game/landscape";
import { DIFFICULTIES, OPENINGS, playHref } from "@/lib/game/campaign";
import { CONTINENT_NAMES, type Difficulty, type EmpireId } from "@/lib/game/types";
import { hasSave } from "@/lib/game/save";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScreenGate } from "./LoadingScreen";

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

const pickId = (id: EmpireId) => `pick-${id}`;

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
  const [canResume, setCanResume] = useState(false);
  const chosen = EMPIRE_LIST.find((e) => e.id === empire)!;
  const chosenBeast = beastOf(empire);
  const start = playHref(empire, difficulty, OPENINGS[0]!.id);
  const chosenRegion = CONTINENT_NAMES[chosen.region];

  useEffect(() => {
    setCanResume(hasSave());
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
          <div className="title-hero-stage">
            <img
              src="/map/title-dragon.jpg"
              alt=""
              width={1200}
              height={800}
              decoding="async"
              className="title-hero-art"
            />
            <div className="title-hero-veil" aria-hidden="true" />
            <div className="title-hero-lead">
              <p className="text-[10px] tracking-[0.22em] text-muted uppercase">The age of dragons</p>
              <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Ancient Empires
              </h1>
            </div>
          </div>
          <div className="title-hero-picks">
            <div className="title-hero-select">
              <button
                type="button"
                className={cn(
                  "empire-" + empire,
                  "title-hero-house",
                  "flex items-center gap-2 rounded-[var(--radius-sm)] border border-accent bg-surface/90 px-2.5 py-1.5 text-left ring-2 ring-accent sm:gap-3 sm:px-3 sm:py-2",
                )}
                onClick={() =>
                  document.getElementById(pickId(empire))?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center sm:h-12 sm:w-12">
                  <img
                    src={BEAST_SRC[chosenBeast.id]}
                    alt=""
                    width={96}
                    height={96}
                    decoding="async"
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm sm:text-base">{chosen.name}</span>
                  <span className="block text-xs text-muted">{chosenRegion}</span>
                  <span className="house-swatch mt-0.5 block h-1.5 w-8 rounded-full sm:mt-1" />
                </span>
              </button>
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
                Train battles
              </Link>
            </div>
          </div>
        </header>

        <section>
          <p className="mb-2 text-xs tracking-[0.18em] text-muted uppercase">Choose an empire</p>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 lg:grid-cols-4">
            {EMPIRE_LIST.map((e) => {
              const beast = beastOf(e.id);
              const region = CONTINENT_NAMES[e.region];
              return (
                <button
                  key={e.id}
                  id={pickId(e.id)}
                  type="button"
                  aria-pressed={empire === e.id}
                  onPointerDown={() => setEmpire(e.id)}
                  onClick={() => setEmpire(e.id)}
                  className={cn(
                    "empire-" + e.id,
                    "empire-pick relative z-10 min-h-11 cursor-pointer touch-manipulation rounded-[var(--radius-sm)] border border-border bg-raised/80 p-1 text-center transition-colors sm:rounded-[var(--radius-md)] sm:p-3",
                    empire === e.id
                      ? "border-accent bg-surface ring-2 ring-accent"
                      : "hover:border-fg/60",
                  )}
                >
                  <span className="mx-auto flex h-8 w-full items-center justify-center sm:mb-1 sm:h-20 lg:h-24">
                    <img
                      src={BEAST_SRC[beast.id]}
                      alt=""
                      width={160}
                      height={160}
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                  </span>
                  <span className="mt-0.5 block font-display text-xs leading-tight sm:mt-1 sm:truncate sm:text-sm">{e.name}</span>
                  <span className="mt-0.5 hidden truncate text-xs leading-tight text-muted sm:block">{region}</span>
                  <span className="house-swatch mx-auto mt-1 block h-0.5 w-4 rounded-full sm:mt-2 sm:h-1.5 sm:w-8" />
                </button>
              );
            })}
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
