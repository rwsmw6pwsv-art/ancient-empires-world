import { useEffect, useRef, useState } from "react";
import { Swords } from "lucide-react";
import {
  BATTLE_UNIT_SRC,
  BEAST_SRC,
  PROP_SRC,
  SIEGE_SRC,
  TERRAIN_TEXTURE,
  beastOf,
} from "@/lib/game/landscape";
import {
  RAID_H,
  RAID_W,
  autoDeployAll,
  canDeployAt,
  cloneRaid,
  deployTroop,
  pickRaidKind,
  raidKindsLeft,
  raidOutcome,
  raidWinner,
  runRaid,
  stepRaid,
  type RaidKind,
  type RaidState,
} from "@/lib/game/raid";
import type { GameState } from "@/lib/game/types";
import { SIEGE_LABEL, UNIT_LABEL_PLURAL } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import type { RaidOutcome } from "@/lib/game/raid";

const KIND_ORDER: RaidKind[] = ["ram", "tower", "ladder", "catapult", "levy", "bowman", "knight", "beast", "dragon"];

function kindLabel(kind: RaidKind, beastName: string) {
  if (kind === "beast") return beastName;
  if (kind === "levy" || kind === "bowman" || kind === "knight" || kind === "dragon") return UNIT_LABEL_PLURAL[kind];
  return SIEGE_LABEL[kind];
}

function battleTips(raid: RaidState, watching: boolean): string[] {
  if (watching) return ["Hold the walls. Archers on the keep rain arrows. Scorpions wound dragons."];
  if (raid.phase === "over") {
    return [raid.keepDestroyed ? "The keep is yours. Leave the field to take the land." : "The assault broke. Survivors fall back next watch."];
  }
  const tips: string[] = [];
  if (raid.phase === "deploy") {
    tips.push("Place hosts on the grass outside the ring. Smash the keep before the clock runs out.");
    if (raid.stock.rams > 0) tips.push("Rams only break the gate — put them on the road to the gate.");
    else if (raid.stock.ladders > 0) tips.push("Ladders open a climb. They do not knock the wall down.");
    else if (raid.stock.towers > 0) tips.push("A siege tower spills warriors, knights or beasts over the wall.");
    else if (raid.stock.catapults > 0) tips.push("Catapults stand back and weaken walls and the keep from range.");
    else if (raid.stock.dragons > 0) tips.push("Dragons fly the ring. Burn scorpions first — they can wound a dragon.");
    else if ((raid.stock.bowmen ?? 0) > 0) tips.push("Archers shoot from outside. Do not walk them into the melee.");
    else if (raid.stock.knights > 0) tips.push("Knights ride warriors down. Send them at infantry, not stone.");
    else tips.push("Warriors take the melee. Auto resolve if you would rather skip the field.");
  } else {
    tips.push("Fifty percent destruction or a fallen keep is one star. Both is two. A razed village is three.");
    const scorpion = raid.buildings.some((b) => b.kind === "scorpion" && b.hp > 0);
    if (scorpion && raid.units.some((u) => u.kind === "dragon" && u.hp > 0 && u.side === "atk")) {
      tips.push("A scorpion still stands. Keep the dragon off it or burn it first.");
    }
  }
  return tips.slice(0, 2);
}

function stockOf(raid: RaidState, kind: RaidKind) {
  if (kind === "levy") return raid.stock.levy;
  if (kind === "bowman") return raid.stock.bowmen ?? 0;
  if (kind === "knight") return raid.stock.knights;
  if (kind === "dragon") return raid.stock.dragons;
  if (kind === "beast") return raid.stock.beasts;
  if (kind === "ram") return raid.stock.rams;
  if (kind === "catapult") return raid.stock.catapults;
  if (kind === "ladder") return raid.stock.ladders;
  return raid.stock.towers;
}

function loadImg(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}

