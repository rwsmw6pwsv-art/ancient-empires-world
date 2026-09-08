#!/usr/bin/env python3
"""Rebuild compact, continent-pure province borders from the painted world map.

Does not move public/map/world.webp. Capitals keep their ids. 100 named lands.
"""
from __future__ import annotations

import heapq
import json
import re
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
WORLD_W, WORLD_H = 1680, 920
SRC = ROOT / "src/lib/game/world.ts"
MAP = ROOT / "public/map/world.webp"
PREVIEW = Path("/tmp/provinces.png")
PREVIEW2 = ROOT / "screenshots/provinces.png"

CONT_CODE = {"na": 1, "ca": 2, "sa": 3, "eu": 4, "af": 5, "me": 6, "as": 7, "oc": 8}
CONT_NAME = {v: k for k, v in CONT_CODE.items()}

ISLAND = {
    "hawaii",
    "polynesia",
    "tasmania",
    "aotearoa",
    "madagascar",
    "caribbean",
    "highlands",
    "nippon",
}
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

# Gameplay land bridges (strait hops the tests and AI expect).
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
    # Split-pair backups so halves stay adjacent even if a third cell wedges in.
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
    ("polynesia", "papua"),
    ("madagascar", "cape"),
    ("madagascar", "rift"),
    ("madagascar", "nyasa"),
    ("madagascar", "horn"),
    ("highlands", "gaul"),
    ("highlands", "fjords"),
    ("highlands", "iberia"),
    ("highlands", "acadia"),
    ("caribbean", "yucatan"),
    ("caribbean", "florida"),
    ("caribbean", "panama"),
    ("caribbean", "seaboard"),
    ("aotearoa", "coral"),
    ("aotearoa", "tasmania"),
    ("tasmania", "coral"),
    ("tasmania", "nullarbor"),
]

