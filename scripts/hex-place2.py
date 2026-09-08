#!/usr/bin/env python3
"""Named region moves, drop Nicobar, place new hex seats. Tessellate INSET 0.99."""
from __future__ import annotations

import importlib.util
import math
import re
from collections import Counter
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
DROP = {"nicobar"}
MOVE = {
    "cappadocia": "an",
    "mentawai": "ss",
    "flores": "ss",
    "timor": "ss",
    "kunlun": "me",
    "java": "me",
    "tibet": "ae",
    "bohemia": "me",
}
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
TERRAIN = {
    "ca": "jungle", "eu": "forest", "oc": "jungle", "nw": "tundra",
    "ne": "tundra", "me": "desert", "an": "desert", "af": "savanna",
    "at": "ice", "ss": "jungle", "sa": "jungle", "aw": "steppe", "ae": "steppe",
}
CONT_COLOR = ht.CONT_COLOR
CAPITALS = {
    "atlantis", "irrawaddy", "pantanal", "volcan", "asgard", "gobi",
    "sahel", "sumer", "karoo", "sahul", "nord",
}


def axial_to_pixel(q: int, r: int, size: float = SIZE) -> tuple[float, float]:
    x = size * (SQRT3 * q + SQRT3 / 2 * r)
    y = size * (1.5 * r)
    return x, y


def pixel_to_axial(x: float, y: float, size: float = SIZE) -> tuple[int, int]:
    q = (SQRT3 / 3 * x - 1.0 / 3 * y) / size
    r = (2.0 / 3 * y) / size
    return hr.cube_round(q, -q - r, r)


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

    def take(q: int, r: int, label: str) -> tuple[int, int]:
        assert empty(q, r), (label, q, r, keys.get((q, r)))
        reserved.add((q, r))
        print(f"  {label} ({q},{r}) frac {round(cell_frac(q, r), 2)}")
        return q, r

    for pid, cont in MOVE.items():
        assert pid in by_id, pid
        old = by_id[pid]["continent"]
        by_id[pid]["continent"] = cont
        ls = landscape.setdefault(pid, {})
        ls["fauna"] = FAUNA[cont]
        print(f"move {pid} {old} -> {cont}")

    gs = by_id["greensahara"]
    an_a = take(gs["q"], gs["r"] - 1, "an-above-nw")
    an_b = take(gs["q"] + 1, gs["r"] - 1, "an-above-ne")

    ice = by_id["greenland"]
    ne_a = take(ice["q"] + 1, ice["r"], "ne-e")
    ne_b = take(ice["q"] + 2, ice["r"], "ne-ee")
    ne_c = take(ice["q"] + 3, ice["r"], "ne-eee")

    cal = by_id["calusa"]
    ca_e1 = take(cal["q"] + 1, cal["r"], "ca-e")
    ca_e2 = take(cal["q"] + 2, cal["r"], "ca-ee")

    nic = by_id["nicoya"]
    bim = by_id["bimini"]
    mid_q = (nic["q"] + bim["q"]) // 2
    mid_r = (nic["r"] + bim["r"]) // 2
    ca_mid = take(mid_q, mid_r, "ca-between")

    fl = by_id["flores"]
    ss_e = take(fl["q"] + 1, fl["r"], "ss-east-flores")

    wed = by_id["weddell"]
    ron = by_id["ronne"]
    at_a = take(wed["q"], wed["r"] + 1, "at-weddell-s")
    at_b = take(ron["q"], ron["r"] - 1, "at-ronne-n")

    new_lands = [
        (an_a, "an", "tibesti", "Tibesti", "desert"),
        (an_b, "an", "hoggar", "Hoggar", "desert"),
        (ne_a, "ne", "scoresby", "Scoresby", "tundra"),
        (ne_b, "ne", "fram", "Fram", "tundra"),
        (ne_c, "ne", "tunu", "Tunu", "ice"),
        (ca_e1, "ca", "tequesta", "Tequesta", "jungle"),
        (ca_e2, "ca", "timucua", "Timucua", "jungle"),
        (ca_mid, "ca", "cuba", "Cuba", "jungle"),
        (ss_e, "ss", "alor", "Alor", "jungle"),
        (at_a, "at", "coats", "Coats", "ice"),
        (at_b, "at", "larsen", "Larsen", "ice"),
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

    for r in recs:
        cx, cy = axial_to_pixel(r["q"], r["r"])
        r["labelX"] = round(cx, 1)
        r["labelY"] = round(cy, 1)
        r["path"] = hex_path(cx, cy)
        m = ht.hex_mask(cx, cy, SIZE)
        _, _, frac = ht.land_stats(m, land)
        n_kept = sum(1 for nq, nr in hr.hex_neighbors(r["q"], r["r"]) if (nq, nr) in keys)
        r["coastal"] = frac < 0.86 or n_kept < 6
        r["_frac"] = frac
    for pid in FORCE_INLAND:
        if pid in by_id:
            by_id[pid]["coastal"] = False
    for pid in FORCE_COASTAL:
        if pid in by_id:
            by_id[pid]["coastal"] = True

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
    assert "nicobar" not in by_id
    assert by_id["cappadocia"]["continent"] == "an"
    assert by_id["mentawai"]["continent"] == "ss"
    assert by_id["flores"]["continent"] == "ss"
    assert by_id["timor"]["continent"] == "ss"
    assert by_id["kunlun"]["continent"] == "me"
    assert by_id["java"]["continent"] == "me"
    assert by_id["tibet"]["continent"] == "ae"
    assert by_id["bohemia"]["continent"] == "me"
    assert tuple(sorted(("peninsula", "weddell"))) in land_edges
    assert tuple(sorted(("beringia", "kamchatka"))) in land_edges
    assert tuple(sorted(("weddell", "coats"))) in land_edges
    assert tuple(sorted(("ronne", "larsen"))) in land_edges
    assert tuple(sorted(("coats", "larsen"))) in land_edges
    assert tuple(sorted(("nicoya", "cuba"))) in land_edges
    assert tuple(sorted(("bimini", "cuba"))) in land_edges
    assert tuple(sorted(("calusa", "tequesta"))) in land_edges
    assert tuple(sorted(("greenland", "scoresby"))) in land_edges
    assert tuple(sorted(("flores", "alor"))) in land_edges
    assert tuple(sorted(("greensahara", "tibesti"))) in land_edges
    assert tuple(sorted(("greensahara", "hoggar"))) in land_edges

    for r in recs:
        r.pop("_frac", None)
        r.pop("q", None)
        r.pop("r", None)

    for r in recs:
        ls = landscape.setdefault(r["id"], {})
        ls["fauna"] = ls.get("fauna") or FAUNA[r["continent"]]
        ls["terrain"] = ls.get("terrain") or TERRAIN.get(r["continent"], "mountain")
        ls["resource"] = ls.get("resource") or RES[0]
        if r["id"] not in CAPITALS:
            if "wonder" not in ls:
                ls["wonder"] = None
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
