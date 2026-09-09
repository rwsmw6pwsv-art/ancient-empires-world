#!/usr/bin/env python3
"""Restore the v130 painted map and put Alaska back on its original land hex."""
from __future__ import annotations

import importlib.util
import math
import shutil
from collections import Counter
from pathlib import Path

from PIL import Image

spec = importlib.util.spec_from_file_location("seat", "/workspace/scripts/apply-seat-map.py")
seat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seat)
hr = seat.hr
ht = seat.ht

ROOT = Path("/workspace")
SRC = ROOT / "public/map/world-v130.webp"
JPG = ROOT / "public/map/world.jpg"
WEBP = ROOT / "public/map/world.webp"


def main() -> None:
    assert SRC.exists(), SRC
    img = Image.open(SRC).convert("RGB")
    img.save(JPG, quality=92)
    img.save(WEBP, "WEBP", quality=86, method=6)
    print("restored", SRC.name, "-> world.jpg/webp", img.size)

    text = hr.WORLD_TS.read_text()
    recs = hr.parse_territories(text)
    sea_old = hr.parse_edges(text, "SEA_EDGES")
    for r in recs:
        r["q"], r["r"] = seat.pixel_to_axial(r["labelX"], r["labelY"])
    by_id = {r["id"]: r for r in recs}
    keys = {(r["q"], r["r"]): r for r in recs}

    yu = by_id["yukon"]
    old = (yu["q"], yu["r"])
    q, rr = 0, 5
    if old != (q, rr):
        assert (q, rr) not in keys, keys.get((q, rr))
        del keys[old]
        yu["q"], yu["r"] = q, rr
        cx, cy = seat.axial_to_pixel(q, rr)
        yu["labelX"], yu["labelY"] = round(cx, 1), round(cy, 1)
        yu["path"] = seat.hex_path(cx, cy)
        yu["coastal"] = True
        keys[q, rr] = yu
        print(f"move yukon {old} -> ({q},{rr}) xy=({yu['labelX']},{yu['labelY']})")
    else:
        print("yukon already at (0,5)")

    land = ht.world_land()
    land_edges, sea_edges = seat.rebuild_edges(recs, by_id, land, sea_old)

    R = seat.SIZE * seat.INSET
    inr = R * (math.sqrt(3) / 2)
    too = []
    recs_l = list(recs)
    for i, a in enumerate(recs_l):
        for b in recs_l[i + 1 :]:
            d = math.hypot(a["labelX"] - b["labelX"], a["labelY"] - b["labelY"])
            if d < inr * 2 - 0.8:
                too.append((round(d, 2), a["id"], b["id"]))
    assert not too, too[:12]
    dups = [n for n, c in Counter(r["name"] for r in recs).items() if c > 1]
    assert not dups, dups
    print("lands", len(recs), "land_edges", len(land_edges), "sea_edges", len(sea_edges))
    print("yukon", yu["name"], yu["labelX"], yu["labelY"], "coastal", yu["coastal"])
    print("nord", by_id["nord"]["name"], by_id["nord"]["labelX"], by_id["nord"]["labelY"])
    print("gobi", by_id["gobi"]["name"], by_id["gobi"]["labelX"], by_id["gobi"]["labelY"])
    print("atlantis", by_id["atlantis"]["name"], by_id["atlantis"]["labelX"], by_id["atlantis"]["labelY"])
    print("sahel", by_id["sahel"]["name"], by_id["sahel"]["labelX"], by_id["sahel"]["labelY"])

    for r in recs:
        r.pop("_frac", None)
        r.pop("q", None)
        r.pop("r", None)
    hr.write_world(recs, land_edges, sea_edges)
    seat.write_preview(recs)
    print("done")


if __name__ == "__main__":
    main()
