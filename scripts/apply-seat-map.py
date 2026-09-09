#!/usr/bin/env python3
"""Move capitals, rename seats, open the Cape Wood lake, add mountain ice."""
from __future__ import annotations

import importlib.util
import math
import re
from collections import Counter
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location("hexreg", "/workspace/scripts/hex-regions.py")
hr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hr)
ht_spec = importlib.util.spec_from_file_location("hextrue", "/workspace/scripts/hex-true.py")
ht = importlib.util.module_from_spec(ht_spec)
ht_spec.loader.exec_module(ht)

SIZE = 34.0
INSET = 0.99
SQRT3 = math.sqrt(3)
ROOT = Path("/workspace")
JPG = ROOT / "public/map/world.jpg"
WEBP = ROOT / "public/map/world.webp"
SRC_MAP = ROOT / "public/map/world-v130.webp"
OUT_V = ROOT / "public/map/world-v131.webp"
PREVIEW = ROOT / "screenshots/provinces.png"

# Capital display names (letters + spaces, <= 12 chars).
CAP_NAMES = {
    "asgard": "Asgard",
    "pantanal": "El Dorado",
    "volcan": "Mayan",
    "gobi": "Kunlun",
    "siberia": "Siberia",
    "irrawaddy": "Shangri La",
    "sahel": "Egypt",
    "tigris": "Sumer",
    "karoo": "Karoo",
    "sahul": "Sahul",
    "nord": "Nord",
    "yukon": "Alaska",
    "atlantis": "Atlantis",
}

# Terrain that should read as ice after the mountain-cap pass.
ICE_TERRAIN = [
    "rockies", "mackenzie", "sierra",
    "tarim",
    "andes", "magellan", "patagonia", "fuegia", "drake", "peninsula",
    "cordillera", "cascades", "laurentide", "columbia",
    "altai", "sayan", "kolyma", "chuvan", "buryatia", "amur", "kamchatka",
]

FORCE_LAND = [
    ("beringia", "kamchatka"),
    ("atlas", "alps"),
    ("peninsula", "patagonia"),
    ("peninsula", "weddell"),
    ("peninsula", "magellan"),
    ("rhine", "caledonia"),
    ("fjords", "caledonia"),
    ("weddell", "drake"),
    ("drake", "fuegia"),
    ("fuegia", "tocantins"),
]
FORCE_INLAND = {"pantanal", "kunlun"}
FORCE_COASTAL = {
    "sahul", "tasmania", "hawaii", "sumer", "asgard", "karoo",
    "irrawaddy", "atlantis", "coral", "volcan",
}


def axial_to_pixel(q: int, r: int, size: float = SIZE) -> tuple[float, float]:
    x = size * (SQRT3 * q + SQRT3 / 2 * r)
    y = size * (1.5 * r)
    return x, y


def pixel_to_axial(x: float, y: float, size: float = SIZE) -> tuple[int, int]:
    q = (SQRT3 / 3 * x - 1.0 / 3 * y) / size
    r = (2.0 / 3 * y) / size
    return hr.cube_round(q, -q - r, r)


def hex_path(cx: float, cy: float, size: float = SIZE) -> str:
    pts = ht.hex_corners(cx, cy, size * INSET)
    return "M" + "L".join(f"{float(x):.1f},{float(y):.1f}" for x, y in pts) + "Z"


def hex_mask_hi(h: int, w: int, cx: float, cy: float, scale: float, size: float) -> np.ndarray:
    m = np.zeros((h, w), np.uint8)
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append([cx * scale + size * scale * math.cos(a), cy * scale + size * scale * math.sin(a)])
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 255)
    return m


def is_water_arr(img: np.ndarray) -> np.ndarray:
    r, g, b = img[:, :, 0].astype(np.int16), img[:, :, 1].astype(np.int16), img[:, :, 2].astype(np.int16)
    return (b > r + 8) & (b > g) & (b > 70)


def paint_water(img: np.ndarray, mask: np.ndarray, sample: np.ndarray, rng: np.random.Generator) -> int:
    yy, xx = np.where(mask > 12)
    if len(xx) == 0:
        return 0
    alpha = (mask[yy, xx].astype(np.float32) / 255.0)[:, None]
    alpha = np.clip(alpha * 1.2, 0, 1)
    pick = rng.integers(0, len(sample), size=len(xx))
    tex = sample[pick].astype(np.float32)
    noise = rng.normal(0, 6, tex.shape)
    tex = np.clip(tex + noise, 0, 255)
    tex[:, 2] = np.maximum(tex[:, 2], tex[:, 0] + 18)
    tex[:, 2] = np.maximum(tex[:, 2], tex[:, 1] + 8)
    tex[:, 2] = np.clip(tex[:, 2], 90, 255)
    base = img[yy, xx].astype(np.float32)
    img[yy, xx] = np.clip(base * (1 - alpha) + tex * alpha, 0, 255).astype(np.uint8)
    return int(len(xx))


