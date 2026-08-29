#!/usr/bin/env python3
"""Trace 65 provinces onto the physical relief map and write world.ts.

One pipeline, one artifact: land pixels, province borders, and SVG hit-paths
are generated together from the same assignment so the painted map and the
playable provinces cannot drift apart.
"""
from __future__ import annotations

import ast
import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path("/workspace")
SRC = ROOT / "artifacts/imagine_images/90ca27a7-18db-4085-94d4-4bf2ce342b2d.jpg"
OUT_IMG = ROOT / "public/map/world.jpg"
WORLD_TS = ROOT / "src/lib/game/world.ts"

WORLD_W, WORLD_H = 1680, 920
MIN_LON, MAX_LON = -178.0, 190.0
MIN_LAT, MAX_LAT = -64.0, 92.0

PROVINCES = [
    ("alaska", "Alaska", "na", (-152, 61)),
    ("yukon", "Yukon", "na", (-127, 62)),
    ("hudson", "Hudson", "na", (-90, 57)),
    ("labrador", "Labrador", "na", (-64, 54)),
    ("greenland", "Greenland", "na", (-42, 72)),
    ("cascade", "Cascadia", "na", (-122, 46)),
    ("prairie", "Prairie", "na", (-105, 49)),
    ("heartland", "Heartland", "na", (-92, 40)),
    ("seaboard", "Seaboard", "na", (-77, 37)),
    ("hawaii", "Hawaii", "ca", (-157.5, 20.6)),
    ("texas", "Texas", "ca", (-99, 31)),
    ("sierra", "Sierra", "ca", (-118, 37)),
    ("mexico", "Mexico", "ca", (-102, 23)),
    ("yucatan", "Yucatan", "ca", (-89, 19)),
    ("panama", "Panama", "ca", (-84, 12)),
    ("caribbean", "Caribbean", "ca", (-72, 19)),
    ("grenada", "Granada", "sa", (-72, 6)),
    ("amazon", "Amazon", "sa", (-64, -4)),
    ("guiana", "Guiana", "sa", (-54, 4)),
    ("andes", "Andes", "sa", (-72, -16)),
    ("cerrado", "Cerrado", "sa", (-52, -14)),
    ("brazil", "Brazil", "sa", (-43, -16)),
    ("pampas", "Pampas", "sa", (-62, -34)),
    ("patagonia", "Patagonia", "sa", (-70, -42)),
    ("fjords", "Fjords", "eu", (16, 63)),
    ("highlands", "Highlands", "eu", (-3, 54)),
    ("gaul", "Gaul", "eu", (2, 47)),
    ("rhine", "Rhine", "eu", (11, 51)),
    ("slavic", "Slavic", "eu", (31, 52)),
    ("iberia", "Iberia", "eu", (-4, 40)),
    ("roma", "Roma", "eu", (12, 42)),
    ("balkans", "Balkans", "eu", (22, 42)),
    ("volga", "Volga", "eu", (46, 55)),
    ("maghreb", "Maghreb", "af", (4, 30)),
    ("nile", "Egypt", "af", (30, 27)),
    ("guinea", "Guinea", "af", (-2, 9)),
    ("congo", "Congo", "af", (22, 1)),
    ("horn", "Horn", "af", (42, 8)),
    ("rift", "Rift", "af", (32, -8)),
    ("cape", "Cape", "af", (24, -28)),
    ("madagascar", "Madagascar", "af", (47, -19)),
    ("anatolia", "Anatolia", "me", (33, 39)),
    ("arabia", "Arabia", "me", (45, 23)),
    ("gulf", "Gulf", "me", (52, 25)),
    ("mesopotamia", "Babylon", "me", (44, 33)),
    ("persia", "Persia", "me", (54, 32)),
    ("armenia", "Armenia", "me", (45, 40)),
    ("media", "Media", "me", (58, 36)),
    ("steppe", "Steppe", "me", (66, 46)),
    ("siberia", "Siberia", "as", (90, 62)),
    ("yakutia", "Yakutia", "as", (140, 64)),
    ("gobi", "Gobi", "as", (100, 44)),
    ("nippon", "Nippon", "as", (138, 36)),
    ("cathay", "Cathay", "as", (118, 36)),
    ("canton", "Canton", "as", (113, 24)),
    ("india", "India", "as", (78, 22)),
    ("indochina", "Indochina", "as", (102, 16)),
    ("malaya", "Malaya", "oc", (115, 2)),
    ("papua", "Papua", "oc", (140, -6)),
    ("outback", "Outback", "oc", (136, -24)),
    ("westralia", "Westralia", "oc", (122, -26)),
    ("coral", "Coral Coast", "oc", (148, -24)),
    ("aotearoa", "Aotearoa", "oc", (172, -41)),
    ("polynesia", "Polynesia", "oc", (176, -17)),
    ("tasmania", "Tasmania", "oc", (147, -42)),
]

