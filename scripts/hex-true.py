#!/usr/bin/env python3
"""Retile every province as a true hexagon (water allowed, mostly land)
and split North America / North Asia into east and west regions."""
from __future__ import annotations

import importlib.util
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location("hexreg", "/workspace/scripts/hex-regions.py")
hr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hr)

ROOT = Path("/workspace")
WORLD_TS = hr.WORLD_TS
LANDS_TS = hr.LANDS_TS
PREVIEW = hr.PREVIEW
WORLD_W, WORLD_H = hr.WORLD_W, hr.WORLD_H

PARENT_SPLIT = {"na": ("nw", "ne"), "ns": ("aw", "ae")}
REGIONS = ["at", "nw", "ne", "ca", "sa", "eu", "an", "af", "me", "aw", "ae", "ss", "oc"]
OLD_CONTS = ["at", "na", "ca", "sa", "eu", "an", "af", "me", "ns", "ss", "oc"]
TARGET, MIN_N, MAX_N = 20, 15, 26

CAPITALS = {
    "atlantis",
    "irrawaddy",
    "pantanal",
    "volcan",
    "asgard",
    "gobi",
    "sahel",
    "sumer",
    "karoo",
    "sahul",
    "nord",
}
MUST_KEEP = CAPITALS | {
    "hawaii",
    "peninsula",
    "weddell",
    "wilkes",
    "coral",
    "iberia",
    "atlas",
    "nile",
    "sirte",
    "eldorado",
    "orinoco",
    "beringia",
    "kamchatka",
    "congo",
    "zambezi",
    "kunlun",
    "laurentide",
    "mayan",
    "madagascar",
    "tasmania",
    "aotearoa",
}
FORCE_INLAND = {"gobi", "kunlun", "pantanal"}
FORCE_COASTAL = {
    "sahul",
    "tasmania",
    "hawaii",
    "sumer",
    "asgard",
    "karoo",
    "irrawaddy",
    "atlantis",
    "coral",
    "nord",
    "volcan",
}
FORCE_LAND = [
    ("beringia", "kamchatka"),
    ("atlas", "iberia"),
    ("atlas", "maghreb"),
    ("atlas", "alps"),
    ("peninsula", "patagonia"),
    ("peninsula", "weddell"),
    ("peninsula", "magellan"),
    ("rhine", "caledonia"),
    ("fjords", "caledonia"),
]

FAUNA = {
    "at": "penguin",
    "nw": "bison",
    "ne": "bison",
    "ca": "jaguar",
    "sa": "caiman",
    "eu": "boar",
    "an": "lion",
    "af": "hippo",
    "me": "camel",
    "aw": "siberian-tiger",
    "ae": "siberian-tiger",
    "ss": "rhino",
    "oc": "kangaroo",
}
RES = ["gold", "silver", "wood", "stone", "metal", "food"]
CONT_COLOR = {
    "at": (220, 240, 255),
    "nw": (70, 140, 200),
    "ne": (120, 190, 230),
    "ca": (220, 70, 70),
    "sa": (230, 150, 50),
    "eu": (40, 190, 190),
    "an": (230, 200, 70),
    "af": (50, 170, 80),
    "me": (180, 110, 220),
    "aw": (70, 110, 200),
    "ae": (40, 80, 170),
    "ss": (230, 80, 160),
    "oc": (255, 130, 90),
}

