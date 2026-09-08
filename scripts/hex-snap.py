#!/usr/bin/env python3
"""Snap the 220 lands onto hex tiles so interiors read as hexagons."""
from __future__ import annotations

import importlib.util
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location("hexreg", "/workspace/scripts/hex-regions.py")
hr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hr)

WORLD_W, WORLD_H = hr.WORLD_W, hr.WORLD_H
FORCE_INLAND = hr.FORCE_INLAND
FORCE_COASTAL = hr.FORCE_COASTAL | {"karoo", "irrawaddy", "atlantis", "coral", "nord", "volcan"}
FORCE_LAND = hr.FORCE_LAND
CONT_COLOR = hr.CONT_COLOR
PREVIEW = hr.PREVIEW


def hex_poly(q: int, r: int, size: float) -> np.ndarray:
    cx, cy = hr.axial_to_pixel(q, r, size)
    pts = []
    for i in range(6):
        a = np.deg2rad(60 * i - 30)
        pts.append([int(round(cx + size * np.cos(a))), int(round(cy + size * np.sin(a)))])
    return np.array(pts, np.int32)


def snap_continent(recs, masks, cont: str):
    local = [r for r in recs if r["continent"] == cont]
    union = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for r in local:
        union |= (masks[r["id"]] > 0).astype(np.uint8)
    union *= 255
    area = int(union.sum() / 255)
    size = float(np.clip(np.sqrt(max(area, 1) / 20 / 2.598), 16.0, 52.0))
    # owner of each land pixel
    owner = {r["id"]: i for i, r in enumerate(local)}
    hex_count: dict[tuple[int, int], dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for r in local:
        yy, xx = np.where(masks[r["id"]] > 0)
        for x, y in zip(xx.tolist(), yy.tolist()):
            hex_count[hr.pixel_to_axial(x, y, size)][r["id"]] += 1
    hex_owner: dict[tuple[int, int], str] = {}
    for key, votes in hex_count.items():
        hex_owner[key] = max(votes, key=votes.get)
    # every land keeps the hex on its centroid
    claimed = set()
    for r in local:
        q, rr = hr.pixel_to_axial(r["labelX"], r["labelY"], size)
        hex_owner[q, rr] = r["id"]
        claimed.add(r["id"])
    have = {pid for pid in hex_owner.values()}
    for r in local:
        if r["id"] in have:
            continue
        # steal nearest hex
        lx, ly = r["labelX"], r["labelY"]
        best, bd = None, 1e18
        for key in hex_owner:
            cx, cy = hr.axial_to_pixel(key[0], key[1], size)
            d = (cx - lx) ** 2 + (cy - ly) ** 2
            if d < bd:
                bd = d
                best = key
        if best is None:
            continue
        hex_owner[best] = r["id"]
    groups: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for key, pid in hex_owner.items():
        groups[pid].append(key)
    out = {}
    for r in local:
        canvas = np.zeros((WORLD_H, WORLD_W), np.uint8)
        for key in groups.get(r["id"], []):
            cv2.fillPoly(canvas, [hex_poly(*key, size)], 255)
        canvas = cv2.bitwise_and(canvas, union)
        if int(canvas.sum() / 255) < 20:
            canvas = masks[r["id"]]
        out[r["id"]] = canvas
    # leftover continent pixels → nearest land of this continent
    covered = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for m in out.values():
        covered |= m
    miss = (union > 0) & (covered == 0)
    if miss.any():
        cents = {r["id"]: hr.centroid(out[r["id"]]) for r in local if int(out[r["id"]].sum()) > 0}
        yy, xx = np.where(miss)
        ids = list(cents)
        cxy = np.array([cents[i] for i in ids], np.float32)
        for x, y in zip(xx.tolist(), yy.tolist()):
            i = int(np.argmin((cxy[:, 0] - x) ** 2 + (cxy[:, 1] - y) ** 2))
            out[ids[i]][y, x] = 255
    return out, size


def main():
    text = hr.WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    assert len(recs) == 220, len(recs)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    landscape = hr.parse_landscape(hr.LANDS_TS.read_text())
    masks = {r["id"]: hr.fill_mask(r["path"]) for r in recs}
    new_masks = {}
    for cont in ["at", "na", "ca", "sa", "eu", "an", "af", "me", "ns", "ss", "oc"]:
        snapped, size = snap_continent(recs, masks, cont)
        print(cont, "hex size", round(size, 1), "lands", len(snapped))
        new_masks.update(snapped)

    # resolve overlaps: last-write would be bad; first land keeps, later yield
    owner = np.full((WORLD_H, WORLD_H and WORLD_W,), -1, np.int32) if False else np.full((WORLD_H, WORLD_W), -1, np.int16)
    id_list = [r["id"] for r in recs]
    index = {pid: i for i, pid in enumerate(id_list)}
    # larger first so small seats are painted on top
    order = sorted(recs, key=lambda r: int(new_masks[r["id"]].sum()), reverse=True)
    for r in order:
        owner[new_masks[r["id"]] > 0] = index[r["id"]]
    # rebuild exclusive masks
    exclusive = {}
    for r in recs:
        m = np.zeros((WORLD_H, WORLD_W), np.uint8)
        m[owner == index[r["id"]]] = 255
        if int(m.sum() / 255) < 12:
            m = new_masks[r["id"]]
        exclusive[r["id"]] = m
        new_masks[r["id"]] = m

    land = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for m in new_masks.values():
        land |= (m > 0).astype(np.uint8)

    for r in recs:
        mask = new_masks[r["id"]]
        path = hr.contour_path(mask)
        if not path:
            raise SystemExit(f"empty {r['id']}")
        r["path"] = path
        lx, ly = hr.centroid(mask)
        r["labelX"] = round(lx, 1)
        r["labelY"] = round(ly, 1)
        r["coastal"] = hr.is_coastal(mask, land)
    by = {r["id"]: r for r in recs}
    for pid in FORCE_INLAND:
        if pid in by:
            by[pid]["coastal"] = False
    for pid in FORCE_COASTAL:
        if pid in by:
            by[pid]["coastal"] = True

    land_edges = set()
    for y in range(WORLD_H - 1):
        row = owner[y]
        below = owner[y + 1]
        for x in range(WORLD_W - 1):
            a = int(row[x])
            if a < 0:
                continue
            for b in (int(row[x + 1]), int(below[x])):
                if b >= 0 and b != a:
                    u, v = (a, b) if a < b else (b, a)
                    land_edges.add((id_list[u], id_list[v]))
    for y in range(WORLD_H):
        a = int(owner[y, 0])
        b = int(owner[y, WORLD_W - 1])
        if a >= 0 and b >= 0 and a != b:
            land_edges.add(tuple(sorted((id_list[a], id_list[b]))))
    for a, b in FORCE_LAND:
        if a in index and b in index:
            land_edges.add(tuple(sorted((a, b))))

    sea_edges = set()
    for a, b in sea_old:
        if a in by and b in by and by[a]["coastal"] and by[b]["coastal"]:
            if tuple(sorted((a, b))) not in land_edges:
                sea_edges.add(tuple(sorted((a, b))))

    hr.write_world(recs, land_edges, sea_edges)
    hr.write_lands(recs, landscape)

    vis = Image.new("RGB", (WORLD_W, WORLD_H), (18, 28, 42))
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    rng = np.random.default_rng(7)
    for r in recs:
        col = CONT_COLOR[r["continent"]]
        tint = (*[int(np.clip(c * 0.8 + int(rng.integers(-18, 18)), 0, 255)) for c in col], 165)
        layer = Image.new("RGBA", vis.size, tint)
        overlay.paste(layer, mask=Image.fromarray(new_masks[r["id"]], "L"))
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except Exception:
        font = ImageFont.load_default()
    for r in recs:
        d.text((r["labelX"] - 14, r["labelY"] - 6), r["name"], fill=(20, 20, 20, 255), font=font)
    vis.convert("RGB").save(PREVIEW)
    print("peninsula-weddell", tuple(sorted(("peninsula", "weddell"))) in land_edges)
    print("wrote snap")


if __name__ == "__main__":
    main()