BOXES = {
    "alaska": [(-180, 51, -129, 72), (170, 51, 190, 72)],
    "yukon": [(-141, 54, -108, 72)],
    "hudson": [(-112, 50, -76, 72)],
    "labrador": [(-80, 46, -50, 64)],
    "greenland": [(-75, 58, -10, 84)],
    "cascade": [(-132, 40, -108, 56)],
    "prairie": [(-116, 42, -93, 56)],
    "heartland": [(-106, 34, -80, 50)],
    "seaboard": [(-84, 24, -62, 50)],
    "hawaii": [(-162, 18, -153, 23)],
    "texas": [(-108, 25, -92, 37)],
    "sierra": [(-126, 30, -106, 43)],
    "mexico": [(-118, 14, -94, 33)],
    "yucatan": [(-94, 14, -85, 23)],
    "panama": [(-94, 6, -76, 18)],
    "caribbean": [(-86, 10, -58, 28)],
    "grenada": [(-80, -6, -58, 14)],
    "amazon": [(-76, -12, -52, 6)],
    "guiana": [(-64, -3, -48, 10)],
    "andes": [(-82, -30, -62, 3)],
    "cerrado": [(-64, -22, -44, 0)],
    "brazil": [(-50, -32, -32, 0)],
    "pampas": [(-72, -42, -48, -20)],
    "patagonia": [(-78, -56, -52, -36)],
    "fjords": [(4, 54, 34, 72)],
    "highlands": [(-12, 48, 4, 62)],
    "gaul": [(-6, 42, 10, 54)],
    "rhine": [(4, 44, 22, 56)],
    "slavic": [(18, 44, 42, 62)],
    "iberia": [(-11, 35, 5, 45)],
    "roma": [(6, 36, 20, 47)],
    "balkans": [(12, 34, 32, 47)],
    "volga": [(32, 46, 62, 64)],
    "maghreb": [(-18, 18, 26, 38)],
    "nile": [(24, 20, 37, 32)],
    "guinea": [(-18, -2, 16, 20)],
    "congo": [(8, -8, 32, 10)],
    "horn": [(32, -6, 54, 18)],
    "rift": [(10, -20, 42, 4)],
    "cape": [(10, -36, 34, -14)],
    "madagascar": [(42, -27, 52, -11)],
    "anatolia": [(26, 36, 45, 43)],
    "arabia": [(34, 12, 60, 32)],
    "gulf": [(46, 22, 58, 31)],
    "mesopotamia": [(35, 29, 50, 38)],
    "persia": [(44, 25, 64, 34)],
    "armenia": [(40, 37, 50, 44)],
    "media": [(44, 33, 62, 40)],
    "steppe": [(46, 35, 88, 56)],
    "siberia": [(60, 50, 122, 78)],
    "yakutia": [(118, 50, 190, 78)],
    "gobi": [(86, 36, 122, 52)],
    "nippon": [(128, 24, 148, 46)],
    "cathay": [(106, 30, 136, 45)],
    "canton": [(104, 18, 124, 33)],
    "india": [(66, 6, 92, 36)],
    "indochina": [(90, 5, 112, 30)],
    "malaya": [(94, -10, 130, 9)],
    "papua": [(128, -12, 156, 1)],
    "outback": [(130, -34, 148, -12)],
    "westralia": [(112, -36, 132, -12)],
    "coral": [(144, -40, 156, -12)],
    "aotearoa": [(164, -48, 180, -32)],
    "polynesia": [(160, -24, 190, -8)],
    "tasmania": [(144, -45, 150, -39)],
}

