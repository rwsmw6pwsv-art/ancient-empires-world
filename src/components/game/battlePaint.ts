import { TERRAIN_LABEL, type TerrainId } from "@/lib/game/landscape";
import {
  RAID_CX,
  RAID_CY,
  RAID_H,
  RAID_W,
  BOARDABLE,
  cargoTotal,
  cityArtId,
  cityRadius,
  type RaidBuilding,
  type RaidKind,
  type RaidState,
  type RaidUnit,
} from "@/lib/game/raid";
import { SIEGE_LABEL, UNIT_LABEL } from "@/lib/game/types";
import { WORLD_H, WORLD_W } from "@/lib/game/world";

export interface RaidCam {
  x: number;
  y: number;
  zoom: number;
}

export const CAM_ZOOM_MIN = 0.85;
export const CAM_ZOOM_MAX = 2.6;

export function clampNum(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function clampCam(cam: RaidCam): RaidCam {
  const zoom = clampNum(cam.zoom, CAM_ZOOM_MIN, CAM_ZOOM_MAX);
  const hw = RAID_W / (2 * zoom);
  const hh = RAID_H / (2 * zoom);
  const x =
    hw >= RAID_W / 2 ? RAID_CX : clampNum(cam.x, hw, RAID_W - hw);
  const y =
    hh >= RAID_H / 2 ? RAID_CY : clampNum(cam.y, hh, RAID_H - hh);
  return { x, y, zoom };
}

export function fitCam(): RaidCam {
  return { x: RAID_CX, y: RAID_CY, zoom: 1.05 };
}

export interface FieldMap {
  s: number;
  ox: number;
  oy: number;
  left: number;
  top: number;
  w: number;
  h: number;
}

export function fieldMap(canvas: HTMLCanvasElement | null): FieldMap | null {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const s = Math.min(rect.width / RAID_W, rect.height / RAID_H);
  const ox = (rect.width - RAID_W * s) / 2;
  const oy = (rect.height - RAID_H * s) / 2;
  return { s, ox, oy, left: rect.left, top: rect.top, w: rect.width, h: rect.height };
}

export function screenToWorld(map: FieldMap, cam: RaidCam, clientX: number, clientY: number) {
  const sx = (clientX - map.left - map.ox) / map.s;
  const sy = (clientY - map.top - map.oy) / map.s;
  return {
    x: cam.x + (sx - RAID_W / 2) / cam.zoom,
    y: cam.y + (sy - RAID_H / 2) / cam.zoom,
  };
}

function seeded(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 16), 0x7feb352d) >>> 0) || 1;
    return (s >>> 0) / 4294967296;
  };
}

function disk(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sq: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * sq, 0, 0, Math.PI * 2);
  ctx.fill();
}

function ready(img?: HTMLImageElement | null) {
  return Boolean(img?.complete && img.naturalWidth);
}