NEW_LANDS: dict[str, list[tuple[str, str]]] = {
    "nw": [
        ("california", "California"),
        ("oregon", "Oregon"),
        ("sonora", "Sonora"),
        ("salish", "Salish"),
        ("athabasca", "Athabasca"),
        ("basin", "Great Basin"),
        ("yellowstone", "Yellowstone"),
        ("cheyenne", "Cheyenne"),
        ("hopi", "Hopi"),
        ("navajo", "Navajo"),
        ("klondike", "Klondike"),
        ("sitka", "Sitka"),
        ("shoshone", "Shoshone"),
        ("chinook", "Chinook"),
        ("haida", "Haida"),
        ("missouri", "Missouri"),
        ("utah", "Utah"),
        ("kwakiutl", "Kwakiutl"),
        ("nechako", "Nechako"),
        ("modoc", "Modoc"),
        ("paiute", "Paiute"),
    ],
    "ne": [
        ("vinland", "Vinland"),
        ("markland", "Markland"),
        ("helluland", "Helluland"),
        ("erie", "Erie"),
        ("huron", "Huron"),
        ("fundy", "Fundy"),
        ("newfoundland", "Newfoundland"),
        ("nunavut", "Nunavut"),
        ("ohio", "Ohio"),
        ("illinois", "Illinois"),
        ("chesapeake", "Chesapeake"),
        ("carolina", "Carolina"),
        ("adirondack", "Adirondack"),
        ("ottawa", "Ottawa"),
        ("algonquin", "Algonquin"),
        ("iroquois", "Iroquois"),
        ("micmac", "Micmac"),
        ("muskeg", "Muskeg"),
        ("winnipeg", "Winnipeg"),
        ("unggava", "Unggava"),
        ("beothuk", "Beothuk"),
        ("disko", "Disko"),
        ("scoresby", "Scoresby"),
        ("superior", "Superior"),
    ],
    "aw": [
        ("irtysh", "Irtysh"),
        ("ob", "Ob"),
        ("tobol", "Tobol"),
        ("baraba", "Baraba"),
        ("minusinsk", "Minusinsk"),
        ("khakassia", "Khakassia"),
        ("tomsk", "Tomsk"),
        ("taimyr", "Taimyr"),
        ("evenk", "Evenk"),
        ("yamal", "Yamal"),
        ("ordos", "Ordos"),
        ("tangut", "Tangut"),
        ("xiongnu", "Xiongnu"),
        ("selkup", "Selkup"),
        ("khanty", "Khanty"),
        ("mansi", "Mansi"),
        ("samoyed", "Samoyed"),
        ("gyda", "Gyda"),
        ("barnaul", "Barnaul"),
        ("kansk", "Kansk"),
        ("tungus", "Tungus"),
        ("nentsi", "Nentsi"),
    ],
    "ae": [
        ("sakhalin", "Sakhalin"),
        ("hokkaido", "Hokkaido"),
        ("ryukyu", "Ryukyu"),
        ("primorye", "Primorye"),
        ("magadan", "Magadan"),
        ("okhotsk", "Okhotsk"),
        ("anadyr", "Anadyr"),
        ("koryak", "Koryak"),
        ("nanai", "Nanai"),
        ("jeju", "Jeju"),
        ("ezo", "Ezo"),
        ("kuril", "Kuril"),
        ("liaodong", "Liaodong"),
        ("jilin", "Jilin"),
        ("heilong", "Heilong"),
        ("ulaan", "Ulaan"),
        ("udege", "Udege"),
        ("oroqen", "Oroqen"),
        ("chuvan", "Chuvan"),
        ("tsushima", "Tsushima"),
        ("shantar", "Shantar"),
    ],
}

SPARE = [
    ("rimland", "Rimland"),
    ("midland", "Midland"),
    ("lowland", "Lowland"),
    ("seahold", "Seahold"),
    ("icehold", "Icehold"),
    ("sunhold", "Sunhold"),
    ("redhold", "Redhold"),
    ("goldhold", "Goldhold"),
    ("ironhold", "Ironhold"),
    ("oakhold", "Oakhold"),
]


def world_land() -> np.ndarray:
    img = Image.open(ROOT / "public/map/world.jpg").convert("RGB")
    arr = np.array(img)
    if arr.shape[1] != WORLD_W:
        arr = cv2.resize(arr, (WORLD_W, WORLD_H), interpolation=cv2.INTER_AREA)
    r, g, b = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16)
    ocean = (b > r + 8) & (b > g) & (b > 70)
    return ((~ocean).astype(np.uint8) * 255)


def hex_corners(cx: float, cy: float, size: float) -> np.ndarray:
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append([cx + size * math.cos(a), cy + size * math.sin(a)])
    return np.array(pts, np.float32)


def hex_path(cx: float, cy: float, size: float) -> str:
    pts = hex_corners(cx, cy, size * 0.96)
    return "M" + "L".join(f"{float(x):.1f},{float(y):.1f}" for x, y in pts) + "Z"


def hex_mask(cx: float, cy: float, size: float) -> np.ndarray:
    m = np.zeros((WORLD_H, WORLD_W), np.uint8)
    pts = np.round(hex_corners(cx, cy, size)).astype(np.int32)
    cv2.fillPoly(m, [pts], 255)
    return m