def paint_land(img: np.ndarray, mask: np.ndarray, sample: np.ndarray, rng: np.random.Generator, ice=False) -> int:
    yy, xx = np.where(mask > 12)
    if len(xx) == 0 or len(sample) == 0:
        return 0
    alpha = (mask[yy, xx].astype(np.float32) / 255.0)[:, None]
    alpha = np.clip(alpha * 1.15, 0, 1)
    pick = rng.integers(0, len(sample), size=len(xx))
    tex = sample[pick].astype(np.float32)
    if ice:
        ice_col = np.array([214.0, 220.0, 226.0])
        t = rng.random(len(xx))[:, None] * 0.45 + 0.25
        tex = tex * (1 - t) + ice_col * t
    tex[:, 2] = np.minimum(tex[:, 2], tex[:, 0] + 4)
    tex[:, 2] = np.minimum(tex[:, 2], tex[:, 1] + 2)
    base = img[yy, xx].astype(np.float32)
    img[yy, xx] = np.clip(base * (1 - alpha) + tex * alpha, 0, 255).astype(np.uint8)
    return int(len(xx))


def paint_map(img: np.ndarray, by_id: dict) -> np.ndarray:
    h, w = img.shape[:2]
    scale = w / hr.WORLD_W
    rng = np.random.default_rng(13)

    def mask_of(pid: str, size: float = SIZE * 1.02) -> np.ndarray:
        r = by_id[pid]
        return hex_mask_hi(h, w, r["labelX"], r["labelY"], scale, size)

    water = is_water_arr(img)
    ocean_sample = img[water]
    if len(ocean_sample) < 80:
        ocean_sample = np.array([[18, 78, 138], [24, 90, 150], [30, 70, 128]], np.uint8)

    # --- Cape Wood lake: enlarge and cut a channel SW into the gulf/sea ---
    lake_world = [
        (559.0, 153.0),  # empty hex west of Cape Wood
        (588.9, 204.0),  # empty hex SW of Cape Wood
        (575.0, 175.0),
        (600.0, 165.0),
    ]
    lake = np.zeros((h, w), np.uint8)
    for x, y in lake_world:
        cv2.circle(lake, (int(x * scale), int(y * scale)), int(72 * scale), 255, -1)
    # existing inland water in the basin
    basin = np.zeros((h, w), np.uint8)
    cv2.rectangle(basin, (int(480 * scale), int(90 * scale)), (int(680 * scale), int(250 * scale)), 255, -1)
    inland = water.astype(np.uint8) * 255
    lake = cv2.bitwise_or(lake, cv2.bitwise_and(inland, basin))
    lake = cv2.dilate(lake, np.ones((int(18 * scale), int(18 * scale)), np.uint8))
    # channel south-west / south into the gulf (empty hexes 8,5 and 8,6)
    pts = np.array(
        [
            [int(588.9 * scale), int(175.0 * scale)],
            [int(575.0 * scale), int(210.0 * scale)],
            [int(600.0 * scale), int(248.0 * scale)],
            [int(618.0 * scale), int(280.0 * scale)],
            [int(640.0 * scale), int(310.0 * scale)],
        ],
        np.int32,
    )
    cv2.polylines(lake, [pts], False, 255, thickness=int(52 * scale))
    cv2.circle(lake, (int(618.0 * scale), int(255.0 * scale)), int(48 * scale), 255, -1)
    lake = cv2.GaussianBlur(lake, (0, 0), 3.2)
    protect = np.zeros((h, w), np.uint8)
    for pid in (
        "newfoundland", "carolina", "adirondack", "iroquois", "ontario",
        "micmac", "chesapeake", "winnipeg", "algonquin", "acadia", "erie",
        "baffin", "nord",
    ):
        if pid in by_id:
            protect = cv2.bitwise_or(protect, hex_mask_hi(h, w, by_id[pid]["labelX"], by_id[pid]["labelY"], scale, SIZE * 0.62))
    paint = np.clip(lake.astype(np.int16) - protect.astype(np.int16), 0, 255).astype(np.uint8)
    n_lake = paint_water(img, paint, ocean_sample, rng)
    print("lake/channel pixels", n_lake)

    # --- Alaska: land on the new west hex, sea on the vacated seat ---
    new_ak = hex_mask_hi(h, w, by_id["yukon"]["labelX"], by_id["yukon"]["labelY"], scale, SIZE * 1.08)
    new_ak = cv2.GaussianBlur(new_ak, (0, 0), 2.4)
    # sample icy west-coast land
    src = np.zeros((h, w), np.uint8)
    for pid in ("dakota", "appalachia", "beringia", "cascades"):
        src = cv2.bitwise_or(src, mask_of(pid, SIZE * 0.9))
    landish = ~water
    src_pix = img[(src > 0) & landish]
    if len(src_pix) < 80:
        src_pix = np.array([[168, 174, 176], [190, 196, 198], [148, 154, 150]], np.uint8)
    n_ak = paint_land(img, new_ak, src_pix, rng, ice=True)
    print("alaska land pixels", n_ak)

    # vacated Yukon seat at old (0,5) ~ (147.2, 255)
    old_cx, old_cy = axial_to_pixel(0, 5)
    old_mask = hex_mask_hi(h, w, old_cx, old_cy, scale, SIZE * 1.04)
    old_mask = cv2.GaussianBlur(old_mask, (0, 0), 2.6)
    keep_land = np.zeros((h, w), np.uint8)
    for pid in ("rockies", "appalachia", "beringia", "cascades", "keewatin"):
        keep_land = cv2.bitwise_or(keep_land, hex_mask_hi(h, w, by_id[pid]["labelX"], by_id[pid]["labelY"], scale, SIZE * 0.70))
    old_mask = np.clip(old_mask.astype(np.int16) - keep_land.astype(np.int16), 0, 255).astype(np.uint8)
    n_old = paint_water(img, old_mask, ocean_sample, rng)
    print("old alaska sea pixels", n_old)

    # --- ice on mountain tops ---
    groups = {
        "nam": [
            "rockies", "mackenzie", "sierra", "cascades", "cordillera",
            "laurentide", "columbia", "aleut", "beringia", "dakota",
            "keewatin", "labrador", "yukon", "appalachia",
        ],
        "asia": [
            "altai", "sayan", "kolyma", "chuvan", "heilong", "amur", "yakutia",
            "tuva", "kamchatka", "buryatia", "chukotka", "fuji", "manchuria",
            "tarim", "yenisei", "siberia",
        ],
        "satip": [
            "peninsula", "fuegia", "drake", "magellan", "patagonia",
            "andes", "altiplano", "weddell", "coats", "larsen", "tocantins",
        ],
    }
    water = is_water_arr(img)
    out = img.astype(np.float32)
    rch, gch, bch = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    lum = 0.3 * rch + 0.5 * gch + 0.2 * bch
    ice_col = np.array([236.0, 238.0, 242.0])
    yy, xx = np.mgrid[0:h, 0:w]
    total = 0
    for ids in groups.values():
        for tid in ids:
            if tid not in by_id:
                continue
            core = mask_of(tid, SIZE * 0.96)
            land = (core > 0) & (~water)
            if land.sum() < 40:
                continue
            cy = by_id[tid]["labelY"] * scale
            upper = land & (yy < cy + 10 * scale)
            vals = lum[land]
            thresh = np.percentile(vals, 55)
            peaks = land & (lum >= thresh)
            peaks |= upper & land & (lum >= np.percentile(vals, 42))
            sprinkle = land & (rng.random(land.shape) < 0.12)
            mask = peaks | sprinkle
            n = int(mask.sum())
            if not n:
                continue
            mix = 0.78 + rng.random(n) * 0.18
            srcp = out[mask]
            iced = srcp * (1 - mix[:, None]) + ice_col * mix[:, None]
            out[mask] = iced
            total += n
    # extra ice ribbon down the SA–Antarctica join
    ribbon = np.zeros((h, w), np.uint8)
    chain = []
    for pid in ("andes", "patagonia", "magellan", "peninsula", "fuegia", "drake", "weddell"):
        if pid in by_id:
            chain.append((int(by_id[pid]["labelX"] * scale), int(by_id[pid]["labelY"] * scale)))
    if len(chain) >= 2:
        cv2.polylines(ribbon, [np.array(chain, np.int32)], False, 255, thickness=int(36 * scale))
        ribbon = cv2.GaussianBlur(ribbon, (0, 0), 2.8)
        land = (~water) & (ribbon > 20)
        n = int(land.sum())
        if n:
            mix = (ribbon[land].astype(np.float32) / 255.0) * 0.7
            srcp = out[land]
            iced = srcp * (1 - mix[:, None]) + ice_col * mix[:, None]
            out[land] = iced
            total += n
    print("ice pixels", total)
    return np.clip(out, 0, 255).astype(np.uint8)


