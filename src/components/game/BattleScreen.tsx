import { useEffect, useRef, useState } from "react";
import {
  ArrowUpToLine,
  BrickWall,
  Building2,
  Castle,
  CircleHelp,
  Crosshair,
  Flame,
  Landmark,
  Minus,
  Pause,
  Play,
  Plus,
  Shield,
  Swords,
  Target,
  X,
} from "lucide-react";
import {
  BATTLE_UNIT_SRC,
  BEAST_SRC,
  CITY_ART_SRC,
  PROP_SRC,
  SCORPION_ART_SRC,
  SIEGE_SRC,
  TERRAIN_TEXTURE,
  UNIT_SHEET_SRC,
  WORLD_SRC,
  beastOf,
} from "@/lib/game/landscape";
import {
  RAID_SPEEDS,
  RAID_SLOWEST,
  KIND_ORDERS,
  ageRaidAlerts,
  autoDeployAll,
  beginAssault,
  canDeployAt,
  chargeWave,
  cloneRaid,
  defaultOrders,
  deployTroop,
  heldCount,
  hostTotal,
  pickRaidKind,
  raidBattleStatus,
  raidKindsLeft,
  raidOutcome,
  runRaid,
  setRaidOrder,
  stepRaid,
  type RaidKind,
  type RaidOrder,
  type RaidOutcome,
  type RaidState,
} from "@/lib/game/raid";
import type { GameState, HostForce } from "@/lib/game/types";
import { SIEGE_LABEL, UNIT_LABEL_PLURAL } from "@/lib/game/types";
import { TOWER_STEPS } from "@/lib/game/defense";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { getImage } from "@/lib/game/preload";
import { LoadingScreen, usePreload } from "./LoadingScreen";
import {
  CAM_ZOOM_MAX,
  CAM_ZOOM_MIN,
  clampCam,
  fieldMap,
  fitCam,
  paintRaid,
  screenToWorld,
  type RaidCam,
  unitCaption,
} from "./battlePaint";

const KIND_ORDER: RaidKind[] = ["ram", "tower", "ladder", "catapult", "levy", "bowman", "knight", "beast", "dragon"];

const TALLY_ROWS: { key: keyof HostForce; label: (beast: string) => string }[] = [
  { key: "levy", label: () => UNIT_LABEL_PLURAL.levy },
  { key: "bowmen", label: () => UNIT_LABEL_PLURAL.bowman },
  { key: "knights", label: () => UNIT_LABEL_PLURAL.knight },
  { key: "beasts", label: (beast) => beast },
  { key: "dragons", label: () => UNIT_LABEL_PLURAL.dragon },
];

function kindLabel(kind: RaidKind, beastName: string) {
  return unitCaption(kind, beastName);
}

function OrderIcon({ id }: { id: RaidOrder }) {
  const cls = "size-3.5";
  if (id === "gate") return <Landmark className={cls} aria-hidden="true" />;
  if (id === "ladder") return <ArrowUpToLine className={cls} aria-hidden="true" />;
  if (id === "tower") return <Building2 className={cls} aria-hidden="true" />;
  if (id === "wall") return <BrickWall className={cls} aria-hidden="true" />;
  if (id === "guard") return <Shield className={cls} aria-hidden="true" />;
  if (id === "posts") return <Target className={cls} aria-hidden="true" />;
  if (id === "wyrm") return <Flame className={cls} aria-hidden="true" />;
  if (id === "scorpions") return <Crosshair className={cls} aria-hidden="true" />;
  if (id === "keep") return <Castle className={cls} aria-hidden="true" />;
  if (id === "hold") return <Pause className={cls} aria-hidden="true" />;
  return <Swords className={cls} aria-hidden="true" />;
}

