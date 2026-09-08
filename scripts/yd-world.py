#!/usr/bin/env python3
"""Restyle public/map/world.* to a Younger Dryas look without moving coastlines."""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

SRC = "/workspace/artifacts/world-current.png"
REF = "/workspace/artifacts/3D915669-973A-453A-9A67-1391AEBDBD67.png"
OUT_PNG = "/workspace/artifacts/world-yd.png"
OUT_WEB = "/workspace/public/map/world.webp"
OUT_JPG = "/workspace/public/map/world.jpg"
SCALE = 2  # world coords -> pixels


def rgb_to_hsv(a: np.ndarray) -> np.ndarray:
    a = a.astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = np.max(a, axis=-1)
    mn = np.min(a, axis=-1)
    df = mx - mn
    h = np.zeros_like(mx)
    mask = df > 1e-6
    rmax = mask & (mx == r)
    gmax = mask & (mx == g)
    bmax = mask & (mx == b)
    h[rmax] = np.mod((g[rmax] - b[rmax]) / df[rmax], 6.0)
    h[gmax] = (b[gmax] - r[gmax]) / df[gmax] + 2.0
    h[bmax] = (r[bmax] - g[bmax]) / df[bmax] + 4.0
    h = h / 6.0
    s = np.where(mx > 1e-6, df / np.maximum(mx, 1e-6), 0.0)
    return np.stack([h, s, mx], axis=-1)


