#!/usr/bin/env python3
"""Snap every province onto one global hex grid so seats tessellate
without overlap. Hexes may include water but must be mostly land."""
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

ht_spec = importlib.util.spec_from_file_location("hextrue", "/workspace/scripts/hex-true.py")
ht = importlib.util.module_from_spec(ht_spec)
ht_spec.loader.exec_module(ht)

ROOT = Path("/workspace")
WORLD_TS = hr.WORLD_TS
LANDS_TS = hr.LANDS_TS
PREVIEW = hr.PREVIEW
WORLD_W, WORLD_H = hr.WORLD_W, hr.WORLD_H
SQRT3 = hr.SQRT3

REGIONS = ht.REGIONS
TARGET, MIN_N, MAX_N = 20, 15, 26
CAPITALS = ht.CAPITALS
MUST_KEEP = ht.MUST_KEEP
FORCE_INLAND = ht.FORCE_INLAND
FORCE_COASTAL = ht.FORCE_COASTAL
FORCE_LAND = ht.FORCE_LAND
FAUNA = ht.FAUNA
RES = ht.RES
CONT_COLOR = ht.CONT_COLOR
NEW_LANDS = ht.NEW_LANDS
SPARE = ht.SPARE

# Inset slightly so SVG strokes read as borders, not stacked fills.
INSET = 0.76


def hex_path(cx: float, cy: float, size: float) -> str:
    pts = ht.hex_corners(cx, cy, size * INSET)
    return "M" + "L".join(f"{float(x):.1f},{float(y):.1f}" for x, y in pts) + "Z"


def all_axials(size: float) -> list[tuple[int, int]]:
    r_min = int(math.floor((-size) / (1.5 * size))) - 2
    r_max = int(math.ceil((WORLD_H + size) / (1.5 * size))) + 2
    q_min = int(math.floor((-size) / (SQRT3 * size))) - 2
    q_max = int(math.ceil((WORLD_W + size) / (SQRT3 * size))) + 2
    keys = []
    for r in range(r_min, r_max + 1):
        for q in range(q_min, q_max + 1):
            cx, cy = hr.axial_to_pixel(q, r, size)
            if -size * 1.5 <= cx <= WORLD_W + size * 1.5 and -size * 1.5 <= cy <= WORLD_H + size * 1.5:
                keys.append((q, r))
    return keys


def paint_regions(recs: list[dict], land: np.ndarray) -> np.ndarray:
    """Closest-centroid owner so overlapping source hexes don't fight."""
    painted = np.full((WORLD_H, WORLD_W), -1, np.int16)
    best = np.full((WORLD_H, WORLD_W), 1e18, np.float32)
    ix = {c: i for i, c in enumerate(REGIONS)}
    for r in recs:
        mask = hr.fill_mask(r["path"])
        yy, xx = np.where(mask > 0)
        if len(xx) == 0:
            continue
        d = (xx.astype(np.float32) - r["labelX"]) ** 2 + (yy.astype(np.float32) - r["labelY"]) ** 2
        cur = best[yy, xx]
        win = d < cur
        if not win.any():
            continue
        ys, xs = yy[win], xx[win]
        painted[ys, xs] = ix[r["continent"]]
        best[ys, xs] = d[win]
    painted = ht.nearest_fill(painted, land)
    return painted


def score_cell(cell: dict) -> float:
    return cell["frac"] * 3.0 + cell["land"] / 6000.0