def bbox_axials(mask: np.ndarray, size: float) -> list[tuple[int, int]]:
    yy, xx = np.where(mask > 0)
    if len(xx) == 0:
        return []
    pad = int(size * 2)
    x0, x1 = max(0, int(xx.min()) - pad), min(WORLD_W - 1, int(xx.max()) + pad)
    y0, y1 = max(0, int(yy.min()) - pad), min(WORLD_H - 1, int(yy.max()) + pad)
    keys = set()
    step = max(2, int(size * 0.4))
    for y in range(y0, y1 + 1, step):
        for x in range(x0, x1 + 1, step):
            keys.add(hr.pixel_to_axial(x, y, size))
    return list(keys)


def land_stats(mask: np.ndarray, land: np.ndarray) -> tuple[int, int, float]:
    pix = int(mask.sum() / 255)
    if pix == 0:
        return 0, 0, 0.0
    lp = int(cv2.countNonZero(cv2.bitwise_and(mask, land)))
    return pix, lp, lp / pix


def nearest_fill(painted: np.ndarray, land: np.ndarray) -> np.ndarray:
    cur = painted.copy()
    kernel = np.ones((9, 9), np.uint8)
    unknown = (land > 0) & (cur < 0)
    guard = 0
    while unknown.any() and guard < 80:
        work = (cur + 1).astype(np.int16)
        work[cur < 0] = 0
        dilv = cv2.dilate(work, kernel)
        grow = (cur < 0) & (land > 0) & (dilv > 0)
        cur[grow] = dilv[grow] - 1
        unknown = (land > 0) & (cur < 0)
        guard += 1
    return cur


def region_of_old(old: str, x: float, na_split: float, ns_split: float) -> str:
    if old == "na":
        return "nw" if x < na_split else "ne"
    if old == "ns":
        return "aw" if x < ns_split else "ae"
    return old


def candidates_for(union: np.ndarray, land: np.ndarray, size: float, must_xy: list[tuple[float, float, str]]):
    core = cv2.dilate(union, np.ones((15, 15), np.uint8))
    keys = bbox_axials(core, size)
    out = []
    seen = set()
    for q, r in keys:
        cx, cy = hr.axial_to_pixel(q, r, size)
        if cx < -size or cy < -size or cx > WORLD_W + size or cy > WORLD_H + size:
            continue
        m = hex_mask(cx, cy, size)
        pix, lp, frac = land_stats(m, land)
        ov = int(cv2.countNonZero(cv2.bitwise_and(m, union)))
        if ov < 18 and frac < 0.12:
            continue
        seen.add((q, r))
        out.append({"q": q, "r": r, "cx": cx, "cy": cy, "size": size, "pix": pix, "land": lp, "frac": frac, "ov": ov, "mask": m})
    for x, y, pid in must_xy:
        q, r = hr.pixel_to_axial(x, y, size)
        if (q, r) in seen:
            continue
        cx, cy = hr.axial_to_pixel(q, r, size)
        m = hex_mask(cx, cy, size)
        pix, lp, frac = land_stats(m, land)
        ov = int(cv2.countNonZero(cv2.bitwise_and(m, union)))
        seen.add((q, r))
        out.append(
            {
                "q": q,
                "r": r,
                "cx": cx,
                "cy": cy,
                "size": size,
                "pix": pix,
                "land": lp,
                "frac": max(frac, 0.05),
                "ov": max(ov, 1),
                "mask": m,
            }
        )
    return out


