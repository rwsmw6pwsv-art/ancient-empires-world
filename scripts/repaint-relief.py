#!/usr/bin/env python3
"""Repaint lake/channel + mountain-top ice from world-v130 without moving hexes."""
from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location("hexreg", "/workspace/scripts/hex-regions.py")
hr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hr)
ht_spec = importlib.util.spec_from_file_location("hextrue", "/workspace/scripts/hex-true.py")
ht = importlib.util.module_from_spec(ht_spec)
ht_spec.loader.exec_module(ht)

SIZE = 34.0
SQRT3 = math.sqrt(3)
ROOT = Path("/workspace")
SRC = ROOT / "public/map/world-v130.webp"
JPG = ROOT / "public/map/world.jpg"
WEBP = ROOT / "public/map/world.webp"
OUT = ROOT / "public/map/world-v131.webp"


def axial_to_pixel(q: int, r: int, size: float = SIZE) -> tuple[float, float]:
    x = size * (SQRT3 * q + SQRT3 / 2 * r)
    y = size * (1.5 * r)
    return x, y


def pixel_to_axial(x: float, y: float, size: float = SIZE) -> tuple[int, int]:
    q = (SQRT3 / 3 * x - 1.0 / 3 * y) / size
    r = (2.0 / 3 * y) / size
    return hr.cube_round(q, -q - r, r)


def hex_mask_hi(h, w, cx, cy, scale, size):
    m = np.zeros((h, w), np.uint8)
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append([cx * scale + size * scale * math.cos(a), cy * scale + size * scale * math.sin(a)])
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 255)
    return m


def is_water(img):
    r, g, b = img[:, :, 0].astype(np.int16), img[:, :, 1].astype(np.int16), img[:, :, 2].astype(np.int16)
    return (b > r + 8) & (b > g) & (b > 70)


def paint_water(img, mask, sample, rng):
    yy, xx = np.where(mask > 10)
    if len(xx) == 0:
        return 0
    alpha = np.clip(mask[yy, xx].astype(np.float32) / 255.0 * 1.15, 0, 1)[:, None]
    pick = rng.integers(0, len(sample), size=len(xx))
    tex = sample[pick].astype(np.float32) + rng.normal(0, 5, (len(xx), 3))
    tex = np.clip(tex, 0, 255)
    tex[:, 2] = np.clip(np.maximum(np.maximum(tex[:, 2], tex[:, 0] + 16), tex[:, 1] + 8), 88, 255)
    base = img[yy, xx].astype(np.float32)
    img[yy, xx] = np.clip(base * (1 - alpha) + tex * alpha, 0, 255).astype(np.uint8)
    return int(len(xx))


def paint_land(img, mask, sample, rng, ice=False):
    yy, xx = np.where(mask > 10)
    if len(xx) == 0 or len(sample) == 0:
        return 0
    alpha = np.clip(mask[yy, xx].astype(np.float32) / 255.0 * 1.12, 0, 1)[:, None]
    pick = rng.integers(0, len(sample), size=len(xx))
    tex = sample[pick].astype(np.float32)
    if ice:
        ice_col = np.array([208.0, 216.0, 222.0])
        t = (0.22 + rng.random(len(xx)) * 0.35)[:, None]
        tex = tex * (1 - t) + ice_col * t
    tex[:, 2] = np.minimum(tex[:, 2], tex[:, 0] + 4)
    tex[:, 2] = np.minimum(tex[:, 2], tex[:, 1] + 2)
    base = img[yy, xx].astype(np.float32)
    img[yy, xx] = np.clip(base * (1 - alpha) + tex * alpha, 0, 255).astype(np.uint8)
    return int(len(xx))


