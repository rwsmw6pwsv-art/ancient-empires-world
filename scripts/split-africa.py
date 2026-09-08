#!/usr/bin/env python3
"""Split every African province in half and tag North vs South Africa."""
from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import numpy as np

ROOT = Path("/workspace")
WORLD = ROOT / "src/lib/game/world.ts"
W, H = 1680, 920
SPLIT_Y = 540
MIN_PX = 80

CHILDREN = {
    "sahara": ("gaetulia", "Gaetulia"),
    "guinea": ("kaabu", "Kaabu"),
    "sahel": ("kanem", "Kanem"),
    "congo": ("teke", "Teke"),
    "kasai": ("lunda", "Lunda"),
    "horn": ("nubia", "Nubia"),
    "rift": ("kilwa", "Kilwa"),
    "nyasa": ("yao", "Yao"),
    "namib": ("damara", "Damara"),
    "cape": ("khoi", "Khoi"),
    "madagascar": ("sakalava", "Sakalava"),
}


def parse_path(p: str):
    rings, cur = [], []
    for cmd in re.finditer(r"([MLZ])([^MLZ]*)", p):
        c, rest = cmd.group(1), cmd.group(2).strip()
        if c in "ML":
            nums = [float(x) for x in re.findall(r"-?\d+\.?\d*", rest)]
            pts = list(zip(nums[0::2], nums[1::2]))
            if c == "M":
                if cur:
                    rings.append(cur)
                cur = pts[:]
            else:
                cur.extend(pts)
        elif c == "Z":
            if cur:
                rings.append(cur)
                cur = []
    if cur:
        rings.append(cur)
    return rings


def fill_mask(rings) -> np.ndarray:
    m = np.zeros((H, W), np.uint8)
    for ring in rings:
        if len(ring) < 3:
            continue
        pts = np.array([[[int(round(x)), int(round(y))]] for x, y in ring], np.int32)
        cv2.fillPoly(m, [pts], 255)
    return m


def contour_path(mask: np.ndarray) -> str:
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = [c for c in cnts if cv2.contourArea(c) >= 20]
    cnts.sort(key=cv2.contourArea, reverse=True)
    parts = []
    for c in cnts:
        eps = max(1.2, 0.004 * cv2.arcLength(c, True))
        approx = cv2.approxPolyDP(c, eps, True)
        if len(approx) < 3:
            continue
        pts = [(float(p[0][0]), float(p[0][1])) for p in approx]
        d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + f"L{pts[0][0]:.1f},{pts[0][1]:.1f}Z"
        parts.append(d)
    return "".join(parts)


def poi(mask: np.ndarray, prefer: tuple[float, float] | None = None) -> tuple[float, float]:
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n <= 1:
        ys, xs = np.where(mask > 0)
        return float(xs.mean()), float(ys.mean())
    pick = 1
    if prefer is not None:
        px, py = int(round(prefer[0])), int(round(prefer[1]))
        if 0 <= py < H and 0 <= px < W and labels[py, px] > 0:
            pick = int(labels[py, px])
        else:
            pick = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    else:
        pick = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    piece = np.uint8(labels == pick) * 255
    dist = cv2.distanceTransform(piece, cv2.DIST_L2, 5)
    _, _, _, mx = cv2.minMaxLoc(dist)
    return float(mx[0]), float(mx[1])


def centroid(mask: np.ndarray) -> tuple[float, float]:
    ys, xs = np.where(mask > 0)
    return float(xs.mean()), float(ys.mean())


src = WORLD.read_text()
items = re.findall(
    r'\{\s*"id": "([^"]+)",\s*"name": "([^"]+)",\s*"continent": "([^"]+)",\s*"coastal": (true|false),\s*"path": "([^"]+)",\s*"labelX": ([0-9.]+),\s*"labelY": ([0-9.]+)\s*\}',
    src,
)
territories = []
for id, name, cont, coast, path, lx, ly in items:
    territories.append(
        {
            "id": id,
            "name": name,
            "continent": cont,
            "coastal": coast == "true",
            "path": path,
            "labelX": float(lx),
            "labelY": float(ly),
        }
    )

masks = {}
for t in territories:
    masks[t["id"]] = fill_mask(parse_path(t["path"]))

new_territories = []
child_of: dict[str, str] = {}
new_ids: list[str] = []

