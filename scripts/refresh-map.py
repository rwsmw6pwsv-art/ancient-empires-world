#!/usr/bin/env python3
"""Strip old 65-province ink from the painted map and retitle the 100 lands.

Keeps the current Voronoi borders. Does not move terrain. Capitals keep their ids;
Mexico City is swapped onto the Aztec seat, and a few capital labels are nudged
onto the city they name.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path("/workspace")
WORLD_TS = ROOT / "src/lib/game/world.ts"
ORIG_TS = ROOT / "scripts/world-orig-65.ts"
WEBP = ROOT / "public/map/world.webp"
JPG = ROOT / "public/map/world.jpg"
BACKUP = ROOT / "artifacts/world-with-borders.webp"

NAMES = {
    "alaska": "Alaska",
    "aleut": "Aleutians",
    "yukon": "Yukon",
    "mackenzie": "Mackenzie",
    "hudson": "Hudson",
    "ontario": "Ontario",
    "labrador": "Labrador",
    "acadia": "Acadia",
    "greenland": "Greenland",
    "baffin": "Baffin",
    "cascade": "Cascadia",
    "columbia": "Columbia",
    "prairie": "Prairie",
    "dakota": "Dakota",
    "heartland": "Midwest",
    "lakes": "Great Lakes",
    "seaboard": "Atlantic",
    "florida": "Florida",
    "hawaii": "Hawaii",
    "texas": "Texas",
    "sierra": "California",
    "baja": "Baja",
    "mexico": "Mexico",
    "oaxaca": "Sonora",
    "yucatan": "Yucatan",
    "panama": "Panama",
    "caribbean": "Caribbean",
    "grenada": "Colombia",
    "amazon": "Amazon",
    "guiana": "Guiana",
    "andes": "Andes",
    "atacama": "Atacama",
    "cerrado": "Cerrado",
    "pantanal": "Pantanal",
    "brazil": "Brazil",
    "pampas": "Pampas",
    "plata": "Plata",
    "araucania": "Chile",
    "patagonia": "Patagonia",
    "fjords": "Scandinavia",
    "highlands": "Britain",
    "gaul": "France",
    "rhine": "Germany",
    "iberia": "Spain",
    "roma": "Rome",
    "balkans": "Greece",
    "slavic": "Poland",
    "ruthenia": "Ukraine",
    "volga": "Volga",
    "ural": "Urals",
    "maghreb": "Morocco",
    "sahara": "Sahara",
    "nile": "Egypt",
    "guinea": "Guinea",
    "sahel": "Sahel",
    "congo": "Congo",
    "kasai": "Kasai",
    "horn": "Sudan",
    "somali": "Somalia",
    "rift": "Kenya",
    "nyasa": "Nyasa",
    "namib": "Namibia",
    "cape": "Cape",
    "madagascar": "Madagascar",
    "anatolia": "Anatolia",
    "armenia": "Caucasus",
    "mesopotamia": "Babylon",
    "hejaz": "Levant",
    "arabia": "Arabia",
    "gulf": "Gulf",
    "persia": "Persia",
    "media": "Media",
    "steppe": "Kazakh",
    "altai": "Altai",
    "siberia": "Siberia",
    "baikal": "Baikal",
    "yakutia": "Yakutia",
    "chukotka": "Chukotka",
    "gobi": "Gobi",
    "tarim": "Tarim",
    "korea": "Korea",
    "nippon": "Japan",
    "cathay": "China",
    "jiangnan": "Jiangnan",
    "canton": "Canton",
    "yunnan": "Yunnan",
    "himalaya": "Himalaya",
    "india": "India",
    "burma": "Burma",
    "indochina": "Indochina",
    "malaya": "Malaya",
    "papua": "Papua",
    "kimberley": "Kimberley",
    "westralia": "Westralia",
    "outback": "Outback",
    "nullarbor": "Nullarbor",
    "coral": "Queensland",
    "tasmania": "Tasmania",
    "aotearoa": "Aotearoa",
    "polynesia": "Polynesia",
}

# Capital (and a few wayward) labels: world-space, snapped onto the cell.
LABEL_AT = {
    "nile": (950.0, 405.0),
    "roma": (864.0, 306.0),
    "mexico": (320.0, 421.0),
    "alaska": (107.0, 217.0),
    "cathay": (1355.0, 319.0),
    "india": (1169.0, 413.0),
    "greenland": (609.0, 117.0),
    "cape": (905.0, 683.0),
    "coral": (1486.0, 712.0),
    "mesopotamia": (1005.0, 345.0),
    "amazon": (516.0, 573.0),
    "highlands": (731.0, 224.0),
    "nippon": (1445.0, 360.0),
}


def parse_territories(path: Path):
    text = path.read_text()
    ids = re.findall(r'"id": "([^"]+)"', text)
    names = re.findall(r'"name": "([^"]+)"', text)
    conts = re.findall(r'"continent": "([^"]+)"', text)
    coasts = re.findall(r'"coastal": (true|false)', text)
    labels = [
        (float(a), float(b))
        for a, b in re.findall(r'"labelX": ([0-9.]+),\s*"labelY": ([0-9.]+)', text)
    ]
    paths = re.findall(r'"path": "([^"]+)"', text)
    n = min(len(ids), len(names), len(conts), len(coasts), len(labels), len(paths))
    return [
        {
            "id": ids[i],
            "name": names[i],
            "continent": conts[i],
            "coastal": coasts[i] == "true",
            "label": labels[i],
            "path": paths[i],
        }
        for i in range(n)
    ]


def polys_of(d: str, scale: float = 1.0):
    parts = re.split(r"(?=[MLZ])", d)
    polys, cur = [], []
    for p in parts:
        if not p:
            continue
        cmd, rest = p[0], p[1:]
        nums = [float(x) for x in re.findall(r"-?\d+\.?\d*", rest)]
        pts = [(x * scale, y * scale) for x, y in zip(nums[0::2], nums[1::2])]
        if cmd == "M":
            if len(cur) >= 2:
                polys.append(np.array(cur, np.int32))
            cur = list(pts)
        elif cmd == "L":
            cur.extend(pts)
        elif cmd == "Z":
            if len(cur) >= 2:
                polys.append(np.array(cur, np.int32))
            cur = []
    if len(cur) >= 2:
        polys.append(np.array(cur, np.int32))
    return polys


def inside(t, x, y) -> bool:
    pt = np.array([[x, y]], np.float32)
    for poly in polys_of(t["path"]):
        if cv2.pointPolygonTest(poly.astype(np.float32), (float(x), float(y)), False) >= 0:
            return True
    return False


def snap_label(t, x, y):
    if inside(t, x, y):
        return float(x), float(y)
    # walk toward the existing label
    lx, ly = t["label"]
    for a in (1.0, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1):
        sx = x * a + lx * (1 - a)
        sy = y * a + ly * (1 - a)
        if inside(t, sx, sy):
            return round(sx, 1), round(sy, 1)
    return t["label"]


def strip_old_ink(rgb: np.ndarray, orig) -> np.ndarray:
    h, w = rgb.shape[:2]
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    land = (((g + b) / 2 - r) < 35).astype(np.uint8) * 255
    interior = cv2.erode(land, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    closed = cv2.morphologyEx(
        gray, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    )
    gap = cv2.subtract(closed, gray)

    stroke = np.zeros((h, w), np.uint8)
    for _id, _name, (_lx, _ly), d in orig:
        for poly in polys_of(d, 2.0):
            cv2.polylines(stroke, [poly], True, 255, 5, cv2.LINE_8)
    dark = (gap > 12).astype(np.uint8) * 255
    borders = cv2.bitwise_and(stroke, interior)
    borders = cv2.bitwise_and(borders, cv2.dilate(dark, np.ones((5, 5), np.uint8)))

    # Letter-sized dark blobs (painted 65 names), not terrain grain and not cities.
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat = hsv[:, :, 1]
    letter_bin = ((gap > 22) & (interior > 0) & (sat < 90)).astype(np.uint8) * 255
    n, lab, stats, _ = cv2.connectedComponentsWithStats(letter_bin, 8)
    letters = np.zeros((h, w), np.uint8)
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area < 20 or area > 2200:
            continue
        if bh < 7 or bh > 48 or bw < 3 or bw > 70:
            continue
        letters[lab == i] = 255
    letters = cv2.dilate(letters, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))

    # Tight ellipses on original labels, gated to actual dark ink.
    named = np.zeros((h, w), np.uint8)
    for _id, _name, (lx, ly), _d in orig:
        cx, cy = int(lx * 2), int(ly * 2)
        cv2.ellipse(named, (cx, cy), (120, 36), 0, 0, 360, 255, -1)
    named = cv2.bitwise_and(named, land)
    named = cv2.bitwise_and(named, cv2.dilate((gap > 18).astype(np.uint8) * 255, np.ones((3, 3), np.uint8)))

    mask = cv2.bitwise_or(borders, letters)
    mask = cv2.bitwise_or(mask, named)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    # Never chew colourful city markers.
    mask[sat > 130] = 0
    print("inpaint mask", int((mask > 0).sum()), "borders", int((borders > 0).sum()), "letters", int((letters > 0).sum()))

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    out = cv2.inpaint(bgr, mask, 3, cv2.INPAINT_TELEA)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB)


def swap_pair(items, a: str, b: str, keys):
    ia = next(i for i, t in enumerate(items) if t["id"] == a)
    ib = next(i for i, t in enumerate(items) if t["id"] == b)
    for k in keys:
        items[ia][k], items[ib][k] = items[ib][k], items[ia][k]


def relabel_edges(edges, a: str, b: str):
    sub = {a: b, b: a}

    def f(x):
        return sub.get(x, x)

    out = []
    seen = set()
    for u, v in edges:
        p = tuple(sorted((f(u), f(v))))
        if p[0] == p[1] or p in seen:
            continue
        seen.add(p)
        out.append(list(p))
    out.sort()
    return out


def write_world(cur, land_edges, sea_edges, tail: str):
    chunks = ["import type { TerritoryDef } from \"./types\";\nimport { CAPITOL } from \"./types\";\n\nexport const WORLD_W = 1680;\nexport const WORLD_H = 920;\n\nexport const TERRITORIES: TerritoryDef[] = [\n"]
    for t in cur:
        chunks.append("  {\n")
        chunks.append(f'    "id": "{t["id"]}",\n')
        chunks.append(f'    "name": "{t["name"]}",\n')
        chunks.append(f'    "continent": "{t["continent"]}",\n')
        chunks.append(f'    "coastal": {"true" if t["coastal"] else "false"},\n')
        chunks.append(f'    "path": "{t["path"]}",\n')
        chunks.append(f'    "labelX": {t["label"][0]:.1f},\n')
        chunks.append(f'    "labelY": {t["label"][1]:.1f}\n')
        chunks.append("  },\n")
    chunks[-1] = chunks[-1].replace("},\n", "}\n", 1)
    chunks.append("];\n")
    le = json.dumps(land_edges, separators=(", ", ": "))
    se = json.dumps(sea_edges, separators=(", ", ": "))
    # rest of file from TERRITORY_BY_ID, with edges replaced
    rest = tail
    rest = re.sub(
        r"const LAND_EDGES: \[string, string\]\[\] = \[.*?\];",
        "const LAND_EDGES: [string, string][] = " + le + " as [string, string][];",
        rest,
        count=1,
        flags=re.S,
    )
    rest = re.sub(
        r"const SEA_EDGES: \[string, string\]\[\] = \[.*?\];",
        "const SEA_EDGES: [string, string][] = " + se + " as [string, string][];",
        rest,
        count=1,
        flags=re.S,
    )
    WORLD_TS.write_text("".join(chunks) + "\n" + rest)


def extract_tail(text: str) -> str:
    m = re.search(r"export const TERRITORY_BY_ID", text)
    if not m:
        raise SystemExit("tail not found")
    return text[m.start() :]


def extract_edges(text: str, name: str):
    m = re.search(rf"const {name}: \[string, string\]\[\] = (\[.*?\])(?: as \[string, string\]\[\])?;", text, re.S)
    if not m:
        raise SystemExit(f"no {name}")
    raw = m.group(1)
    return json.loads(raw)


def main():
    if not BACKUP.exists():
        BACKUP.write_bytes(WEBP.read_bytes())
        print("backed up", BACKUP)

    orig_rows = parse_territories(ORIG_TS)
    orig = [(t["id"], t["name"], t["label"], t["path"]) for t in orig_rows]

    rgb = np.array(Image.open(WEBP).convert("RGB"))
    stripped = strip_old_ink(rgb, orig)
    Image.fromarray(stripped).save(WEBP, "WEBP", quality=92, method=6)
    Image.fromarray(stripped).save(JPG, "JPEG", quality=92)
    print("wrote", WEBP, JPG)

    text = WORLD_TS.read_text()
    cur = parse_territories(WORLD_TS)
    # First 100 ids only (TERRITORIES), parse_territories also sees nothing else with those keys
    assert len(cur) == 100, len(cur)

    swap_pair(cur, "mexico", "oaxaca", ["path", "coastal", "continent", "label"])
    by = {t["id"]: t for t in cur}

    for t in cur:
        t["name"] = NAMES[t["id"]]
        if t["id"] in LABEL_AT:
            t["label"] = snap_label(t, *LABEL_AT[t["id"]])

    land = extract_edges(text, "LAND_EDGES")
    sea = extract_edges(text, "SEA_EDGES")
    land = relabel_edges(land, "mexico", "oaxaca")
    sea = relabel_edges(sea, "mexico", "oaxaca")

    write_world(cur, land, sea, extract_tail(text))
    print("wrote", WORLD_TS)
    print("mexico", by["mexico"]["label"], "oaxaca", by["oaxaca"]["label"])
    print("nile", by["nile"]["label"], by["nile"]["name"])
    print("roma", by["roma"]["name"], by["roma"]["label"])
    print("highlands", by["highlands"]["name"], by["highlands"]["label"])


if __name__ == "__main__":
    main()