function defenseLine(raid: RaidState) {
  const bits: string[] = [];
  const wallName = ["", "Wood", "Stone", "High stone", "Giant stone", "Colossal stone"][raid.wallRank] ?? "";
  const outerName = ["", "Wood outer", "Stone outer", "High outer", "Giant outer", "Colossal outer"][raid.outerWallRank] ?? "";
  const keepName = ["", "Wood keep", "Stone keep", "High keep", "Giant keep", "Colossal keep"][raid.keepRank] ?? "";
  const towerName = raid.towerRank > 0 ? (TOWER_STEPS[raid.towerRank] ?? "") : "";
  const moatName = ["", "Single moat", "Dual moats", "Triple moats"][raid.moatRank] ?? "";
  if (wallName) bits.push(wallName + " walls");
  if (outerName) bits.push(outerName);
  if (keepName) bits.push(keepName);
  if (towerName) bits.push(towerName);
  if (moatName) bits.push(moatName);
  if (raid.buildings.some((b) => b.kind === "scorpion")) bits.push("Scorpions");
  return bits.length ? bits.join(" · ") : "Open ground";
}

function OrderButtons({
  kind,
  current,
  onPick,
}: {
  kind: RaidKind;
  current: RaidOrder;
  onPick: (id: RaidOrder) => void;
}) {
  return (
    <div className="raid-tactics" role="group" aria-label="Troop order">
      {(KIND_ORDERS[kind] ?? []).map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.hint}
          onClick={() => onPick(t.id)}
          className={cn("raid-tactic", current === t.id && "is-picked")}
        >
          <OrderIcon id={t.id} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function battleTips(raid: RaidState, watching: boolean): string[] {
  if (watching) return ["Hold the walls. Archers and scorpions stand on the towers. Levy at the gate sally if the walls break."];
  if (raid.phase === "over") {
    return [raid.keepDestroyed ? "The keep is yours. Leave the field to take the land." : "The assault broke. Survivors fall back next watch."];
  }
  const tips: string[] = [];
  if (raid.phase === "deploy") {
    tips.push("Set orders before the charge. Hold keeps warriors, archers, knights, beasts, catapults or dragons for the next wave. Rams, towers and ladders always roll.");
    if (raid.stock.towers > 0) tips.push("Tap a siege tower to load warriors, archers, knights or beasts. It spills them over the wall.");
    if (raid.stock.rams > 0) tips.push("Rams break the gate. Warriors and knights follow the ram, or ride ladders and towers.");
    else if (raid.stock.ladders > 0) tips.push("Ladders open a climb. Warriors follow them up. They do not knock the wall down.");
    else if (raid.stock.towers > 0) tips.push("A siege tower spills whoever you load onto it over the wall. Tap the tower to board.");
    else if (raid.stock.catapults > 0) tips.push("Catapults chew a wall for a second entry (slower than a ram), or aim at the towers.");
    else if (raid.stock.dragons > 0) tips.push("Dragons fly the city — they do not circle the walls. They hunt enemy dragons first, then scorpions.");
    else if ((raid.stock.bowmen ?? 0) > 0) tips.push("Archers ride a siege tower or shoot nearby towers. Guard the ram if you send them to the gate.");
    else if (raid.stock.beasts > 0) tips.push("Beasts punch a weak stretch of wall, drive the gate, or ride a tower over.");
    else if (raid.stock.knights > 0) tips.push("Knights follow a ram or tower, then ride the garrison down.");
    else tips.push("Warriors take the melee. Near a gate they strike it. Auto resolve if you would rather skip the field.");
  } else {
    if (raidKindsLeft(raid).length > 0) tips.push("Tap the field to send one more of the selected host, or send the rest as a second wave.");
    else if (raid.tactic === "gate") tips.push("Drive the bridges and the gate. Rams chew the gate only.");
    else if (raid.tactic === "walls") tips.push("Beasts punch a weak stretch. Ladders scale. Catapults chew the ring.");
    else if (raid.tactic === "keep") tips.push("Once inside, drive for the citadel. Dragons can burn the keep from the air.");
    else if (raid.tactic === "scorpions") tips.push("Burn the scorpions first. They are the only ground engines that wound a dragon.");
    else tips.push("Fifty percent destruction or a fallen keep is one star. Both is two. A razed village is three.");
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
  const cached = getImage(src);
  if (cached) return cached;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = src;
  return img;
}

function hostCount(h: HostForce, key: keyof HostForce) {
  if (key === "bowmen") return h.bowmen ?? 0;
  return h[key] as number;
}

function speedLabel(n: number) {
  if (n <= 0) return "Pause";
  if (n <= 0.16) return "⅛×";
  if (n <= 0.3) return "¼×";
  if (n <= 0.6) return "½×";
  return "1×";
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
  const camRef = useRef<RaidCam>(fitCam());
  const lastSpeed = useRef<number>(RAID_SLOWEST);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean; pinching: boolean; dist: number } | null>(null);
  const [hud, setHud] = useState(() => snapshot(raidRef.current, camRef.current));
  const [shake, setShake] = useState(0);
  const [brief, setBrief] = useState(false);
  const reduced = useRef(false);
  const imgs = useRef<Record<string, HTMLImageElement>>({});
  const lastSfx = useRef({ stars: 0, keep: false, alert: "" });

  const from = state.territories[battle.fromId]!;
  const atkBeast = from.owner === "barbarian" ? null : beastOf(state.players[from.owner]!.empire);
  const beastSrc = atkBeast ? BEAST_SRC[atkBeast.id] : null;
  const assets = usePreload("battle");

  useEffect(() => {
    raidRef.current.timeScale = RAID_SLOWEST;
    lastSpeed.current = RAID_SLOWEST;
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!assets.ready) return;
    const bag = imgs.current;
    bag.levy = loadImg(BATTLE_UNIT_SRC.levy);
    bag.bowman = loadImg(BATTLE_UNIT_SRC.bowman);
    bag.knight = loadImg(BATTLE_UNIT_SRC.knight);
    bag.dragon = loadImg(BATTLE_UNIT_SRC.dragon);
    bag.sheetLevy = loadImg(UNIT_SHEET_SRC.levy);
    bag.sheetBowman = loadImg(UNIT_SHEET_SRC.bowman);
    bag.sheetKnight = loadImg(UNIT_SHEET_SRC.knight);
    bag.sheetDragon = loadImg(UNIT_SHEET_SRC.dragon);
    bag.sheetBeast = loadImg(UNIT_SHEET_SRC.beast);
    bag.sheetRam = loadImg(UNIT_SHEET_SRC.ram);
    bag.sheetCatapult = loadImg(UNIT_SHEET_SRC.catapult);
    bag.scorpionArt = loadImg(SCORPION_ART_SRC);
    bag["city-camp"] = loadImg(CITY_ART_SRC.camp);
    bag["city-wood"] = loadImg(CITY_ART_SRC.wood);
    bag["city-stone"] = loadImg(CITY_ART_SRC.stone);
    bag["city-high"] = loadImg(CITY_ART_SRC.high);
    bag["city-outer"] = loadImg(CITY_ART_SRC.outer);
    bag["city-moat1"] = loadImg(CITY_ART_SRC.moat1);
    bag["city-moat2"] = loadImg(CITY_ART_SRC.moat2);
    bag["city-ring"] = loadImg(CITY_ART_SRC.ring);
    bag.city = loadImg(PROP_SRC.city);
    bag.camp = loadImg(PROP_SRC.camp);
    bag.walls = loadImg(PROP_SRC.walls);
    bag.woodwalls = loadImg(PROP_SRC.woodwalls);
    bag.woodkeep = loadImg(PROP_SRC.woodkeep);
    bag.scorpion = loadImg(PROP_SRC.scorpion);
    bag.ground = loadImg(TERRAIN_TEXTURE[battle.terrain] ?? TERRAIN_TEXTURE.grass);
    bag.world = loadImg(WORLD_SRC);
    bag.ram = loadImg(SIEGE_SRC.ram);
    bag.catapult = loadImg(SIEGE_SRC.catapult);
    bag.ladder = loadImg(SIEGE_SRC.ladder);
    bag.tower = loadImg(SIEGE_SRC.tower);
    if (beastSrc) bag.beast = loadImg(beastSrc);
  }, [assets.ready, battle.terrain, beastSrc]);

  useEffect(() => {
    if (!assets.ready) return;
    const raid = raidRef.current;
    if (raid.humanSide === "def" && raid.phase === "deploy") {
      autoDeployAll(raid);
      beginAssault(raid);
    }
  }, [assets.ready]);

  useEffect(() => {
    if (!assets.ready) return;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const raid = raidRef.current;
      ageRaidAlerts(raid, dt);
      const beforeKeep = raid.keepDestroyed;
      stepRaid(raid, dt);
      const newest = raid.alerts?.[raid.alerts.length - 1];
      if (newest && newest.age < 0.08 && newest.id !== lastSfx.current.alert) {
        lastSfx.current.alert = newest.id;
        sfx(newest.kind === "keep" ? "rout" : "ok");
      }
      if (raid.stars > lastSfx.current.stars) {
        lastSfx.current.stars = raid.stars;
        sfx("ok");
      }
      if (raid.keepDestroyed && !lastSfx.current.keep) {
        lastSfx.current.keep = true;
        sfx("rout");
      } else if (raid.keepDestroyed !== beforeKeep) {
        /* already handled */
      }
      setShake(reduced.current ? 0 : raid.trauma);
      hudAcc += dt;
      if (hudAcc > 0.12 || raid.phase === "over") {
        hudAcc = 0;
        setHud(snapshot(raid, camRef.current));
      }
      paintRaid(canvasRef.current, wrapRef.current, raid, imgs.current, reduced.current, camRef.current, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [assets.ready]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const map = fieldMap(canvasRef.current);
      const pt = map ? screenToWorld(map, camRef.current, e.clientX, e.clientY) : null;
      const dir = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      const cam = camRef.current;
      const zoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, cam.zoom * dir));
      if (pt) {
        cam.x = pt.x - (pt.x - cam.x) * (cam.zoom / zoom);
        cam.y = pt.y - (pt.y - cam.y) * (cam.zoom / zoom);
      }
      cam.zoom = zoom;
      camRef.current = clampCam(cam);
      setHud(snapshot(raidRef.current, camRef.current));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [assets.ready]);

  function bumpHud() {
    setHud(snapshot(raidRef.current, camRef.current));
  }

  function setSpeed(n: number) {
    const raid = raidRef.current;
    raid.timeScale = n;
    if (n > 0) lastSpeed.current = n;
    sfx("tick");
    bumpHud();
  }

  function setZoom(next: number, around?: { x: number; y: number }) {
    const cam = camRef.current;
    const zoom = Math.max(CAM_ZOOM_MIN, Math.min(CAM_ZOOM_MAX, next));
    if (around) {
      cam.x = around.x - (around.x - cam.x) * (cam.zoom / zoom);
      cam.y = around.y - (around.y - cam.y) * (cam.zoom / zoom);
    }
    cam.zoom = zoom;
    camRef.current = clampCam(cam);
    bumpHud();
  }

  function worldAt(clientX: number, clientY: number) {
    const map = fieldMap(canvasRef.current);
    if (!map) return null;
    return screenToWorld(map, camRef.current, clientX, clientY);
  }

  function onField(clientX: number, clientY: number) {
    const raid = raidRef.current;
    if (raid.humanSide !== "atk" || raid.phase === "over") return;
    const pt = worldAt(clientX, clientY);
    if (!pt) return;
    const kind = raid.selected;
    if (!kind) return;
    if (deployTroop(raid, kind, pt.x, pt.y)) {
      sfx("tap");
      bumpHud();
    } else if (!canDeployAt(raid, pt.x, pt.y)) {
      sfx("tick");
    }
  }

  const watching = battle.humanSide === "def";
  const kinds = KIND_ORDER.filter((k) => stockOf(initial.current, k) > 0 || stockOf(raidRef.current, k) > 0);
  const orderKinds = kinds.filter((k) => (KIND_ORDERS[k] ?? []).length > 0);
  const outcome = hud.phase === "over" ? raidOutcome(raidRef.current) : null;
  const beastName = battle.beastName;

  if (!assets.ready) {
    return (
      <div className="battle-root raid-root fixed inset-0 z-50">
        <LoadingScreen label="Preparing the battle" fraction={assets.fraction} />
      </div>
    );
  }

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
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate font-display text-base text-fg sm:text-lg">
              {battle.atkName} → {battle.defName}
            </h2>
            <button
              type="button"
              className={cn("raid-help", brief && "is-picked")}
              aria-expanded={brief}
              aria-controls="raid-brief"
              title="How to fight"
              onClick={() => setBrief((v) => !v)}
            >
              <CircleHelp className="size-4" />
              <span className="sr-only">How to fight</span>
            </button>
          </div>
          <div className="raid-meter">
            <div className="flex items-center justify-end gap-2">
              <div className="raid-stars" aria-label={`${hud.stars} stars`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={cn("raid-star", hud.stars > i && "is-lit")} />
                ))}
              </div>
              <p className="font-display text-base tabular-nums text-fg sm:text-lg">{hud.destruction}%</p>
              <p className="text-[10px] tracking-[0.16em] text-muted uppercase">{fmtTime(hud.timeLeft)}</p>
            </div>
          </div>
        </header>

        <div className="raid-canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            className="raid-canvas"
            onPointerDown={(e) => {
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
              drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, pinching: false, dist: 0 };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.id !== e.pointerId) return;
              const dx = e.clientX - d.x;
              const dy = e.clientY - d.y;
              if (!d.moved && Math.hypot(dx, dy) < 8) return;
              d.moved = true;
              const map = fieldMap(canvasRef.current);
              if (!map) return;
              camRef.current.x -= dx / (map.s * camRef.current.zoom);
              camRef.current.y -= dy / (map.s * camRef.current.zoom);
              camRef.current = clampCam(camRef.current);
              d.x = e.clientX;
              d.y = e.clientY;
              bumpHud();
            }}
            onPointerUp={(e) => {
              const d = drag.current;
              drag.current = null;
              if (d && !d.moved) onField(e.clientX, e.clientY);
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          />
          {hud.alerts?.length ? (
            <div className="raid-alerts" aria-live="polite">
              {hud.alerts.map((a) => (
                <p key={a.id} className="raid-alert" data-kind={a.kind}>
                  {a.text}
                </p>
              ))}
            </div>
          ) : null}
          {hud.phase !== "over" ? (
            <div className="raid-status" aria-live="polite">
              {hud.status.gateLabel ? (
                <span className={cn("raid-status-chip", (hud.status.gateDown || hud.status.gateLabel.includes("destroyed")) && "is-down")}>
                  {hud.status.gateLabel}
                </span>
              ) : null}
              {hud.status.wallLabel ? (
                <span className={cn("raid-status-chip", (hud.status.wallBreached || hud.status.wallLabel.includes("down")) && "is-down")}>
                  {hud.status.wallLabel}
                </span>
              ) : null}
              {hud.status.towerLabel ? (
                <span className={cn("raid-status-chip", hud.status.towersDown > 0 && "is-down")}>
                  {hud.status.towerLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          {hud.phase !== "over" ? (
            <div className="raid-field-tools">
              <div className="raid-speed-row" role="group" aria-label="Battle speed">
                <button
                  type="button"
                  className={cn("raid-speed", hud.timeScale <= 0 && "is-picked")}
                  onClick={() => setSpeed(hud.timeScale <= 0 ? lastSpeed.current || RAID_SLOWEST : 0)}
                  title={hud.timeScale <= 0 ? "Resume" : "Pause"}
                >
                  {hud.timeScale <= 0 ? <Play className="size-3" /> : <Pause className="size-3" />}
                </button>
                {RAID_SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    className={cn("raid-speed", hud.timeScale === sp && "is-picked")}
                    onClick={() => setSpeed(sp)}
                  >
                    {speedLabel(sp)}
                  </button>
                ))}
              </div>
              <div className="raid-zoom-row" role="group" aria-label="Zoom">
                <button type="button" className="raid-speed" onClick={() => setZoom(camRef.current.zoom / 1.2)} title="Zoom out">
                  <Minus className="size-3" />
                </button>
                <button
                  type="button"
                  className="raid-speed"
                  onClick={() => {
                    camRef.current = fitCam();
                    bumpHud();
                  }}
                  title="Fit the field"
                >
                  {Math.round(hud.zoom * 100)}%
                </button>
                <button type="button" className="raid-speed" onClick={() => setZoom(camRef.current.zoom * 1.2)} title="Zoom in">
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          ) : null}
          {brief ? (
            <div className="raid-brief" id="raid-brief" role="dialog" aria-label="Battle briefing">
              <div className="raid-brief-head">
                <p>How to fight</p>
                <button type="button" className="raid-brief-close" onClick={() => setBrief(false)} title="Close">
                  <X className="size-3.5" />
                  <span className="sr-only">Close briefing</span>
                </button>
              </div>
              <p className="raid-brief-works">{defenseLine(battle)}</p>
              <ul>
                {battleTips(raidRef.current, watching).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {outcome ? (
          <BattleSummary outcome={outcome} beastName={beastName} watching={watching} humanSide={battle.humanSide} />
        ) : null}

        <div className="raid-dock">
          {!watching && hud.phase === "deploy" ? (
            <div className="raid-orders raid-plan">
              <p className="raid-orders-kicker">Orders before the charge</p>
              {orderKinds.map((kind) => (
                <div key={kind} className="raid-plan-row">
                  <p className="raid-plan-kind">{kindLabel(kind, battle.beastName)}</p>
                  <OrderButtons
                    kind={kind}
                    current={hud.orders[kind]}
                    onPick={(id) => {
                      setRaidOrder(raidRef.current, kind, id);
                      pickRaidKind(raidRef.current, kind);
                      sfx("tick");
                      bumpHud();
                    }}
                  />
                </div>
              ))}
            </div>
          ) : !watching && hud.phase !== "over" && hud.selected && (KIND_ORDERS[hud.selected] ?? []).length > 0 ? (
            <div className="raid-orders">
              <p className="raid-orders-kicker">{kindLabel(hud.selected, battle.beastName)} — order</p>
              <OrderButtons
                kind={hud.selected}
                current={hud.orders[hud.selected]}
                onPick={(id) => {
                  setRaidOrder(raidRef.current, hud.selected!, id);
                  sfx("tick");
                  bumpHud();
                }}
              />
            </div>
          ) : null}
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
                      bumpHud();
                    }}
                    className={cn(
                      "raid-chip",
                      hud.selected === kind && "is-picked",
                      hud.orders[kind] === "hold" && "is-hold",
                    )}
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
          ) : hud.phase !== "over" ? (
            <p className="min-h-6 text-center text-xs text-muted">{hud.log}</p>
          ) : null}
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
                    {hud.phase === "deploy" ? (
                      <>
                        <Button
                          variant="secondary"
                          className="flex-1"
                          disabled={hud.stockLeft < 1}
                          onClick={() => {
                            autoDeployAll(raidRef.current);
                            sfx("tick");
                            bumpHud();
                          }}
                        >
                          Place the rest
                        </Button>
                        <Button
                          className="flex-1"
                          disabled={hud.placedAtk < 1}
                          onClick={() => {
                            if (beginAssault(raidRef.current)) {
                              sfx("clash");
                              bumpHud();
                            }
                          }}
                        >
                          Charge
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          className="flex-1"
                          disabled={hud.stockLeft < 1}
                          onClick={() => {
                            autoDeployAll(raidRef.current);
                            sfx("clash");
                            bumpHud();
                          }}
                        >
                          Send the rest
                        </Button>
                        {hud.held > 0 ? (
                          <Button
                            className="flex-1"
                            onClick={() => {
                              if (chargeWave(raidRef.current)) {
                                sfx("clash");
                                bumpHud();
                              }
                            }}
                          >
                            Charge held
                          </Button>
                        ) : null}
                      </>
                    )}
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        const raid = raidRef.current;
                        runRaid(raid);
                        sfx("ok");
                        bumpHud();
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

function BattleSummary({
  outcome,
  beastName,
  watching,
  humanSide,
}: {
  outcome: RaidOutcome;
  beastName: string;
  watching: boolean;
  humanSide: "atk" | "def";
}) {
  const won = outcome.winner === humanSide;
  const you = humanSide === "atk" ? outcome.atk : outcome.def;
  const them = humanSide === "atk" ? outcome.def : outcome.atk;
  const captured = hostTotal(outcome.captured);
  const showTaken = captured > 0;
  return (
    <section className="raid-summary" aria-label="Battle summary">
      <header className="raid-summary-head">
        <p className="text-[10px] tracking-[0.18em] text-muted uppercase">After the field</p>
        <h3 className="font-display text-base text-fg">{won ? (watching ? "The keep holds." : "The keep is yours.") : watching ? "The keep is lost." : "The assault breaks."}</h3>
        {showTaken && outcome.winner === "atk" ? (
          <p className="text-xs text-muted">Captured men and beasts join the host that takes the land.</p>
        ) : (
          <p className="text-xs text-muted">{outcome.winner === "atk" ? "The garrison is spent." : "Survivors fall back to their own walls."}</p>
        )}
      </header>
      <div className="raid-summary-grid">
        <TallyTable title={watching ? "The assault" : "Your host"} tally={humanSide === "atk" ? you : them} beastName={beastName} showTaken={showTaken} />
        <TallyTable title={watching ? "Your garrison" : "The garrison"} tally={humanSide === "atk" ? them : you} beastName={beastName} showTaken={showTaken} />
      </div>
    </section>
  );
}

function TallyTable({
  title,
  tally,
  beastName,
  showTaken,
}: {
  title: string;
  tally: RaidOutcome["atk"];
  beastName: string;
  showTaken: boolean;
}) {
  const rows = TALLY_ROWS.filter((row) => hostCount(tally.remaining, row.key) + hostCount(tally.lost, row.key) + hostCount(tally.captured, row.key) > 0);
  if (!rows.length) {
    return (
      <div className="raid-tally">
        <p className="raid-tally-title">{title}</p>
        <p className="text-xs text-muted">None left on the field.</p>
      </div>
    );
  }
  return (
    <div className="raid-tally">
      <p className="raid-tally-title">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="px-2.5 py-1.5 text-left text-[10px] tracking-[0.1em] text-muted uppercase">Host</th>
            <th className="px-2.5 py-1.5 text-right text-[10px] tracking-[0.1em] text-muted uppercase">Left</th>
            <th className="px-2.5 py-1.5 text-right text-[10px] tracking-[0.1em] text-muted uppercase">Lost</th>
            {showTaken ? <th className="px-2.5 py-1.5 text-right text-[10px] tracking-[0.1em] text-muted uppercase">Taken</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border">
              <td className="px-2.5 py-1.5">{row.label(beastName)}</td>
              <td className="px-2.5 py-1.5 text-right tabular-nums">{hostCount(tally.remaining, row.key)}</td>
              <td className="px-2.5 py-1.5 text-right tabular-nums">{hostCount(tally.lost, row.key)}</td>
              {showTaken ? <td className="px-2.5 py-1.5 text-right tabular-nums">{hostCount(tally.captured, row.key)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function snapshot(raid: RaidState, cam: RaidCam) {
  return {
    phase: raid.phase,
    stars: raid.stars,
    destruction: raid.destruction,
    timeLeft: raid.timeLeft,
    selected: raid.selected,
    log: raid.log[raid.log.length - 1] ?? "",
    alerts: (raid.alerts ?? []).filter((a) => a.age < 6.4).slice(-3),
    timeScale: raid.timeScale,
    tactic: raid.tactic ?? "any",
    orders: raid.orders ?? defaultOrders(),
    held: heldCount(raid),
    zoom: cam.zoom,
    placedAtk: raid.units.filter((u) => u.side === "atk" && u.hp > 0).length,
    stockLeft: raidKindsLeft(raid).length,
    status: raidBattleStatus(raid),
  };
}

function fmtTime(t: number) {
  const s = Math.max(0, Math.ceil(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