for t in territories:
    if t["id"] not in CHILDREN:
        new_territories.append(t)
        continue
    cid, cname = CHILDREN[t["id"]]
    m = masks[t["id"]]
    ys, xs = np.where(m > 0)
    cut = float(np.median(ys))
    north = m.copy()
    north[int(np.ceil(cut)) :, :] = 0
    south = m.copy()
    south[: int(np.ceil(cut)), :] = 0
    if north.sum() / 255 < MIN_PX or south.sum() / 255 < MIN_PX:
        print("skip tiny", t["id"], north.sum() / 255, south.sum() / 255)
        new_territories.append(t)
        continue
    lx, ly = t["labelX"], t["labelY"]
    label_in_north = 0 <= int(ly) < H and 0 <= int(lx) < W and north[int(ly), int(lx)] > 0
    keep_mask, child_mask = (north, south) if label_in_north else (south, north)
    keep_path = contour_path(keep_mask)
    child_path = contour_path(child_mask)
    if not keep_path or not child_path:
        print("skip empty contour", t["id"])
        new_territories.append(t)
        continue
    kx, ky = poi(keep_mask, (lx, ly))
    cx, cy = poi(child_mask, None)
    kcent = centroid(keep_mask)
    ccent = centroid(child_mask)

    def region(y: float) -> str:
        if t["id"] == "horn":
            return "an"
        if t["id"] == "cape":
            return "af"
        return "an" if y < SPLIT_Y else "af"

    keep = {
        "id": t["id"],
        "name": t["name"],
        "continent": region(kcent[1]) if t["id"] not in ("horn", "cape") else ("an" if t["id"] == "horn" else "af"),
        "coastal": t["coastal"],
        "path": keep_path,
        "labelX": round(kx, 1),
        "labelY": round(ky, 1),
    }
    child = {
        "id": cid,
        "name": cname,
        "continent": region(ccent[1]),
        "coastal": t["coastal"],
        "path": child_path,
        "labelX": round(cx, 1),
        "labelY": round(cy, 1),
    }
    new_territories.append(keep)
    new_territories.append(child)
    child_of[cid] = t["id"]
    new_ids.append(cid)
    masks[t["id"]] = keep_mask
    masks[cid] = child_mask
    print(
        f"{t['id']:12} {keep['continent']} y={kcent[1]:.0f}  + {cid:10} {child['continent']} y={ccent[1]:.0f}  keepN={label_in_north}"
    )

# coastal from raster
all_land = np.zeros((H, W), np.uint8)
for m in masks.values():
    all_land |= m
kernel = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], np.uint8)
for t in new_territories:
    m = masks[t["id"]]
    dil = cv2.dilate(m, kernel)
    border = dil & ~m
    ocean = border & ~all_land
    t["coastal"] = bool(ocean.any())

# land adjacency
ids = [t["id"] for t in new_territories]
id_at = np.full((H, W), -1, np.int32)
for i, tid in enumerate(ids):
    id_at[masks[tid] > 0] = i
land_pairs = set()
for y in range(H):
    row = id_at[y]
    right = id_at[y, 1:] if W > 1 else row
    for a, b in zip(row[:-1], row[1:]):
        if a >= 0 and b >= 0 and a != b:
            land_pairs.add(tuple(sorted((ids[a], ids[b]))))
    if y + 1 < H:
        below = id_at[y + 1]
        for a, b in zip(row, below):
            if a >= 0 and b >= 0 and a != b:
                land_pairs.add(tuple(sorted((ids[a], ids[b]))))

# sea edges: rewrite old
old_land = re.search(r"const LAND_EDGES: \[string, string\]\[\] = (\[.*?\]) as", src, re.S)
old_sea = re.search(r"const SEA_EDGES: \[string, string\]\[\] = (\[.*?\]) as", src, re.S)
old_sea_list = json.loads(old_sea.group(1)) if old_sea else []
parent_children: dict[str, list[str]] = {}
for cid, pid in child_of.items():
    parent_children.setdefault(pid, [pid]).append(cid)
for pid in CHILDREN:
    parent_children.setdefault(pid, [pid])

def expand(tid: str) -> list[str]:
    return parent_children.get(tid, [tid])

id_set = set(ids)
coastal_set = {t["id"] for t in new_territories if t["coastal"]}
land_set = land_pairs
sea_pairs = set()
for a, b in old_sea_list:
    for ca in expand(a):
        for cb in expand(b):
            if ca not in id_set or cb not in id_set or ca == cb:
                continue
            pair = tuple(sorted((ca, cb)))
            if pair in land_set:
                continue
            if ca in coastal_set and cb in coastal_set:
                sea_pairs.add(pair)

land_list = sorted(land_pairs)
sea_list = sorted(sea_pairs)


def ts_bool(v: bool) -> str:
    return "true" if v else "false"


body = []
for t in new_territories:
    body.append(
        "  {\n"
        f'    "id": "{t["id"]}",\n'
        f'    "name": "{t["name"]}",\n'
        f'    "continent": "{t["continent"]}",\n'
        f'    "coastal": {ts_bool(t["coastal"])},\n'
        f'    "path": "{t["path"]}",\n'
        f'    "labelX": {t["labelX"]},\n'
        f'    "labelY": {t["labelY"]}\n'
        "  }"
    )
arr = "export const TERRITORIES: TerritoryDef[] = [\n" + ",\n".join(body) + "\n];"

land_js = "const LAND_EDGES: [string, string][] = " + json.dumps(land_list, separators=(", ", ": ")) + " as [string, string][];"
sea_js = "const SEA_EDGES: [string, string][] = " + json.dumps(sea_list, separators=(", ", ": ")) + " as [string, string][];"

out = src
out = re.sub(r"export const TERRITORIES: TerritoryDef\[\] = \[[\s\S]*?\n\];", arr, out, count=1)
out = re.sub(r"const LAND_EDGES: \[string, string\]\[\] = \[.*?\] as \[string, string\]\[\];", land_js, out, count=1)
out = re.sub(r"const SEA_EDGES: \[string, string\]\[\] = \[.*?\] as \[string, string\]\[\];", sea_js, out, count=1)
WORLD.write_text(out)

from collections import Counter
c = Counter(t["continent"] for t in new_territories)
print("counts", dict(c))
print("n", len(new_territories), "land", len(land_list), "sea", len(sea_list), "new", new_ids)