function drawWorldCrop(ctx: CanvasRenderingContext2D, raid: RaidState, world?: HTMLImageElement) {
  if (!ready(world) || !world) return false;
  const scale = world.naturalWidth / WORLD_W;
  const spanX = 200;
  const spanY = 140;
  const sx = clampNum((raid.worldX ?? WORLD_W / 2) - spanX / 2, 0, Math.max(0, WORLD_W - spanX));
  const sy = clampNum((raid.worldY ?? WORLD_H / 2) - spanY / 2, 0, Math.max(0, WORLD_H - spanY));
  ctx.drawImage(world, sx * scale, sy * scale, spanX * scale, spanY * scale, 0, 0, RAID_W, RAID_H);
  return true;
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dark: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(12,11,10,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 7 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a3420";
  ctx.fillRect(-1.4 * s, -2 * s, 2.8 * s, 8 * s);
  ctx.fillStyle = dark ? "#2f5a32" : "#3f7a3c";
  ctx.beginPath();
  ctx.ellipse(0, -8 * s, 9 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark ? "#4a8a44" : "#5aaa52";
  ctx.beginPath();
  ctx.ellipse(-3 * s, -10 * s, 5 * s, 4.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(12,11,10,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 8 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a7368";
  ctx.beginPath();
  ctx.moveTo(-8 * s, 2 * s);
  ctx.lineTo(-3 * s, -7 * s);
  ctx.lineTo(6 * s, -4 * s);
  ctx.lineTo(9 * s, 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9a9488";
  ctx.beginPath();
  ctx.moveTo(-3 * s, -7 * s);
  ctx.lineTo(2 * s, -5 * s);
  ctx.lineTo(6 * s, -4 * s);
  ctx.lineTo(-1 * s, -1 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDune(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(210, 180, 120, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(240, 220, 170, 0.4)";
  ctx.beginPath();
  ctx.ellipse(x - w * 0.15, y - h * 0.2, w * 0.55, h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(220, 235, 245, 0.8)";
  ctx.beginPath();
  ctx.moveTo(0, -10 * s);
  ctx.lineTo(6 * s, 4 * s);
  ctx.lineTo(-7 * s, 5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.moveTo(0, -10 * s);
  ctx.lineTo(2.4 * s, 0);
  ctx.lineTo(-1.5 * s, 1 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGrassTuft(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = "rgba(70, 110, 50, 0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 3 * s, y - 7 * s);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 1 * s, y - 8 * s);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 4 * s, y - 6 * s);
  ctx.stroke();
}

function inCity(raid: RaidState, x: number, y: number) {
  const r = cityRadius(raid) + 8;
  const dx = x - RAID_CX;
  const dy = (y - RAID_CY) / (raid.squash || 0.78);
  return Math.hypot(dx, dy) < r;
}

function drawTerrainFeatures(ctx: CanvasRenderingContext2D, raid: RaidState) {
  const rng = seeded(raid.seed ^ 0x9e3779b9);
  const terrain = raid.terrain;
  const n = terrain === "forest" || terrain === "jungle" ? 58 : terrain === "mountain" ? 36 : 42;
  for (let i = 0; i < n; i++) {
    const x = 18 + rng() * (RAID_W - 36);
    const y = 18 + rng() * (RAID_H - 36);
    if (inCity(raid, x, y)) continue;
    const s = 0.7 + rng() * 0.7;
    if (terrain === "forest" || terrain === "jungle") drawTree(ctx, x, y, s, terrain === "jungle");
    else if (terrain === "mountain") drawRock(ctx, x, y, s * 1.1);
    else if (terrain === "desert" || terrain === "savanna") drawDune(ctx, x, y, 18 + rng() * 22, 7 + rng() * 6);
    else if (terrain === "ice" || terrain === "tundra") drawIce(ctx, x, y, s);
    else if (rng() > 0.45) drawGrassTuft(ctx, x, y, s);
    else drawTree(ctx, x, y, s * 0.7, false);
  }
  for (const nb of raid.neighbors ?? []) {
    const len = Math.hypot(nb.dx, nb.dy) || 1;
    const nx = nb.dx / len;
    const ny = nb.dy / len;
    const px = RAID_CX + nx * 300;
    const py = RAID_CY + ny * 200;
    if (inCity(raid, px, py)) continue;
    if (nb.terrain === "forest" || nb.terrain === "jungle") {
      drawTree(ctx, px, py, 1.1, nb.terrain === "jungle");
      drawTree(ctx, px + 16, py + 10, 0.85, nb.terrain === "jungle");
    } else if (nb.terrain === "ice" || nb.terrain === "tundra") {
      drawIce(ctx, px, py, 1.2);
      drawIce(ctx, px + 12, py + 8, 0.8);
    } else if (nb.terrain === "desert") {
      drawDune(ctx, px, py, 28, 10);
    } else if (nb.terrain === "mountain") {
      drawRock(ctx, px, py, 1.3);
    }
  }
}

function drawCoast(ctx: CanvasRenderingContext2D, raid: RaidState) {
  if (!raid.coastal) return;
  const nbs = raid.neighbors ?? [];
  let lx = 0;
  let ly = 0;
  for (const n of nbs) {
    lx += n.dx;
    ly += n.dy;
  }
  const len = Math.hypot(lx, ly) || 1;
  const ox = -lx / len;
  const oy = -ly / len;
  const gx = RAID_CX + ox * 420;
  const gy = RAID_CY + oy * 300;
  const water = ctx.createRadialGradient(gx, gy, 20, gx, gy, 280);
  water.addColorStop(0, "rgba(40, 110, 150, 0.55)");
  water.addColorStop(0.55, "rgba(30, 90, 130, 0.28)");
  water.addColorStop(1, "rgba(30, 90, 130, 0)");
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, RAID_W, RAID_H);
}

function drawNeighborLabels(ctx: CanvasRenderingContext2D, raid: RaidState) {
  ctx.save();
  ctx.font = "11px Palatino, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const n of raid.neighbors ?? []) {
    const len = Math.hypot(n.dx, n.dy) || 1;
    const nx = n.dx / len;
    const ny = n.dy / len;
    const x = clampNum(RAID_CX + nx * 338, 46, RAID_W - 46);
    const y = clampNum(RAID_CY + ny * 218, 18, RAID_H - 18);
    const label = n.name;
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(12,11,10,0.55)";
    ctx.fillRect(x - w / 2, y - 8, w, 16);
    ctx.fillStyle = "rgba(232,220,196,0.92)";
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, raid: RaidState, imgs: Record<string, HTMLImageElement>) {
  const cropped = drawWorldCrop(ctx, raid, imgs.world);
  const ground = imgs.ground;
  if (!cropped) {
    if (ready(ground)) ctx.drawImage(ground, 0, 0, RAID_W, RAID_H);
    else {
      ctx.fillStyle = "#2a261c";
      ctx.fillRect(0, 0, RAID_W, RAID_H);
    }
  } else {
    ctx.fillStyle = "rgba(12,11,10,0.22)";
    ctx.fillRect(0, 0, RAID_W, RAID_H);
  }
  drawCoast(ctx, raid);
  const r = cityRadius(raid) + 28;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, RAID_W, RAID_H);
  ctx.ellipse(RAID_CX, RAID_CY, r, r * (raid.squash || 0.78), 0, 0, Math.PI * 2);
  ctx.clip("evenodd");
  if (ready(ground)) {
    ctx.globalAlpha = cropped ? 0.55 : 1;
    ctx.drawImage(ground, 0, 0, RAID_W, RAID_H);
    ctx.globalAlpha = 1;
  }
  drawTerrainFeatures(ctx, raid);
  ctx.restore();
  drawNeighborLabels(ctx, raid);
}

function drawCityPad(ctx: CanvasRenderingContext2D, raid: RaidState, imgs: Record<string, HTMLImageElement>) {
  const r = cityRadius(raid) + 24;
  const sq = raid.squash || 0.78;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(RAID_CX, RAID_CY, r, r * sq, 0, 0, Math.PI * 2);
  ctx.clip();
  const ground = imgs.ground;
  if (ready(ground) && ground) ctx.drawImage(ground, 0, 0, RAID_W, RAID_H);
  else {
    ctx.fillStyle = raid.camp || cityArtId(raid) === "camp" ? "#6b5a3a" : "#5a7844";
    ctx.fillRect(0, 0, RAID_W, RAID_H);
  }
  ctx.restore();
}

function drawCityArt(ctx: CanvasRenderingContext2D, raid: RaidState, imgs: Record<string, HTMLImageElement>) {
  const key = cityArtId(raid);
  const img = imgs[`city-${key}`];
  const r = cityRadius(raid);
  const camp = key === "camp";
  const w = camp ? Math.max(210, r * 3.15) : Math.max(190, r * 2.45);
  if (ready(img) && img) {
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    const h = w / aspect;
    ctx.drawImage(img, RAID_CX - w / 2, RAID_CY - h * 0.56, w, h);
    return;
  }
  const sq = raid.squash || 0.78;
  disk(ctx, RAID_CX, RAID_CY + 6, Math.max(36, r * 0.7), sq, camp || raid.camp ? "#7a6a48" : "#6b9144");
}

function drawWall(ctx: CanvasRenderingContext2D, wall: RaidState["walls"][number], raid: RaidState) {
  const frac = Math.max(0, wall.hp / wall.max);
  ctx.save();
  ctx.translate(wall.x + wall.w / 2, wall.y + wall.h / 2);
  ctx.rotate(wall.a || 0);
  const hw = wall.w / 2;
  const hh = wall.h / 2;
  if (wall.hp <= 0) {
    ctx.fillStyle = "rgba(48,40,32,0.7)";
    ctx.fillRect(-hw * 0.7, -hh * 0.4, wall.w * 0.7, wall.h * 0.8);
    labelPlate(ctx, 0, -hh - 8, "BREACH", "#b45a4a");
    ctx.restore();
    return;
  }
  if (wall.climb) {
    ctx.fillStyle = "rgba(196,170,120,0.9)";
    ctx.fillRect(-hw, -hh, wall.w, wall.h);
    ctx.strokeStyle = "rgba(232,220,196,0.95)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-hw + 3, hh);
    ctx.lineTo(0, -hh);
    ctx.lineTo(hw - 3, hh);
    ctx.stroke();
    labelPlate(ctx, 0, -hh - 10, "LADDER", "#cfc6b0");
    ctx.restore();
    return;
  }
  if (wall.gate) {
    ctx.fillStyle = frac < 0.45 ? "rgba(180,90,74,0.55)" : "rgba(12,11,10,0.35)";
    ctx.fillRect(-hw * 0.6, -hh * 0.5, wall.w * 0.6, wall.h);
    const outerStanding = raid.walls.some((w) => w.ring === "outer" && w.gate && w.hp > 0);
    const showLabel = !outerStanding || wall.ring === "outer";
    if (showLabel) labelPlate(ctx, 0, -hh - 10, "GATE", "#e8dcc4");
    if (frac < 1) {
      const barW = Math.max(18, wall.w * 0.8);
      ctx.fillStyle = "rgba(12,11,10,0.75)";
      ctx.fillRect(-barW / 2, hh + 4, barW, 4);
      ctx.fillStyle = frac > 0.45 ? "#cfc6b0" : "#b45a4a";
      ctx.fillRect(-barW / 2, hh + 4, barW * frac, 4);
    }
    ctx.restore();
    return;
  }
  ctx.restore();
}

function labelPlate(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.save();
  ctx.font = "bold 9px Palatino, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = "rgba(12,11,10,0.72)";
  ctx.fillRect(x - w / 2, y - 7, w, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
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
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.fillStyle = "#cfc6b0";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(5, -3.4);
    ctx.lineTo(5, 3.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: RaidBuilding, imgs: Record<string, HTMLImageElement>, _raid: RaidState) {
  const vr = b.kind === "keep" ? b.r + 4 : b.r + 2;
  const frac = b.hp / b.max;
  if (b.kind === "scorpion") {
    const img = imgs.scorpionArt;
    const s = vr * 1.7;
    ctx.save();
    if (b.flash > 0) ctx.filter = "brightness(1.8)";
    if (ready(img) && img) ctx.drawImage(img, b.x - s / 2, b.y - s * 0.82, s, s);
    ctx.restore();
  }
  const showBar = b.kind === "keep" || b.kind === "scorpion" || (b.kind === "archer" && (frac < 0.98 || b.flash > 0));
  if (!showBar) return;
  const barW = Math.max(16, vr * 1.4);
  const barY = b.kind === "keep" ? b.y - vr - 12 : b.y - vr * 1.35;
  ctx.fillStyle = "rgba(12,11,10,0.8)";
  ctx.fillRect(b.x - barW / 2, barY, barW, 4);
  ctx.fillStyle = frac > 0.45 ? "#cfc6b0" : "#b45a4a";
  ctx.fillRect(b.x - barW / 2, barY, barW * frac, 4);
}

function visRadius(u: RaidUnit) {
  if (u.kind === "dragon") return 11;
  if (u.kind === "beast") return 5;
  if (u.kind === "tower") return 8;
  if (u.kind === "ram" || u.kind === "catapult") return 6;
  if (u.kind === "knight") return 4;
  if (u.kind === "ladder") return 4;
  return 3;
}

export function unitCaption(kind: RaidKind, beastName: string) {
  if (kind === "beast") return beastName;
  if (kind === "levy" || kind === "bowman" || kind === "knight" || kind === "dragon") return UNIT_LABEL[kind];
  return SIEGE_LABEL[kind];
}

function sheetOf(u: RaidUnit, imgs: Record<string, HTMLImageElement>) {
  if (u.kind === "levy") return imgs.sheetLevy;
  if (u.kind === "bowman") return imgs.sheetBowman;
  if (u.kind === "knight") return imgs.sheetKnight;
  if (u.kind === "dragon") return imgs.sheetDragon;
  if (u.kind === "beast") return imgs.sheetBeast;
  if (u.kind === "ram") return imgs.sheetRam;
  if (u.kind === "catapult") return imgs.sheetCatapult;
  return null;
}

function drawStrip(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: number,
  frames: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flip: boolean,
) {
  const fw = img.naturalWidth / frames;
  const fh = img.naturalHeight;
  const i = ((frame % frames) + frames) % frames;
  ctx.save();
  if (flip) {
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(dx + dw / 2), -(dy + dh / 2));
  }
  ctx.drawImage(img, i * fw, 0, fw, fh, dx, dy, dw, dh);
  ctx.restore();
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  u: RaidUnit,
  imgs: Record<string, HTMLImageElement>,
  beastName: string,
  showLabel: boolean,
  now: number,
  moving: boolean,
  reduced: boolean,
  showBar: boolean,
  raid: RaidState,
) {
  const r = visRadius(u);
  const facing = typeof u.facing === "number" ? u.facing : 0;
  const atk = u.side === "atk";
  const fly = u.kind === "dragon";
  const seed = u.id.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  const t = reduced ? 0 : now / 1000;
  const flap = fly ? 10 : moving ? 8 : 0;
  const frame = flap ? Math.floor(t * flap + seed) % 4 : 0;
  const hover = fly ? 10 + Math.sin(t * 4.2 + seed) * 3 : moving ? Math.sin(t * 11 + seed) * 0.8 : 0;
  const flip = Math.cos(facing) < 0;
  const sheet = sheetOf(u, imgs);

  ctx.fillStyle = "rgba(12,11,10,0.4)";
  ctx.beginPath();
  ctx.ellipse(u.x, u.y + r * 0.55, r * (fly ? 0.7 : 0.9), r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const dw = r * (fly ? 3.1 : 1.85);
  const dh = r * (fly ? 2.5 : 2.05);
  const dx = u.x - dw / 2;
  const dy = u.y - dh * 0.78 - hover;
  ctx.save();
  if (u.flash > 0) ctx.filter = "brightness(1.85)";
  if (ready(sheet) && sheet) {
    drawStrip(ctx, sheet, frame, 4, dx, dy, dw, dh, flip);
  } else {
    const siege = u.kind === "ram" || u.kind === "catapult" || u.kind === "ladder" || u.kind === "tower";
    const img = siege ? imgs[u.kind] : u.kind === "beast" ? imgs.beast : imgs[u.kind];
    ctx.translate(u.x, u.y - hover);
    if (flip) ctx.scale(-1, 1);
    if (ready(img) && img) ctx.drawImage(img, -dw / 2, -dh * 0.78, dw, dh);
    else if (siege) drawSiege(ctx, u.kind, r);
    ctx.translate(0, 0);
  }
  ctx.restore();

  if (showBar) {
    const frac = u.hp / u.max;
    const barW = r * 2.1;
    const barY = u.y + r * 0.7;
    ctx.fillStyle = "rgba(12,11,10,0.8)";
    ctx.fillRect(u.x - barW / 2, barY, barW, 4);
    ctx.fillStyle = atk ? "#cfc6b0" : "#b45a4a";
    ctx.fillRect(u.x - barW / 2, barY, barW * frac, 4);
    if (showLabel) {
      labelPlate(ctx, u.x, barY + 12, unitCaption(u.kind, beastName).toUpperCase(), atk ? "#e8dcc4" : "#e2b2a6");
    }
  } else if (showLabel) {
    labelPlate(ctx, u.x, u.y + r * 0.85, unitCaption(u.kind, beastName).toUpperCase(), atk ? "#e8dcc4" : "#e2b2a6");
  }
  if (u.kind === "tower" && !u.dumped) {
    const n = cargoTotal(u.cargo);
    const board = raid.selected && (BOARDABLE as readonly string[]).includes(raid.selected);
    if (board) {
      ctx.strokeStyle = "rgba(232,220,196,0.85)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(u.x, u.y - 6, r + 10, r + 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (n > 0) labelPlate(ctx, u.x, u.y - r - 10, `${n} ABOARD`, "#e8dcc4");
    else if (board) labelPlate(ctx, u.x, u.y - r - 10, "LOAD", "#e8dcc4");
  }
}

function drawSiege(ctx: CanvasRenderingContext2D, kind: RaidKind, r: number) {
  ctx.fillStyle = "#8a7350";
  ctx.strokeStyle = "rgba(232,220,196,0.7)";
  ctx.lineWidth = 1.4;
  if (kind === "ram") {
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(-r * 0.7, -r * 0.45);
    ctx.lineTo(-r * 0.7, r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === "catapult") {
    ctx.fillRect(-r * 0.7, -r * 0.25, r * 1.4, r * 0.55);
    ctx.strokeRect(-r * 0.7, -r * 0.25, r * 1.4, r * 0.55);
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.25);
    ctx.lineTo(r * 0.55, -r * 0.95);
    ctx.lineTo(r * 0.2, -r * 0.25);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "ladder") {
    ctx.strokeStyle = "#cfc6b0";
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.7);
    ctx.lineTo(-r * 0.15, -r * 0.7);
    ctx.moveTo(r * 0.4, r * 0.7);
    ctx.lineTo(r * 0.15, -r * 0.7);
    ctx.stroke();
  } else {
    ctx.fillRect(-r * 0.5, -r * 1.05, r, r * 1.8);
    ctx.strokeRect(-r * 0.5, -r * 1.05, r, r * 1.8);
  }
}

function drawLegend(ctx: CanvasRenderingContext2D, raid: RaidState) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.font = "10px Palatino, 'Times New Roman', serif";
  ctx.textBaseline = "middle";
  const rows = [
    { c: "rgba(207,198,176,0.95)", t: raid.atkName },
    { c: "rgba(180,90,74,0.95)", t: raid.defName },
  ];
  let y = 14;
  for (const row of rows) {
    ctx.fillStyle = "rgba(12,11,10,0.55)";
    ctx.fillRect(8, y - 8, 108, 16);
    ctx.fillStyle = row.c;
    ctx.beginPath();
    ctx.arc(18, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(232,220,196,0.92)";
    ctx.fillText(row.t, 28, y);
    y += 18;
  }
  ctx.fillStyle = "rgba(12,11,10,0.55)";
  ctx.fillRect(8, y - 8, 108, 16);
  ctx.fillStyle = "rgba(232,220,196,0.8)";
  ctx.fillText(TERRAIN_LABEL[raid.terrain as TerrainId] ?? raid.terrain, 14, y);
  ctx.restore();
}

export function paintRaid(
  canvas: HTMLCanvasElement | null,
  wrap: HTMLDivElement | null,
  raid: RaidState,
  imgs: Record<string, HTMLImageElement>,
  reduced: boolean,
  cam: RaidCam,
  now = 0,
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
  const view = clampCam(cam);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.rect(0, 0, RAID_W, RAID_H);
  ctx.clip();
  ctx.translate(RAID_W / 2, RAID_H / 2);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-view.x, -view.y);

  drawGround(ctx, raid, imgs);
  const dusk = ctx.createRadialGradient(RAID_CX, RAID_CY, 80, RAID_CX, RAID_CY, 420);
  dusk.addColorStop(0, "rgba(12,11,10,0.02)");
  dusk.addColorStop(1, "rgba(12,11,10,0.28)");
  ctx.fillStyle = dusk;
  ctx.fillRect(0, 0, RAID_W, RAID_H);
  drawCityPad(ctx, raid, imgs);
  drawCityArt(ctx, raid, imgs);

  if (raid.phase !== "over" && raid.humanSide === "atk") {
    const r = cityRadius(raid) + 18;
    ctx.strokeStyle = raid.phase === "deploy" ? "rgba(232,220,196,0.55)" : "rgba(232,220,196,0.18)";
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(RAID_CX, RAID_CY, r, r * (raid.squash || 0.78), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (raid.phase === "deploy" && raid.humanSide === "atk") {
    for (const b of raid.buildings) {
      if (b.hp <= 0 || b.kind !== "keep") continue;
      ctx.strokeStyle = "rgba(180,90,74,0.22)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  for (const wall of raid.walls) {
    drawWall(ctx, wall, raid);
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
    drawBuilding(ctx, b, imgs, raid);
  }
  const living = raid.units.filter((u) => u.hp > 0);
  living.sort((a, b) => a.y - b.y);
  const crowded = living.length > 90 && view.zoom < 1.45;
  for (const u of living) {
    const showLabel = u.kind === "dragon" || view.zoom >= 1.7;
    const moving = raid.phase === "fight" && !u.planted;
    const showBar = !crowded || u.kind === "dragon" || u.kind === "beast" || u.kind === "ram" || u.kind === "tower";
    drawUnit(ctx, u, imgs, raid.beastName, showLabel, now, moving, reduced, showBar, raid);
  }
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

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  drawLegend(ctx, raid);
  ctx.restore();
}