FORCE_COASTAL = {"mesopotamia", "volga", "media", "steppe", "patagonia", "heartland"}
FORCE_INLAND = {"prairie", "cerrado", "gobi", "amazon"}
PAINT = {
    "hawaii": (18, 10),
    "polynesia": (16, 10),
    "caribbean": (22, 12),
    "aotearoa": (18, 22),
    "madagascar": (14, 22),
    "tasmania": (10, 8),
}


def lonlat_to_xy(lon: float, lat: float) -> tuple[float, float]:
    x = (lon - MIN_LON) / (MAX_LON - MIN_LON) * WORLD_W
    y = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT) * WORLD_H
    return x, y


def in_box(lon: float, lat: float, box: tuple[float, float, float, float]) -> bool:
    a, b, c, d = box
    x = lon
    if a < -170 and x > 160:
        x -= 360
    if c > 170 and x < -160:
        x += 360
    return a <= x <= c and b <= lat <= d


def load_neighbors() -> tuple[list, list]:
    src = (ROOT / "scripts/build-world.mjs").read_text()
    land = ast.literal_eval(re.search(r"const LAND_FORCE = (\[[\s\S]*?\]);", src).group(1))
    sea = ast.literal_eval(re.search(r"const SEA = (\[[\s\S]*?\]);", src).group(1))
    return land, sea


def land_mask(img: Image.Image) -> np.ndarray:
    a = np.asarray(img.convert("RGB"))
    r, g, b = a[:, :, 0].astype(np.int16), a[:, :, 1].astype(np.int16), a[:, :, 2].astype(np.int16)
    ocean = (r < 72) & (g > r + 8) & (b > r + 8)
    dark = (r + g + b) < 70
    return ~(ocean | dark)