def pick_hexes(cands: list[dict], must_xy: list[tuple[float, float, str]], target: int) -> list[dict]:
    if not cands:
        return []
    by_key = {(c["q"], c["r"]): c for c in cands}

    def score(c):
        return c["frac"] * 2.0 + c["ov"] / max(c["pix"], 1) + c["land"] / 8000.0

    claimed: dict[tuple[int, int], str] = {}
    for x, y, pid in sorted(must_xy, key=lambda t: 0 if t[2] in CAPITALS else 1):
        best, bd = None, 1e18
        for c in cands:
            d = (c["cx"] - x) ** 2 + (c["cy"] - y) ** 2
            if d < bd:
                bd = d
                best = (c["q"], c["r"])
        if best is None:
            continue
        if best in claimed:
            cx, cy = by_key[best]["cx"], by_key[best]["cy"]
            rest = [c for c in cands if (c["q"], c["r"]) not in claimed]
            if rest:
                alt = min(rest, key=lambda c: (c["cx"] - cx) ** 2 + (c["cy"] - cy) ** 2)
                claimed[alt["q"], alt["r"]] = pid
            continue
        claimed[best] = pid

    kept = set(claimed)
    if not kept:
        seed = max(cands, key=score)
        kept.add((seed["q"], seed["r"]))

    def neighbor_cands(keys):
        found = []
        for q, r in keys:
            for nq, nr in hr.hex_neighbors(q, r):
                if (nq, nr) in by_key and (nq, nr) not in keys:
                    found.append(by_key[nq, nr])
        return found

    pool = sorted(cands, key=score, reverse=True)
    min_frac = 0.34
    while len(kept) < target:
        nbs = [c for c in neighbor_cands(kept) if c["frac"] >= min_frac or c["ov"] > 40]
        if nbs:
            nbs.sort(key=score, reverse=True)
            kept.add((nbs[0]["q"], nbs[0]["r"]))
            continue
        leftover = [c for c in pool if (c["q"], c["r"]) not in kept and (c["frac"] >= min_frac or (c["q"], c["r"]) in claimed)]
        if not leftover:
            leftover = [c for c in pool if (c["q"], c["r"]) not in kept]
        if not leftover:
            break
        kept.add((leftover[0]["q"], leftover[0]["r"]))

    while len(kept) > MAX_N:
        ranked = sorted([k for k in kept if k not in claimed], key=lambda k: score(by_key[k]))
        if not ranked:
            break
        kept.remove(ranked[0])

    while len(kept) < MIN_N:
        leftover = [c for c in pool if (c["q"], c["r"]) not in kept]
        if not leftover:
            break
        kept.add((leftover[0]["q"], leftover[0]["r"]))

    picked = [by_key[k] for k in kept if k in by_key]
    for c in picked:
        c["must_id"] = claimed.get((c["q"], c["r"]))
    return picked


def geom_neighbors(a: dict, b: dict) -> bool:
    dx = a["cx"] - b["cx"]
    dy = a["cy"] - b["cy"]
    if abs(dx) > WORLD_W / 2:
        dx = abs(dx) - WORLD_W
    d = math.hypot(dx, dy)
    thresh = 1.78 * (a["size"] + b["size"]) / 2
    return 1.0 < d < thresh


def line_land_frac(a: dict, b: dict, land: np.ndarray) -> float:
    n = 10
    hits = 0
    ax, ay, bx, by = a["cx"], a["cy"], b["cx"], b["cy"]
    dx = bx - ax
    if abs(dx) > WORLD_W / 2:
        if ax < bx:
            ax += WORLD_W
        else:
            bx += WORLD_W
    for i in range(1, n):
        t = i / n
        x = int(round(ax * (1 - t) + bx * t)) % WORLD_W
        y = int(round(ay * (1 - t) + by * t))
        if 0 <= y < WORLD_H and land[y, x] > 0:
            hits += 1
    return hits / (n - 1)