# id, name, continent, seed_x, seed_y, kind ('mega' | 'isle' | 'any')
# Seeds sit on painted land of the intended mass — not ocean scraps.
PROVINCES = [
    # NA
    ("alaska", "Alaska", "na", 150, 210, "mega"),
    ("aleut", "Aleut", "na", 62, 220, "mega"),
    ("yukon", "Yukon", "na", 220, 195, "mega"),
    ("mackenzie", "Mackenzie", "na", 290, 185, "mega"),
    ("hudson", "Hudson", "na", 370, 165, "mega"),
    ("ontario", "Ontario", "na", 385, 195, "mega"),
    ("labrador", "Labrador", "na", 470, 195, "mega"),
    ("acadia", "Acadia", "na", 500, 210, "mega"),
    ("greenland", "Greenland", "na", 616, 130, "mega"),
    ("baffin", "Baffin", "na", 429, 84, "isle"),
    ("cascade", "Cascadia", "na", 210, 270, "mega"),
    ("columbia", "Columbia", "na", 265, 258, "mega"),
    ("prairie", "Prairie", "na", 345, 250, "mega"),
    ("dakota", "Dakota", "na", 310, 250, "mega"),
    ("heartland", "Heartland", "na", 360, 305, "mega"),
    ("lakes", "Lakes", "na", 410, 310, "mega"),
    ("seaboard", "Seaboard", "na", 470, 290, "mega"),
    ("florida", "Florida", "na", 455, 355, "mega"),
    # CA
    ("hawaii", "Hawaii", "ca", 66, 475, "isle"),
    ("texas", "Texas", "ca", 360, 355, "mega"),
    ("sierra", "Sierra", "ca", 250, 310, "mega"),
    ("baja", "Baja", "ca", 255, 370, "mega"),
    ("mexico", "Mexico", "ca", 320, 395, "mega"),
    ("oaxaca", "Oaxaca", "ca", 325, 445, "mega"),
    ("yucatan", "Yucatan", "ca", 395, 410, "mega"),
    ("panama", "Panama", "ca", 392, 487, "mega"),
    ("caribbean", "Caribbean", "ca", 433, 470, "isle"),
    # SA
    ("grenada", "Granada", "sa", 455, 540, "mega"),
    ("amazon", "Amazon", "sa", 500, 580, "mega"),
    ("guiana", "Guiana", "sa", 530, 545, "mega"),
    ("andes", "Andes", "sa", 455, 640, "mega"),
    ("atacama", "Atacama", "sa", 450, 700, "mega"),
    ("cerrado", "Cerrado", "sa", 555, 600, "mega"),
    ("pantanal", "Pantanal", "sa", 540, 650, "mega"),
    ("brazil", "Brazil", "sa", 600, 640, "mega"),
    ("pampas", "Pampas", "sa", 530, 710, "mega"),
    ("plata", "Plata", "sa", 505, 760, "mega"),
    ("araucania", "Araucania", "sa", 470, 780, "mega"),
    ("patagonia", "Patagonia", "sa", 460, 830, "mega"),
    # EU
    ("fjords", "Fjords", "eu", 900, 185, "mega"),
    ("highlands", "Highlands", "eu", 713, 216, "isle"),
    ("gaul", "Gaul", "eu", 832, 242, "mega"),
    ("rhine", "Rhine", "eu", 878, 200, "mega"),
    ("iberia", "Iberia", "eu", 800, 318, "mega"),
    ("roma", "Graecia", "eu", 844, 302, "mega"),
    ("balkans", "Balkans", "eu", 920, 270, "mega"),
    ("slavic", "Slavic", "eu", 930, 220, "mega"),
    ("ruthenia", "Ruthenia", "eu", 970, 245, "mega"),
    ("volga", "Volga", "eu", 1020, 220, "mega"),
    ("ural", "Ural", "eu", 1080, 195, "mega"),
    # AF
    ("maghreb", "Maghreb", "af", 804, 340, "mega"),
    ("sahara", "Sahara", "af", 849, 400, "mega"),
    ("nile", "Egypt", "af", 932, 380, "mega"),
    ("guinea", "Guinea", "af", 770, 490, "mega"),
    ("sahel", "Sahel", "af", 840, 480, "mega"),
    ("congo", "Congo", "af", 900, 500, "mega"),
    ("kasai", "Kasai", "af", 880, 560, "mega"),
    ("horn", "Horn", "af", 980, 490, "mega"),
    ("somali", "Somali", "af", 1035, 510, "mega"),
    ("rift", "Rift", "af", 900, 610, "mega"),
    ("nyasa", "Nyasa", "af", 960, 600, "mega"),
    ("namib", "Namib", "af", 860, 680, "mega"),
    ("cape", "Cape", "af", 920, 710, "mega"),
    ("madagascar", "Madagascar", "af", 1015, 669, "isle"),
    # ME
    ("anatolia", "Anatolia", "me", 940, 315, "mega"),
    ("armenia", "Armenia", "me", 1005, 300, "mega"),
    ("mesopotamia", "Babylon", "me", 1000, 345, "mega"),
    ("hejaz", "Hejaz", "me", 980, 420, "mega"),
    ("arabia", "Arabia", "me", 1040, 451, "mega"),
    ("gulf", "Gulf", "me", 1075, 400, "mega"),
    ("persia", "Persia", "me", 1085, 365, "mega"),
    ("media", "Media", "me", 1090, 325, "mega"),
    ("steppe", "Steppe", "me", 1120, 260, "mega"),
    ("altai", "Altai", "me", 1180, 270, "mega"),
    # AS
    ("siberia", "Siberia", "as", 1180, 175, "mega"),
    ("baikal", "Baikal", "as", 1280, 175, "mega"),
    ("yakutia", "Yakutia", "as", 1420, 175, "mega"),
    ("chukotka", "Chukotka", "as", 1570, 200, "mega"),
    ("gobi", "Gobi", "as", 1300, 270, "mega"),
    ("tarim", "Tarim", "as", 1220, 300, "mega"),
    ("korea", "Korea", "as", 1375, 325, "mega"),
    ("nippon", "Nippon", "as", 1446, 395, "isle"),
    ("cathay", "Cathay", "as", 1365, 300, "mega"),
    ("jiangnan", "Jiangnan", "as", 1375, 345, "mega"),
    ("canton", "Canton", "as", 1320, 385, "mega"),
    ("yunnan", "Yunnan", "as", 1295, 400, "mega"),
    ("himalaya", "Himalaya", "as", 1185, 360, "mega"),
    ("india", "India", "as", 1170, 450, "mega"),
    ("burma", "Burma", "as", 1270, 430, "mega"),
    ("indochina", "Indochina", "as", 1295, 470, "mega"),
    # OC
    ("malaya", "Malaya", "oc", 1295, 530, "mega"),
    ("papua", "Papua", "oc", 1457, 603, "isle"),
    ("kimberley", "Kimberley", "oc", 1360, 650, "mega"),
    ("westralia", "Westralia", "oc", 1340, 720, "mega"),
    ("outback", "Outback", "oc", 1424, 690, "mega"),
    ("nullarbor", "Nullarbor", "oc", 1410, 730, "mega"),
    ("coral", "Coral Coast", "oc", 1485, 710, "mega"),
    ("tasmania", "Tasmania", "oc", 1479, 789, "isle"),
    ("aotearoa", "Aotearoa", "oc", 1598, 786, "isle"),
    ("polynesia", "Polynesia", "oc", 1621, 660, "isle"),
]

