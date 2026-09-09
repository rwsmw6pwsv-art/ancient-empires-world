import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { EMPIRE_LIST } from "@/lib/game/empires";
import { BEAST_SRC, beastOf } from "@/lib/game/landscape";
import { DIFFICULTIES, OPENINGS, playHref } from "@/lib/game/campaign";
import { CONTINENT_NAMES, type Difficulty, type EmpireId } from "@/lib/game/types";
import { hasSave } from "@/lib/game/save";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 pb-28 sm:px-8 sm:py-12">
        <header className="reveal flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="max-w-xl">
            <p className="text-[10px] tracking-[0.22em] text-muted uppercase">The age of dragons</p>
            <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">Ancient Empires</h1>
            <div className="mt-4 max-w-xl space-y-3 text-sm leading-relaxed text-muted sm:text-base">
              <p>Twelve courts. Thirteen regions. Dragons wake when a capital falls or a region locks.</p>
              <p>Raise them. Spend them. Five regions write the age — or the last throne standing at turn 200.</p>
            </div>
          </div>
          <img
            src="/map/title-dragon.jpg"
            alt=""
            width={1200}
            height={800}
            decoding="async"
            className="mx-auto h-44 w-auto object-contain sm:mx-0 sm:h-56 lg:h-72"
          />
        </header>

        <section>
          <p className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">Choose an empire</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {EMPIRE_LIST.map((e) => {
              const beast = beastOf(e.id);
              const region = CONTINENT_NAMES[e.region];
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEmpire(e.id)}
                  className={cn(
                    "empire-" + e.id,
                    "relative z-10 rounded-[var(--radius-md)] border border-border bg-raised/80 p-3 text-center transition-colors",
                    empire === e.id && "border-fg bg-surface",
                  )}
                >
                  <span className="mx-auto mb-1 flex h-20 w-full items-center justify-center sm:h-24">
                    <img
                      src={BEAST_SRC[beast.id]}
                      alt=""
                      width={160}
                      height={160}
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                  </span>
                  <span className="mt-1 block font-display text-sm">{e.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{region}</span>
                  <span className="house-swatch mx-auto mt-2 block h-1.5 w-8 rounded-full" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="hidden h-24 w-24 shrink-0 items-center justify-center sm:flex">
            <img
              src={BEAST_SRC[chosenBeast.id]}
              alt=""
              width={96}
              height={96}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg text-fg">{chosen.name}</p>
            <p className="text-sm text-muted">
              {chosenBeast.name} of {chosenRegion}. A dragon wakes on a taken capital, and again when you lock a region.
            </p>
            <p className="mt-3 text-xs tracking-[0.18em] text-muted uppercase">Difficulty</p>
            <div className="mt-2 flex flex-wrap gap-2">
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
            <p className="mt-2 text-xs text-muted">{DIFFICULTIES.find((d) => d.id === difficulty)?.blurb}</p>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={start.to} params={start.params} className={cn(buttonVariants({ size: "lg" }), "sm:min-w-52")}>
            Begin the age
          </Link>
          {canResume ? (
            <Link
              to="/play/$empire/$difficulty/$opening"
              params={{ empire: "resume", difficulty: "normal", opening: "capital" }}
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              Resume
            </Link>
          ) : null}
          <Button size="lg" variant="ghost" onClick={() => setHelp(true)}>
            How to play
          </Button>
        </div>
      </div>
      {help ? (
        <Suspense fallback={null}>
          <HowTo onClose={() => setHelp(false)} />
        </Suspense>
      ) : null}
    </main>
  );
}
