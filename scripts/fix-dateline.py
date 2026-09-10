#!/usr/bin/env python3
"""Flood isolated North Pacific paint. Keeps Beringia, Kamchatka, Alaska, NZ."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path("/workspace")
SRC = ROOT / "public/map/world-v132.webp"
OUT = ROOT / "public/map/world-v134.webp"


def is_ocean(img: np.ndarray) -> np.ndarray:
    r = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    b = img[:, :, 2].astype(np.int16)
    return (b > 80) & (r < 90) & (b > g)


def is_deep_ocean(img: np.ndarray) -> np.ndarray:
    r = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    b = img[:, :, 2].astype(np.int16)
    return (b > 110) & (r < 40) & (b > g + 20)


def paint_ocean(img: np.ndarray, mask: np.ndarray, sample: np.ndarray, rng: np.random.Generator) -> int:
    yy, xx = np.where(mask > 0)
    if len(xx) == 0 or len(sample) == 0:
        return 0
    pick = rng.integers(0, len(sample), size=len(xx))
    tex = sample[pick].astype(np.float32) + rng.normal(0, 4, (len(xx), 3))
    tex = np.clip(tex, 0, 255)
    tex[:, 2] = np.clip(np.maximum(np.maximum(tex[:, 2], tex[:, 0] + 16), tex[:, 1] + 8), 88, 255)
    img[yy, xx] = tex.astype(np.uint8)
    return int(len(xx))


def main() -> None:
    img = np.array(Image.open(SRC).convert("RGB"))
    h, w, _ = img.shape
    rng = np.random.default_rng(19)
    ocean = is_ocean(img)
    deep = is_deep_ocean(img)
    sample = img[deep]
    if len(sample) > 8000:
        sample = sample[rng.choice(len(sample), 8000, replace=False)]

    def y_of(lat: float) -> int:
        return int(np.clip(round(h * (90 - lat) / 180), 0, h))

    def x_of(lon: float) -> int:
        return int(round((lon + 180) / 360 * w)) % w

    # Open Pacific south of Beringia: 56N .. 10S
    y0 = y_of(56)
    y1 = y_of(-10)
    # Date-line-centered wrap crop: 150E .. 150W
    x_e = x_of(150)
    x_w = x_of(-150)
    # wrap: x_e .. w-1 and 0 .. x_w
    band = np.zeros((h, w), np.uint8)
    land = (~ocean).astype(np.uint8) * 255
    band[y0:y1, x_e:] = land[y0:y1, x_e:]
    band[y0:y1, :x_w] = land[y0:y1, :x_w]

    # Mainland anchors: Asia west of 145E and America east of 145W, same latitudes
    # (plus a few pixels of Kamchatka/Alaska coast just inside the basin)
    inland = np.zeros((h, w), np.uint8)
    inland[y0:y1, x_of(80) : x_of(145)] = land[y0:y1, x_of(80) : x_of(145)]
    inland[y0:y1, x_of(-145) : x_of(-80)] = land[y0:y1, x_of(-145) : x_of(-80)]

    # Wrap-aware components of basin land
    pad = x_w  # left pad width equals right-of-zero slice
    wide = np.concatenate([band[:, w - (w - x_e) :], band, band[:, :x_w]], axis=1)
    # simpler: stitch basin into a contiguous image
    left = band[:, x_e:]  # 150E -> 180
    right = band[:, :x_w]  # -180 -> -150
    stitch = np.concatenate([left, right], axis=1)
    inland_stitch = np.concatenate([inland[:, x_e:], inland[:, :x_w]], axis=1)
    nlab, labels = cv2.connectedComponents(stitch, 8)
    keep = set()
    for lab in range(1, nlab):
        if np.any((labels == lab) & (inland_stitch > 0)):
            keep.add(lab)
    flood_stitch = (stitch > 0) & ~np.isin(labels, list(keep) or [0])
    flood = np.zeros((h, w), np.uint8)
    flood[:, x_e:] = flood_stitch[:, : left.shape[1]].astype(np.uint8) * 255
    flood[:, :x_w] = flood_stitch[:, left.shape[1] :].astype(np.uint8) * 255

    # Thin date-line leftovers 56N-10S (grey smear), but never north of 56N (Beringia wrap)
    seam = np.zeros((h, w), np.uint8)
    for xband in (range(0, 10), range(w - 10, w)):
        for x in xband:
            col = ~deep[y0:y1, x]
            seam[y0:y1, x][col] = 255
    flood = (flood > 0) | (seam > 0)

    n = paint_ocean(img, flood.astype(np.uint8), sample, rng)
    Image.fromarray(img).save(OUT, "WEBP", quality=92, method=6)
    print(f"flooded {n} pixels -> {OUT}")


if __name__ == "__main__":
    main()
