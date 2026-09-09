#!/usr/bin/env python3
"""Chroma-key battle city miniatures and unit sheets into public/."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace")
OUT_CITIES = ROOT / "public/map/battle/cities"
OUT_UNITS = ROOT / "public/map/battle/units"
ART = Path("/workspace/artifacts/imagine_images")

CITIES = {
    "camp": "dd96c1e7-3545-4191-b063-494abd06fdd0.jpg",
    "wood": "b5ff7a13-d717-4726-84f1-933f675534af.jpg",
    "stone": "db6b43b5-a23e-4593-aa58-66b3178e59b1.jpg",
    "high": "68a6510b-e543-4016-973b-269308ffd65e.jpg",
    "outer": "729d8d9b-23cc-466b-bc99-9359e397afb3.jpg",
    "moat1": "2da85822-e17e-4d33-a4ac-49970c801919.jpg",
    "moat2": "2e9095c0-d7b1-4b18-9d8d-87236ca22c77.jpg",
    "ring": "22e30020-66a7-4c6a-9020-fb67bffe1c5d.jpg",
}

SHEETS = {
    "levy": "efad7cab-9e86-4965-aae2-594848b37ffb.jpg",
    "bowman": "8f652ec0-0305-4306-ae3f-ec516f6e1bdd.jpg",
    "knight": "b25c5b42-550e-4cbd-9c7b-608b349f257c.jpg",
    "dragon": "ad139020-d183-46ed-bbb2-9d74864836fc.jpg",
    "beast": "480b63da-d084-4920-b09a-f63ebe1ca700.jpg",
    "ram": "a7dc8f8f-8f81-4404-9d91-e34b1f676c39.jpg",
    "catapult": "e7d8c75e-4a94-4e2e-b5ef-68be271258e1.jpg",
}

PROPS = {
    "scorpion": "fcae0372-d7d5-4010-b460-a9753e47fce7.jpg",
    "tower-wood": "bb56c840-3559-4003-a27c-79ee16dde29b.jpg",
    "tower-stone": "33da5a9e-f1f6-4448-b7bc-193529e75ecc.jpg",
}

MAG = np.array([255.0, 0.0, 255.0])
ROSE = np.array([219.0, 14.0, 132.0])


def key_mask(rgb: np.ndarray) -> np.ndarray:
    """True where the pixel is Imagine magenta/rose, not red roofs or water."""
    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]
    d_mag = np.sqrt(((rgb - MAG) ** 2).sum(axis=2))
    d_rose = np.sqrt(((rgb - ROSE) ** 2).sum(axis=2))
    mag_like = (r > 150) & (b > 90) & (g < 95) & (b > g + 25) & (r > g + 35)
    # I2I often emits a dark burgundy key instead of #FF00FF
    dark_key = (r > 140) & (g < 48) & (b > 55) & (r > g + 80)
    roof = (r > 70) & (b < 85) & (g < r * 0.75) & (b < g + 15) & (g > 40)
    water = (b > r + 20) & (b > g - 10) & (r < 140) & (g < 170)
    return ((d_mag < 100) | (d_rose < 80) | mag_like | dark_key) & ~roof & ~water


def chroma(im: Image.Image, crop=True, pad=16) -> Image.Image:
    src = np.array(im.convert("RGBA"))
    rgb = src[:, :, :3].astype(np.float32)
    raw = key_mask(rgb)
    band = np.concatenate(
        [
            rgb[:8].reshape(-1, 3),
            rgb[-8:].reshape(-1, 3),
            rgb[:, :8].reshape(-1, 3),
            rgb[:, -8:].reshape(-1, 3),
        ]
    )
    seed = np.median(band, axis=0)
    if seed[1] < 55 and seed[0] > 130 and seed[2] > 50:
        dist = np.sqrt(((rgb - seed) ** 2).sum(axis=2))
        raw = raw | (dist < 44)
    drop = raw
    src[drop, 3] = 0
    h, w = src.shape[0], src.shape[1]
    alpha = src[:, :, 3]
    neigh = np.zeros(alpha.shape, dtype=bool)
    neigh[1:, :] |= alpha[:-1, :] == 0
    neigh[:-1, :] |= alpha[1:, :] == 0
    neigh[:, 1:] |= alpha[:, :-1] == 0
    neigh[:, :-1] |= alpha[:, 1:] == 0
    fringe = neigh & (alpha > 0) & raw
    src[fringe, 3] = 0
    soft = neigh & (alpha > 0) & ~drop
    if soft.any():
        d_mag = np.sqrt(((rgb - MAG) ** 2).sum(axis=2))
        pull = soft & (d_mag < 140)
        src[pull, 0] = np.minimum(src[pull, 0], src[pull, 1] + 20)
        src[pull, 2] = np.minimum(src[pull, 2], src[pull, 1] + 20)
        src[pull, 3] = (src[pull, 3].astype(np.float32) * 0.45).astype(np.uint8)
    if crop:
        ys, xs = np.where(src[:, :, 3] > 18)
        if len(xs):
            x0, x1 = max(0, int(xs.min()) - pad), min(w, int(xs.max()) + pad)
            y0, y1 = max(0, int(ys.min()) - pad), min(h, int(ys.max()) + pad)
            src = src[y0:y1, x0:x1]
    return Image.fromarray(src)


def split_sheet(im: Image.Image, cols=2, rows=2) -> list[Image.Image]:
    w, h = im.size
    cw, ch = w // cols, h // rows
    frames = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            frames.append(chroma(cell, crop=True, pad=8))
    mw = max(f.size[0] for f in frames)
    mh = max(f.size[1] for f in frames)
    out = []
    for f in frames:
        canvas = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
        x = (mw - f.size[0]) // 2
        y = mh - f.size[1]
        canvas.paste(f, (x, y), f)
        out.append(canvas)
    return out


def write_strip(frames: list[Image.Image], dest: Path) -> None:
    w, h = frames[0].size
    strip = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * w, 0), f)
    dest.parent.mkdir(parents=True, exist_ok=True)
    strip.save(dest)
    print("strip", dest, strip.size)


def main() -> None:
    OUT_CITIES.mkdir(parents=True, exist_ok=True)
    OUT_UNITS.mkdir(parents=True, exist_ok=True)
    for name, fn in CITIES.items():
        im = chroma(Image.open(ART / fn), crop=True, pad=18)
        dest = OUT_CITIES / f"{name}.png"
        im.save(dest)
        print("city", dest, im.size)
    for name, fn in SHEETS.items():
        frames = split_sheet(Image.open(ART / fn))
        write_strip(frames, OUT_UNITS / f"{name}.png")
        for i, f in enumerate(frames):
            f.save(OUT_UNITS / f"{name}-{i}.png")
    for name, fn in PROPS.items():
        im = chroma(Image.open(ART / fn), crop=True, pad=8)
        dest = OUT_UNITS / f"{name}.png"
        im.save(dest)
        print("prop", dest, im.size)


if __name__ == "__main__":
    main()