# Small-island components whose centroid falls in the box join that province.
CLAIM_BOX = {
    "hawaii": (35, 448, 100, 512),
    "polynesia": (1565, 620, 1675, 705),
    "madagascar": (990, 625, 1045, 715),
    "highlands": (668, 185, 762, 252),
    "nippon": (1398, 338, 1488, 435),
    "aotearoa": (1555, 735, 1655, 845),
    "tasmania": (1462, 768, 1508, 818),
    "caribbean": (395, 440, 525, 500),
    "malaya": (1280, 518, 1428, 615),
    "papua": (1405, 568, 1548, 642),
    "baffin": (318, 46, 525, 148),
}

MEGA_AREA = 10000


def land_mask(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    cyan = (g + b) / 2 - r
    land = (cyan < 35).astype(np.uint8)
    # Close gaps but do NOT open — opening wipes Hawaii / Polynesia specks.
    land = cv2.morphologyEx(land, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    return land


def continent_at(x: int, y: int) -> int:
    """Hard envelopes so a province cannot spill onto another game continent."""
    # Oceania: Australia, NZ, Indonesia, Malay peninsula south of Kra.
    if x >= 1260 and y >= 518:
        return CONT_CODE["oc"]
    # Americas (west of the Atlantic).
    if x < 680:
        if y >= 518:
            return CONT_CODE["sa"]
        if x >= 428 and y < 392:
            return CONT_CODE["na"]  # Florida / east seaboard
        if x < 300 and y >= 292:
            return CONT_CODE["ca"]  # California / Baja
        if y >= 328:
            return CONT_CODE["ca"]  # Texas / Mexico / Panama
        return CONT_CODE["na"]
    # Africa: Sahara + west + Horn (east of Sinai stays ME until y>=458).
    if y >= 338 and x < 968:
        return CONT_CODE["af"]
    if y >= 458 and x < 1088:
        return CONT_CODE["af"]
    # Europe: west of Bosphorus, plus the east-European plain / Urals.
    if y < 338 and x < 922:
        return CONT_CODE["eu"]
    if y < 252 and x < 1135:
        return CONT_CODE["eu"]
    # Middle East: Anatolia, Arabia, Persia, steppe.
    if x < 1148 and y < 520:
        return CONT_CODE["me"]
    if x < 1180 and y < 300:
        return CONT_CODE["me"]
    return CONT_CODE["as"]


def paint_continents(land: np.ndarray) -> np.ndarray:
    H, W = land.shape
    cont = np.zeros((H, W), np.uint8)
    ys, xs = np.where(land == 1)
    for y, x in zip(ys.tolist(), xs.tolist()):
        cont[y, x] = continent_at(x, y)
    # Island stamps (paint over whatever the envelope guessed).
    stamps = [
        ("hawaii", "ca"),
        ("polynesia", "oc"),
        ("madagascar", "af"),
        ("highlands", "eu"),
        ("nippon", "as"),
        ("aotearoa", "oc"),
        ("tasmania", "oc"),
        ("caribbean", "ca"),
        ("baffin", "na"),
    ]
    n, lab, stats, _cent = cv2.connectedComponentsWithStats(land, 8)
    for pid, cname in stamps:
        x0, y0, x1, y1 = CLAIM_BOX[pid]
        c = CONT_CODE[cname]
        for yy in range(y0, y1):
            for xx in range(x0, x1):
                if land[yy, xx] == 0:
                    continue
                i = int(lab[yy, xx])
                if i == 0:
                    continue
                # Don't recolour a mega landmass inside an island box (Korea in Nippon box).
                if int(stats[i, cv2.CC_STAT_AREA]) >= MEGA_AREA and pid != "baffin":
                    continue
                cont[yy, xx] = c
    return cont


def snap_seed(land, lab, stats, mega, x, y, kind, want_c, cont, box=None):
    H, W = land.shape
    x = int(np.clip(round(x), 0, W - 1))
    y = int(np.clip(round(y), 0, H - 1))

    def ok(nx, ny):
        if land[ny, nx] == 0:
            return False
        if want_c and cont[ny, nx] != want_c:
            return False
        cc = int(lab[ny, nx])
        area = int(stats[cc, cv2.CC_STAT_AREA]) if cc else 0
        is_mega = area >= MEGA_AREA
        if kind == "mega" and not is_mega:
            return False
        if kind == "isle" and is_mega:
            return False
        if box is not None:
            x0, y0, x1, y1 = box
            if not (x0 <= nx < x1 and y0 <= ny < y1):
                return False
        return True

    if ok(x, y):
        return x, y
    # Expanding ring, prefer in-box if given.
    for use_box in (True, False) if box is not None else (False,):
        for r in range(1, 90):
            best = None
            best_d = 10**9
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if abs(dx) != r and abs(dy) != r:
                        continue
                    nx, ny = x + dx, y + dy
                    if nx < 0 or ny < 0 or nx >= W or ny >= H:
                        continue
                    if use_box:
                        x0, y0, x1, y1 = box
                        if not (x0 <= nx < x1 and y0 <= ny < y1):
                            continue
                    if ok(nx, ny):
                        d = dx * dx + dy * dy
                        if d < best_d:
                            best_d = d
                            best = (nx, ny)
            if best:
                return best
    # Last resort: any land of the wanted continent.
    ys, xs = np.where((land == 1) & ((cont == want_c) if want_c else True))
    if len(xs) == 0:
        return x, y
    d = (xs - x) ** 2 + (ys - y) ** 2
    i = int(np.argmin(d))
    return int(xs[i]), int(ys[i])


def dijkstra_voronoi(land, cont, seeds):
    """Compact cells: 8-connected Euclidean Dijkstra, same continent only."""
    H, W = land.shape
    owner = np.zeros((H, W), np.int16)
    dist = np.full((H, W), np.inf, np.float32)
    heap = []
    for i, s in enumerate(seeds):
        x, y = s["x"], s["y"]
        owner[y, x] = i + 1
        dist[y, x] = 0
        heapq.heappush(heap, (0.0, y, x, i + 1))

    neigh = (
        (1, 0, 1.0),
        (-1, 0, 1.0),
        (0, 1, 1.0),
        (0, -1, 1.0),
        (1, 1, 1.414),
        (1, -1, 1.414),
        (-1, 1, 1.414),
        (-1, -1, 1.414),
    )
    while heap:
        d, y, x, sid = heapq.heappop(heap)
        if d != dist[y, x]:
            continue
        sc = seeds[sid - 1]["c"]
        for dy, dx, w in neigh:
            ny, nx = y + dy, x + dx
            if nx < 0 or ny < 0 or nx >= W or ny >= H:
                # Bering wrap on the arctic belt only.
                if y < 280 and ny == y:
                    if x == 0 and dx == -1:
                        nx = W - 1
                    elif x == W - 1 and dx == 1:
                        nx = 0
                    else:
                        continue
                else:
                    continue
            if land[ny, nx] == 0:
                continue
            if cont[ny, nx] != sc:
                continue
            nd = d + w
            if nd < dist[ny, nx]:
                dist[ny, nx] = nd
                owner[ny, nx] = sid
                heapq.heappush(heap, (nd, ny, nx, sid))
    return owner


def assign_orphans(owner, land, cont, seeds):
    """Unclaimed islands and scraps join the nearest same-continent seed."""
    ys, xs = np.where((land == 1) & (owner == 0))
    if len(xs) == 0:
        return owner
    byc = defaultdict(list)
    all_s = []
    for i, s in enumerate(seeds):
        rec = (i + 1, s["x"], s["y"])
        byc[s["c"]].append(rec)
        all_s.append(rec)
    for y, x in zip(ys.tolist(), xs.tolist()):
        c = int(cont[y, x])
        cands = byc.get(c) or all_s
        best = cands[0][0]
        bd = 10**18
        for sid, sx, sy in cands:
            d = (x - sx) * (x - sx) + (y - sy) * (y - sy)
            if d < bd:
                bd = d
                best = sid
        owner[y, x] = best
    return owner


def fill_leftover(owner, land, cont, seeds):
    """Any unclaimed land joins the nearest same-continent owner."""
    H, W = owner.shape
    from collections import deque

    q = deque()
    ys, xs = np.where((land == 1) & (owner > 0))
    for y, x in zip(ys.tolist(), xs.tolist()):
        q.append((y, x))
    while q:
        y, x = q.popleft()
        s = int(owner[y, x])
        sc = seeds[s - 1]["c"]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if nx < 0 or ny < 0 or nx >= W or ny >= H:
                if y < 280 and ny == y:
                    if x == 0 and dx == -1:
                        nx = W - 1
                    elif x == W - 1 and dx == 1:
                        nx = 0
                    else:
                        continue
                else:
                    continue
            if land[ny, nx] and owner[ny, nx] == 0 and cont[ny, nx] == sc:
                owner[ny, nx] = s
                q.append((ny, nx))
    return owner


def claim_islands(owner, land, seeds, lab, stats, cent, cont):
    """Give each island its whole archipelago (small CCs in its claim box)."""
    H, W = owner.shape
    id_of = {s["id"]: i + 1 for i, s in enumerate(seeds)}
    for pid, box in CLAIM_BOX.items():
        if pid not in id_of:
            continue
        x0, y0, x1, y1 = box
        seen = set()
        for yy in range(max(0, y0), min(H, y1)):
            for xx in range(max(0, x0), min(W, x1)):
                i = int(lab[yy, xx])
                if i == 0 or i in seen:
                    continue
                seen.add(i)
                area = int(stats[i, cv2.CC_STAT_AREA])
                if area >= MEGA_AREA:
                    continue
                cx, cy = cent[i]
                if not (x0 <= cx < x1 and y0 <= cy < y1):
                    continue
                best_pid = pid
                best_d = 1e18
                for other, obox in CLAIM_BOX.items():
                    if other not in id_of:
                        continue
                    ox0, oy0, ox1, oy1 = obox
                    if ox0 <= cx < ox1 and oy0 <= cy < oy1:
                        os = seeds[id_of[other] - 1]
                        d = (cx - os["x"]) ** 2 + (cy - os["y"]) ** 2
                        if d < best_d:
                            best_d = d
                            best_pid = other
                dest = id_of[best_pid]
                want = seeds[dest - 1]["c"]
                # Only take pixels already on this continent.
                take = (lab == i) & (cont == want)
                owner[take] = dest
    return owner


def majority_smooth(owner, land, seeds, cont, rounds=4):
    n = len(seeds)
    cmap = np.zeros(n + 1, np.uint8)
    for i, s in enumerate(seeds):
        cmap[i + 1] = s["c"]
    k = np.ones((3, 3), np.float32)
    k[1, 1] = 0
    for _ in range(rounds):
        best = np.zeros_like(owner)
        bestv = np.zeros(owner.shape, np.float32)
        for i in range(1, n + 1):
            m = (owner == i).astype(np.float32)
            v = cv2.filter2D(m, -1, k)
            take = v > bestv
            best[take] = i
            bestv[take] = v[take]
        oc = cmap[np.clip(owner, 0, n)]
        bc = cmap[np.clip(best, 0, n)]
        flip = (land == 1) & (bestv >= 5) & (best > 0) & (oc == bc) & (cont == bc)
        owner = np.where(flip, best, owner).astype(np.int16)
    return owner


def drop_far_scraps(owner, land, seeds, lab):
    """Mainland tendrils that are a tiny disconnected scrap go to a neighbour."""
    H, W = owner.shape
    n = len(seeds)
    mega_lab = set()
    # A pixel is a scrap if its owner-mask CC is small AND far from the seed.
    for i, s in enumerate(seeds):
        if s["id"] in ISLAND or s["id"] in CLAIM_BOX:
            continue
        idx = i + 1
        mask = (owner == idx).astype(np.uint8)
        k, clab, st, _ = cv2.connectedComponentsWithStats(mask, 8)
        if k <= 2:
            continue
        # Keep the component that contains the seed (or the largest).
        sx, sy = s["x"], s["y"]
        keep = int(clab[sy, sx]) if mask[sy, sx] else 1
        if keep == 0:
            keep = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        for c in range(1, k):
            if c == keep:
                continue
            area = int(st[c, cv2.CC_STAT_AREA])
            if area > 400:
                continue
            # Reassign to a neighbouring owner of the same continent.
            ys, xs = np.where(clab == c)
            votes = defaultdict(int)
            for y, x in zip(ys.tolist(), xs.tolist()):
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= nx < W and 0 <= ny < H:
                        o = int(owner[ny, nx])
                        if o and o != idx and seeds[o - 1]["c"] == s["c"]:
                            votes[o] += 1
            if not votes:
                continue
            dest = max(votes, key=votes.get)
            owner[clab == c] = dest
    return owner


def grow_small(owner, seeds, min_main=1600, min_isle=60):
    """Steal pixels closest to our seed from a fat same-continent neighbour."""
    H, W = owner.shape
    n = len(seeds)
    for _round in range(12):
        counts = np.bincount(owner.ravel(), minlength=n + 1)
        grew = False
        for i, s in enumerate(seeds):
            idx = i + 1
            area = int(counts[idx])
            floor = min_isle if s["id"] in ISLAND else min_main
            if area == 0 or area >= floor:
                continue
            ys, xs = np.where(owner == idx)
            if len(xs) == 0:
                continue
            border = []
            for y, x in zip(ys.tolist(), xs.tolist()):
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    ny, nx = y + dy, x + dx
                    if nx < 0 or ny < 0 or nx >= W or ny >= H:
                        continue
                    o = int(owner[ny, nx])
                    if o and o != idx and seeds[o - 1]["c"] == s["c"]:
                        d = (nx - s["x"]) ** 2 + (ny - s["y"]) ** 2
                        border.append((d, ny, nx, o))
            if not border:
                continue
            border.sort()
            need = floor - area
            taken = 0
            for d, ny, nx, o in border:
                if taken >= need:
                    break
                if int(counts[o]) <= floor + 200:
                    continue
                if owner[ny, nx] != o:
                    continue
                owner[ny, nx] = idx
                counts[idx] += 1
                counts[o] -= 1
                taken += 1
            if taken:
                grew = True
                print(f"  grow {s['id']} +{taken}px now {int(counts[idx])}")
        if not grew:
            break
    return owner


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
        eps = max(1.6, 0.0055 * peri)
        approx = cv2.approxPolyDP(c, eps, True)
        if len(approx) > 90:
            approx = cv2.approxPolyDP(c, max(eps, 0.009 * peri), True)
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


def label_of(mask: np.ndarray, sx, sy):
    m = (mask > 0).astype(np.uint8)
    if int(m.sum()) == 0:
        return float(sx), float(sy)
    dist = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    y, x = np.unravel_index(int(np.argmax(dist)), dist.shape)
    return float(x), float(y)


def land_edges(owner):
    adj = set()
    a = owner
    left, right = a[:, :-1], a[:, 1:]
    m = (left > 0) & (right > 0) & (left != right)
    ys, xs = np.where(m)
    for y, x in zip(ys.tolist()[::2], xs.tolist()[::2]):
        p, q = int(left[y, x]), int(right[y, x])
        if p > q:
            p, q = q, p
        adj.add((p, q))
    up, down = a[:-1, :], a[1:, :]
    m = (up > 0) & (down > 0) & (up != down)
    ys, xs = np.where(m)
    for y, x in zip(ys.tolist()[::2], xs.tolist()[::2]):
        p, q = int(up[y, x]), int(down[y, x])
        if p > q:
            p, q = q, p
        adj.add((p, q))
    L, R = a[:, 0], a[:, -1]
    m = (L > 0) & (R > 0) & (L != R)
    for y in np.where(m)[0].tolist():
        if y > 280:
            continue
        p, q = int(L[y]), int(R[y])
        if p > q:
            p, q = q, p
        adj.add((p, q))
    return adj


def sea_edges(owner, land, seeds, old_sea, coastal_set):
    n = len(seeds)
    close = set()
    k = np.ones((19, 19), np.uint8)
    dilated = []
    for i in range(n):
        m = (owner == i + 1).astype(np.uint8)
        dilated.append(cv2.dilate(m, k, iterations=1))
    for i in range(n):
        if seeds[i]["id"] not in coastal_set:
            continue
        for j in range(i + 1, n):
            if seeds[j]["id"] not in coastal_set:
                continue
            overlap = int(np.logical_and(dilated[i], dilated[j]).sum())
            if overlap > 36:
                close.add((seeds[i]["id"], seeds[j]["id"]))
    ids = {s["id"] for s in seeds}
    kept = set()
    for a, b in old_sea:
        if a in ids and b in ids and a in coastal_set and b in coastal_set:
            kept.add((a, b) if a < b else (b, a))
    out = set()
    for a, b in close:
        out.add((a, b) if a < b else (b, a))
    out |= kept
    for a, b in FORCE_SEA:
        if a in ids and b in ids:
            out.add((a, b) if a < b else (b, a))
    return sorted(out)


def parse_old_sea(text: str):
    m = re.search(r"const SEA_EDGES: \[string, string\]\[\] = (\[.*?\]);", text, re.S)
    if not m:
        return []
    return re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', m.group(1))


def write_world(defs, land_pairs, sea_pairs):
    land_pairs = sorted({(a, b) if a < b else (b, a) for a, b in land_pairs})
    sea_pairs = sorted({(a, b) if a < b else (b, a) for a, b in sea_pairs})
    landset = set(land_pairs)
    sea_pairs = [p for p in sea_pairs if p not in landset]
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
    print("wrote", SRC, "bytes", len(out), "lands", len(defs), "land-edges", len(land_pairs), "sea-edges", len(sea_pairs))


def preview(rgb, owner, seeds, path):
    vis = rgb.copy()
    n = len(seeds)
    rng = np.random.RandomState(3)
    cols = rng.randint(50, 230, size=(n + 1, 3), dtype=np.uint8)
    tint = vis.astype(np.int16)
    for i in range(1, n + 1):
        m = owner == i
        if not m.any():
            continue
        tint[m] = (tint[m] * 0.42 + cols[i] * 0.58).astype(np.int16)
    vis = np.clip(tint, 0, 255).astype(np.uint8)
    e = np.zeros(owner.shape, np.uint8)
    e[:, 1:] |= (owner[:, 1:] != owner[:, :-1]) & (owner[:, 1:] > 0) & (owner[:, :-1] > 0)
    e[1:, :] |= (owner[1:, :] != owner[:-1, :]) & (owner[1:, :] > 0) & (owner[:-1, :] > 0)
    vis[e > 0] = (18, 16, 12)
    im = Image.fromarray(vis)
    draw = ImageDraw.Draw(im)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    for s in seeds:
        draw.ellipse((s["x"] - 2, s["y"] - 2, s["x"] + 2, s["y"] + 2), fill=(255, 255, 255))
        draw.text((s["x"] + 3, s["y"] - 4), s["id"][:6], fill=(255, 255, 255), font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    print("preview", path)


def main():
    assert len(PROVINCES) == 100, len(PROVINCES)
    text = SRC.read_text() if SRC.exists() else ""
    img = Image.open(MAP).convert("RGB").resize((WORLD_W, WORLD_H), Image.Resampling.BILINEAR)
    rgb = np.array(img)
    land = land_mask(rgb)
    print("land frac", float(land.mean()), "px", int(land.sum()))
    ncc, lab, stats, cent = cv2.connectedComponentsWithStats(land, 8)
    print("components", ncc - 1)
    cont = paint_continents(land)
    for c, code in CONT_CODE.items():
        print(f"  continent {c} land {int((cont == code).sum())}")

    seeds = []
    for pid, name, cname, x, y, kind in PROVINCES:
        want = CONT_CODE[cname]
        box = CLAIM_BOX.get(pid)
        sx, sy = snap_seed(land, lab, stats, MEGA_AREA, x, y, kind, want, cont, box)
        got = int(cont[sy, sx])
        if got != want:
            print("WARN seed continent", pid, sx, sy, "got", CONT_NAME.get(got, 0), "want", cname)
        if land[sy, sx] == 0:
            print("WARN seed ocean", pid, sx, sy)
        seeds.append(
            {"id": pid, "name": name, "continent": cname, "c": want, "x": sx, "y": sy, "kind": kind}
        )

    print("dijkstra…")
    owner = dijkstra_voronoi(land, cont, seeds)
    owner = fill_leftover(owner, land, cont, seeds)
    owner = claim_islands(owner, land, seeds, lab, stats, cent, cont)
    owner = majority_smooth(owner, land, seeds, cont, rounds=4)
    owner = drop_far_scraps(owner, land, seeds, lab)
    owner = fill_leftover(owner, land, cont, seeds)
    owner = assign_orphans(owner, land, cont, seeds)
    # Compact grow only for truly tiny mainland scraps, not islands.
    owner = grow_small(owner, seeds, min_main=700, min_isle=40)
    owner = majority_smooth(owner, land, seeds, cont, rounds=2)

    # Unclaimed land report
    leftover = int(((land == 1) & (owner == 0)).sum())
    print("unclaimed land", leftover)

    counts = np.bincount(owner.ravel(), minlength=len(seeds) + 1)
    defs = []
    coastal_set = set()
    for i, s in enumerate(seeds):
        idx = i + 1
        mask = (owner == idx).astype(np.uint8)
        area = int(mask.sum())
        rings = contours_of(mask)
        if area < 8 or not rings:
            # Stamp a small disk so the named land never disappears.
            print("STAMP", s["id"], "area", area)
            disk = np.zeros_like(mask)
            cv2.circle(disk, (s["x"], s["y"]), 7, 1, -1)
            disk &= land
            owner[disk == 1] = idx
            mask = (owner == idx).astype(np.uint8)
            area = int(mask.sum())
            rings = contours_of(mask)
        if not rings:
            print("DROP still empty", s["id"])
            continue
        dil = cv2.dilate(mask, np.ones((3, 3), np.uint8))
        touches_water = bool(((dil == 1) & (land == 0)).any())
        coastal = touches_water and s["id"] not in INLAND
        if coastal:
            coastal_set.add(s["id"])
        lx, ly = label_of(mask, s["x"], s["y"])
        defs.append(
            {
                "id": s["id"],
                "name": s["name"],
                "continent": s["continent"],
                "coastal": coastal,
                "path": path_of(rings),
                "labelX": round(lx, 1),
                "labelY": round(ly, 1),
            }
        )
        print(f"  {s['id']:12} {s['continent']} area={area:6d} coastal={coastal} rings={len(rings)}")

    id_by_idx = {i + 1: s["id"] for i, s in enumerate(seeds)}
    cont_of = {s["id"]: s["continent"] for s in seeds}
    adj = land_edges(owner)
    kept_ids = {d["id"] for d in defs}
    land_pairs = []
    for p, q in adj:
        a, b = id_by_idx.get(p), id_by_idx.get(q)
        if a in kept_ids and b in kept_ids and cont_of[a] == cont_of[b]:
            land_pairs.append((a, b))
    for a, b in FORCE_LAND:
        if a in kept_ids and b in kept_ids:
            land_pairs.append((a, b))

    old_sea = parse_old_sea(text)
    sea_pairs = sea_edges(owner, land, seeds, old_sea, coastal_set)

    areas = sorted((int(counts[i + 1]), s["id"]) for i, s in enumerate(seeds) if s["id"] in kept_ids)
    print("count", len(defs))
    print("smallest", areas[:12])
    print("largest", areas[-8:])

    # Continent purity: no owner should paint two continent codes.
    mixed = 0
    for i, s in enumerate(seeds):
        m = owner == i + 1
        codes = set(int(v) for v in np.unique(cont[m]) if v)
        if len(codes) > 1:
            mixed += 1
            print("MIXED continent", s["id"], [CONT_NAME.get(c, c) for c in codes])
    print("mixed continents", mixed)

    preview(rgb, owner, seeds, PREVIEW)
    preview(rgb, owner, seeds, PREVIEW2)
    write_world(defs, land_pairs, sea_pairs)
    have = {d["id"] for d in defs}
    missing = [s["id"] for s in seeds if s["id"] not in have]
    print("missing", missing)


if __name__ == "__main__":
    main()