def rebuild_edges(recs: list[dict], by_id: dict, land: np.ndarray, sea_old: set) -> tuple[set, set]:
    for r in recs:
        cx, cy = axial_to_pixel(r["q"], r["r"])
        r["labelX"] = round(cx, 1)
        r["labelY"] = round(cy, 1)
        r["path"] = hex_path(cx, cy)
        m = ht.hex_mask(cx, cy, SIZE)
        _, _, frac = ht.land_stats(m, land)
        r["_frac"] = frac
    keys = {(r["q"], r["r"]): r for r in recs}
    for r in recs:
        n_kept = sum(1 for nq, nr in hr.hex_neighbors(r["q"], r["r"]) if (nq, nr) in keys)
        r["coastal"] = r["_frac"] < 0.86 or n_kept < 6
    for pid in FORCE_INLAND:
        if pid in by_id:
            by_id[pid]["coastal"] = False
    for pid in FORCE_COASTAL:
        if pid in by_id:
            by_id[pid]["coastal"] = True
    by_id["yukon"]["coastal"] = True

    land_edges: set[tuple[str, str]] = set()
    key_of = {(h["q"], h["r"]): h["id"] for h in recs}
    for h in recs:
        for nq, nr in hr.hex_neighbors(h["q"], h["r"]):
            oid = key_of.get((nq, nr))
            if oid and oid != h["id"]:
                land_edges.add(tuple(sorted((h["id"], oid))))
    left = [h for h in recs if h["labelX"] < SIZE * 1.2]
    right = [h for h in recs if h["labelX"] > hr.WORLD_W - SIZE * 1.2]
    for a in left:
        for b in right:
            if abs(a["labelY"] - b["labelY"]) < SIZE * 1.8:
                land_edges.add(tuple(sorted((a["id"], b["id"]))))
    for a, b in FORCE_LAND:
        if a in by_id and b in by_id:
            land_edges.add(tuple(sorted((a, b))))

    sea_edges: set[tuple[str, str]] = set()
    for a, b in sea_old:
        if a in by_id and b in by_id and by_id[a]["coastal"] and by_id[b]["coastal"]:
            p = tuple(sorted((a, b)))
            if p not in land_edges:
                sea_edges.add(p)
    coastal = [r for r in recs if r["coastal"]]
    for i, a in enumerate(coastal):
        near = []
        for b in coastal[i + 1 :]:
            p = tuple(sorted((a["id"], b["id"])))
            if p in land_edges:
                continue
            dx = a["labelX"] - b["labelX"]
            dy = a["labelY"] - b["labelY"]
            if abs(dx) > hr.WORLD_W / 2:
                dx = abs(dx) - hr.WORLD_W
            d = math.hypot(dx, dy)
            if d < SIZE * 7:
                near.append((d, b["id"]))
        near.sort()
        for d, bid in near[:3]:
            sea_edges.add(tuple(sorted((a["id"], bid))))
    return land_edges, sea_edges


