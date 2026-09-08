#!/usr/bin/env python3
"""Paint SA–Antarctica land and Ottawa/Unggava sea, then named map edits."""
from __future__ import annotations

import importlib.util
import math
import re
from collections import Counter
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

SIZE = 34.0
INSET = 0.99
SQRT3 = math.sqrt(3)
JPG = Path("/workspace/public/map/world.jpg")
WEBP = Path("/workspace/public/map/world.webp")
DROP = {"ottawa", "unggava"}
MOVE = {
    "nile": "me",
    "yenisei": "eu",
    "amur": "aw",
    "baikal": "aw",
    "chuvan": "aw",
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
    ("weddell", "drake"),
    ("drake", "fuegia"),
    ("fuegia", "tocantins"),
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


def hex_mask_hi(h: int, w: int, cx: float, cy: float, scale: float, size: float) -> np.ndarray:
    m = np.zeros((h, w), np.uint8)
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append([cx * scale + size * scale * math.cos(a), cy * scale + size * scale * math.sin(a)])
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 255)
    return m


def paint_map(by_id: dict) -> None:
    img = np.array(Image.open(JPG).convert("RGB"))
    h, w = img.shape[:2]
    scale = w / hr.WORLD_W
    rng = np.random.default_rng(11)

    def mask_of(pid: str, size: float = SIZE) -> np.ndarray:
        r = by_id[pid]
        return hex_mask_hi(h, w, r["labelX"], r["labelY"], scale, size)

    # --- flood Ottawa / Unggava with sea ---
    ocean = np.array([18, 78, 138], np.int16)
    sea_ids = ["ottawa", "unggava"]
    sea_mask = np.zeros((h, w), np.uint8)
    for pid in sea_ids:
        sea_mask = cv2.bitwise_or(sea_mask, mask_of(pid, SIZE * 1.02))
    sea_mask = cv2.GaussianBlur(sea_mask, (0, 0), 1.6)
    yy, xx = np.where(sea_mask > 8)
    if len(xx):
        alpha = (sea_mask[yy, xx].astype(np.float32) / 255.0)[:, None]
        noise = rng.normal(0, 7, (len(xx), 3))
        painted = np.clip(ocean + noise, 0, 255)
        # keep it ocean-classified: b > r+8, b > g, b > 70
        painted[:, 2] = np.maximum(painted[:, 2], painted[:, 0] + 18)
        painted[:, 2] = np.maximum(painted[:, 2], painted[:, 1] + 8)
        painted[:, 2] = np.clip(painted[:, 2], 90, 255)
        base = img[yy, xx].astype(np.float32)
        img[yy, xx] = np.clip(base * (1 - alpha) + painted * alpha, 0, 255).astype(np.uint8)

    # --- land isthmus through Fuegia and Drake ---
    src_mask = cv2.bitwise_or(mask_of("peninsula"), mask_of("tocantins"))
    src_mask = cv2.bitwise_or(src_mask, mask_of("magellan"))
    lo = img.astype(np.int16)
    rch, gch, bch = lo[:, :, 0], lo[:, :, 1], lo[:, :, 2]
    landish = ~((bch > rch + 8) & (bch > gch) & (bch > 70))
    src_pix = img[(src_mask > 0) & landish]
    if len(src_pix) < 80:
        src_pix = np.array([[148, 138, 118], [132, 128, 108], [160, 150, 128]], np.uint8)

    corridor = np.zeros((h, w), np.uint8)
    for pid in ("fuegia", "drake"):
        corridor = cv2.bitwise_or(corridor, mask_of(pid, SIZE * 0.94))
    pts = []
    for pid in ("tocantins", "fuegia", "drake", "weddell"):
        r = by_id[pid]
        pts.append((int(round(r["labelX"] * scale)), int(round(r["labelY"] * scale))))
    cv2.polylines(corridor, [np.array(pts, np.int32)], False, 255, thickness=int(38 * scale))
    p2 = []
    for pid in ("peninsula", "drake"):
        r = by_id[pid]
        p2.append((int(round(r["labelX"] * scale)), int(round(r["labelY"] * scale))))
    cv2.polylines(corridor, [np.array(p2, np.int32)], False, 255, thickness=int(28 * scale))
    corridor = cv2.GaussianBlur(corridor, (0, 0), 2.2)

    yy, xx = np.where(corridor > 12)
    if len(xx):
        pick = rng.integers(0, len(src_pix), size=len(xx))
        tex = src_pix[pick].astype(np.float32)
        # shift toward pale ice as we approach Weddell (east)
        t = np.clip((xx / scale - by_id["fuegia"]["labelX"]) / 160.0, 0, 1)[:, None]
        ice = np.array([206, 202, 188], np.float32)
        tex = tex * (1 - t) + ice * t
        # stay land-classified
        tex[:, 2] = np.minimum(tex[:, 2], tex[:, 0] + 4)
        tex[:, 2] = np.minimum(tex[:, 2], tex[:, 1] + 2)
        alpha = (corridor[yy, xx].astype(np.float32) / 255.0)[:, None]
        alpha = np.clip(alpha * 1.15, 0, 1)
        base = img[yy, xx].astype(np.float32)
        img[yy, xx] = np.clip(base * (1 - alpha) + tex * alpha, 0, 255).astype(np.uint8)

    out = Image.fromarray(img)
    out.save(JPG, quality=92)
    out.save(WEBP, "WEBP", quality=90)
    print("painted", JPG, WEBP)


def main() -> None:
    text = hr.WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    landscape = hr.parse_landscape(hr.LANDS_TS.read_text())

    for r in recs:
        r["q"], r["r"] = pixel_to_axial(r["labelX"], r["labelY"])
        cx, cy = axial_to_pixel(r["q"], r["r"])
        r["labelX"] = round(cx, 1)
        r["labelY"] = round(cy, 1)

    by_id = {r["id"]: r for r in recs}
    paint_map(by_id)
    land = ht.world_land()

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

    olm = by_id["olmec"]
    par = by_id["paria"]
    mid_q = (olm["q"] + par["q"]) // 2
    mid_r = (olm["r"] + par["r"]) // 2
    ca_mid = take(mid_q, mid_r, "ca-olmec-paria")

    new_lands = [
        (ca_mid, "ca", "miskito", "Miskito", "jungle"),
    ]
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

    print("drake frac", round(by_id["drake"]["_frac"], 2), "fuegia frac", round(by_id["fuegia"]["_frac"], 2))
    assert by_id["drake"]["_frac"] >= 0.4, by_id["drake"]["_frac"]
    assert by_id["fuegia"]["_frac"] >= 0.4, by_id["fuegia"]["_frac"]

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
    assert "ottawa" not in by_id and "unggava" not in by_id
    assert by_id["nile"]["continent"] == "me"
    assert by_id["yenisei"]["continent"] == "eu"
    assert by_id["amur"]["continent"] == "aw"
    assert by_id["baikal"]["continent"] == "aw"
    assert by_id["chuvan"]["continent"] == "aw"
    assert by_id["miskito"]["continent"] == "ca"
    assert tuple(sorted(("olmec", "miskito"))) in land_edges
    assert tuple(sorted(("paria", "miskito"))) in land_edges
    assert tuple(sorted(("weddell", "drake"))) in land_edges
    assert tuple(sorted(("drake", "fuegia"))) in land_edges
    assert tuple(sorted(("fuegia", "tocantins"))) in land_edges
    assert tuple(sorted(("peninsula", "weddell"))) in land_edges
    assert tuple(sorted(("beringia", "kamchatka"))) in land_edges

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
        bg = Image.open(JPG).convert("RGB")
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
