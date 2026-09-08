#!/usr/bin/env python3
"""Align 100 playable provinces to the painted borders on world.webp.

The relief map was traced from the original 65 lands. Those outer paths are
kept. The 35 later splits happen *inside* a parent so Egypt stays in Africa,
Iberia in Europe, and no province crosses a painted continent line.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path("/workspace")
WORLD_W, WORLD_H = 1680, 920
ORIG = ROOT / "scripts/world-orig-65.ts"
SRC = ROOT / "src/lib/game/world.ts"
MAP = ROOT / "public/map/world.webp"
PREVIEW = Path("/tmp/provinces.png")
PREVIEW2 = ROOT / "screenshots/provinces.png"

INLAND = {
    "prairie",
    "amazon",
    "cerrado",
    "gobi",
    "himalaya",
    "altai",
    "dakota",
    "tarim",
    "pantanal",
}

# parent -> (child_id, child_name, child_seed_x, child_seed_y)
SPLITS: dict[str, tuple[str, str, int, int]] = {
    "greenland": ("baffin", "Baffin", 469, 84),
    "siberia": ("baikal", "Baikal", 1280, 175),
    "yakutia": ("chukotka", "Chukotka", 1570, 200),
    "india": ("himalaya", "Himalaya", 1185, 360),
    "guinea": ("sahel", "Sahel", 840, 480),
    "steppe": ("altai", "Altai", 1180, 270),
    "hudson": ("ontario", "Ontario", 385, 195),
    "gobi": ("tarim", "Tarim", 1220, 300),
    "alaska": ("aleut", "Aleut", 62, 220),
    "congo": ("kasai", "Kasai", 880, 560),
    "maghreb": ("sahara", "Sahara", 848, 400),
    "indochina": ("burma", "Burma", 1270, 430),
    "yukon": ("mackenzie", "Mackenzie", 290, 185),
    "rift": ("nyasa", "Nyasa", 960, 600),
    "mexico": ("oaxaca", "Oaxaca", 325, 445),
    "andes": ("atacama", "Atacama", 464, 703),
    "cape": ("namib", "Namib", 860, 680),
    "seaboard": ("florida", "Florida", 455, 355),
    "cathay": ("jiangnan", "Jiangnan", 1375, 345),
    "sierra": ("baja", "Baja", 255, 370),
    "nippon": ("korea", "Korea", 1395, 325),
    "cascade": ("columbia", "Columbia", 265, 258),
    "volga": ("ural", "Ural", 1080, 195),
    "horn": ("somali", "Somali", 1034, 507),
    "labrador": ("acadia", "Acadia", 500, 210),
    "canton": ("yunnan", "Yunnan", 1295, 400),
    "arabia": ("hejaz", "Hejaz", 980, 420),
    "slavic": ("ruthenia", "Ruthenia", 970, 245),
    "westralia": ("kimberley", "Kimberley", 1366, 655),
    "outback": ("nullarbor", "Nullarbor", 1410, 730),
    "pampas": ("plata", "Plata", 505, 760),
    "prairie": ("dakota", "Dakota", 310, 250),
    "cerrado": ("pantanal", "Pantanal", 540, 650),
    "patagonia": ("araucania", "Araucania", 470, 780),
    "heartland": ("lakes", "Lakes", 410, 310),
}

FORCE_LAND = [
    ("greenland", "baffin"),
    ("baffin", "labrador"),
    ("greenland", "fjords"),
    ("aleut", "chukotka"),
    ("iberia", "maghreb"),
    ("nippon", "korea"),
    ("greenland", "acadia"),
    ("labrador", "acadia"),
    ("nile", "hejaz"),
    ("mesopotamia", "arabia"),
    ("mesopotamia", "persia"),
    ("siberia", "baikal"),
    ("yakutia", "chukotka"),
    ("india", "himalaya"),
    ("guinea", "sahel"),
    ("steppe", "altai"),
    ("hudson", "ontario"),
    ("gobi", "tarim"),
    ("alaska", "aleut"),
    ("congo", "kasai"),
    ("maghreb", "sahara"),
    ("indochina", "burma"),
    ("yukon", "mackenzie"),
    ("rift", "nyasa"),
    ("mexico", "oaxaca"),
    ("andes", "atacama"),
    ("cape", "namib"),
    ("seaboard", "florida"),
    ("cathay", "jiangnan"),
    ("sierra", "baja"),
    ("cascade", "columbia"),
    ("volga", "ural"),
    ("horn", "somali"),
    ("canton", "yunnan"),
    ("arabia", "hejaz"),
    ("slavic", "ruthenia"),
    ("westralia", "kimberley"),
    ("outback", "nullarbor"),
    ("pampas", "plata"),
    ("prairie", "dakota"),
    ("cerrado", "pantanal"),
    ("patagonia", "araucania"),
    ("heartland", "lakes"),
]

FORCE_SEA = [
    ("hawaii", "sierra"),
    ("hawaii", "alaska"),
    ("hawaii", "cascade"),
    ("hawaii", "aleut"),
    ("polynesia", "coral"),
    ("polynesia", "aotearoa"),
    ("polynesia", "malaya"),
    ("madagascar", "cape"),
    ("madagascar", "rift"),
    ("madagascar", "horn"),
    ("highlands", "gaul"),
    ("highlands", "fjords"),
    ("highlands", "acadia"),
    ("caribbean", "yucatan"),
    ("caribbean", "florida"),
    ("caribbean", "panama"),
    ("aotearoa", "coral"),
    ("aotearoa", "tasmania"),
    ("tasmania", "coral"),
]


def parse_territories(text: str):
    ids = re.findall(
        r'"id": "([^"]+)",\s*"name": "([^"]+)",\s*"continent": "([^"]+)",\s*"coastal": (true|false),\s*"path": "([^"]+)",\s*"labelX": ([0-9.]+),\s*"labelY": ([0-9.]+)',
        text,
    )
    out = []
    for i, name, cont, coastal, path, lx, ly in ids:
        out.append(
            {
                "id": i,
                "name": name,
                "continent": cont,
                "coastal": coastal == "true",
                "path": path,
                "labelX": float(lx),
                "labelY": float(ly),
            }
        )
    return out


def parse_edges(text: str, name: str):
    m = re.search(rf"const {name}: \[string, string\]\[\] = (\[.*?\]);", text, re.S)
    if not m:
        return []
    return re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', m.group(1))


def rings_of(d: str):
    rings, ring = [], []
    nums = re.findall(r"[MLZmlz]|[-+]?\d*\.?\d+", d)
    i, cmd = 0, None
    while i < len(nums):
        t = nums[i]
        if t in "MLZmlz":
            cmd = t.upper()
            i += 1
            if cmd == "Z" and ring:
                rings.append(ring)
                ring = []
            continue
        if cmd in ("M", "L"):
            x, y = float(t), float(nums[i + 1])
            i += 2
            ring.append((x, y))
            cmd = "L"
        else:
            i += 1
    if ring:
        rings.append(ring)
    return rings


def fill_path(path: str) -> np.ndarray:
    canvas = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for ring in rings_of(path):
        if len(ring) < 3:
            continue
        cv2.fillPoly(canvas, [np.array(ring, np.int32)], 1)
    return canvas


def land_mask(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    land = (((g + b) / 2 - r) < 35).astype(np.uint8)
    return cv2.morphologyEx(land, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


def snap_in(mask: np.ndarray, x: int, y: int) -> tuple[int, int]:
    H, W = mask.shape
    x = max(0, min(W - 1, int(round(x))))
    y = max(0, min(H - 1, int(round(y))))
    if mask[y, x]:
        return x, y
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return x, y
    d = (xs - x) ** 2 + (ys - y) ** 2
    k = int(np.argmin(d))
    return int(xs[k]), int(ys[k])


def split_mask(parent: np.ndarray, ax: int, ay: int, bx: int, by: int):
    """Euclidean split of a parent fill. Both pieces stay inside the parent."""
    ys, xs = np.where(parent > 0)
    da = (xs - ax) ** 2 + (ys - ay) ** 2
    db = (xs - bx) ** 2 + (ys - by) ** 2
    a = np.zeros_like(parent)
    b = np.zeros_like(parent)
    a[ys[da <= db], xs[da <= db]] = 1
    b[ys[db < da], xs[db < da]] = 1
    # If the child is a sliver, push its seed to the far end and retry once.
    if int(b.sum()) < max(80, int(parent.sum()) * 0.12):
        dist = da.astype(np.float64)
        k = int(np.argmax(dist))
        bx, by = int(xs[k]), int(ys[k])
        db = (xs - bx) ** 2 + (ys - by) ** 2
        a[:] = 0
        b[:] = 0
        a[ys[da <= db], xs[da <= db]] = 1
        b[ys[db < da], xs[db < da]] = 1
    return a, b, bx, by


def contours_of(mask: np.ndarray):
    m = (mask > 0).astype(np.uint8)
    if int(m.sum()) < 4:
        return []
    m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=1)
    found = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cnts = found[0] if len(found) == 2 else found[1]
    parts = []
    for c in cnts:
        if cv2.contourArea(c) < 8:
            continue
        peri = cv2.arcLength(c, True)
        eps = max(1.4, 0.004 * peri)
        approx = cv2.approxPolyDP(c, eps, True)
        if len(approx) < 3:
            continue
        pts = [(float(p[0][0]), float(p[0][1])) for p in approx]
        parts.append(pts)
    parts.sort(
        key=lambda p: -abs(
            sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p))) / 2
        )
    )
    return parts


def path_of(rings):
    bits = []
    for ring in rings:
        if ring[0] != ring[-1]:
            ring = ring + [ring[0]]
        d = f"M{ring[0][0]:.1f},{ring[0][1]:.1f}"
        for x, y in ring[1:]:
            d += f"L{x:.1f},{y:.1f}"
        d += "Z"
        bits.append(d)
    return "".join(bits)


def label_of(mask: np.ndarray, sx: float, sy: float):
    m = (mask > 0).astype(np.uint8)
    if int(m.sum()) == 0:
        return float(sx), float(sy)
    dist = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    y, x = np.unravel_index(int(np.argmax(dist)), dist.shape)
    return float(x), float(y)


def is_coastal(mask: np.ndarray, land: np.ndarray, pid: str) -> bool:
    if pid in INLAND:
        return False
    dil = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    return bool(((dil == 1) & (land == 0)).any())


def land_edges(owner: np.ndarray):
    adj = set()
    a = owner
    left, right = a[:, :-1], a[:, 1:]
    m = (left > 0) & (right > 0) & (left != right)
    ys, xs = np.where(m)
    for y, x in zip(ys.tolist()[::3], xs.tolist()[::3]):
        p, q = int(left[y, x]), int(right[y, x])
        adj.add((min(p, q), max(p, q)))
    up, down = a[:-1, :], a[1:, :]
    m = (up > 0) & (down > 0) & (up != down)
    ys, xs = np.where(m)
    for y, x in zip(ys.tolist()[::3], xs.tolist()[::3]):
        p, q = int(up[y, x]), int(down[y, x])
        adj.add((min(p, q), max(p, q)))
    L, R = a[:, 0], a[:, -1]
    m = (L > 0) & (R > 0) & (L != R)
    for y in np.where(m)[0].tolist():
        if y > 280:
            continue
        p, q = int(L[y]), int(R[y])
        adj.add((min(p, q), max(p, q)))
    return adj


def write_world(defs, land_pairs, sea_pairs):
    land_pairs = sorted({(a, b) if a < b else (b, a) for a, b in land_pairs})
    landset = set(land_pairs)
    sea_pairs = sorted(
        {(a, b) if a < b else (b, a) for a, b in sea_pairs if ((a, b) if a < b else (b, a)) not in landset}
    )
    body = json.dumps(defs, indent=2)
    land_js = json.dumps([[a, b] for a, b in land_pairs])
    sea_js = json.dumps([[a, b] for a, b in sea_pairs])
    out = f"""import type {{ TerritoryDef }} from "./types";
