#!/usr/bin/env python3
"""Apply named map edits: drop watery seats, place new ones, tessellate hexes."""
from __future__ import annotations

import importlib.util
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location("hexreg", "/workspace/scripts/hex-regions.py")
hr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hr)
ht_spec = importlib.util.spec_from_file_location("hextrue", "/workspace/scripts/hex-true.py")
ht = importlib.util.module_from_spec(ht_spec)
ht_spec.loader.exec_module(ht)

SIZE = 34.0
INSET = 0.99
SQRT3 = math.sqrt(3)
NBS = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)]
DROP = {"eldorado", "guinea", "maghreb", "iberia", "wilkes", "sofala", "arabia"}
FORCE_INLAND = {"gobi", "kunlun", "pantanal"}
FORCE_COASTAL = {
    "sahul", "tasmania", "hawaii", "sumer", "asgard", "karoo",
    "irrawaddy", "atlantis", "coral", "nord", "volcan",
}
FORCE_LAND = [
    ("beringia", "kamchatka"),
    ("atlas", "alps"),
    ("peninsula", "patagonia"),
    ("peninsula", "weddell"),
    ("peninsula", "magellan"),
    ("rhine", "caledonia"),
    ("fjords", "caledonia"),
]
FAUNA = {
    "at": "penguin", "nw": "bison", "ne": "bison", "ca": "jaguar", "sa": "caiman",
    "eu": "boar", "an": "lion", "af": "hippo", "me": "camel",
    "aw": "siberian-tiger", "ae": "siberian-tiger", "ss": "rhino", "oc": "kangaroo",
}
RES = ["gold", "silver", "wood", "stone", "metal", "food"]
CONT_COLOR = ht.CONT_COLOR
TERRAIN = {
    "ca": "jungle", "eu": "forest", "oc": "jungle", "nw": "tundra",
    "ne": "forest", "me": "desert", "an": "desert", "af": "savanna",
}


def pixel_to_axial(x: float, y: float, size: float = SIZE) -> tuple[int, int]:
    q = (SQRT3 / 3 * x - 1.0 / 3 * y) / size
    r = (2.0 / 3 * y) / size
    return hr.cube_round(q, -q - r, r)


def axial_to_pixel(q: int, r: int, size: float = SIZE) -> tuple[float, float]:
    x = size * (SQRT3 * q + SQRT3 / 2 * r)
    y = size * (1.5 * r)
    return x, y


def hex_path(cx: float, cy: float, size: float = SIZE) -> str:
    pts = ht.hex_corners(cx, cy, size * INSET)
    return "M" + "L".join(f"{float(x):.1f},{float(y):.1f}" for x, y in pts) + "Z"