def write_preview(recs: list[dict]) -> None:
    vis = Image.new("RGB", (hr.WORLD_W, hr.WORLD_H), (12, 22, 36))
    try:
        bg = Image.open(JPG).convert("RGB")
        bg = bg.resize((hr.WORLD_W, hr.WORLD_H), Image.BILINEAR)
        vis = Image.blend(vis, bg, 0.62)
    except Exception:
        pass
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    colors = {
        "at": (220, 240, 255), "nw": (70, 140, 200), "ne": (120, 190, 230),
        "ca": (220, 70, 70), "sa": (230, 150, 50), "eu": (40, 190, 190),
        "an": (230, 200, 70), "af": (50, 170, 80), "me": (180, 110, 220),
        "aw": (70, 110, 200), "ae": (40, 80, 170), "ss": (230, 80, 160),
        "oc": (255, 130, 90),
    }
    rng = np.random.default_rng(7)
    for r in recs:
        col = colors[r["continent"]]
        tint = tuple(int(np.clip(c * 0.9 + int(rng.integers(-10, 10)), 0, 255)) for c in col) + (150,)
        pts = [(float(x), float(y)) for x, y in re.findall(r"(-?\d+\.?\d*),(-?\d+\.?\d*)", r["path"])]
        if len(pts) >= 3:
            d0.polygon(pts, fill=tint, outline=(20, 20, 24, 200))
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
        font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 11)
    except Exception:
        font = font_b = ImageFont.load_default()
    for r in recs:
        name = r["name"]
        f = font_b if r["id"] in CAP_NAMES else font
        draw.text((r["labelX"] - 18, r["labelY"] - 6), name, fill=(250, 250, 252), font=f)
    vis.save(PREVIEW)
    print("preview", PREVIEW)