import {{ CAPITOL }} from "./types";

export const WORLD_W = {WORLD_W};
export const WORLD_H = {WORLD_H};

export const TERRITORIES: TerritoryDef[] = {body};

export const TERRITORY_BY_ID: Record<string, TerritoryDef> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);

/** Independent tribes. Every land that is not a capital starts tribal. */
export const BARBARIAN_IDS: readonly string[] = TERRITORIES.map((t) => t.id).filter(
  (id) => !Object.values(CAPITOL).includes(id),
);

export const BARBARIAN_SET = new Set<string>(BARBARIAN_IDS);

const LAND_EDGES: [string, string][] = {land_js};
const SEA_EDGES: [string, string][] = {sea_js};

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
"""
    SRC.write_text(out)
    print("wrote", SRC, "lands", len(defs), "land-edges", len(land_pairs), "sea-edges", len(sea_pairs))


def preview(rgb, owner, defs, path):
    vis = rgb.copy()
    rng = np.random.RandomState(7)
    n = int(owner.max())
    cols = rng.randint(40, 220, size=(n + 1, 3), dtype=np.uint8)
    tint = vis.astype(np.int16)
    for i in range(1, n + 1):
        m = owner == i
        if not m.any():
            continue
        tint[m] = (tint[m] * 0.5 + cols[i] * 0.5).astype(np.int16)
    vis = np.clip(tint, 0, 255).astype(np.uint8)
    e = np.zeros(owner.shape, np.uint8)
    e[:, 1:] |= (owner[:, 1:] != owner[:, :-1]) & (owner[:, 1:] > 0) & (owner[:, :-1] > 0)
    e[1:, :] |= (owner[1:, :] != owner[:-1, :]) & (owner[1:, :] > 0) & (owner[:-1, :] > 0)
    vis[e > 0] = (18, 16, 12)
    Image.fromarray(vis).save(path)
    print("preview", path)


def main():
    orig_text = ORIG.read_text()
    orig = parse_territories(orig_text)
    old_land = parse_edges(orig_text, "LAND_EDGES")
    old_sea = parse_edges(orig_text, "SEA_EDGES")
    print("orig", len(orig), "land", len(old_land), "sea", len(old_sea))

    img = Image.open(MAP).convert("RGB").resize((WORLD_W, WORLD_H), Image.Resampling.BILINEAR)
    rgb = np.array(img)
    land = land_mask(rgb)

    # Rasterize the painted 65. Clip to land so ocean stays ocean.
    parent_masks = {}
    for t in orig:
        m = fill_path(t["path"]) & land
        parent_masks[t["id"]] = m
        print(f"  orig {t['id']:12} {t['continent']} area={int(m.sum()):6d}")

    claimed = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for m in parent_masks.values():
        claimed |= m
    leftover = (land == 1) & (claimed == 0)
    print("leftover land", int(leftover.sum()))
    # Tiny gaps join the nearest painted land (4-connected, no water jump).
    if leftover.any():
        from collections import deque

        own = np.zeros((WORLD_H, WORLD_W), np.int16)
        id_list = [t["id"] for t in orig]
        for i, t in enumerate(orig):
            own[parent_masks[t["id"]] > 0] = i + 1
        q = deque()
        ys, xs = np.where(own > 0)
        for y, x in zip(ys.tolist(), xs.tolist()):
            q.append((y, x))
        while q:
            y, x = q.popleft()
            s = int(own[y, x])
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if nx < 0 or ny < 0 or nx >= WORLD_W or ny >= WORLD_H:
                    continue
                if leftover[ny, nx] and own[ny, nx] == 0:
                    own[ny, nx] = s
                    leftover[ny, nx] = False
                    q.append((ny, nx))
        for i, t in enumerate(orig):
            parent_masks[t["id"]] = (own == i + 1).astype(np.uint8)
        print("leftover after fill", int(((land == 1) & (own == 0)).sum()))

    defs = []
    owner = np.zeros((WORLD_H, WORLD_W), np.int16)
    seeds = []  # index 0 unused; id at index
    id_of = {}

    def add_def(pid, name, cont, mask, path, lx, ly, keep_path):
        idx = len(seeds) + 1
        id_of[pid] = idx
        seeds.append({"id": pid, "name": name, "continent": cont, "c": cont})
        owner[mask > 0] = idx
        coastal = is_coastal(mask, land, pid)
        if keep_path:
            pth = path
            labx, laby = lx, ly
        else:
            rings = contours_of(mask)
            if not rings:
                # stamp a small disk so the land is never dropped
                yy, xx = int(ly), int(lx)
                cv2.circle(mask, (xx, yy), 6, 1, -1)
                mask &= land
                owner[mask > 0] = idx
                rings = contours_of(mask)
            pth = path_of(rings) if rings else path
            labx, laby = label_of(mask, lx, ly)
        defs.append(
            {
                "id": pid,
                "name": name,
                "continent": cont,
                "coastal": coastal,
                "path": pth,
                "labelX": round(labx, 1),
                "labelY": round(laby, 1),
            }
        )
        print(f"  {pid:12} {cont} area={int(mask.sum()):6d} coastal={coastal} split={not keep_path}")

    children_of = {}
    for t in orig:
        pid = t["id"]
        mask = parent_masks[pid]
        if pid not in SPLITS:
            add_def(pid, t["name"], t["continent"], mask, t["path"], t["labelX"], t["labelY"], True)
            continue
        cid, cname, cx, cy = SPLITS[pid]
        children_of[pid] = cid
        ax, ay = snap_in(mask, t["labelX"], t["labelY"])
        bx, by = snap_in(mask, cx, cy)
        if (ax, ay) == (bx, by):
            ys, xs = np.where(mask > 0)
            d = (xs - ax) ** 2 + (ys - ay) ** 2
            k = int(np.argmax(d))
            bx, by = int(xs[k]), int(ys[k])
        keep_m, child_m, bx, by = split_mask(mask, ax, ay, bx, by)
        add_def(pid, t["name"], t["continent"], keep_m, t["path"], t["labelX"], t["labelY"], False)
        add_def(cid, cname, t["continent"], child_m, t["path"], bx, by, False)

    # Neighbours: pixel land + original land remapped through splits + force.
    adj = land_edges(owner)
    land_pairs = []
    id_by_idx = {i + 1: s["id"] for i, s in enumerate(seeds)}
    kept = {d["id"] for d in defs}
    for p, q in adj:
        a, b = id_by_idx.get(p), id_by_idx.get(q)
        if a in kept and b in kept:
            land_pairs.append((a, b))

    def parts(pid: str):
        out = [pid]
        if pid in children_of:
            out.append(children_of[pid])
        return out

    for a, b in old_land:
        for pa in parts(a):
            for pb in parts(b):
                if pa in kept and pb in kept:
                    land_pairs.append((pa, pb))
    for a, b in FORCE_LAND:
        if a in kept and b in kept:
            land_pairs.append((a, b))

    coastal_set = {d["id"] for d in defs if d["coastal"]}
    sea_pairs = []
    for a, b in old_sea:
        for pa in parts(a):
            for pb in parts(b):
                if pa in coastal_set and pb in coastal_set:
                    sea_pairs.append((pa, pb))
    for a, b in FORCE_SEA:
        if a in coastal_set and b in coastal_set:
            sea_pairs.append((a, b))

    # Close short water gaps.
    k = np.ones((15, 15), np.uint8)
    dilated = []
    for i, s in enumerate(seeds):
        dilated.append(cv2.dilate((owner == i + 1).astype(np.uint8), k, iterations=1))
    for i, s in enumerate(seeds):
        if s["id"] not in coastal_set:
            continue
        for j in range(i + 1, len(seeds)):
            if seeds[j]["id"] not in coastal_set:
                continue
            if int(np.logical_and(dilated[i], dilated[j]).sum()) > 50:
                sea_pairs.append((s["id"], seeds[j]["id"]))

    nile = next(d for d in defs if d["id"] == "nile")
    print("nile continent", nile["continent"], "label", nile["labelX"], nile["labelY"])
    print("count", len(defs))
    assert len(defs) == 100, len(defs)
    assert nile["continent"] == "af"
    assert nile["labelY"] > 360, nile["labelY"]

    preview(rgb, owner, defs, PREVIEW)
    preview(rgb, owner, defs, str(PREVIEW2))
    # order like the original list, children after parent
    write_world(defs, land_pairs, sea_pairs)


if __name__ == "__main__":
    main()