def main() -> None:
    text = hr.WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    landscape = hr.parse_landscape(hr.LANDS_TS.read_text())
    land = ht.world_land()

    for r in recs:
        r["q"], r["r"] = pixel_to_axial(r["labelX"], r["labelY"])
        cx, cy = axial_to_pixel(r["q"], r["r"])
        r["labelX"] = round(cx, 1)
        r["labelY"] = round(cy, 1)

    recs = [r for r in recs if r["id"] not in DROP]
    by_id = {r["id"]: r for r in recs}
    keys = {(r["q"], r["r"]): r for r in recs}
    used_ids = set(by_id)
    used_names = {r["name"] for r in recs}

    def cell_frac(q: int, r: int) -> float:
        cx, cy = axial_to_pixel(q, r)
        m = ht.hex_mask(cx, cy, SIZE)
        _, _, f = ht.land_stats(m, land)
        return f

    reserved: set[tuple[int, int]] = set()

    def empty(q: int, r: int) -> bool:
        return (q, r) not in keys and (q, r) not in reserved

    def pick_empty(cands: list[tuple[int, int]], prefer_frac: float = 0.28, ordered: bool = False) -> tuple[int, int]:
        scored = []
        for q, r in cands:
            if not empty(q, r):
                continue
            f = cell_frac(q, r)
            scored.append((f, q, r))
        print("  candidates", [(round(f, 2), q, r) for f, q, r in scored[:8]])
        if not scored:
            raise SystemExit(f"no empty cell in {cands}")
        if ordered:
            choice = (scored[0][1], scored[0][2])
        else:
            good = [s for s in scored if s[0] >= prefer_frac]
            pool = good or scored
            pool.sort(reverse=True)
            choice = (pool[0][1], pool[0][2])
        reserved.add(choice)
        return choice

    # Laurentide east one hex
    lau = by_id["laurentide"]
    nq, nr = lau["q"] + 1, lau["r"]
    assert empty(nq, nr), (nq, nr, keys.get((nq, nr)))
    print("laurentide", (lau["q"], lau["r"]), "->", (nq, nr), "frac", round(cell_frac(nq, nr), 2))
    del keys[lau["q"], lau["r"]]
    lau["q"], lau["r"] = nq, nr
    lau["labelX"], lau["labelY"] = (round(x, 1) for x in axial_to_pixel(nq, nr))
    keys[nq, nr] = lau

    by_id["zapotec"]["continent"] = "nw"
    by_id["carthage"]["continent"] = "me"

    yq, yr = by_id["yucatan"]["q"], by_id["yucatan"]["r"]
    print("yucatan", yq, yr)
    north_east = [
        (yq, yr - 1),
        (yq + 1, yr - 1),
        (yq + 1, yr),
        (yq + 2, yr - 1),
        (yq + 2, yr),
        (yq + 1, yr + 1),
    ]
    ca_picked: list[tuple[int, int]] = []
    for q, r in sorted(north_east, key=lambda k: -cell_frac(*k)):
        if empty(q, r) and (q, r) not in ca_picked:
            ca_picked.append((q, r))
            reserved.add((q, r))
        if len(ca_picked) == 4:
            break
    print("CA new cells", [(qr, round(cell_frac(*qr), 2)) for qr in ca_picked])
    assert len(ca_picked) == 4

    cq, cr = by_id["carpathian"]["q"], by_id["carpathian"]["r"]
    eu_nw = pick_empty([(cq - 1, cr), (cq, cr - 1), (cq - 1, cr - 1), (cq - 2, cr), (cq - 1, cr + 1)])
    lq, lr = by_id["lusitania"]["q"], by_id["lusitania"]["r"]
    eu_ne = pick_empty([(lq + 1, lr - 1), (lq, lr - 1), (lq + 1, lr - 2), (lq + 2, lr - 1)])
    sq, sr = by_id["scythia"]["q"], by_id["scythia"]["r"]
    eu_e = pick_empty([(sq + 1, sr), (sq + 1, sr - 1), (sq + 2, sr), (sq + 1, sr + 1)])
    print("EU cells nw/ne/e", eu_nw, eu_ne, eu_e)

    tq, tr = by_id["tamil"]["q"], by_id["tamil"]["r"]
    oc_w = pick_empty([(tq - 1, tr), (tq - 2, tr), (tq - 1, tr - 1)], ordered=True)
    oc_sw = pick_empty([(tq - 1, tr + 1), (tq, tr + 1), (tq - 2, tr + 1)], ordered=True)
    oc_se = pick_empty([(tq + 1, tr), (tq + 1, tr + 1), (tq + 2, tr)], ordered=True)
    oc_ne = pick_empty([(tq + 1, tr - 1), (tq + 2, tr - 1), (tq + 2, tr - 2), (tq + 1, tr - 2), (tq + 2, tr)], ordered=True)
    print("OC tamil w/sw/se/ne", oc_w, oc_sw, oc_se, oc_ne)

    bq, br = by_id["barrier"]["q"], by_id["barrier"]["r"]
    oc_bar = pick_empty([(bq + 1, br), (bq + 1, br - 1), (bq + 2, br), (bq + 1, br + 1)])
    nq2, nr2 = by_id["nullarbor"]["q"], by_id["nullarbor"]["r"]
    oc_nul = pick_empty([(nq2 + 1, nr2), (nq2 + 1, nr2 - 1), (nq2 + 1, nr2 + 1), (nq2 + 2, nr2)])
    print("OC barrier/nullarbor", oc_bar, oc_nul)

    new_lands = [
        (ca_picked[0], "ca", "calusa", "Calusa", "jungle"),
        (ca_picked[1], "ca", "lucayan", "Lucayan", "jungle"),
        (ca_picked[2], "ca", "ciboney", "Ciboney", "jungle"),
        (ca_picked[3], "ca", "bimini", "Bimini", "jungle"),
        (eu_nw, "eu", "doggerland", "Doggerland", "tundra"),
        (eu_ne, "eu", "jutland", "Jutland", "tundra"),
        (eu_e, "eu", "sarmatia", "Sarmatia", "steppe"),
        (oc_w, "oc", "mentawai", "Mentawai", "jungle"),
        (oc_sw, "oc", "flores", "Flores", "jungle"),
        (oc_se, "oc", "timor", "Timor", "jungle"),
        (oc_ne, "oc", "nicobar", "Nicobar", "jungle"),
        (oc_bar, "oc", "loyalty", "Loyalty", "jungle"),
        (oc_nul, "oc", "tasman", "Tasman", "forest"),
    ]
    placed_cells = [c[0] for c in new_lands]
    assert len(placed_cells) == len(set(placed_cells)), placed_cells

    added = []
    for i, ((q, r), cont, pid, pname, terrain) in enumerate(new_lands):
        assert pid not in used_ids and pname not in used_names, (pid, pname)
        assert (q, r) not in keys, (pid, q, r, keys.get((q, r)))
        cx, cy = axial_to_pixel(q, r)
        rec = {
            "id": pid,
            "name": pname,
            "continent": cont,
            "coastal": True,
            "path": "",
            "labelX": round(cx, 1),
            "labelY": round(cy, 1),
            "q": q,
            "r": r,
        }
        recs.append(rec)
        by_id[pid] = rec
        keys[q, r] = rec
        used_ids.add(pid)
        used_names.add(pname)
        landscape[pid] = {
            "terrain": terrain,
            "resource": RES[i % len(RES)],
            "wonder": None,
            "fauna": FAUNA[cont],
        }
        added.append(pid)

    # tessellate every seat at the shared size so neighbours touch
    for r in recs:
        cx, cy = axial_to_pixel(r["q"], r["r"])
        r["labelX"] = round(cx, 1)
        r["labelY"] = round(cy, 1)
        r["path"] = hex_path(cx, cy)
        m = ht.hex_mask(cx, cy, SIZE)
        _, lp, frac = ht.land_stats(m, land)
        n_kept = sum(1 for nq, nr in hr.hex_neighbors(r["q"], r["r"]) if (nq, nr) in keys)
        r["coastal"] = frac < 0.86 or n_kept < 6
        r["_frac"] = frac
    for pid in FORCE_INLAND:
        if pid in by_id:
            by_id[pid]["coastal"] = False
    for pid in FORCE_COASTAL:
        if pid in by_id:
            by_id[pid]["coastal"] = True

    # land graph
    land_edges: set[tuple[str, str]] = set()
    key_of = {(h["q"], h["r"]): h["id"] for h in recs}
    for h in recs:
        for nq, nr in hr.hex_neighbors(h["q"], h["r"]):
            oid = key_of.get((nq, nr))
            if oid and oid != h["id"]:
                land_edges.add(tuple(sorted((h["id"], oid))))
    left = [h for h in recs if h["labelX"] < SIZE * 1.2]
    right = [h for h in recs if h["labelX"] > hr.WORLD_W - SIZE * 1.2]
    for a in left:
        for b in right:
            if abs(a["labelY"] - b["labelY"]) < SIZE * 1.8:
                land_edges.add(tuple(sorted((a["id"], b["id"]))))
    for a, b in FORCE_LAND:
        if a in by_id and b in by_id:
            land_edges.add(tuple(sorted((a, b))))

    # sea graph: keep surviving old links, plus nearest coastal for new/changed
    sea_edges: set[tuple[str, str]] = set()
    for a, b in sea_old:
        if a in by_id and b in by_id and by_id[a]["coastal"] and by_id[b]["coastal"]:
            p = tuple(sorted((a, b)))
            if p not in land_edges:
                sea_edges.add(p)
    coastal = [r for r in recs if r["coastal"]]
    for i, a in enumerate(coastal):
        near = []
        for b in coastal[i + 1 :]:
            p = tuple(sorted((a["id"], b["id"])))
            if p in land_edges:
                continue
            dx = a["labelX"] - b["labelX"]
            dy = a["labelY"] - b["labelY"]
            if abs(dx) > hr.WORLD_W / 2:
                dx = abs(dx) - hr.WORLD_W
            d = math.hypot(dx, dy)
            if d < SIZE * 7:
                near.append((d, b["id"]))
        near.sort()
        for d, bid in near[:3]:
            sea_edges.add(tuple(sorted((a["id"], bid))))

    # overlap: interiors must not cross; neighbours may touch
    R = SIZE * INSET
    inr = R * (SQRT3 / 2)
    too = []
    recs_l = list(recs)
    for i, a in enumerate(recs_l):
        for b in recs_l[i + 1 :]:
            d = math.hypot(a["labelX"] - b["labelX"], a["labelY"] - b["labelY"])
            if d < inr * 2 - 0.8:
                too.append((round(d, 2), a["id"], b["id"]))
    print("too-close", len(too), too[:8])
    assert not too, too[:12]

    dups = [n for n, c in Counter(r["name"] for r in recs).items() if c > 1]
    assert not dups, dups
    assert len({r["id"] for r in recs}) == len(recs)

    counts = Counter(r["continent"] for r in recs)
    print("counts", dict(sorted(counts.items())))
    print("total", len(recs), "added", added, "dropped", sorted(DROP))
    print("mean frac", round(float(np.mean([r["_frac"] for r in recs])), 2))
    for c, n in sorted(counts.items()):
        assert 15 <= n <= 26, (c, n)
    for pid in ("peninsula", "weddell", "nord", "gobi", "orinoco", "atlas", "volcan"):
        assert pid in by_id, pid
    assert tuple(sorted(("peninsula", "weddell"))) in land_edges
    assert tuple(sorted(("beringia", "kamchatka"))) in land_edges
    assert by_id["zapotec"]["continent"] == "nw"
    assert by_id["carthage"]["continent"] == "me"
    assert "eldorado" not in by_id and "iberia" not in by_id and "wilkes" not in by_id

    for r in recs:
        r.pop("_frac", None)
        r.pop("q", None)
        r.pop("r", None)

    # fauna fallback for every remaining land
    for r in recs:
        ls = landscape.setdefault(r["id"], {})
        ls["fauna"] = ls.get("fauna") or FAUNA[r["continent"]]
        ls["terrain"] = ls.get("terrain") or TERRAIN.get(r["continent"], "mountain")
        ls["resource"] = ls.get("resource") or RES[0]
        if r["id"] not in ("gobi", "asgard", "pantanal", "irrawaddy", "volcan", "sahel", "sumer", "karoo", "sahul", "nord", "atlantis"):
            ls["wonder"] = ls.get("wonder") if r["id"] in landscape else None
    if "gobi" in landscape:
        landscape["gobi"]["wonder"] = "pagoda"
    if "asgard" in landscape:
        landscape["asgard"]["wonder"] = "icewall"
        landscape["asgard"]["terrain"] = "ice"
        landscape["asgard"]["fauna"] = "penguin"
    if "congo" in landscape:
        landscape["congo"]["resource"] = "wood"
    if "zambezi" in landscape:
        landscape["zambezi"]["resource"] = "silver"

    hr.write_world(recs, land_edges, sea_edges)
    hr.write_lands(recs, landscape)

    vis = Image.new("RGB", (hr.WORLD_W, hr.WORLD_H), (12, 22, 36))
    try:
        bg = Image.open(Path("/workspace/public/map/world.jpg")).convert("RGB")
        bg = bg.resize((hr.WORLD_W, hr.WORLD_H), Image.BILINEAR)
        vis = Image.blend(vis, bg, 0.62)
    except Exception:
        pass
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    d0 = ImageDraw.Draw(overlay)
    rng = np.random.default_rng(7)
    for r in recs:
        col = CONT_COLOR[r["continent"]]
        tint = tuple(int(np.clip(c * 0.9 + int(rng.integers(-10, 10)), 0, 255)) for c in col) + (150,)
        pts = [(float(x), float(y)) for x, y in re.findall(r"(-?\d+\.?\d*),(-?\d+\.?\d*)", r["path"])]
        if len(pts) >= 3:
            d0.polygon(pts, fill=tint, outline=(18, 18, 18, 230))
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 9)
    except Exception:
        font = ImageFont.load_default()
    for r in recs:
        d.text((r["labelX"] - 12, r["labelY"] - 5), r["name"], fill=(250, 250, 240, 255), font=font)
    vis.convert("RGB").save(hr.PREVIEW)
    print("wrote", hr.WORLD_TS, hr.LANDS_TS, hr.PREVIEW)


if __name__ == "__main__":
    main()