def dilate(mask: np.ndarray, n: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(n):
        s = out.copy()
        s[1:] |= out[:-1]
        s[:-1] |= out[1:]
        s[:, 1:] |= out[:, :-1]
        s[:, :-1] |= out[:, 1:]
        out = s
    return out


def snap_land(x: int, y: int, land: np.ndarray, rad: int = 80) -> tuple[int, int]:
    h, w = land.shape
    x = int(np.clip(x, 0, w - 1))
    y = int(np.clip(y, 0, h - 1))
    if land[y, x]:
        return x, y
    y1, y2 = max(0, y - rad), min(h, y + rad)
    x1, x2 = max(0, x - rad), min(w, x + rad)
    sy, sx = np.where(land[y1:y2, x1:x2])
    if len(sx) == 0:
        return x, y
    d = (sx - (x - x1)) ** 2 + (sy - (y - y1)) ** 2
    i = int(d.argmin())
    return int(sx[i] + x1), int(sy[i] + y1)


def dist_point_line(p, a, b) -> float:
    x, y = p
    x1, y1 = a
    x2, y2 = b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return ((x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2) ** 0.5


def simplify(pts: list, eps: float) -> list:
    if len(pts) < 3:
        return pts
    dmax, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        d = dist_point_line(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = simplify(pts[: idx + 1], eps)
        right = simplify(pts[idx:], eps)
        return left[:-1] + right
    return [pts[0], pts[-1]]


def convex_hull(pts: list[tuple[int, int]]) -> list[tuple[int, int]]:
    pts = sorted(set(pts))
    if len(pts) <= 2:
        return pts
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower: list[tuple[int, int]] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper: list[tuple[int, int]] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def marching_rings(mask: np.ndarray) -> list[list[tuple[float, float]]]:
    m = np.pad(mask.astype(np.uint8), 1)
    hh, ww = m.shape
    segs: list[tuple[tuple[float, float], tuple[float, float]]] = []
    table = {
        1: "LB", 2: "BR", 3: "LR", 4: "RT",
        6: "BT", 7: "LT", 8: "TL", 9: "TB",
        11: "TR", 12: "RL", 13: "RB", 14: "BL",
        5: "LT,BR", 10: "TR,LB",
    }
    for y in range(hh - 1):
        for x in range(ww - 1):
            idx = (int(m[y, x]) << 3) | (int(m[y, x + 1]) << 2) | (int(m[y + 1, x + 1]) << 1) | int(m[y + 1, x])
            code = table.get(idx)
            if not code:
                continue
            T = (x + 0.5 - 1, y - 1)
            R = (x + 1 - 1, y + 0.5 - 1)
            B = (x + 0.5 - 1, y + 1 - 1)
            L = (x - 1, y + 0.5 - 1)
            pts = {"T": T, "R": R, "B": B, "L": L}
            for pair in code.split(","):
                segs.append((pts[pair[0]], pts[pair[1]]))
    adj: dict[tuple[float, float], list[tuple[float, float]]] = defaultdict(list)
    for a, b in segs:
        adj[a].append(b)
        adj[b].append(a)
    used: set[tuple[tuple[float, float], tuple[float, float]]] = set()
    rings: list[list[tuple[float, float]]] = []
    for start, nbs in adj.items():
        for nb in nbs:
            e0 = (start, nb) if start < nb else (nb, start)
            if e0 in used:
                continue
            ring = [start]
            prev, cur = start, nb
            used.add(e0)
            ring.append(cur)
            for _ in range(len(segs) + 5):
                nxt = None
                for n in adj[cur]:
                    e = (cur, n) if cur < n else (n, cur)
                    if e not in used:
                        nxt = n
                        used.add(e)
                        break
                if nxt is None:
                    break
                ring.append(nxt)
                prev, cur = cur, nxt
                if cur == start:
                    break
            if len(ring) >= 8:
                rings.append(ring)
    return rings


def path_from_mask(mask: np.ndarray) -> str:
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return ""
    y0, y1 = max(0, int(ys.min()) - 2), min(mask.shape[0], int(ys.max()) + 3)
    x0, x1 = max(0, int(xs.min()) - 2), min(mask.shape[1], int(xs.max()) + 3)
    fat = dilate(mask[y0:y1, x0:x1], 1)
    rings = marching_rings(fat)
    rings.sort(key=len, reverse=True)
    parts = []
    for ring in rings[:8]:
        pts = simplify([(p[0] + x0, p[1] + y0) for p in ring], 1.15)
        if len(pts) < 4:
            continue
        if pts[0] != pts[-1]:
            pts.append(pts[0])
        d = "M" + "L".join(f"{round(x, 1)},{round(y, 1)}" for x, y in pts) + "Z"
        parts.append(d)
    if parts:
        return "".join(parts)
    hull = convex_hull(list(zip(xs.tolist(), ys.tolist())))
    if len(hull) < 3:
        return ""
    hull.append(hull[0])
    return "M" + "L".join(f"{round(x, 1)},{round(y, 1)}" for x, y in hull) + "Z"


def ellipse_path(cx: float, cy: float, rx: float, ry: float) -> str:
    pts = []
    for i in range(18):
        a = (i / 18) * 6.28318530718
        pts.append((cx + np.cos(a) * rx, cy + np.sin(a) * ry))
    pts.append(pts[0])
    return "M" + "L".join(f"{round(x, 1)},{round(y, 1)}" for x, y in pts) + "Z"


def paint_borders(rgb: np.ndarray, ids: np.ndarray) -> np.ndarray:
    """Ink province and coast edges onto the relief so land and borders are one image."""
    out = rgb.astype(np.float32)
    h, w = ids.shape
    land = ids >= 0
    v_diff = ids[:, 1:] != ids[:, :-1]
    h_diff = ids[1:, :] != ids[:-1, :]
    edge = np.zeros((h, w), dtype=bool)
    edge[:, 1:] |= v_diff
    edge[:, :-1] |= v_diff
    edge[1:, :] |= h_diff
    edge[:-1, :] |= h_diff
    edge &= land
    thick = edge.copy()
    thick[1:] |= edge[:-1]
    thick[:-1] |= edge[1:]
    thick[:, 1:] |= edge[:, :-1]
    thick[:, :-1] |= edge[:, 1:]
    thick &= land
    out[thick] *= 0.42
    out[edge] *= 0.16
    return np.clip(out, 0, 255).astype(np.uint8)


def classify_terrain(mean_rgb: tuple[float, float, float], pid: str) -> str:
    r, g, b = mean_rgb
    forced = {
        "maghreb": "desert",
        "nile": "desert",
        "arabia": "desert",
        "gulf": "desert",
        "gobi": "desert",
        "outback": "desert",
        "westralia": "desert",
        "prairie": "grass",
        "heartland": "grass",
        "greenland": "ice",
        "andes": "mountain",
        "sierra": "mountain",
        "cascade": "mountain",
        "highlands": "mountain",
        "fjords": "mountain",
        "amazon": "jungle",
        "congo": "jungle",
        "guinea": "jungle",
        "malaya": "jungle",
        "papua": "jungle",
        "yucatan": "jungle",
        "panama": "jungle",
    }
    if pid in forced:
        return forced[pid]
    if r > 180 and g > 185 and b > 180:
        return "ice"
    if r > 145 and g > 110 and b < 120 and r >= g - 5:
        return "desert"
    if r > 110 and g > 90 and abs(r - g) < 35 and b < 100 and (r + g) > 220:
        return "mountain"
    if g > r + 20 and g > 80 and r < 110:
        return "jungle"
    if g > 90 and r < 130 and g >= r:
        return "forest"
    if r > 130 and g > 120 and b < 110:
        return "savanna"
    if g > 100 and b > 110 and r > 140:
        return "tundra"
    return "grass"


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    src = src.resize((WORLD_W, WORLD_H), Image.Resampling.LANCZOS)
    src = ImageEnhance.Contrast(src).enhance(1.08)
    src = ImageEnhance.Sharpness(src).enhance(1.25)
    src = src.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    land = land_mask(src)
    rgb = np.asarray(src)

    n = len(PROVINCES)
    seeds = []
    for pid, name, cont, (lon, lat) in PROVINCES:
        x, y = lonlat_to_xy(lon, lat)
        sx, sy = snap_land(round(x), round(y), land)
        seeds.append((sx, sy))
        if pid in PAINT:
            rx, ry = PAINT[pid]
            draw = Image.fromarray(land.astype(np.uint8) * 255)
            ImageDraw.Draw(draw).ellipse((sx - rx, sy - ry, sx + rx, sy + ry), fill=255)
            land = np.asarray(draw) > 127

    xs = np.arange(WORLD_W)[None, :].repeat(WORLD_H, 0)
    ys = np.arange(WORLD_H)[:, None].repeat(WORLD_W, 1)
    lon = MIN_LON + xs / WORLD_W * (MAX_LON - MIN_LON)
    lat = MAX_LAT - ys / WORLD_H * (MAX_LAT - MIN_LAT)

    ids = np.full((WORLD_H, WORLD_W), -1, np.int16)
    best = np.full((WORLD_H, WORLD_W), 1e12, np.float32)
    for i, (pid, name, cont, seedll) in enumerate(PROVINCES):
        sx, sy = seeds[i]
        d2 = (xs.astype(np.float32) - sx) ** 2 + (ys.astype(np.float32) - sy) ** 2
        inside = np.zeros((WORLD_H, WORLD_W), dtype=bool)
        for box in BOXES[pid]:
            inside |= (
                (lon >= box[0]) & (lon <= box[2]) & (lat >= box[1]) & (lat <= box[3])
            )
        take = land & inside & (d2 < best)
        ids[take] = i
        best[take] = d2[take]

    leftover = land & (ids < 0)
    if leftover.any():
        best[:] = 1e12
        for i, (pid, name, cont, seedll) in enumerate(PROVINCES):
            sx, sy = seeds[i]
            d2 = (xs.astype(np.float32) - sx) ** 2 + (ys.astype(np.float32) - sy) ** 2
            take = leftover & (d2 < best)
            ids[take] = i
            best[take] = d2[take]

    painted = paint_borders(rgb, ids)
    OUT_IMG.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(painted).save(OUT_IMG, quality=92)

    land_edges, sea_edges = load_neighbors()
    defs = []
    empty = []
    for i, (pid, name, cont, seedll) in enumerate(PROVINCES):
        mask = ids == i
        area = int(mask.sum())
        path = path_from_mask(mask) if area >= 8 else ""
        if not path:
            sx, sy = seeds[i]
            rx, ry = PAINT.get(pid, (14, 12))
            path = ellipse_path(sx, sy, rx, ry)
            empty.append(pid)
        ys_, xs_ = np.where(mask) if area else (np.array([seeds[i][1]]), np.array([seeds[i][0]]))
        lx = float(xs_.mean())
        ly = float(ys_.mean())
        coastal = False
        if area:
            # coastal if any 4-neighbour is ocean
            up = np.zeros_like(mask)
            down = np.zeros_like(mask)
            left = np.zeros_like(mask)
            right = np.zeros_like(mask)
            up[1:] = mask[:-1]
            down[:-1] = mask[1:]
            left[:, 1:] = mask[:, :-1]
            right[:, :-1] = mask[:, 1:]
            ring = mask & ~(up & down & left & right)
            # neighbor ocean
            for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                ny = np.clip(ys_ + dy, 0, WORLD_H - 1)
                nx = np.clip(xs_ + dx, 0, WORLD_W - 1)
                if np.any(ids[ny, nx] < 0):
                    coastal = True
                    break
            _ = ring
        if pid in FORCE_COASTAL:
            coastal = True
        if pid in FORCE_INLAND:
            coastal = False
        if area:
            mean = rgb[mask].mean(axis=0)
        else:
            mean = (120, 120, 80)
        defs.append(
            {
                "id": pid,
                "name": name,
                "continent": cont,
                "coastal": bool(coastal),
                "path": path,
                "labelX": round(lx, 1),
                "labelY": round(ly, 1),
            }
        )

    inland = [d["id"] for d in defs if not d["coastal"]]
    print("provinces", len(defs))
    print("inland", ", ".join(inland))
    print("fallback", ", ".join(empty))
    print("land pixels", int(land.sum()))

    out = f'''import type {{ TerritoryDef }} from "./types";
import {{ CAPITOL }} from "./types";

export const WORLD_W = {WORLD_W};
export const WORLD_H = {WORLD_H};

export const TERRITORIES: TerritoryDef[] = {json.dumps(defs, indent=2)};

export const TERRITORY_BY_ID: Record<string, TerritoryDef> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);

/** Independent tribes. Every land that is not a capital starts tribal. */
export const BARBARIAN_IDS: readonly string[] = TERRITORIES.map((t) => t.id).filter(
  (id) => !Object.values(CAPITOL).includes(id),
);

export const BARBARIAN_SET = new Set<string>(BARBARIAN_IDS);

const LAND_EDGES: [string, string][] = {json.dumps(land_edges)};
const SEA_EDGES: [string, string][] = {json.dumps(sea_edges)};

function undirected(edges: [string, string][]) {{
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {{
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  }};
  for (const [a, b] of edges) {{ add(a, b); add(b, a); }}
  return map;
}}

export const LAND_NEIGHBORS = undirected(LAND_EDGES);
export const SEA_NEIGHBORS = undirected(SEA_EDGES);

export function landNeighbors(id: string): string[] {{
  return [...(LAND_NEIGHBORS.get(id) ?? [])];
}}

export function seaNeighbors(id: string): string[] {{
  return [...(SEA_NEIGHBORS.get(id) ?? [])];
}}

export function continentTerritories(continent: string) {{
  return TERRITORIES.filter((t) => t.continent === continent);
}}
'''
    WORLD_TS.write_text(out)
    print("wrote", WORLD_TS, "bytes", WORLD_TS.stat().st_size)


if __name__ == "__main__":
    main()