def pick_connected(cells: list[dict], must_keys: set[tuple[int, int]], target: int) -> list[dict]:
    by = {(c["q"], c["r"]): c for c in cells}
    kept = set(must_keys) & set(by)
    if not kept and cells:
        kept.add(max(cells, key=score_cell)["q":] if False else (max(cells, key=score_cell)["q"], max(cells, key=score_cell)["r"]))
    pool = sorted(cells, key=score_cell, reverse=True)

    def nbs(keys):
        out = []
        for q, r in keys:
            for nq, nr in hr.hex_neighbors(q, r):
                if (nq, nr) in by and (nq, nr) not in keys:
                    out.append(by[nq, nr])
        return out

    while len(kept) < target:
        cand = [c for c in nbs(kept) if c["frac"] >= 0.32 or (c["q"], c["r"]) in must_keys]
        if cand:
            cand.sort(key=score_cell, reverse=True)
            kept.add((cand[0]["q"], cand[0]["r"]))
            continue
        rest = [c for c in pool if (c["q"], c["r"]) not in kept]
        if not rest:
            break
        kept.add((rest[0]["q"], rest[0]["r"]))

    while len(kept) > MAX_N:
        extra = sorted([k for k in kept if k not in must_keys], key=lambda k: score_cell(by[k]))
        if not extra:
            break
        kept.remove(extra[0])

    while len(kept) < MIN_N:
        rest = [c for c in pool if (c["q"], c["r"]) not in kept]
        if not rest:
            break
        kept.add((rest[0]["q"], rest[0]["r"]))

    return [by[k] for k in kept if k in by]


def choose_size(painted: np.ndarray, land: np.ndarray, recs: list[dict]) -> tuple[float, dict[str, list[dict]]]:
    must_xy = [(r["labelX"], r["labelY"], r["id"], r["continent"]) for r in recs if r["id"] in MUST_KEEP]
    best = None
    for size in (40.0, 38.0, 36.0, 42.0, 34.0, 44.0):
        cells = harvest(painted, land, size, must_xy)
        counts = {rid: len(v) for rid, v in cells.items()}
        if not counts:
            continue
        spread = sum(abs(counts.get(rid, 0) - TARGET) for rid in REGIONS)
        in_band = sum(1 for rid in REGIONS if MIN_N <= counts.get(rid, 0) <= MAX_N)
        mean_frac = float(np.mean([c["frac"] for v in cells.values() for c in v])) if cells else 0
        score = spread * 4 - in_band * 8 - mean_frac * 6
        print("try size", size, "counts", {k: counts.get(k, 0) for k in REGIONS}, "frac", round(mean_frac, 2), "score", round(score, 1))
        if best is None or score < best[0]:
            best = (score, size, cells)
    assert best
    return best[1], best[2]


def harvest(painted: np.ndarray, land: np.ndarray, size: float, must_xy) -> dict[str, list[dict]]:
    ix = {c: i for i, c in enumerate(REGIONS)}
    inv = {i: c for c, i in ix.items()}
    owned: dict[tuple[int, int], dict] = {}
    for q, r in all_axials(size):
        cx, cy = hr.axial_to_pixel(q, r, size)
        m = ht.hex_mask(cx, cy, size)
        pix, lp, frac = ht.land_stats(m, land)
        if pix < 20:
            continue
        land_m = (m > 0) & (land > 0)
        if not land_m.any():
            continue
        labels = painted[land_m]
        labels = labels[labels >= 0]
        if len(labels) == 0:
            continue
        # majority region
        vals, cnts = np.unique(labels, return_counts=True)
        owner_i = int(vals[int(np.argmax(cnts))])
        rid = inv[owner_i]
        owned[q, r] = {
            "q": q,
            "r": r,
            "cx": cx,
            "cy": cy,
            "size": size,
            "pix": pix,
            "land": lp,
            "frac": frac,
            "continent": rid,
        }

    # force must-keep hexes onto the grid even if watery
    for x, y, pid, cont in must_xy:
        q, r = hr.pixel_to_axial(x, y, size)
        if (q, r) in owned:
            owned[q, r]["must_id"] = pid
            owned[q, r]["continent"] = cont
            continue
        cx, cy = hr.axial_to_pixel(q, r, size)
        m = ht.hex_mask(cx, cy, size)
        pix, lp, frac = ht.land_stats(m, land)
        owned[q, r] = {
            "q": q,
            "r": r,
            "cx": cx,
            "cy": cy,
            "size": size,
            "pix": pix,
            "land": lp,
            "frac": max(frac, 0.08),
            "continent": cont,
            "must_id": pid,
        }

    # drop very watery hexes that are not must-keep
    kept = {}
    for key, c in owned.items():
        if c.get("must_id") or c["frac"] >= 0.36:
            kept[key] = c
    owned = kept

    by_reg: dict[str, list[dict]] = defaultdict(list)
    for c in owned.values():
        by_reg[c["continent"]].append(c)

    picked: dict[str, list[dict]] = {}
    used_keys: set[tuple[int, int]] = set()
    for rid in REGIONS:
        cells = [c for c in by_reg.get(rid, []) if (c["q"], c["r"]) not in used_keys]
        must_keys = {(c["q"], c["r"]) for c in cells if c.get("must_id")}
        sel = pick_connected(cells, must_keys, TARGET)
        for c in sel:
            used_keys.add((c["q"], c["r"]))
        picked[rid] = sel
    return picked


