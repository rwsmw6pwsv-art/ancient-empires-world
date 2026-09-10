#!/usr/bin/env python3
"""Paint Ice Channel and Cold Reach like Calve, South Grass like Gale Steppe."""
from __future__ import annotations

import math
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path("/workspace")
SRC = ROOT / "public/map/world-v135.webp"
OUT_WEBP = ROOT / "public/map/world-v136.webp"
OUT_JPG = ROOT / "public/map/world-v136.jpg"
WORLD_TS = ROOT / "src/lib/game/world.ts"
WORLD_W, WORLD_H = 1680, 1260
SIZE = 34.0


def parse_lands() -> dict[str, dict]:
    text = WORLD_TS.read_text()
    pat = re.compile(
        r'\{\s*"id": "([^"]+)",\s*"name": "([^"]+)",\s*"continent": "([^"]+)",'
        r'\s*"coastal": (true|false),\s*"path": "[^"]+",\s*"labelX": ([0-9.]+),'
        r'\s*"labelY": ([0-9.]+)\s*\}',
        re.S,
    )
    out = {}
    for m in pat.finditer(text):
        out[m.group(1)] = {
            "id": m.group(1),
            "name": m.group(2),
            "x": float(m.group(5)),
            "y": float(m.group(6)),
        }
    return out


def hex_mask(h: int, w: int, cx: float, cy: float, scale: float, size: float, inset: float) -> np.ndarray:
    m = np.zeros((h, w), np.uint8)
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append(
            [
                cx * scale + size * scale * inset * math.cos(a),
                cy * scale + size * scale * inset * math.sin(a),
            ]
        )
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 255)
    return m


def is_ocean(img: np.ndarray) -> np.ndarray:
    r = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    b = img[:, :, 2].astype(np.int16)
    return (b > 82) & (r < 92) & (b > g + 8)


def stamp(img: np.ndarray, by_id: dict, src_id: str, dst_id: str, scale: float, rng: np.random.Generator, kind: str) -> None:
    h, w = img.shape[:2]
    src = by_id[src_id]
    dst = by_id[dst_id]
    src_m = hex_mask(h, w, src["x"], src["y"], scale, SIZE, 1.0)
    dst_m = hex_mask(h, w, dst["x"], dst["y"], scale, SIZE, 1.02)
    dst_m = cv2.GaussianBlur(dst_m, (0, 0), 1.2)
    ocean = is_ocean(img)
    land = ~ocean
    src_land = img[(src_m > 80) & land]
    if len(src_land) < 40:
        src_land = np.array([[176, 192, 204], [154, 174, 190], [198, 208, 216]], np.uint8)
    if kind == "steppe":
        r, g, b = src_land[:, 0], src_land[:, 1], src_land[:, 2]
        grass = src_land[(g.astype(int) > b.astype(int) - 6) & (r.astype(int) > 90)]
        if len(grass) > 30:
            src_land = grass
    yy, xx = np.where(dst_m > 12)
    if len(xx) == 0:
        return
    alpha = dst_m[yy, xx].astype(np.float32) / 255.0
    dest_ocean = ocean[yy, xx]
    pick = rng.integers(0, len(src_land), size=len(xx))
    tex = src_land[pick].astype(np.float32) + rng.normal(0, 4.5, (len(xx), 3))
    tex = np.clip(tex, 0, 255)
    base = img[yy, xx].astype(np.float32)
    out = base.copy()
    landish = ~dest_ocean
    a_land = (alpha * landish.astype(np.float32) * np.clip((dst_m[yy, xx] / 180.0), 0.55, 1.0))[:, None]
    if kind == "ice":
        a_land = np.clip(a_land * 1.15, 0, 0.94)
    out = out * (1 - a_land) + tex * a_land
    # Ice shelf along the inner coast so Ice Channel / Cold Reach match Calve's pale rim.
    if kind == "ice":
        ring = (dest_ocean) & (dst_m[yy, xx] > 40) & (dst_m[yy, xx] < 210)
        if ring.any():
            ice = src_land[rng.integers(0, len(src_land), size=int(ring.sum()))].astype(np.float32)
            mix = (0.62 + 0.22 * rng.random(int(ring.sum())))[:, None]
            blended = ice * mix + np.array([18, 70, 126], np.float32) * (1 - mix)
            inner = dst_m[yy, xx][ring] > 110
            blended[~inner, 2] = np.clip(np.maximum(blended[~inner, 2], blended[~inner, 0] + 20), 96, 255)
            blended[~inner, 0] = np.minimum(blended[~inner, 0], 68)
            a_s = (alpha[ring] * 0.9)[:, None]
            idx = np.where(ring)[0]
            out[idx] = out[idx] * (1 - a_s) + blended * a_s
    img[yy, xx] = np.clip(out, 0, 255).astype(np.uint8)
    print(dst_id, "from", src_id, "kind", kind, "px", int(landish.sum()))


def main() -> None:
    by_id = parse_lands()
    img = np.array(Image.open(SRC).convert("RGB"))
    h, w = img.shape[:2]
    scale = w / WORLD_W
    rng = np.random.default_rng(29)
    stamp(img, by_id, "larsen", "fuegia", scale, rng, "ice")
    stamp(img, by_id, "larsen", "drake", scale, rng, "ice")
    stamp(img, by_id, "magellan", "tocantins", scale, rng, "steppe")
    Image.fromarray(img).save(OUT_WEBP, "WEBP", quality=92, method=6)
    Image.fromarray(img).save(OUT_JPG, "JPEG", quality=92)
    print("wrote", OUT_WEBP, img.shape)


if __name__ == "__main__":
    main()