def main() -> None:
    text = WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    assert len(recs) == 220, len(recs)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    landscape = hr.parse_landscape(LANDS_TS.read_text())
    by_id = {r["id"]: r for r in recs}
    land = world_land()

    masks = {r["id"]: hr.fill_mask(r["path"]) for r in recs}
    painted = np.full((WORLD_H, WORLD_W), -1, np.int16)
    cont_ix = {c: i for i, c in enumerate(OLD_CONTS)}
    for r in recs:
        painted[masks[r["id"]] > 0] = cont_ix[r["continent"]]
    painted = nearest_fill(painted, land)

    na_xs = np.where((painted == cont_ix["na"]) & (land > 0))[1]
    ns_xs = np.where((painted == cont_ix["ns"]) & (land > 0))[1]
    na_split = float(np.median(na_xs)) if len(na_xs) else 420.0
    ns_split = float(np.median(ns_xs)) if len(ns_xs) else 1320.0
    nord = by_id["nord"]
    if nord["labelX"] > na_split - 20:
        na_split = nord["labelX"] + 40
    print(f"NA split x={na_split:.1f}  NS split x={ns_split:.1f}")

    region_mask: dict[str, np.ndarray] = {rid: np.zeros((WORLD_H, WORLD_W), np.uint8) for rid in REGIONS}
    yy, xx = np.where((land > 0) & (painted >= 0))
    for y, x in zip(yy.tolist(), xx.tolist()):
        old = OLD_CONTS[int(painted[y, x])]
        rid = region_of_old(old, x, na_split, ns_split)
        region_mask[rid][y, x] = 255

    must_of: dict[str, list[tuple[float, float, str]]] = defaultdict(list)
    for r in recs:
        if r["id"] not in MUST_KEEP:
            continue
        x = min(max(int(round(r["labelX"])), 0), WORLD_W - 1)
        y = min(max(int(round(r["labelY"])), 0), WORLD_H - 1)
        ix = int(painted[y, x])
        if ix < 0:
            rid = region_of_old(r["continent"], r["labelX"], na_split, ns_split)
        else:
            rid = region_of_old(OLD_CONTS[ix], x, na_split, ns_split)
        must_of[rid].append((r["labelX"], r["labelY"], r["id"]))

    picked: dict[str, list[dict]] = {}
    for rid in REGIONS:
        union = region_mask[rid]
        area = int(union.sum() / 255)
        base = float(np.clip(math.sqrt(max(area, 1) / TARGET / 2.598), 18.0, 58.0))
        best_score, chosen, size_used = None, None, base
        for scale in (1.12, 1.04, 1.0, 0.94, 0.88, 0.82, 0.76, 0.70, 1.20, 0.64):
            size = base * scale
            cands = candidates_for(union, land, size, must_of[rid])
            sel = pick_hexes(cands, must_of[rid], TARGET)
            n = len(sel)
            mean_frac = float(np.mean([c["frac"] for c in sel])) if sel else 0
            score = abs(n - TARGET) * 10 + (0 if MIN_N <= n <= MAX_N else 40) - mean_frac * 4
            if best_score is None or score < best_score:
                best_score, chosen, size_used = score, sel, size
            if MIN_N <= n <= MAX_N and mean_frac >= 0.42:
                chosen, size_used = sel, size
                break
        assert chosen, rid
        picked[rid] = chosen
        print(rid, "n", len(chosen), "size", round(size_used, 1), "area", area, "frac", round(float(np.mean([c["frac"] for c in chosen])), 2))

    used_ids: set[str] = set()
    used_names: set[str] = set()
    new_recs = []
    new_landscape: dict[str, dict] = {}
    hexes: list[dict] = []
    old_to_new: dict[str, list[str]] = defaultdict(list)
    spare_i = 0
    name_i = {rid: 0 for rid in REGIONS}

    def take_new_name(rid: str) -> tuple[str, str]:
        nonlocal spare_i
        pool = list(NEW_LANDS.get(rid, [])) + SPARE
        while name_i[rid] < len(pool):
            nid, nname = pool[name_i[rid]]
            name_i[rid] += 1
            if nid not in used_ids and nname not in used_names:
                return nid, nname
        spare_i += 1
        return f"hex{rid}{spare_i}", f"Hex {rid.upper()}{spare_i}"

    parent_ids: dict[str, list[dict]] = defaultdict(list)
    for r in recs:
        if r["continent"] == "na":
            parent_ids["nw"].append(r)
            parent_ids["ne"].append(r)
        elif r["continent"] == "ns":
            parent_ids["aw"].append(r)
            parent_ids["ae"].append(r)
        else:
            parent_ids[r["continent"]].append(r)

    for rid in REGIONS:
        cells = picked[rid]
        assigned_cell = {}
        for c in cells:
            mid = c.get("must_id")
            if mid and mid not in used_ids:
                assigned_cell[id(c)] = mid
                used_ids.add(mid)
        avail = [r for r in parent_ids[rid] if r["id"] not in used_ids]
        if rid in ("nw", "ne", "aw", "ae"):
            split = na_split if rid in ("nw", "ne") else ns_split
            west = rid in ("nw", "aw")
            avail = [r for r in avail if (r["labelX"] < split) == west]
        leftover_cells = sorted([c for c in cells if id(c) not in assigned_cell], key=lambda c: -c["frac"])
        taken_old: set[str] = set()
        for c in leftover_cells:
            rest = [r for r in avail if r["id"] not in taken_old]
            if not rest:
                break
            best = min(rest, key=lambda r: (r["labelX"] - c["cx"]) ** 2 + (r["labelY"] - c["cy"]) ** 2)
            assigned_cell[id(c)] = best["id"]
            used_ids.add(best["id"])
            taken_old.add(best["id"])

        for c in cells:
            oid = assigned_cell.get(id(c))
            if oid and oid in by_id:
                old = by_id[oid]
                pid, pname = old["id"], old["name"]
                src = oid
            else:
                pid, pname = take_new_name(rid)
                src = min(parent_ids[rid], key=lambda r: (r["labelX"] - c["cx"]) ** 2 + (r["labelY"] - c["cy"]) ** 2)["id"]
            used_ids.add(pid)
            used_names.add(pname)
            rec = {
                "id": pid,
                "name": pname,
                "continent": rid,
                "coastal": True,
                "path": hex_path(c["cx"], c["cy"], c["size"]),
                "labelX": round(c["cx"], 1),
                "labelY": round(c["cy"], 1),
                "frac": c["frac"],
            }
            new_recs.append(rec)
            hexes.append({**c, "id": pid, "continent": rid})
            old_to_new[src].append(pid)
            parent_ls = landscape.get(src, {})
            own_ls = landscape.get(pid, {})
            terrain = own_ls.get("terrain") or parent_ls.get("terrain") or ("ice" if rid == "at" else "mountain")
            resource = own_ls.get("resource") or parent_ls.get("resource") or RES[len(new_recs) % len(RES)]
            if pid not in by_id:
                resource = RES[len(new_recs) % len(RES)]
            fauna = own_ls.get("fauna") or parent_ls.get("fauna") or FAUNA[rid]
            wonder = (own_ls.get("wonder") or parent_ls.get("wonder")) if pid in CAPITALS else None
            new_landscape[pid] = {"terrain": terrain, "resource": resource, "wonder": wonder, "fauna": fauna}

    if "congo" in new_landscape:
        new_landscape["congo"]["resource"] = "wood"
    if "zambezi" in new_landscape:
        new_landscape["zambezi"]["resource"] = "silver"
    for cid in CAPITALS:
        if cid in landscape and landscape[cid].get("wonder"):
            new_landscape.setdefault(cid, {})
            new_landscape[cid]["wonder"] = landscape[cid]["wonder"]
            new_landscape[cid]["terrain"] = landscape[cid].get("terrain") or new_landscape[cid].get("terrain")
            new_landscape[cid]["fauna"] = landscape[cid].get("fauna") or new_landscape[cid].get("fauna")
    if "laurentide" in new_landscape:
        new_landscape["laurentide"]["terrain"] = "ice"
    if "arabia" in new_landscape:
        new_landscape["arabia"]["fauna"] = "camel"
    if "asgard" in new_landscape:
        new_landscape["asgard"]["terrain"] = "ice"
        new_landscape["asgard"]["fauna"] = "penguin"

    by_new = {r["id"]: r for r in new_recs}
    hx_by_id = {h["id"]: h for h in hexes}

    for r in new_recs:
        h = hx_by_id[r["id"]]
        n_kept = 0
        for nq, nr in hr.hex_neighbors(h["q"], h["r"]):
            if any(x["q"] == nq and x["r"] == nr and x["continent"] == h["continent"] for x in hexes):
                n_kept += 1
        r["coastal"] = h["frac"] < 0.86 or n_kept < 6
    for pid in FORCE_INLAND:
        if pid in by_new:
            by_new[pid]["coastal"] = False
    for pid in FORCE_COASTAL:
        if pid in by_new:
            by_new[pid]["coastal"] = True

    dups = [n for n, c in Counter(r["name"] for r in new_recs).items() if c > 1]
    if dups:
        raise SystemExit(f"duplicate names {dups}")
    ids = [r["id"] for r in new_recs]
    if len(set(ids)) != len(ids):
        raise SystemExit("duplicate ids")

    land_edges: set[tuple[str, str]] = set()
    nhex = len(hexes)
    for i in range(nhex):
        a = hexes[i]
        for j in range(i + 1, nhex):
            b = hexes[j]
            if not geom_neighbors(a, b):
                continue
            same = a["continent"] == b["continent"]
            frac = line_land_frac(a, b, land)
            if same or frac >= 0.28:
                land_edges.add(tuple(sorted((a["id"], b["id"]))))  # type: ignore[arg-type]
    for a, b in FORCE_LAND:
        if a in by_new and b in by_new:
            land_edges.add(tuple(sorted((a, b))))  # type: ignore[arg-type]

    sea_edges: set[tuple[str, str]] = set()
    coastal_ids = [r["id"] for r in new_recs if r["coastal"]]
    for i, aid in enumerate(coastal_ids):
        a = hx_by_id[aid]
        near = []
        for bid in coastal_ids[i + 1 :]:
            if tuple(sorted((aid, bid))) in land_edges:
                continue
            b = hx_by_id[bid]
            dx = a["cx"] - b["cx"]
            dy = a["cy"] - b["cy"]
            if abs(dx) > WORLD_W / 2:
                dx = abs(dx) - WORLD_W
            d = math.hypot(dx, dy)
            if d < 280:
                near.append((d, bid))
        near.sort()
        for d, bid in near[:3]:
            b = hx_by_id[bid]
            if line_land_frac(a, b, land) < 0.55:
                sea_edges.add(tuple(sorted((aid, bid))))  # type: ignore[arg-type]
    for a, b in sea_old:
        for na in old_to_new.get(a, [a] if a in by_new else []):
            for nb in old_to_new.get(b, [b] if b in by_new else []):
                if na == nb or na not in by_new or nb not in by_new:
                    continue
                if not by_new[na]["coastal"] or not by_new[nb]["coastal"]:
                    continue
                p = tuple(sorted((na, nb)))
                if p in land_edges:
                    continue
                dx = by_new[na]["labelX"] - by_new[nb]["labelX"]
                dy = by_new[na]["labelY"] - by_new[nb]["labelY"]
                if dx * dx + dy * dy > 340 * 340:
                    continue
                sea_edges.add(p)  # type: ignore[arg-type]

    counts = Counter(r["continent"] for r in new_recs)
    print("counts", dict(sorted(counts.items())))
    print("total", len(new_recs), "mean frac", round(float(np.mean([r["frac"] for r in new_recs])), 2))
    missing_keep = [pid for pid in MUST_KEEP if pid not in by_new]
    print("missing must", missing_keep)
    if missing_keep:
        raise SystemExit(f"lost must-keep {missing_keep}")
    if tuple(sorted(("peninsula", "weddell"))) not in land_edges:
        land_edges.add(("peninsula", "weddell"))
        print("forced peninsula-weddell land edge")

    for r in new_recs:
        r.pop("frac", None)

    hr.write_world(new_recs, land_edges, sea_edges)
    hr.write_lands(new_recs, new_landscape)

    vis = Image.new("RGB", (WORLD_W, WORLD_H), (12, 22, 36))
    try:
        bg = Image.open(ROOT / "public/map/world.jpg").convert("RGB")
        bg = bg.resize((WORLD_W, WORLD_H), Image.BILINEAR)
        vis = Image.blend(vis, bg, 0.55)
    except Exception:
        pass
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    rng = np.random.default_rng(3)
    for r in new_recs:
        col = CONT_COLOR[r["continent"]]
        tint = tuple(int(np.clip(c * 0.85 + int(rng.integers(-12, 12)), 0, 255)) for c in col) + (150,)
        pts = []
        for m in re.finditer(r"(-?\d+\.?\d*),(-?\d+\.?\d*)", r["path"]):
            pts.append((float(m.group(1)), float(m.group(2))))
        if len(pts) >= 3:
            d0.polygon(pts, fill=tint, outline=(20, 20, 20, 220))
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
    except Exception:
        font = ImageFont.load_default()
    for r in new_recs:
        d.text((r["labelX"] - 12, r["labelY"] - 5), r["name"], fill=(250, 250, 240, 255), font=font)
    vis.convert("RGB").save(PREVIEW)

    added = [r["id"] for r in new_recs if r["id"] not in by_id]
    dropped = [oid for oid in by_id if oid not in by_new]
    print("added", len(added), added)
    print("dropped", dropped)
    print("wrote", WORLD_TS, LANDS_TS, PREVIEW)


if __name__ == "__main__":
    main()