def hsv_to_rgb(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    h = h * 6.0
    i = np.floor(h).astype(np.int32) % 6
    f = h - np.floor(h)
    p = v * (1.0 - s)
    q = v * (1.0 - f * s)
    t = v * (1.0 - (1.0 - f) * s)
    out = np.zeros(h.shape + (3,), dtype=np.float32)
    for k, (rk, gk, bk) in enumerate(
        [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    ):
        m = i == k
        out[m, 0], out[m, 1], out[m, 2] = rk[m], gk[m], bk[m]
    return np.clip(out * 255.0, 0, 255).astype(np.uint8)


def ellipse(h: int, w: int, cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
    ys, xs = np.ogrid[:h, :w]
    return np.clip(1.0 - ((xs - cx) / rx) ** 2 - ((ys - cy) / ry) ** 2, 0.0, 1.0)


def blur_mask(m: np.ndarray, px: int) -> np.ndarray:
    im = Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8), "L")
    im = im.filter(ImageFilter.GaussianBlur(px))
    return np.asarray(im).astype(np.float32) / 255.0


def mix(a: np.ndarray, b: np.ndarray, t: np.ndarray | float) -> np.ndarray:
    tt = np.asarray(t, dtype=np.float32)
    if tt.ndim == 0:
        t3 = float(tt)
        return np.clip(a * (1.0 - t3) + b * t3, 0, 255)
    if tt.ndim == 2:
        tt = tt[..., None]
    return np.clip(a * (1.0 - tt) + b * tt, 0, 255)


def main() -> None:
    src = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    h, w, _ = src.shape
    hsv = rgb_to_hsv(src)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    r, g, b = src[..., 0], src[..., 1], src[..., 2]

    ocean = (b > r + 12) & (b > g - 8) & (b > 70) & (val < 0.78) & (sat > 0.18)
    land = ~ocean
    land_f = land.astype(np.float32)
    ocean_f = ocean.astype(np.float32)

    land_edge = blur_mask(land_f, 6)
    shelf = np.clip(blur_mask(land_f, 18) - land_edge, 0, 1) * ocean_f

    deep = np.array([18, 62, 112], dtype=np.float32)
    mid = np.array([32, 96, 138], dtype=np.float32)
    shelf_c = np.array([78, 158, 168], dtype=np.float32)
    ocean_col = mix(np.broadcast_to(deep, src.shape), np.broadcast_to(mid, src.shape), (val * ocean_f))
    ocean_col = mix(ocean_col, np.broadcast_to(shelf_c, src.shape), shelf * 0.85)
    relief = (src - src.mean(axis=(0, 1))) * 0.22
    ocean_col = np.clip(ocean_col + relief * ocean_f[..., None], 0, 255)

    out = src.copy()
    out = mix(out, ocean_col, ocean_f * 0.92)

    # Cooler, more forested land; keep relief
    land_hsv_h = hue.copy()
    land_hsv_s = sat.copy()
    land_hsv_v = val.copy()
    land_hsv_s = np.clip(land_hsv_s * 0.92, 0, 1)
    land_hsv_v = np.clip(land_hsv_v * 0.98, 0, 1)
    land_rgb = hsv_to_rgb(land_hsv_h, land_hsv_s, land_hsv_v).astype(np.float32)
    out = mix(out, land_rgb, land_f * 0.35)

    rng = np.random.default_rng(12900)
    noise = rng.random((h, w)).astype(np.float32)
    noise = blur_mask(noise, 4)

    ice_c = np.array([238, 246, 252], dtype=np.float32)
    ice_blue = np.array([198, 220, 234], dtype=np.float32)
    ice_shadow = np.array([164, 186, 202], dtype=np.float32)

    ys, xs = np.ogrid[:h, :w]
    lat = np.clip(1.0 - (ys / (0.38 * h)), 0.0, 1.0) ** 1.35
    na = ((xs < 980) & (ys < 620)).astype(np.float32)
    grn = ((xs > 980) & (xs < 1540) & (ys < 520)).astype(np.float32)
    fen = ((xs > 1680) & (xs < 1980) & (ys < 430)).astype(np.float32)
    sib = ((xs > 2900) & (ys < 420)).astype(np.float32)
    ice_region = np.clip(na * 1.0 + grn * 1.05 + fen * 0.95 + sib * 0.7, 0, 1)
    ice_region = blur_mask(ice_region, 8)
    already_cold = np.clip((val - 0.42) / 0.45, 0, 1)
    ice = land_f * ice_region * lat * (0.35 + 0.65 * already_cold)
    ice = np.clip(ice * (0.85 + 0.15 * noise), 0, 1)
    ice = blur_mask(ice, 2) * land_f

    ice_col = mix(np.broadcast_to(ice_c, src.shape), np.broadcast_to(ice_blue, src.shape), noise)
    ice_col = mix(ice_col, np.broadcast_to(ice_shadow, src.shape), np.clip(1.0 - val, 0, 1) * 0.55)
    ice_col = mix(src, ice_col, 0.82)
    out = mix(out, ice_col, np.clip(ice * 1.05, 0, 1))

    # Green Sahara / North Africa
    green = ellipse(h, w, 860 * SCALE, 430 * SCALE, 200 * SCALE, 120 * SCALE)
    green = np.maximum(green, ellipse(h, w, 930 * SCALE, 400 * SCALE, 140 * SCALE, 90 * SCALE))
    green = np.maximum(green, ellipse(h, w, 800 * SCALE, 400 * SCALE, 120 * SCALE, 80 * SCALE))
    green = blur_mask(green, 14) * land_f * (1.0 - ice)
    savanna = np.array([126, 158, 72], dtype=np.float32)
    woodland = np.array([72, 122, 58], dtype=np.float32)
    green_col = mix(np.broadcast_to(savanna, src.shape), np.broadcast_to(woodland, src.shape), noise)
    green_col = mix(green_col, src, 0.28)
    out = mix(out, green_col, green * 0.78)

    # Slightly greener Sahel belt south of Sahara
    sahel = ellipse(h, w, 850 * SCALE, 500 * SCALE, 180 * SCALE, 55 * SCALE)
    sahel = blur_mask(sahel, 10) * land_f * (1.0 - ice)
    out = mix(out, np.broadcast_to(np.array([96, 140, 58], dtype=np.float32), src.shape), sahel * 0.4)

    # Tibetan plateau stays high tan/grey — nudge inner Asia toward steppe
    steppe = ellipse(h, w, 1180 * SCALE, 280 * SCALE, 220 * SCALE, 90 * SCALE)
    steppe = blur_mask(steppe, 12) * land_f * (1.0 - ice)
    out = mix(out, np.broadcast_to(np.array([186, 168, 110], dtype=np.float32), src.shape), steppe * 0.28)

    # Lock exact ocean/land silhouette from the original
    out = mix(out, ocean_col, ocean_f * 0.15)
    out[ocean] = ocean_col[ocean]
    # restore a little original land shading
    out = mix(out, src, land_f * 0.12)

    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")
    img.save(OUT_PNG)
    img.save(OUT_WEB, "WEBP", quality=88, method=6)
    img.save(OUT_JPG, "JPEG", quality=90, optimize=True)
    print("wrote", img.size, OUT_WEB)


if __name__ == "__main__":
    main()