def main() -> None:
    text = hr.WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    landscape = hr.parse_landscape(hr.LANDS_TS.read_text())

    for r in recs:
        r["q"], r["r"] = pixel_to_axial(r["labelX"], r["labelY"])
    by_id = {r["id"]: r for r in recs}
    keys = {(r["q"], r["r"]): r for r in recs}

    def swap_pos(a: str, b: str) -> None:
        ra, rb = by_id[a], by_id[b]
        for k in ("path", "labelX", "labelY", "coastal", "q", "r"):
            ra[k], rb[k] = rb[k], ra[k]
        keys[ra["q"], ra["r"]] = ra
        keys[rb["q"], rb["r"]] = rb
        print(f"swap {a} ({ra['name']}) <-> {b} ({rb['name']})  {a}->({ra['q']},{ra['r']})")

    # Nord west 2, Kunlun SW 1, Atlantis NE 1, Egypt east 2.
    swap_pos("nord", "hudson")
    swap_pos("gobi", "anadyr")
    swap_pos("atlantis", "gotland")
    swap_pos("sahel", "hejaz")

    # Alaska west 2 lands: destination is open ocean, so the seat itself moves.
    q, rr = -2, 5
    assert (q, rr) not in keys, keys.get((q, rr))
    old = (by_id["yukon"]["q"], by_id["yukon"]["r"])
    del keys[old]
    yu = by_id["yukon"]
    yu["q"], yu["r"] = q, rr
    cx, cy = axial_to_pixel(q, rr)
    yu["labelX"], yu["labelY"] = round(cx, 1), round(cy, 1)
    yu["path"] = hex_path(cx, cy)
    yu["coastal"] = True
    keys[q, rr] = yu
    print(f"move yukon Alaska {old} -> ({q},{rr}) xy=({yu['labelX']},{yu['labelY']})")

    for tid, name in CAP_NAMES.items():
        by_id[tid]["name"] = name

    img = np.array(Image.open(SRC_MAP).convert("RGB"))
    img = paint_map(img, by_id)
    out = Image.fromarray(img)
    out.save(JPG, quality=92)
    out.save(WEBP, "WEBP", quality=86, method=6)
    out.save(OUT_V, "WEBP", quality=86, method=6)
    print("wrote maps", img.shape, OUT_V)

    land = ht.world_land()
    land_edges, sea_edges = rebuild_edges(recs, by_id, land, sea_old)

    R = SIZE * INSET
    inr = R * (SQRT3 / 2)
    too = []
    recs_l = list(recs)
    for i, a in enumerate(recs_l):
        for b in recs_l[i + 1 :]:
            d = math.hypot(a["labelX"] - b["labelX"], a["labelY"] - b["labelY"])
            if d < inr * 2 - 0.8:
                too.append((round(d, 2), a["id"], b["id"]))
    print("too-close", len(too), too[:8])
    assert not too, too[:12]
    dups = [n for n, c in Counter(r["name"] for r in recs).items() if c > 1]
    assert not dups, dups
    counts = Counter(r["continent"] for r in recs)
    print("counts", dict(sorted(counts.items())))
    for c, n in sorted(counts.items()):
        assert 15 <= n <= 26, (c, n)
    assert tuple(sorted(("beringia", "kamchatka"))) in land_edges
    assert tuple(sorted(("peninsula", "weddell"))) in land_edges
    assert by_id["nord"]["continent"] == "ne"
    assert by_id["yukon"]["continent"] == "nw"
    assert by_id["gobi"]["continent"] == "ae"
    assert by_id["sahel"]["continent"] == "an"
    assert by_id["atlantis"]["continent"] == "eu"

    for r in recs:
        r.pop("_frac", None)
        r.pop("q", None)
        r.pop("r", None)

    for tid in ICE_TERRAIN:
        if tid in landscape:
            landscape[tid]["terrain"] = "ice"
    # capitals keep their wonders / beasts
    landscape["nord"]["wonder"] = "meadhall"
    landscape["gobi"]["wonder"] = "pagoda"
    landscape["atlantis"]["wonder"] = "pantheon"
    landscape["sahel"]["wonder"] = "pyramids"
    landscape["yukon"]["terrain"] = "ice"
    landscape["yukon"]["fauna"] = "mammoth"

    hr.write_world(recs, land_edges, sea_edges)
    hr.write_lands(recs, landscape)
    write_preview(recs)
    print("done")


if __name__ == "__main__":
    main()