export function BattleScreen({
  state,
  battle,
  onFinish,
  onCancel,
}: {
  state: GameState;
  battle: RaidState;
  onFinish: (outcome: RaidOutcome) => void;
  onCancel: (outcome: RaidOutcome | null) => void;
}) {
  const initial = useRef(battle);
  const raidRef = useRef<RaidState>(cloneRaid(battle));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hud, setHud] = useState(() => snapshot(raidRef.current));
  const [shake, setShake] = useState(0);
  const reduced = useRef(false);
  const imgs = useRef<Record<string, HTMLImageElement>>({});
  const lastSfx = useRef({ stars: 0, keep: false });

  const from = state.territories[battle.fromId]!;
  const atkBeast = from.owner === "barbarian" ? null : beastOf(state.players[from.owner]!.empire);
  const beastSrc = atkBeast ? BEAST_SRC[atkBeast.id] : null;

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const bag = imgs.current;
    bag.levy = loadImg(BATTLE_UNIT_SRC.levy);
    bag.bowman = loadImg(BATTLE_UNIT_SRC.bowman);
    bag.knight = loadImg(BATTLE_UNIT_SRC.knight);
    bag.dragon = loadImg(BATTLE_UNIT_SRC.dragon);
    bag.city = loadImg(PROP_SRC.city);
    bag.camp = loadImg(PROP_SRC.camp);
    bag.walls = loadImg(PROP_SRC.walls);
    bag.woodwalls = loadImg(PROP_SRC.woodwalls);
    bag.woodkeep = loadImg(PROP_SRC.woodkeep);
    bag.scorpion = loadImg(PROP_SRC.scorpion);
    bag.ground = loadImg(TERRAIN_TEXTURE[battle.terrain] ?? TERRAIN_TEXTURE.grass);
    bag.ram = loadImg(SIEGE_SRC.ram);
    bag.catapult = loadImg(SIEGE_SRC.catapult);
    bag.ladder = loadImg(SIEGE_SRC.ladder);
    bag.tower = loadImg(SIEGE_SRC.tower);
    if (beastSrc) bag.beast = loadImg(beastSrc);
  }, [battle.terrain, beastSrc]);

  useEffect(() => {
    const raid = raidRef.current;
    if (raid.humanSide === "def" && raid.phase === "deploy") {
      autoDeployAll(raid);
      raid.timeScale = 1.35;
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const raid = raidRef.current;
      const beforeStars = raid.stars;
      const beforeKeep = raid.keepDestroyed;
      stepRaid(raid, dt);
      if (raid.stars > lastSfx.current.stars) {
        lastSfx.current.stars = raid.stars;
        sfx("ok");
      }
      if (raid.keepDestroyed && !lastSfx.current.keep) {
        lastSfx.current.keep = true;
        sfx("rout");
      } else if (raid.stars !== beforeStars || raid.keepDestroyed !== beforeKeep) {
        /* already handled */
      }
      setShake(reduced.current ? 0 : raid.trauma);
      hudAcc += dt;
      if (hudAcc > 0.12 || raid.phase === "over") {
        hudAcc = 0;
        setHud(snapshot(raid));
      }
      paint(canvasRef.current, wrapRef.current, raid, imgs.current, reduced.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function onField(clientX: number, clientY: number) {
    const raid = raidRef.current;
    if (raid.humanSide !== "atk" || raid.phase === "over") return;
    const map = fieldMap(canvasRef.current);
    if (!map) return;
    const x = (clientX - map.left) / map.s - map.ox / map.s;
    const y = (clientY - map.top) / map.s - map.oy / map.s;
    const kind = raid.selected;
    if (!kind) return;
    if (deployTroop(raid, kind, x, y)) {
      sfx("tap");
      setHud(snapshot(raid));
    } else if (!canDeployAt(raid, x, y)) {
      sfx("tick");
    }
  }

  const winner = hud.phase === "over" ? raidWinner(raidRef.current) : null;
  const watching = battle.humanSide === "def";
  const kinds = KIND_ORDER.filter((k) => stockOf(initial.current, k) > 0 || stockOf(raidRef.current, k) > 0);

  return (
    <div className="battle-root raid-root fixed inset-0 z-50">
      <img src={TERRAIN_TEXTURE[battle.terrain] ?? TERRAIN_TEXTURE.grass} alt="" className="battle-terrain" />
      <div className="battle-dust" />
      <div className="battle-vignette" />
      <div
        className={cn("raid-stage", shake > 0.04 && !reduced.current && "is-shake")}
        style={
          shake > 0.04 && !reduced.current
            ? { transform: `translate(${(shake * shake * 10).toFixed(1)}px, ${(shake * 6).toFixed(1)}px)` }
            : undefined
        }
      >
        <header className="raid-top">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.18em] text-muted uppercase">The field · {battle.toName}</p>
            <h2 className="font-display text-lg text-fg sm:text-xl">
              {battle.fromName} → {battle.toName}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">
              {winner
                ? winner === battle.humanSide
                  ? watching
                    ? "The keep holds."
                    : "The keep is yours."
                  : watching
                    ? "The keep is lost."
                    : "The assault breaks."
                : watching
                  ? "They deploy around the walls. Defences fire on their own."
                  : hud.phase === "deploy"
                    ? "Tap a host, then tap the grass outside the walls."
                    : "Troops path on their own. Smash the keep to take the land."}
            </p>
            {!watching ? (
              <ul className="raid-tips">
                {battleTips(raidRef.current, watching).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="raid-meter">
            <div className="raid-stars" aria-label={`${hud.stars} stars`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn("raid-star", hud.stars > i && "is-lit")} />
              ))}
            </div>
            <p className="font-display text-lg tabular-nums text-fg">{hud.destruction}%</p>
            <p className="text-[10px] tracking-[0.16em] text-muted uppercase">{fmtTime(hud.timeLeft)}</p>
            {hud.phase !== "over" && !watching ? (
              <button
                type="button"
                className="raid-speed"
                onClick={() => {
                  const raid = raidRef.current;
                  raid.timeScale = raid.timeScale >= 2.9 ? 1 : raid.timeScale >= 1.9 ? 3 : 2;
                  sfx("tick");
                  setHud(snapshot(raid));
                }}
              >
                {hud.timeScale >= 2.9 ? "3×" : hud.timeScale >= 1.9 ? "2×" : "1×"}
              </button>
            ) : null}
          </div>
        </header>

        <div className="raid-canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className="raid-canvas"
            onPointerDown={(e) => {
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
              onField(e.clientX, e.clientY);
            }}
          />
        </div>

        <div className="raid-dock">
          {!watching && hud.phase !== "over" ? (
            <div className="raid-tray">
              {kinds.map((kind) => {
                const n = stockOf(raidRef.current, kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={n < 1}
                    onClick={() => {
                      pickRaidKind(raidRef.current, kind);
                      sfx("tick");
                      setHud(snapshot(raidRef.current));
                    }}
                    className={cn("raid-chip", hud.selected === kind && "is-picked")}
                  >
                    <img
                      src={
                        kind === "ram" || kind === "catapult" || kind === "ladder" || kind === "tower"
                          ? SIEGE_SRC[kind]
                          : kind === "dragon"
                            ? BATTLE_UNIT_SRC.dragon
                            : kind === "knight"
                              ? BATTLE_UNIT_SRC.knight
                              : kind === "bowman"
                                ? BATTLE_UNIT_SRC.bowman
                              : kind === "beast" && beastSrc
                                ? beastSrc
                                : BATTLE_UNIT_SRC.levy
                      }
                      alt=""
                      className="raid-chip-art"
                    />
                    <span className="raid-chip-name">{kindLabel(kind, battle.beastName)}</span>
                    <span className="tabular-nums text-muted">{n}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="min-h-6 text-center text-xs text-muted">{hud.log}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {hud.phase === "over" ? (
              <Button
                className="flex-1"
                onClick={() => {
                  sfx("ok");
                  onFinish(raidOutcome(raidRef.current));
                }}
              >
                Leave the field
              </Button>
            ) : (
              <>
                {watching ? (
                  <p className="flex-1 text-xs text-muted">Hold the walls. You do not place a host on defence.</p>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        const raid = raidRef.current;
                        autoDeployAll(raid);
                        raid.timeScale = 2.4;
                        sfx("clash");
                        setHud(snapshot(raid));
                      }}
                    >
                      Captains, take them
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        const raid = raidRef.current;
                        runRaid(raid);
                        sfx("ok");
                        setHud(snapshot(raid));
                      }}
                    >
                      Auto resolve
                    </Button>
                  </>
                )}
                {battle.humanSide === "atk" ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const raid = raidRef.current;
                      if (raid.phase === "deploy") onCancel(null);
                      else onCancel(raidOutcome(raid));
                    }}
                  >
                    Fall back
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
      <Swords className="pointer-events-none absolute right-4 top-4 size-5 text-muted" />
    </div>
  );
}

function snapshot(raid: RaidState) {
  return {
    phase: raid.phase,
    stars: raid.stars,
    destruction: raid.destruction,
    timeLeft: raid.timeLeft,
    selected: raid.selected,
    log: raid.log[raid.log.length - 1] ?? "",
    timeScale: raid.timeScale,
  };
}

function fmtTime(t: number) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fieldMap(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const s = Math.min(rect.width / RAID_W, rect.height / RAID_H);
  const ox = (rect.width - RAID_W * s) / 2;
  const oy = (rect.height - RAID_H * s) / 2;
  return { s, ox, oy, left: rect.left, top: rect.top, w: rect.width, h: rect.height };
}

function paint(
  canvas: HTMLCanvasElement | null,
  wrap: HTMLDivElement | null,
  raid: RaidState,
  imgs: Record<string, HTMLImageElement>,
  reduced: boolean,
) {
  if (!canvas || !wrap) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = wrap.clientWidth;
  const h = Math.max(160, wrap.clientHeight);
  if (w < 4 || h < 4) return;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = Math.min(w / RAID_W, h / RAID_H);
  const ox = (w - RAID_W * s) / 2;
  const oy = (h - RAID_H * s) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  const ground = imgs.ground;
  if (ground?.complete && ground.naturalWidth) {
    ctx.drawImage(ground, 0, 0, RAID_W, RAID_H);
  } else {
    ctx.fillStyle = "#2a261c";
    ctx.fillRect(0, 0, RAID_W, RAID_H);
  }
  const dusk = ctx.createRadialGradient(RAID_W / 2, RAID_H / 2, 80, RAID_W / 2, RAID_H / 2, 420);
  dusk.addColorStop(0, "rgba(12,11,10,0.08)");
  dusk.addColorStop(1, "rgba(12,11,10,0.55)");
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, RAID_W, RAID_H);
  ctx.fillStyle = "rgba(62, 48, 28, 0.5)";
  ctx.beginPath();
  ctx.ellipse(RAID_W / 2, RAID_H / 2 + 8, 196, 148, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40, 32, 20, 0.35)";
  ctx.beginPath();
  ctx.ellipse(RAID_W / 2, RAID_H / 2 + 8, 150, 108, 0, 0, Math.PI * 2);
  ctx.fill();
  if (raid.phase !== "over" && raid.humanSide === "atk") {
    ctx.strokeStyle = raid.phase === "deploy" ? "rgba(232,220,196,0.45)" : "rgba(232,220,196,0.18)";
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(RAID_W / 2, RAID_H / 2, 172, 132, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (raid.phase === "deploy" || (raid.phase === "fight" && raid.humanSide === "atk")) {
    for (const b of raid.buildings) {
      if (b.hp <= 0 || b.range < 40) continue;
      ctx.strokeStyle =
        b.kind === "air" || b.kind === "scorpion" ? "rgba(90,140,190,0.28)" : b.kind === "archer" ? "rgba(110,150,90,0.25)" : "rgba(180,90,74,0.22)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  for (const wall of raid.walls) {
    drawWall(ctx, wall, (raid.fort ?? 1) === 1 || (raid.fort ?? 1) === 3);
  }
  for (const b of raid.buildings) {
    if (b.hp <= 0) {
      ctx.fillStyle = "rgba(20,16,12,0.55)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180,90,74,0.35)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    drawBuilding(ctx, b, imgs, raid.camp, raid.fort ?? 1);
  }
  const living = raid.units.filter((u) => u.hp > 0);
  living.sort((a, b) => a.y - b.y);
  for (const u of living) drawUnit(ctx, u, imgs);
  for (const sh of raid.shots) drawShot(ctx, sh);
  if (!reduced) {
    for (const sp of raid.sparks) {
      ctx.globalAlpha = Math.max(0, sp.life / sp.max);
      ctx.fillStyle = sp.life / sp.max > 0.5 ? "rgba(232,220,196,0.9)" : "rgba(180,90,74,0.7)";
      ctx.fillRect(sp.x, sp.y, 2.6, 2.6);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, wall: RaidState["walls"][number], wood: boolean) {
  const frac = Math.max(0, wall.hp / wall.max);
  if (wall.climb) {
    ctx.fillStyle = "rgba(196,170,120,0.7)";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = "rgba(232,220,196,0.85)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(wall.x + 3, wall.y + wall.h);
    ctx.lineTo(wall.x + wall.w / 2, wall.y);
    ctx.lineTo(wall.x + wall.w - 3, wall.y + wall.h);
    ctx.stroke();
    ctx.strokeStyle = "rgba(12,11,10,0.45)";
    ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(wall.x + 3 + t * (wall.w / 2 - 3), wall.y + wall.h - t * wall.h);
      ctx.lineTo(wall.x + wall.w - 3 - t * (wall.w / 2 - 3), wall.y + wall.h - t * wall.h);
      ctx.stroke();
    }
    return;
  }
  if (wall.gate) {
    ctx.fillStyle = wood ? "rgba(92,56,24,0.96)" : "rgba(72,68,60,0.96)";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(12,11,10,0.55)";
    const aw = Math.max(8, wall.w * 0.55);
    const ah = Math.max(10, wall.h * 0.7);
    ctx.beginPath();
    ctx.moveTo(wall.x + (wall.w - aw) / 2, wall.y + wall.h);
    ctx.lineTo(wall.x + (wall.w - aw) / 2, wall.y + wall.h - ah + aw / 2);
    ctx.arc(wall.x + wall.w / 2, wall.y + wall.h - ah + aw / 2, aw / 2, Math.PI, 0);
    ctx.lineTo(wall.x + (wall.w + aw) / 2, wall.y + wall.h);
    ctx.fill();
    if (frac < 0.5) {
      ctx.strokeStyle = "rgba(180,90,74,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wall.x + 2, wall.y + 2);
      ctx.lineTo(wall.x + wall.w - 2, wall.y + wall.h - 2);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = wood
    ? `rgba(${86 + (1 - frac) * 28}, ${50 - frac * 8}, ${20}, ${0.78 + frac * 0.18})`
    : `rgba(${108 + (1 - frac) * 36}, ${104 - frac * 10}, ${92}, ${0.7 + frac * 0.24})`;
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.fillStyle = wood ? "rgba(58, 34, 14, 0.7)" : "rgba(70, 66, 58, 0.65)";
  const step = Math.max(6, Math.min(10, Math.max(wall.w, wall.h) / 5));
  if (wall.w >= wall.h) {
    for (let x = wall.x; x < wall.x + wall.w - 2; x += step) {
      ctx.fillRect(x, wall.y - 6, step * 0.55, 7);
    }
  } else {
    for (let y = wall.y; y < wall.y + wall.h - 2; y += step) {
      ctx.fillRect(wall.x - 6, y, 7, step * 0.55);
    }
  }
  if (frac < 0.4) {
    ctx.fillStyle = "rgba(20,16,12,0.35)";
    ctx.fillRect(wall.x, wall.y + wall.h * 0.4, wall.w, wall.h * 0.25);
  }
}

function drawShot(ctx: CanvasRenderingContext2D, sh: RaidState["shots"][number]) {
  const a = Math.atan2(sh.vy, sh.vx);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  ctx.rotate(a);
  if (sh.splash > 0) {
    ctx.fillStyle = "rgba(12,11,10,0.35)";
    ctx.beginPath();
    ctx.ellipse(2, 6, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c4b496";
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(12,11,10,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(232,220,196,0.95)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
    ctx.fillStyle = "#cfc6b0";
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: RaidState["buildings"][number],
  imgs: Record<string, HTMLImageElement>,
  camp: boolean,
  fort: number,
) {
  const wood = fort <= 1 || fort === 3;
  const img =
    b.kind === "keep"
      ? camp
        ? imgs.camp
        : fort === 3
          ? imgs.woodkeep
          : imgs.city
      : b.kind === "store"
        ? imgs.camp
        : b.kind === "scorpion"
          ? imgs.scorpion
          : wood
            ? imgs.woodwalls
            : imgs.walls;
  ctx.save();
  ctx.fillStyle = "rgba(12,11,10,0.35)";
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + b.r * 0.7, b.r * 0.9, b.r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  if (b.flash > 0) ctx.filter = "brightness(1.8)";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle =
    b.kind === "cannon"
      ? "#4a4338"
      : b.kind === "archer"
        ? "#3d4a3a"
        : b.kind === "air"
          ? "#3a3f4a"
          : b.kind === "scorpion"
            ? "#4a4030"
          : b.kind === "store"
            ? "#4a4034"
            : "#5a4e3c";
  ctx.fill();
  if (img?.complete && img.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r - 1, 0, Math.PI * 2);
    ctx.clip();
    const s = b.r * 2.2;
    ctx.drawImage(img, b.x - s / 2, b.y - s / 2, s, s);
    ctx.restore();
  }
  if (b.kind === "keep") {
    ctx.fillStyle = camp ? "#b45a4a" : "#cfc6b0";
    ctx.beginPath();
    ctx.moveTo(b.x + 4, b.y - b.r - 10);
    ctx.lineTo(b.x + 18, b.y - b.r - 4);
    ctx.lineTo(b.x + 4, b.y - b.r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(12,11,10,0.7)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(b.x + 4, b.y - b.r + 6);
    ctx.lineTo(b.x + 4, b.y - b.r - 10);
    ctx.stroke();
  }
  ctx.restore();
  const frac = b.hp / b.max;
  ctx.fillStyle = "rgba(12,11,10,0.75)";
  ctx.fillRect(b.x - b.r, b.y - b.r - 7, b.r * 2, 4);
  ctx.fillStyle = frac > 0.45 ? "#cfc6b0" : "#b45a4a";
  ctx.fillRect(b.x - b.r, b.y - b.r - 7, b.r * 2 * frac, 4);
  if (b.kind !== "keep" && b.kind !== "store") {
    ctx.fillStyle = "rgba(232,220,196,0.85)";
    ctx.font = "8px Palatino, serif";
    ctx.textAlign = "center";
    ctx.fillText(b.kind === "cannon" ? "cannon" : b.kind === "archer" ? "archers" : b.kind === "scorpion" ? "scorpion" : "air", b.x, b.y + b.r + 11);
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, u: RaidState["units"][number], imgs: Record<string, HTMLImageElement>) {
  const r = u.radius + (u.kind === "dragon" ? 2 : 0);
  const facing = typeof u.facing === "number" ? u.facing : 0;
  ctx.save();
  ctx.fillStyle = "rgba(12,11,10,0.4)";
  ctx.beginPath();
  ctx.ellipse(u.x, u.y + r * 0.7, r * 0.95, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(u.x, u.y);
  ctx.rotate(facing);
  if (u.flash > 0) ctx.filter = "brightness(1.9)";
  const siege = u.kind === "ram" || u.kind === "catapult" || u.kind === "ladder" || u.kind === "tower";
  const img = siege ? imgs[u.kind] : u.kind === "beast" ? imgs.beast : imgs[u.kind];
  ctx.beginPath();
  ctx.arc(0, 0, r + 1.2, 0, Math.PI * 2);
  ctx.fillStyle = siege ? "#4a3c2c" : u.side === "def" ? "#5a4034" : "#3d4a3a";
  ctx.fill();
  if (img?.complete && img.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(-facing);
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    ctx.restore();
  } else if (siege) {
    ctx.rotate(-facing);
    drawSiege(ctx, { ...u, x: 0, y: 0 });
    ctx.rotate(facing);
  }
  ctx.strokeStyle = u.side === "def" ? "rgba(180,90,74,0.95)" : "rgba(207,198,176,0.9)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const frac = u.hp / u.max;
  ctx.fillStyle = "rgba(12,11,10,0.75)";
  ctx.fillRect(u.x - r, u.y + r + 2, r * 2, 3);
  ctx.fillStyle = u.side === "def" ? "#b45a4a" : "#cfc6b0";
  ctx.fillRect(u.x - r, u.y + r + 2, r * 2 * frac, 3);
}

function drawSiege(ctx: CanvasRenderingContext2D, u: RaidState["units"][number]) {
  ctx.translate(u.x, u.y);
  ctx.fillStyle = u.planted ? "#8a7350" : "#6a5840";
  ctx.strokeStyle = "rgba(232,220,196,0.55)";
  ctx.lineWidth = 1.2;
  if (u.kind === "ram") {
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-10, -7);
    ctx.lineTo(-10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-6, 8, 3.2, 0, Math.PI * 2);
    ctx.arc(4, 8, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#3a342c";
    ctx.fill();
  } else if (u.kind === "catapult") {
    ctx.fillRect(-9, -4, 18, 8);
    ctx.strokeRect(-9, -4, 18, 8);
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(8, -14);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
  } else if (u.kind === "ladder") {
    ctx.strokeStyle = "#cfc6b0";
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(-2, -10);
    ctx.moveTo(5, 10);
    ctx.lineTo(2, -10);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      ctx.beginPath();
      ctx.moveTo(-5 + t * 3, 10 - t * 20);
      ctx.lineTo(5 - t * 3, 10 - t * 20);
      ctx.stroke();
    }
  } else {
    ctx.fillRect(-7, -16, 14, 28);
    ctx.strokeRect(-7, -16, 14, 28);
    ctx.fillStyle = "rgba(12,11,10,0.35)";
    ctx.fillRect(-5, -12, 10, 8);
  }
}