def main() -> None:
    text = WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    assert len(recs) >= 200, len(recs)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    landscape = hr.parse_landscape(LANDS_TS.read_text())
    by_id = {r["id"]: r for r in recs}
    land = ht.world_land()
    painted = paint_regions(recs, land)

    size, picked = choose_size(painted, land, recs)
    print("chosen size", size)
    for rid in REGIONS:
        fr = [c["frac"] for c in picked.get(rid, [])]
        print(rid, "n", len(picked.get(rid, [])), "frac", round(float(np.mean(fr)), 2) if fr else 0)

    # uniqueness of axial keys
    keys = [(c["q"], c["r"]) for v in picked.values() for c in v]
    assert len(keys) == len(set(keys)), "overlapping axial hexes"

    used_ids: set[str] = set()
    used_names: set[str] = set()
    new_recs = []
    hexes = []
    new_landscape: dict[str, dict] = {}
    old_to_new: dict[str, list[str]] = defaultdict(list)
    name_i = {rid: 0 for rid in REGIONS}
    spare_i = 0

    def take_new_name(rid: str) -> tuple[str, str]:
        nonlocal spare_i
        pool = list(NEW_LANDS.get(rid, [])) + list(SPARE)
        while name_i[rid] < len(pool):
            nid, nname = pool[name_i[rid]]
            name_i[rid] += 1
            if nid not in used_ids and nname not in used_names and nid not in by_id:
                return nid, nname
        spare_i += 1
        nid = f"hex{rid}{spare_i}"
        while nid in used_ids or nid in by_id:
            spare_i += 1
            nid = f"hex{rid}{spare_i}"
        return nid, f"Hex {rid.upper()}{spare_i}"

    parent_of = defaultdict(list)
    for r in recs:
        parent_of[r["continent"]].append(r)

    for rid in REGIONS:
        cells = picked.get(rid, [])
        assigned = {}
        # must-keep first
        for c in cells:
            mid = c.get("must_id")
            if mid and mid in by_id and mid not in used_ids and by_id[mid]["continent"] == rid:
                assigned[id(c)] = mid
                used_ids.add(mid)
        # remaining old ids of this region by nearest centroid
        leftover = [c for c in cells if id(c) not in assigned]
        avail = [r for r in parent_of[rid] if r["id"] not in used_ids]
        leftover.sort(key=lambda c: -c["frac"])
        taken = set()
        for c in leftover:
            rest = [r for r in avail if r["id"] not in taken]
            if not rest:
                break
            best = min(rest, key=lambda r: (r["labelX"] - c["cx"]) ** 2 + (r["labelY"] - c["cy"]) ** 2)
            assigned[id(c)] = best["id"]
            used_ids.add(best["id"])
            taken.add(best["id"])

        for c in cells:
            oid = assigned.get(id(c))
            if oid and oid in by_id:
                old = by_id[oid]
                pid, pname = old["id"], old["name"]
                src = oid
            else:
                pid, pname = take_new_name(rid)
                src = min(parent_of[rid] or recs, key=lambda r: (r["labelX"] - c["cx"]) ** 2 + (r["labelY"] - c["cy"]) ** 2)["id"]
            used_ids.add(pid)
            used_names.add(pname)
            rec = {
                "id": pid,
                "name": pname,
                "continent": rid,
                "coastal": True,
                "path": hex_path(c["cx"], c["cy"], size),
                "labelX": round(c["cx"], 1),
                "labelY": round(c["cy"], 1),
                "frac": c["frac"],
            }
            new_recs.append(rec)
            hexes.append({**c, "id": pid, "continent": rid, "size": size})
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
    hx_by = {h["id"]: h for h in hexes}
    key_of = {(h["q"], h["r"]): h["id"] for h in hexes}

    for r in new_recs:
        h = hx_by[r["id"]]
        n_kept = sum(1 for nq, nr in hr.hex_neighbors(h["q"], h["r"]) if (nq, nr) in key_of)
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
    missing = [pid for pid in MUST_KEEP if pid not in by_new]
    if missing:
        raise SystemExit(f"lost must-keep {missing}")

    land_edges: set[tuple[str, str]] = set()
    for h in hexes:
        for nq, nr in hr.hex_neighbors(h["q"], h["r"]):
            oid = key_of.get((nq, nr))
            if oid and oid != h["id"]:
                land_edges.add(tuple(sorted((h["id"], oid))))  # type: ignore[arg-type]
    # date-line wrap: leftmost and rightmost hexes on similar y
    left = [h for h in hexes if h["cx"] < size * 1.2]
    right = [h for h in hexes if h["cx"] > WORLD_W - size * 1.2]
    for a in left:
        for b in right:
            if abs(a["cy"] - b["cy"]) < size * 1.8:
                land_edges.add(tuple(sorted((a["id"], b["id"]))))  # type: ignore[arg-type]
    for a, b in FORCE_LAND:
        if a in by_new and b in by_new:
            land_edges.add(tuple(sorted((a, b))))  # type: ignore[arg-type]
    if tuple(sorted(("peninsula", "weddell"))) not in land_edges:
        land_edges.add(("peninsula", "weddell"))

    sea_edges: set[tuple[str, str]] = set()
    coastal = [r["id"] for r in new_recs if r["coastal"]]
    for i, aid in enumerate(coastal):
        a = hx_by[aid]
        near = []
        for bid in coastal[i + 1 :]:
            if tuple(sorted((aid, bid))) in land_edges:
                continue
            b = hx_by[bid]
            dx = a["cx"] - b["cx"]
            dy = a["cy"] - b["cy"]
            if abs(dx) > WORLD_W / 2:
                dx = abs(dx) - WORLD_W
            d = math.hypot(dx, dy)
            if d < size * 7:
                near.append((d, bid))
        near.sort()
        for d, bid in near[:3]:
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
                if dx * dx + dy * dy > 360 * 360:
                    continue
                sea_edges.add(p)  # type: ignore[arg-type]

    counts = Counter(r["continent"] for r in new_recs)
    print("counts", dict(sorted(counts.items())))
    print("total", len(new_recs), "mean frac", round(float(np.mean([r["frac"] for r in new_recs])), 2))

    # overlap check: min center distance among non-neighbors should be large;
    # any two distinct hexes must be at least ~0.9 * neighbor spacing apart
    neigh_d = size * SQRT3
    too_close = 0
    for i, a in enumerate(hexes):
        for b in hexes[i + 1 :]:
            dx = a["cx"] - b["cx"]
            dy = a["cy"] - b["cy"]
            d = math.hypot(dx, dy)
            if d < neigh_d * 0.85:
                too_close += 1
    print("too-close pairs", too_close)
    if too_close:
        raise SystemExit("hexes still overlap")

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
        tint = tuple(int(np.clip(c * 0.85 + int(rng.integers(-12, 12)), 0, 255)) for c in col) + (155,)
        pts = [(float(x), float(y)) for x, y in re.findall(r"(-?\d+\.?\d*),(-?\d+\.?\d*)", r["path"])]
        if len(pts) >= 3:
            d0.polygon(pts, fill=tint, outline=(18, 18, 18, 230))
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
    print("added", added)
    print("dropped", dropped)
    print("wrote", WORLD_TS, LANDS_TS, PREVIEW)


if __name__ == "__main__":
    main()