def main():
    recs = hr.parse_territories(hr.WORLD_TS.read_text())
    by_id = {r["id"]: r for r in recs}
    img = np.array(Image.open(SRC).convert("RGB"))
    h, w = img.shape[:2]
    scale = w / hr.WORLD_W
    rng = np.random.default_rng(17)

    def mask_of(pid, size=SIZE * 1.0):
        r = by_id[pid]
        return hex_mask_hi(h, w, r["labelX"], r["labelY"], scale, size)

    water0 = is_water(img)
    # sample bright coastal water, not abyssal dark
    gx0, gx1 = int(620 * scale), int(720 * scale)
    gy0, gy1 = int(250 * scale), int(340 * scale)
    gulf = img[gy0:gy1, gx0:gx1]
    gulf_w = is_water(gulf)
    gulf_pix = gulf[gulf_w]
    west = img[int(200 * scale):int(320 * scale), 0:int(80 * scale)]
    west_w = is_water(west)
    west_pix = west[west_w]
    ocean = gulf_pix if len(gulf_pix) > 80 else img[water0]
    pacific = west_pix if len(west_pix) > 40 else ocean
    print("gulf sample", len(gulf_pix), "pacific sample", len(west_pix))

    # --- lake enlarge + SW channel to the gulf ---
    lake = np.zeros((h, w), np.uint8)
    for x, y, rad in (
        (559.0, 153.0, 78),
        (588.9, 175.0, 70),
        (575.0, 198.0, 64),
        (600.0, 210.0, 58),
    ):
        cv2.circle(lake, (int(x * scale), int(y * scale)), int(rad * scale), 255, -1)
    basin = np.zeros((h, w), np.uint8)
    cv2.ellipse(basin, (int(575 * scale), int(165 * scale)), (int(110 * scale), int(70 * scale)), 12, 0, 360, 255, -1)
    inland = (water0.astype(np.uint8) * 255)
    lake = cv2.bitwise_or(lake, cv2.bitwise_and(inland, basin))
    lake = cv2.dilate(lake, np.ones((int(14 * scale), int(14 * scale)), np.uint8))
    pts = np.array(
        [
            [int(575 * scale), int(175 * scale)],
            [int(568 * scale), int(205 * scale)],
            [int(590 * scale), int(235 * scale)],
            [int(615 * scale), int(265 * scale)],
            [int(640 * scale), int(300 * scale)],
        ],
        np.int32,
    )
    cv2.polylines(lake, [pts], False, 255, thickness=int(44 * scale))
    cv2.circle(lake, (int(630 * scale), int(275 * scale)), int(40 * scale), 255, -1)
    lake = cv2.GaussianBlur(lake, (0, 0), 2.8)
    protect = np.zeros((h, w), np.uint8)
    for pid in (
        "newfoundland", "carolina", "adirondack", "iroquois", "ontario",
        "micmac", "chesapeake", "winnipeg", "algonquin", "acadia",
    ):
        protect = cv2.bitwise_or(
            protect,
            hex_mask_hi(h, w, by_id[pid]["labelX"], by_id[pid]["labelY"], scale, SIZE * 0.58),
        )
    paint = np.clip(lake.astype(np.int16) - protect.astype(np.int16), 0, 255).astype(np.uint8)
    print("lake", paint_water(img, paint, ocean if len(ocean) else img[water0], rng))

    # --- Alaska peninsula 2 west: land on new hex, sea on vacated (0,5) ---
    src = np.zeros((h, w), np.uint8)
    for pid in ("dakota", "appalachia", "beringia", "cascades"):
        src = cv2.bitwise_or(src, mask_of(pid, SIZE * 0.88))
    landish = ~is_water(img)
    src_pix = img[(src > 0) & landish]
    if len(src_pix) < 80:
        src_pix = np.array([[160, 166, 168], [184, 190, 192], [140, 148, 146]], np.uint8)
    new_ak = mask_of("yukon", SIZE * 1.12)
    # land bridge toward appalachia / dakota so it reads as a peninsula
    corridor = np.zeros((h, w), np.uint8)
    ak = (int(by_id["yukon"]["labelX"] * scale), int(by_id["yukon"]["labelY"] * scale))
    ap = (int(by_id["appalachia"]["labelX"] * scale), int(by_id["appalachia"]["labelY"] * scale))
    dk = (int(by_id["dakota"]["labelX"] * scale), int(by_id["dakota"]["labelY"] * scale))
    cv2.polylines(corridor, [np.array([ak, ap], np.int32)], False, 255, thickness=int(22 * scale))
    cv2.polylines(corridor, [np.array([ak, dk], np.int32)], False, 255, thickness=int(18 * scale))
    new_ak = cv2.GaussianBlur(cv2.bitwise_or(new_ak, corridor), (0, 0), 2.2)
    print("alaska land", paint_land(img, new_ak, src_pix, rng, ice=True))

    old_cx, old_cy = axial_to_pixel(0, 5)
    old_mask = hex_mask_hi(h, w, old_cx, old_cy, scale, SIZE * 1.02)
    old_mask = cv2.GaussianBlur(old_mask, (0, 0), 2.4)
    keep = np.zeros((h, w), np.uint8)
    for pid in ("rockies", "appalachia", "beringia", "cascades", "keewatin"):
        keep = cv2.bitwise_or(
            keep, hex_mask_hi(h, w, by_id[pid]["labelX"], by_id[pid]["labelY"], scale, SIZE * 0.72)
        )
    old_mask = np.clip(old_mask.astype(np.int16) - keep.astype(np.int16), 0, 255).astype(np.uint8)
    print("old alaska sea", paint_water(img, old_mask, pacific if len(pacific) else ocean, rng))

    # --- mountain-top ice only (skip forest/jungle/grass) ---
    groups = {
        "nam": ["rockies", "mackenzie", "sierra", "cascades", "cordillera", "laurentide"],
        "asia": ["altai", "sayan", "tarim", "kamchatka", "chuvan", "fuji", "yenisei", "kolyma"],
        "satip": ["peninsula", "fuegia", "drake", "magellan", "patagonia", "andes", "altiplano"],
    }
    water = is_water(img)
    out = img.astype(np.float32)
    rch, gch, bch = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    forest = (gch > rch + 10) & (gch > bch + 4) & (gch > 52)
    desert = (rch > gch + 8) & (rch > bch + 8) & (rch > 90)
    lum = 0.3 * rch + 0.5 * gch + 0.2 * bch
    sat = np.maximum(np.maximum(rch, gch), bch) - np.minimum(np.minimum(rch, gch), bch)
    ice_col = np.array([234.0, 237.0, 242.0])
    yy, xx = np.mgrid[0:h, 0:w]
    total = 0
    for ids in groups.values():
        for tid in ids:
            core = mask_of(tid, SIZE * 0.94)
            land = (core > 40) & (~water) & (~forest) & (~desert)
            if land.sum() < 30:
                continue
            cy = by_id[tid]["labelY"] * scale
            upper = land & (yy < cy + 6 * scale)
            # peaks: brighter or low-sat rock in the upper half
            vals = lum[land]
            thresh = np.percentile(vals, 72)
            peaks = land & (lum >= thresh)
            peaks |= upper & land & (lum >= np.percentile(vals, 60)) & (sat < 55)
            n = int(peaks.sum())
            if not n:
                continue
            mix = 0.62 + rng.random(n) * 0.28
            srcp = out[peaks]
            out[peaks] = srcp * (1 - mix[:, None]) + ice_col * mix[:, None]
            total += n
    # ice ribbon joining southern America to Antarctica
    ribbon = np.zeros((h, w), np.uint8)
    chain = []
    for pid in ("andes", "patagonia", "magellan", "peninsula", "fuegia", "drake", "weddell"):
        chain.append((int(by_id[pid]["labelX"] * scale), int(by_id[pid]["labelY"] * scale)))
    cv2.polylines(ribbon, [np.array(chain, np.int32)], False, 255, thickness=int(28 * scale))
    ribbon = cv2.GaussianBlur(ribbon, (0, 0), 2.4)
    land = (~water) & (~forest) & (ribbon > 24)
    n = int(land.sum())
    if n:
        mix = np.clip(ribbon[land].astype(np.float32) / 255.0 * 0.62, 0, 0.85)
        srcp = out[land]
        out[land] = srcp * (1 - mix[:, None]) + ice_col * mix[:, None]
        total += n
    print("ice pixels", total)
    img = np.clip(out, 0, 255).astype(np.uint8)
    im = Image.fromarray(img)
    im.save(JPG, quality=92)
    im.save(WEBP, "WEBP", quality=86, method=6)
    im.save(OUT, "WEBP", quality=86, method=6)
    print("wrote", OUT, img.shape)


if __name__ == "__main__":
    main()
