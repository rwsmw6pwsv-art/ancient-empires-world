#!/usr/bin/env python3
"""Build a 110-province Younger Dryas world from AncientWorldMap.jpg."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
SRC = ROOT / "attachments/AncientWorldMap.jpg"
WORLD_W, WORLD_H = 1680, 1260
MAP_WEB = ROOT / "public/map/world.webp"
MAP_JPG = ROOT / "public/map/world.jpg"
PREVIEW = ROOT / "screenshots/provinces.png"
WORLD_TS = ROOT / "src/lib/game/world.ts"
LANDS_TS = ROOT / "src/lib/game/lands.gen.ts"

# id, name, continent, seed_x, seed_y (in 1600x1200 source space), kind
PROVINCES = [
    # Antarctica
    ("asgard", "Asgard", "at", 800, 1055, "mega"),
    ("ross", "Ross", "at", 1020, 1080, "mega"),
    ("weddell", "Weddell", "at", 600, 1080, "mega"),
    ("peninsula", "Peninsula", "sa", 480, 1005, "mega"),
    ("vinson", "Vinson", "at", 720, 1035, "mega"),
    ("ronne", "Ronne", "at", 680, 1120, "mega"),
    ("amundsen", "Amundsen", "at", 880, 1125, "mega"),
    ("wilkes", "Wilkes", "oc", 1470, 905, "mega"),
    ("enderby", "Enderby", "at", 940, 1005, "mega"),
    ("maud", "Maud", "at", 860, 1020, "mega"),
    # North America
    ("beringia", "Beringia", "na", 90, 185, "mega"),
    ("laurentide", "Laurentide", "na", 340, 150, "mega"),
    ("greenland", "Inland Ice", "na", 650, 140, "mega"),
    ("hudson", "Hudson", "na", 430, 200, "mega"),
    ("rockies", "Rockies", "na", 230, 270, "mega"),
    ("cascades", "Cascades", "na", 175, 245, "mega"),
    ("nord", "Nord", "na", 380, 285, "mega"),
    ("prairie", "Prairie", "na", 320, 305, "mega"),
    ("appalachia", "Appalachia", "na", 455, 285, "mega"),
    ("labrador", "Labrador", "na", 510, 205, "mega"),
    # Central America (Hawaii included)
    ("mayan", "Anahuac", "ca", 275, 430, "mega"),
    ("yucatan", "Yucatan", "ca", 355, 450, "mega"),
    ("sierra", "Sierra", "ca", 215, 400, "mega"),
    ("baja", "Baja", "ca", 195, 425, "mega"),
    ("gulf", "Warm Gulf", "ca", 325, 405, "mega"),
    ("panama", "Isthmus", "ca", 375, 505, "mega"),
    ("caribbean", "Caribbean", "ca", 430, 465, "isle"),
    ("volcan", "Mayan", "ca", 305, 485, "mega"),
    ("hawaii", "Hawaii", "ca", 95, 430, "isle"),
    ("reefs", "Reefs", "ca", 400, 495, "isle"),
    # South America
    ("eldorado", "Choco", "ca", 330, 540, "mega"),
    ("amazon", "Amazon", "sa", 440, 575, "mega"),
    ("orinoco", "Orinoco", "ca", 410, 530, "mega"),
    ("andes", "Andes", "sa", 345, 650, "mega"),
    ("cerrado", "Cerrado", "sa", 455, 640, "mega"),
    ("pantanal", "El Dorado", "sa", 400, 665, "mega"),
    ("pampas", "Pampas", "sa", 405, 725, "mega"),
    ("atacama", "Atacama", "sa", 350, 705, "mega"),
    ("patagonia", "Patagonia", "sa", 375, 805, "mega"),
    ("guiana", "Guiana", "sa", 455, 555, "mega"),
    # Europe
    ("fjords", "Fjords", "eu", 855, 155, "mega"),
    ("doggerland", "Doggerland", "eu", 785, 235, "mega"),
    ("caledonia", "Caledonia", "eu", 745, 205, "mega"),
    ("atlantis", "Atlantis", "eu", 825, 275, "mega"),
    ("alps", "Alps", "eu", 835, 305, "mega"),
    ("rhine", "Rhine", "eu", 800, 250, "mega"),
    ("gaul", "Gaul", "eu", 735, 325, "mega"),
    ("iberia", "Iberia", "eu", 755, 360, "mega"),
    ("danube", "Danube", "eu", 885, 275, "mega"),
    ("carpathian", "Carpathians", "eu", 925, 255, "mega"),
    ("baltic", "Baltic", "eu", 875, 215, "mega"),
    # North Africa
    ("egypt", "Thebes", "an", 925, 425, "mega"),
    ("nile", "Aegean", "eu", 935, 375, "mega"),
    ("greensahara", "Green Sahara", "an", 850, 425, "mega"),
    ("maghreb", "Maghreb", "an", 780, 400, "mega"),
    ("sahel", "Egypt", "an", 845, 485, "mega"),
    ("chad", "Chad", "an", 905, 475, "mega"),
    ("guinea", "Guinea", "an", 770, 505, "mega"),
    ("darfur", "Darfur", "an", 925, 475, "mega"),
    ("sirte", "Grecia", "eu", 875, 380, "mega"),
    # South Africa
    ("karoo", "Karoo", "af", 880, 680, "mega"),
    ("congo", "Congo", "an", 870, 545, "mega"),
    ("rift", "Rift", "an", 955, 575, "mega"),
    ("kalahari", "Kalahari", "af", 855, 700, "mega"),
    ("madagascar", "Madagascar", "af", 1040, 680, "isle"),
    ("drakensberg", "Drakensberg", "af", 910, 720, "mega"),
    ("namib", "Namib", "af", 815, 690, "mega"),
    ("zambezi", "Zambezi", "af", 920, 680, "mega"),
    ("kilimanjaro", "Kilimanjaro", "an", 985, 560, "mega"),
    ("okavango", "Okavango", "af", 865, 655, "mega"),
    # Middle East
    ("sumer", "Sumer", "me", 985, 375, "mega"),
    ("tigris", "Tigris", "me", 1000, 355, "mega"),
    ("arabia", "Arabia", "me", 1010, 450, "mega"),
    ("zagros", "Zagros", "me", 1050, 375, "mega"),
    ("anatolia", "Anatolia", "me", 940, 325, "mega"),
    ("levant", "Levant", "me", 960, 375, "mega"),
    ("elburz", "Elburz", "me", 1085, 355, "mega"),
    ("caucasus", "Caucasus", "me", 1025, 315, "mega"),
    ("hejaz", "Hejaz", "me", 965, 430, "mega"),
    ("oman", "Oman", "me", 1060, 430, "mega"),
    # North Asia
    ("kunlun", "Qilian", "ns", 1205, 345, "mega"),
    ("siberia", "Siberia", "ns", 1200, 175, "mega"),
    ("gobi", "Kunlun", "ns", 1290, 300, "mega"),
    ("baikal", "Baikal", "ns", 1310, 215, "mega"),
    ("yenisei", "Yenisei", "ns", 1145, 175, "mega"),
    ("amur", "Amur", "ns", 1410, 245, "mega"),
    ("fuji", "Fuji", "ns", 1455, 345, "isle"),
    ("tarim", "Tarim", "ns", 1180, 315, "mega"),
    ("altai", "Altai", "ns", 1225, 255, "mega"),
    ("kamchatka", "Kamchatka", "ns", 1510, 200, "mega"),
    # South Asia
    ("shangrila", "Kailash", "ss", 1180, 400, "mega"),
    ("himalaya", "Himalaya", "ss", 1160, 375, "mega"),
    ("ganges", "Ganges", "ss", 1140, 450, "mega"),
    ("deccan", "Deccan", "ss", 1115, 505, "mega"),
    ("mekong", "Mekong", "ss", 1285, 475, "mega"),
    ("sundaland", "Sundaland", "ss", 1355, 525, "mega"),
    ("irrawaddy", "Shangri-La", "ss", 1245, 450, "mega"),
    ("borneo", "Borneo", "ss", 1385, 545, "mega"),
    ("ghats", "Ghats", "ss", 1095, 505, "mega"),
    ("malaya", "Malaya", "ss", 1305, 565, "mega"),
    # Oceania
    ("sahul", "Sahul", "oc", 1420, 700, "mega"),
    ("outback", "Outback", "oc", 1375, 680, "mega"),
    ("barrier", "Barrier Reef", "oc", 1485, 685, "mega"),
    ("aotearoa", "Aotearoa", "oc", 1555, 765, "isle"),
    ("papua", "Papua", "oc", 1485, 605, "mega"),
    ("kimberley", "Kimberley", "oc", 1335, 650, "mega"),
    ("tasmania", "Tasmania", "oc", 1465, 785, "isle"),
    ("uluru", "Uluru", "oc", 1405, 725, "mega"),
    ("polynesia", "Polynesia", "oc", 1585, 640, "isle"),
    ("coral", "Coral", "oc", 1505, 725, "mega"),
]

CLAIM_BOX = {
    "hawaii": (40, 360, 180, 510),
    "caribbean": (390, 430, 530, 520),
    "reefs": (380, 470, 520, 540),
    "madagascar": (1010, 610, 1075, 720),
    "fuji": (1405, 310, 1505, 410),
    "aotearoa": (1510, 720, 1598, 830),
    "tasmania": (1435, 760, 1500, 820),
    "polynesia": (1540, 600, 1598, 700),
    "greenland": (560, 60, 760, 270),
}

FORCE_LAND = [
    ("beringia", "kamchatka"),
    ("iberia", "maghreb"),
    ("gaul", "iberia"),
    ("nile", "sirte"),
    ("nile", "anatolia"),
    ("anatolia", "alps"),
    ("panama", "orinoco"),
    ("malaya", "papua"),
    ("sundaland", "papua"),
    ("doggerland", "caledonia"),
    ("doggerland", "rhine"),
    ("peninsula", "patagonia"),
]

FORCE_SEA = [
    ("hawaii", "mayan"),
    ("hawaii", "sierra"),
    ("hawaii", "baja"),
    ("hawaii", "polynesia"),
    ("polynesia", "aotearoa"),
    ("polynesia", "barrier"),
    ("madagascar", "rift"),
    ("madagascar", "zambezi"),
    ("madagascar", "karoo"),
    ("aotearoa", "tasmania"),
    ("aotearoa", "coral"),
    ("caribbean", "yucatan"),
    ("caribbean", "panama"),
    ("fuji", "amur"),
    ("fuji", "gobi"),
    ("peninsula", "patagonia"),
    ("asgard", "drakensberg"),
    ("iberia", "maghreb"),
    ("caledonia", "labrador"),
    ("greenland", "fjords"),
    ("greenland", "labrador"),
    ("sahul", "namib"),
]

SX = WORLD_W / 1600.0
SY = WORLD_H / 1200.0

CONT_COLOR = {
    "at": (220, 240, 255),
    "na": (90, 160, 220),
    "ca": (220, 70, 70),
    "sa": (230, 150, 50),
    "eu": (40, 190, 190),
    "an": (230, 200, 70),
    "af": (50, 170, 80),
    "me": (180, 110, 220),
    "ns": (70, 110, 200),
    "ss": (230, 80, 160),
    "oc": (255, 130, 90),
}

CAPITALS = {
    "asgard", "nord", "volcan", "pantanal", "atlantis", "sahel",
    "karoo", "sumer", "gobi", "irrawaddy", "sahul",
}

WONDER = {
    "asgard": "icewall",
    "nord": "meadhall",
    "volcan": "teocalli",
    "pantanal": "eldorado",
    "atlantis": "pantheon",
    "sahel": "pyramids",
    "karoo": "lighthouse",
    "sumer": "gardens",
    "gobi": "pagoda",
    "irrawaddy": "stupa",
    "sahul": "reefshrine",
}

FAUNA = {
    "at": "penguin",
    "na": "bison",
    "ca": "jaguar",
    "sa": "caiman",
    "eu": "boar",
    "an": "lion",
    "af": "hippo",
    "me": "camel",
    "ns": "siberian-tiger",
    "ss": "rhino",
    "oc": "kangaroo",
}

RES = ["gold", "silver", "wood", "stone", "metal", "food"]


def continent_at(x: float, y: float) -> str | None:
    """Hard envelopes in 1600x1200 source space."""
    # Antarctic peninsula belongs to South America.
    if 390 <= x <= 535 and 885 <= y <= 1030:
        return "sa"
    # Wilkes faces Australia.
    if x >= 1435 and y >= 880:
        return "oc"
    if y >= 895:
        return "at"
    if x <= 175 and 350 <= y <= 520:
        return "ca"
    if 555 <= x <= 770 and y <= 275:
        return "na"
    if x < 585:
        if y >= 575:
            return "sa"
        if y >= 375:
            return "ca"
        return "na"
    if x >= 1288 and y >= 618:
        return "oc"
    if x >= 1460 and y >= 555:
        return "oc"
    # Europe includes Iberia, Grecia and the Aegean.
    if 660 <= x <= 1005 and y <= 398:
        return "eu"
    # Madagascar
    if 1015 <= x <= 1080 and 600 <= y <= 730:
        return "af"
    # South Africa only the bottom half of the continent.
    if 700 <= x <= 1075 and y >= 600:
        return "af"
    if 900 <= x <= 1128 and 275 <= y <= 512:
        return "me"
    # North Africa: Sahara plus the equatorial belt the south no longer claims.
    if 680 <= x <= 1075 and 350 <= y <= 620:
        return "an"
    if x >= 1095 and 392 <= y <= 618:
        return "ss"
    if 1075 <= x <= 1475 and 430 <= y <= 615:
        return "ss"
    if x >= 980 and y <= 405:
        return "ns"
    if x >= 1120 and y <= 430:
        return "ns"
    return None


def land_mask(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    ocean = (b > r + 12) & (b > g - 8) & (b > 70)
    land = (~ocean).astype(np.uint8)
    land = cv2.morphologyEx(land, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    return land


def snap_seed(land: np.ndarray, x: int, y: int) -> tuple[int, int]:
    h, w = land.shape
    x = int(np.clip(x, 0, w - 1))
    y = int(np.clip(y, 0, h - 1))
    if land[y, x]:
        return x, y
    yy, xx = np.where(land)
    if len(xx) == 0:
        return x, y
    d = (xx - x) ** 2 + (yy - y) ** 2
    i = int(np.argmin(d))
    return int(xx[i]), int(yy[i])


def contour_path(mask: np.ndarray) -> str:
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
    parts: list[str] = []
    for c in cnts:
        if cv2.contourArea(c) < 18:
            continue
        eps = max(1.4, 0.0022 * cv2.arcLength(c, True))
        approx = cv2.approxPolyDP(c, eps, True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2)
        parts.append("M" + "L".join(f"{float(x):.1f},{float(y):.1f}" for x, y in pts) + "Z")
    return "".join(parts)


def terrain_for(mean: np.ndarray, cont: str) -> str:
    r, g, b = (float(x) for x in mean)
    bright = (r + g + b) / 3
    if cont == "at" or bright > 205:
        return "ice"
    if r > 180 and g > 170 and b > 160 and bright > 170:
        return "tundra"
    if g > r + 8 and g > 90:
        if g > 130 and r < 100:
            return "jungle"
        if bright < 90:
            return "forest"
        return "grass"
    if r > 140 and g > 110 and b < 110:
        if r > 170:
            return "desert"
        return "savanna"
    if abs(r - g) < 25 and bright < 130:
        return "mountain"
    if cont in ("an", "af", "me") and r > 120:
        return "savanna"
    if cont == "eu":
        return "grass"
    if cont == "oc":
        return "savanna"
    return "steppe"


def main() -> None:
    assert len(PROVINCES) == 110, len(PROVINCES)
    ids = [p[0] for p in PROVINCES]
    assert len(set(ids)) == 110
    names = [p[1] for p in PROVINCES]
    assert len(set(names)) == 110, [n for n in names if names.count(n) > 1]
    by_c: dict[str, int] = defaultdict(int)
    for p in PROVINCES:
        by_c[p[2]] += 1
    assert by_c == {k: 10 for k in CONT_COLOR}, dict(by_c)

    src = Image.open(SRC).convert("RGB")
    hi = src.resize((WORLD_W * 2, WORLD_H * 2), Image.Resampling.LANCZOS)
    hi.save(MAP_WEB, "WEBP", quality=90, method=6)
    hi.save(MAP_JPG, "JPEG", quality=92, optimize=True)
    img = src.resize((WORLD_W, WORLD_H), Image.Resampling.LANCZOS)
    rgb = np.asarray(img)
    land = land_mask(rgb)
    h, w = land.shape

    env = np.full((h, w), -1, np.int16)
    cont_index = {c: i for i, c in enumerate(CONT_COLOR)}
    index_cont = {i: c for c, i in cont_index.items()}
    ys, xs = np.ogrid[:h, :w]
    # vectorized-ish loop on downsample
    step = 1
    for y in range(0, h, step):
        for x in range(0, w, step):
            if not land[y, x]:
                continue
            sx, sy = x / SX, y / SY
            c = continent_at(sx, sy)
            if c:
                env[y, x] = cont_index[c]
    # fill leftover land from nearest envelope
    assigned = env >= 0
    if np.any(land & ~assigned):
        yy, xx = np.where(assigned)
        leftover = np.argwhere(land & ~assigned)
        for y, x in leftover:
            d = (xx - x) ** 2 + (yy - y) ** 2
            env[y, x] = env[int(yy[d.argmin()]), int(xx[d.argmin()])]

    n = len(PROVINCES)
    seeds = np.zeros((n, 2), np.int32)
    kinds = []
    for i, (pid, name, cont, x0, y0, kind) in enumerate(PROVINCES):
        x, y = snap_seed(land, int(x0 * SX), int(y0 * SY))
        # keep seed on its continent when possible
        if env[y, x] != cont_index[cont]:
            yy, xx = np.where((env == cont_index[cont]) & land)
            if len(xx):
                d = (xx - x) ** 2 + (yy - y) ** 2
                j = int(np.argmin(d))
                x, y = int(xx[j]), int(yy[j])
        seeds[i] = (x, y)
        kinds.append(kind)

    owner = np.full((h, w), -1, np.int16)
    # island claim boxes first
    id_of = {p[0]: i for i, p in enumerate(PROVINCES)}
    for pid, box in CLAIM_BOX.items():
        if pid not in id_of:
            continue
        i = id_of[pid]
        x0, y0, x1, y1 = box
        x0, x1 = int(x0 * SX), int(x1 * SX)
        y0, y1 = int(y0 * SY), int(y1 * SY)
        sub = land[y0:y1, x0:x1]
        owner[y0:y1, x0:x1][sub > 0] = i

    # nearest-seed within continent (Lloyd)
    for _round in range(6):
        for ci, cont in enumerate(CONT_COLOR):
            mask = (env == ci) & land
            yy, xx = np.where(mask)
            if len(xx) == 0:
                continue
            idxs = [i for i, p in enumerate(PROVINCES) if p[2] == cont]
            pts = seeds[idxs].astype(np.float32)
            # skip pixels already claimed by isle boxes of other continents
            pix = np.stack([xx, yy], 1).astype(np.float32)
            # distances
            dmin = np.full(len(xx), 1e18, np.float32)
            arg = np.full(len(xx), idxs[0], np.int32)
            for local, gi in enumerate(idxs):
                if kinds[gi] == "isle" and PROVINCES[gi][0] in CLAIM_BOX:
                    continue
                dx = pix[:, 0] - pts[local, 0]
                dy = pix[:, 1] - pts[local, 1]
                d = dx * dx + dy * dy
                better = d < dmin
                dmin[better] = d[better]
                arg[better] = gi
            # don't overwrite dedicated isle claims
            current = owner[yy, xx]
            isle_lock = np.zeros(len(xx), dtype=bool)
            for gi in idxs:
                if kinds[gi] == "isle" and PROVINCES[gi][0] in CLAIM_BOX:
                    isle_lock |= current == gi
            take = ~isle_lock
            owner[yy[take], xx[take]] = arg[take]
        # relocate seeds to centroids
        for i in range(n):
            yy, xx = np.where(owner == i)
            if len(xx) == 0:
                continue
            seeds[i] = (int(xx.mean()), int(yy.mean()))

    # drop empty
    areas = [(i, int((owner == i).sum())) for i in range(n)]
    empty = [PROVINCES[i][0] for i, a in areas if a < 30]
    if empty:
        print("EMPTY", empty)

    # paths, centroids, coastal
    records = []
    for i, (pid, name, cont, *_rest) in enumerate(PROVINCES):
        mask = (owner == i).astype(np.uint8)
        area = int(mask.sum())
        path = contour_path(mask)
        yy, xx = np.where(mask)
        if len(xx) == 0:
            lx, ly = int(seeds[i][0]), int(seeds[i][1])
            coastal = True
            mean = np.array([200, 200, 200])
        else:
            lx, ly = float(xx.mean()), float(yy.mean())
            dil = cv2.dilate(mask, np.ones((5, 5), np.uint8))
            ring = dil & ~mask
            coastal = bool(((land == 0) & ring).any())
            mean = rgb[yy, xx].mean(axis=0)
        records.append({
            "id": pid,
            "name": name,
            "continent": cont,
            "coastal": coastal,
            "path": path or f"M{seeds[i][0]},{seeds[i][1]}l8,0l0,8l-8,0Z",
            "labelX": round(float(lx), 1),
            "labelY": round(float(ly), 1),
            "area": area,
            "terrain": terrain_for(mean, cont),
            "resource": RES[i % len(RES)],
            "fauna": FAUNA[cont],
            "wonder": WONDER.get(pid),
        })

    # land adjacency
    land_edges: set[tuple[str, str]] = set()
    for y in range(1, h - 1):
        row = owner[y]
        above = owner[y - 1]
        for x in range(1, w - 1):
            a = int(row[x])
            if a < 0:
                continue
            for b in (int(row[x + 1]), int(above[x])):
                if b < 0 or b == a:
                    continue
                u, v = (a, b) if a < b else (b, a)
                land_edges.add((PROVINCES[u][0], PROVINCES[v][0]))

    sea_edges: set[tuple[str, str]] = set()
    ocean = (land == 0).astype(np.uint8)
    near = cv2.dilate(ocean, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    coastal_pix = defaultdict(list)
    for i, rec in enumerate(records):
        if not rec["coastal"]:
            continue
        m = (owner == i) & near.astype(bool)
        yy, xx = np.where(m)
        if len(xx) == 0:
            continue
        coastal_pix[rec["id"]] = (xx[::8], yy[::8])
    ids_c = list(coastal_pix)
    for i in range(len(ids_c)):
        ax, ay = coastal_pix[ids_c[i]]
        if len(ax) == 0:
            continue
        for j in range(i + 1, len(ids_c)):
            bx, by = coastal_pix[ids_c[j]]
            # cheap min distance via bbox then sample
            if abs(float(ax.mean()) - float(bx.mean())) > 280 and abs(float(ay.mean()) - float(by.mean())) > 220:
                continue
            # subsample
            a = np.stack([ax[::3], ay[::3]], 1)
            b = np.stack([bx[::3], by[::3]], 1)
            if len(a) == 0 or len(b) == 0:
                continue
            # min dist
            mind = 1e9
            for px, py in a[:: max(1, len(a)//40)]:
                d = (b[:, 0] - px) ** 2 + (b[:, 1] - py) ** 2
                mind = min(mind, float(d.min()))
            if mind ** 0.5 < 70:
                u, v = sorted((ids_c[i], ids_c[j]))
                sea_edges.add((u, v))

    def add_pair(store: set[tuple[str, str]], a: str, b: str):
        if a in id_of and b in id_of:
            store.add(tuple(sorted((a, b))))  # type: ignore

    for a, b in FORCE_LAND:
        add_pair(land_edges, a, b)
        sea_edges.discard(tuple(sorted((a, b))))  # type: ignore
    for a, b in FORCE_SEA:
        add_pair(sea_edges, a, b)

    # write world.ts
    recs_js = []
    for r in records:
        recs_js.append(
            "  {\n"
            f'    "id": {json.dumps(r["id"])},\n'
            f'    "name": {json.dumps(r["name"])},\n'
            f'    "continent": {json.dumps(r["continent"])},\n'
            f'    "coastal": {str(r["coastal"]).lower()},\n'
            f'    "path": {json.dumps(r["path"])},\n'
            f'    "labelX": {r["labelX"]},\n'
            f'    "labelY": {r["labelY"]}\n'
            "  }"
        )
    land_list = ", ".join(f'["{a}", "{b}"]' for a, b in sorted(land_edges))
    sea_list = ", ".join(f'["{a}", "{b}"]' for a, b in sorted(sea_edges))
    WORLD_TS.write_text(
        'import type { TerritoryDef } from "./types";\n'
        'import { CAPITOL } from "./types";\n\n'
        f"export const WORLD_W = {WORLD_W};\n"
        f"export const WORLD_H = {WORLD_H};\n\n"
        "export const TERRITORIES: TerritoryDef[] = [\n"
        + ",\n".join(recs_js)
        + "\n];\n\n"
        "export const TERRITORY_BY_ID: Record<string, TerritoryDef> = Object.fromEntries(\n"
        "  TERRITORIES.map((t) => [t.id, t]),\n"
        ");\n\n"
        "/** Independent tribes. Every land that is not a capital starts tribal. */\n"
        "export const BARBARIAN_IDS: readonly string[] = TERRITORIES.map((t) => t.id).filter(\n"
        "  (id) => !Object.values(CAPITOL).includes(id),\n"
        ");\n\n"
        "export const BARBARIAN_SET = new Set<string>(BARBARIAN_IDS);\n\n"
        f"const LAND_EDGES: [string, string][] = [{land_list}] as [string, string][];\n"
        f"const SEA_EDGES: [string, string][] = [{sea_list}] as [string, string][];\n\n"
        "function undirected(edges: [string, string][]) {\n"
        "  const map = new Map<string, Set<string>>();\n"
        "  const add = (a: string, b: string) => {\n"
        "    if (!map.has(a)) map.set(a, new Set());\n"
        "    map.get(a)!.add(b);\n"
        "  };\n"
        "  for (const [a, b] of edges) { add(a, b); add(b, a); }\n"
        "  return map;\n"
        "}\n\n"
        "export const LAND_NEIGHBORS = undirected(LAND_EDGES);\n"
        "export const SEA_NEIGHBORS = undirected(SEA_EDGES);\n\n"
        "export function landNeighbors(id: string): string[] {\n"
        "  return [...(LAND_NEIGHBORS.get(id) ?? [])];\n"
        "}\n\n"
        "export function seaNeighbors(id: string): string[] {\n"
        "  return [...(SEA_NEIGHBORS.get(id) ?? [])];\n"
        "}\n\n"
        "export function continentTerritories(continent: string) {\n"
        "  return TERRITORIES.filter((t) => t.continent === continent);\n"
        "}\n"
    )

    # landscape gen
    lines = ["import type { LandscapeDef } from \"./landscape\";\n", "export const LANDSCAPE: Record<string, LandscapeDef> = {\n"]
    for r in records:
        extra = ""
        if r["wonder"]:
            extra = f', wonder: "{r["wonder"]}"'
        # capital fauna override
        fauna = r["fauna"]
        if r["id"] == "asgard":
            fauna = "penguin"
        if r["id"] == "nord":
            fauna = "bison"
        lines.append(
            f'  {r["id"]}: {{ terrain: "{r["terrain"]}", resource: "{r["resource"]}"{extra}, fauna: "{fauna}" }},\n'
        )
    lines.append("};\n\n")
    lines.append("export const OCEAN_LABELS: { name: string; x: number; y: number }[] = [\n")
    lines.append('  { name: "ARCTIC OCEAN", x: 780, y: 40 },\n')
    lines.append('  { name: "PACIFIC OCEAN", x: 90, y: 520 },\n')
    lines.append('  { name: "PACIFIC OCEAN", x: 1580, y: 480 },\n')
    lines.append('  { name: "ATLANTIC OCEAN", x: 560, y: 480 },\n')
    lines.append('  { name: "INDIAN OCEAN", x: 1180, y: 720 },\n')
    lines.append('  { name: "SOUTHERN OCEAN", x: 840, y: 920 },\n')
    lines.append("];\n")
    LANDS_TS.write_text("".join(lines))

    # preview
    vis = img.convert("RGBA")
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    rng = np.random.default_rng(7)
    for i, r in enumerate(records):
        col = CONT_COLOR[r["continent"]]
        tint = (*[int(c * 0.75 + rng.integers(-20, 20)) for c in col], 110)
        mask = Image.fromarray((owner == i).astype(np.uint8) * 255, "L")
        layer = Image.new("RGBA", vis.size, tint)
        overlay.paste(layer, mask=mask)
    vis = Image.alpha_composite(vis, overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    for r in records:
        d.text((r["labelX"] - 18, r["labelY"] - 6), r["name"], fill=(20, 20, 20, 255), font=font)
    vis.convert("RGB").save(PREVIEW)
    print("provinces", len(records), "land_edges", len(land_edges), "sea_edges", len(sea_edges))
    print("areas min/max/mean", min(r["area"] for r in records), max(r["area"] for r in records), int(np.mean([r["area"] for r in records])))
    for c in CONT_COLOR:
        aa = [r["area"] for r in records if r["continent"] == c]
        print(c, "n", len(aa), "area", sum(aa))
    empty_path = [r["id"] for r in records if not r["path"] or r["area"] < 40]
    print("weak", empty_path)
    inland = [r["id"] for r in records if not r["coastal"]]
    print("inland", inland)


if __name__ == "__main__":
    main()
