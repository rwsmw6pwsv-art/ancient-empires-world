#!/usr/bin/env python3
"""Rename Hawaii, bridge Peninsula–Weddell, grow Wilkes, shrink Coral,
and retile every region into twenty hex-shaped lands."""
from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
WORLD_TS = ROOT / "src/lib/game/world.ts"
LANDS_TS = ROOT / "src/lib/game/lands.gen.ts"
PREVIEW = ROOT / "screenshots/provinces.png"
WORLD_W, WORLD_H = 1680, 1260
TARGET = 20
SQRT3 = math.sqrt(3)

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
FORCE_INLAND = {"gobi", "kunlun", "pantanal"}
FORCE_COASTAL = {"sahul", "tasmania", "hawaii", "sumer", "asgard"}
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

NEW_LANDS: dict[str, list[tuple[str, str]]] = {
    "at": [
        ("ellsworth", "Ellsworth"),
        ("filchner", "Filchner"),
        ("dufek", "Dufek"),
        ("shirase", "Shirase"),
        ("oates", "Oates"),
        ("siple", "Siple"),
        ("berkner", "Berkner"),
        ("pennell", "Pennell"),
        ("thurston", "Thurston"),
        ("getz", "Getz"),
    ],
    "na": [
        ("yukon", "Yukon"),
        ("mackenzie", "Mackenzie"),
        ("keewatin", "Keewatin"),
        ("ontario", "Ontario"),
        ("acadia", "Acadia"),
        ("dakota", "Dakota"),
        ("columbia", "Columbia"),
        ("baffin", "Baffin"),
        ("aleut", "Aleut"),
        ("cordillera", "Cordillera"),
    ],
    "ca": [
        ("olmec", "Olmec"),
        ("toltec", "Toltec"),
        ("mixtec", "Mixtec"),
        ("zapotec", "Zapotec"),
        ("tarascan", "Tarascan"),
        ("taino", "Taino"),
        ("arawak", "Arawak"),
        ("nicoya", "Nicoya"),
        ("tehuantepec", "Tehuantepec"),
        ("maui", "Maui"),
    ],
    "sa": [
        ("chaco", "Chaco"),
        ("parana", "Parana"),
        ("marajo", "Marajo"),
        ("araguaia", "Araguaia"),
        ("araucania", "Araucania"),
        ("altiplano", "Altiplano"),
        ("guapore", "Guapore"),
        ("tocantins", "Tocantins"),
        ("plata", "Plata"),
        ("chubut", "Chubut"),
    ],
    "eu": [
        ("aquitaine", "Aquitaine"),
        ("bohemia", "Bohemia"),
        ("dacia", "Dacia"),
        ("thrace", "Thrace"),
        ("lusitania", "Lusitania"),
        ("armorica", "Armorica"),
        ("helvetia", "Helvetia"),
        ("liguria", "Liguria"),
        ("noricum", "Noricum"),
        ("scythia", "Scythia"),
    ],
    "an": [
        ("nubia", "Nubia"),
        ("cyrenaica", "Cyrenaica"),
        ("fezzan", "Fezzan"),
        ("kanem", "Kanem"),
        ("awdaghost", "Awdaghost"),
        ("axum", "Axum"),
        ("punt", "Punt"),
        ("carthage", "Carthage"),
        ("gaetulia", "Gaetulia"),
        ("timbuktu", "Timbuktu"),
    ],
    "af": [
        ("transvaal", "Transvaal"),
        ("caprivi", "Caprivi"),
        ("nyasa", "Nyasa"),
        ("mashona", "Mashona"),
        ("bechuana", "Bechuana"),
        ("pondoland", "Pondoland"),
        ("namaqua", "Namaqua"),
        ("sofala", "Sofala"),
        ("lesotho", "Lesotho"),
        ("swazi", "Swazi"),
    ],
    "me": [
        ("persia", "Persia"),
        ("media", "Media"),
        ("elam", "Elam"),
        ("phoenicia", "Phoenicia"),
        ("nabataea", "Nabataea"),
        ("cappadocia", "Cappadocia"),
        ("urartu", "Urartu"),
        ("dilmun", "Dilmun"),
        ("magan", "Magan"),
        ("parthia", "Parthia"),
    ],
    "ns": [
        ("buryatia", "Buryatia"),
        ("yakutia", "Yakutia"),
        ("manchuria", "Manchuria"),
        ("korea", "Korea"),
        ("dzungaria", "Dzungaria"),
        ("sayan", "Sayan"),
        ("kolyma", "Kolyma"),
        ("chukotka", "Chukotka"),
        ("ussuri", "Ussuri"),
        ("tuva", "Tuva"),
    ],
    "ss": [
        ("bengal", "Bengal"),
        ("punjab", "Punjab"),
        ("tamil", "Tamil"),
        ("ceylon", "Ceylon"),
        ("siam", "Siam"),
        ("annam", "Annam"),
        ("java", "Java"),
        ("sumatra", "Sumatra"),
        ("kashmir", "Kashmir"),
        ("tibet", "Tibet"),
    ],
    "oc": [
        ("zealandia", "Zealandia"),
        ("vanuatu", "Vanuatu"),
        ("fiji", "Fiji"),
        ("nullarbor", "Nullarbor"),
        ("arnhem", "Arnhem"),
        ("pilbara", "Pilbara"),
        ("carpentaria", "Carpentaria"),
        ("chatham", "Chatham"),
        ("macquarie", "Macquarie"),
        ("melanesia", "Melanesia"),
    ],
}


def parse_territories(text: str) -> list[dict]:
    recs = []
    for m in re.finditer(
        r'\{\s*"id": "([^"]+)",\s*"name": "([^"]+)",\s*"continent": "([^"]+)",\s*'
        r'"coastal": (true|false),\s*"path": "([^"]*)",\s*"labelX": ([0-9.]+),\s*"labelY": ([0-9.]+)\s*\}',
        text,
    ):
        recs.append(
            {
                "id": m.group(1),
                "name": m.group(2),
                "continent": m.group(3),
                "coastal": m.group(4) == "true",
                "path": m.group(5),
                "labelX": float(m.group(6)),
                "labelY": float(m.group(7)),
            }
        )
    return recs


def parse_edges(text: str, const_name: str) -> set[tuple[str, str]]:
    m = re.search(rf"const {const_name}: \[string, string\]\[\] = \[(.*?)\] as", text, re.S)
    if not m:
        raise SystemExit(f"missing {const_name}")
    pairs = re.findall(r'\["([^"]+)", "([^"]+)"\]', m.group(1))
    return {tuple(sorted(p)) for p in pairs}  # type: ignore[return-value]


def parse_path(path: str) -> list[list[tuple[float, float]]]:
    rings: list[list[tuple[float, float]]] = []
    cur: list[tuple[float, float]] = []
    for cmd in re.finditer(r"([MLZ])([^MLZ]*)", path):
        c, rest = cmd.group(1), cmd.group(2).strip()
        if c in "ML":
            nums = [float(x) for x in re.findall(r"-?\d+\.?\d*", rest)]
            pts = list(zip(nums[0::2], nums[1::2]))
            if c == "M":
                if cur:
                    rings.append(cur)
                cur = list(pts)
            else:
                cur.extend(pts)
        elif c == "Z":
            if cur:
                rings.append(cur)
                cur = []
    if cur:
        rings.append(cur)
    return rings


def fill_mask(path: str) -> np.ndarray:
    m = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for ring in parse_path(path):
        if len(ring) < 3:
            continue
        pts = np.array([[[int(round(x)), int(round(y))]] for x, y in ring], np.int32)
        cv2.fillPoly(m, [pts], 255)
    return m


def contour_path(mask: np.ndarray) -> str:
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = [c for c in cnts if cv2.contourArea(c) >= 18]
    cnts.sort(key=cv2.contourArea, reverse=True)
    parts = []
    for c in cnts:
        eps = max(0.8, 0.0018 * cv2.arcLength(c, True))
        approx = cv2.approxPolyDP(c, eps, True)
        if len(approx) < 3:
            continue
        pts = approx.reshape(-1, 2)
        parts.append("M" + "L".join(f"{float(x):.1f},{float(y):.1f}" for x, y in pts) + "Z")
    return "".join(parts)


def centroid(mask: np.ndarray) -> tuple[float, float]:
    yy, xx = np.where(mask > 0)
    if len(xx) == 0:
        return 0.0, 0.0
    return float(xx.mean()), float(yy.mean())


def is_coastal(mask: np.ndarray, land: np.ndarray) -> bool:
    closed = cv2.morphologyEx(land, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    dil = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    ring = (dil > 0) & (mask == 0)
    return bool(((closed == 0) & ring).any())


def parse_landscape(text: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for m in re.finditer(
        r"(\w+): \{ terrain: \"([^\"]+)\", resource: \"([^\"]+)\"(?:, wonder: \"([^\"]+)\")?, fauna: \"([^\"]+)\" \}",
        text,
    ):
        out[m.group(1)] = {
            "terrain": m.group(2),
            "resource": m.group(3),
            "wonder": m.group(4),
            "fauna": m.group(5),
        }
    return out


def cube_round(x: float, y: float, z: float) -> tuple[int, int]:
    rx, ry, rz = round(x), round(y), round(z)
    dx, dy, dz = abs(rx - x), abs(ry - y), abs(rz - z)
    if dx > dy and dx > dz:
        rx = -ry - rz
    elif dy > dz:
        ry = -rx - rz
    else:
        rz = -rx - ry
    return int(rx), int(rz)


def pixel_to_axial(x: float, y: float, size: float) -> tuple[int, int]:
    q = (SQRT3 / 3 * x - 1.0 / 3 * y) / size
    r = (2.0 / 3 * y) / size
    return cube_round(q, -q - r, r)


def axial_to_pixel(q: int, r: int, size: float) -> tuple[float, float]:
    x = size * (SQRT3 * q + SQRT3 / 2 * r)
    y = size * (1.5 * r)
    return x, y


def hex_neighbors(q: int, r: int) -> list[tuple[int, int]]:
    return [
        (q + 1, r),
        (q - 1, r),
        (q, r + 1),
        (q, r - 1),
        (q + 1, r - 1),
        (q - 1, r + 1),
    ]


def hexes_for_mask(mask: np.ndarray, size: float) -> dict[tuple[int, int], np.ndarray]:
    yy, xx = np.where(mask > 0)
    buckets: dict[tuple[int, int], list[tuple[int, int]]] = defaultdict(list)
    for x, y in zip(xx.tolist(), yy.tolist()):
        buckets[pixel_to_axial(x, y, size)].append((x, y))
    out: dict[tuple[int, int], np.ndarray] = {}
    min_pix = max(40, int(mask.sum() / 255 / 80))
    for key, pts in buckets.items():
        if len(pts) < min_pix:
            continue
        m = np.zeros((WORLD_H, WORLD_W), np.uint8)
        xs = np.array([p[0] for p in pts], np.int32)
        ys = np.array([p[1] for p in pts], np.int32)
        m[ys, xs] = 255
        out[key] = m
    return out


def merge_to_target(cells: dict[tuple[int, int], np.ndarray], target: int) -> list[np.ndarray]:
    if not cells:
        return []
    items = [{ "key": k, "mask": m, "area": int(m.sum() / 255), "members": {k} } for k, m in cells.items()]
    key_of = {it["key"]: it for it in items}

    def neighbor_items(it):
        found = []
        for mem in it["members"]:
            for nb in hex_neighbors(*mem):
                other = key_of.get(nb)
                if other is not None and other is not it:
                    found.append(other)
        return found

    while len(items) > target:
        items.sort(key=lambda it: it["area"])
        victim = items[0]
        nbs = neighbor_items(victim)
        if not nbs:
            # absorb into nearest centroid
            cx, cy = centroid(victim["mask"])
            rest = items[1:]
            if not rest:
                break
            nbs = [min(rest, key=lambda it: (centroid(it["mask"])[0] - cx) ** 2 + (centroid(it["mask"])[1] - cy) ** 2)]
        host = min(nbs, key=lambda it: it["area"])
        host["mask"] = host["mask"] | victim["mask"]
        host["area"] = int(host["mask"].sum() / 255)
        host["members"] |= victim["members"]
        items.remove(victim)
        for mem in list(victim["members"]):
            key_of[mem] = host

    while len(items) < target:
        items.sort(key=lambda it: it["area"], reverse=True)
        big = items[0]
        keep, new = split_mask_xy(big["mask"])
        if int(keep.sum() / 255) < 30 or int(new.sum() / 255) < 30:
            break
        big["mask"] = keep
        big["area"] = int(keep.sum() / 255)
        items.append({"key": ("split", len(items)), "mask": new, "area": int(new.sum() / 255), "members": set()})

    return [it["mask"] for it in items]


def split_mask_xy(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    yy, xx = np.where(mask > 0)
    if xx.ptp() >= yy.ptp():
        cut = int(np.median(xx))
        keep = mask.copy()
        keep[:, cut:] = 0
        new = mask.copy()
        new[:, :cut] = 0
    else:
        cut = int(np.median(yy))
        keep = mask.copy()
        keep[cut:, :] = 0
        new = mask.copy()
        new[:cut, :] = 0
    k = np.ones((3, 3), np.uint8)
    keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, k)
    new = cv2.morphologyEx(new, cv2.MORPH_OPEN, k)
    return keep, new


def paint_bridge(a: np.ndarray, b: np.ndarray, thickness: int = 22) -> tuple[np.ndarray, np.ndarray]:
    ax, ay = centroid(a)
    bx, by = centroid(b)
    line = np.zeros((WORLD_H, WORLD_W), np.uint8)
    cv2.line(line, (int(ax), int(ay)), (int(bx), int(by)), 255, thickness)
    # do not paint over unrelated existing land
    both = ((a > 0) | (b > 0)).astype(np.uint8) * 255
    extra = cv2.bitwise_and(line, cv2.bitwise_not(both))
    # split extra by distance to each centroid
    yy, xx = np.where(extra > 0)
    for x, y in zip(xx.tolist(), yy.tolist()):
        da = (x - ax) ** 2 + (y - ay) ** 2
        db = (x - bx) ** 2 + (y - by) ** 2
        if da <= db:
            a[y, x] = 255
        else:
            b[y, x] = 255
    return a, b


def write_world(recs: list[dict], land_edges: set[tuple[str, str]], sea_edges: set[tuple[str, str]]) -> None:
    recs_js = []
    for r in recs:
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


def write_lands(recs: list[dict], landscape: dict[str, dict]) -> None:
    lines = ["export const LANDSCAPE_GEN = {\n"]
    for r in recs:
        pid = r["id"]
        ls = landscape.get(pid, {})
        terrain = ls.get("terrain") or ("ice" if r["continent"] == "at" else "mountain")
        resource = ls.get("resource") or RES[len(lines) % len(RES)]
        fauna = ls.get("fauna") or FAUNA[r["continent"]]
        wonder = ls.get("wonder")
        extra = f', wonder: "{wonder}"' if wonder else ""
        lines.append(
            f'  {pid}: {{ terrain: "{terrain}", resource: "{resource}"{extra}, fauna: "{fauna}" }},\n'
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


def tile_continent(cont: str, recs: list[dict], masks: dict[str, np.ndarray]) -> list[tuple[np.ndarray, dict]]:
    local = [r for r in recs if r["continent"] == cont]
    union = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for r in local:
        union |= (masks[r["id"]] > 0).astype(np.uint8)
    union = (union > 0).astype(np.uint8) * 255
    area = int(union.sum() / 255)
    size = float(np.clip(math.sqrt(max(area, 1) / 24 / 2.598), 12.0, 42.0))
    cells = hexes_for_mask(union, size)
    # leftover pixels of tiny hexes attach to nearest kept hex
    if cells:
        kept = np.zeros((WORLD_H, WORLD_W), np.uint8)
        for m in cells.values():
            kept |= m
        leftover = (union > 0) & (kept == 0)
        if leftover.any():
            centers = {k: axial_to_pixel(k[0], k[1], size) for k in cells}
            yy, xx = np.where(leftover)
            keys = list(centers.keys())
            cxy = np.array([centers[k] for k in keys], np.float32)
            for x, y in zip(xx.tolist(), yy.tolist()):
                d = (cxy[:, 0] - x) ** 2 + (cxy[:, 1] - y) ** 2
                k = keys[int(np.argmin(d))]
                cells[k][y, x] = 255
    parts = merge_to_target(cells, TARGET)
    # guarantee leftover union coverage
    covered = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for p in parts:
        covered |= p
    miss = (union > 0) & (covered == 0)
    if miss.any() and parts:
        yy, xx = np.where(miss)
        cents = [centroid(p) for p in parts]
        for x, y in zip(xx.tolist(), yy.tolist()):
            i = int(np.argmin([(cx - x) ** 2 + (cy - y) ** 2 for cx, cy in cents]))
            parts[i][y, x] = 255
    while len(parts) < TARGET:
        parts.sort(key=lambda m: int(m.sum()), reverse=True)
        keep, new = split_mask_xy(parts[0])
        if int(new.sum() / 255) < 25:
            break
        parts[0] = keep
        parts.append(new)
    if len(parts) > TARGET:
        parts.sort(key=lambda m: int(m.sum()))
        while len(parts) > TARGET:
            small = parts.pop(0)
            cents = [centroid(p) for p in parts]
            sx, sy = centroid(small)
            i = int(np.argmin([(cx - sx) ** 2 + (cy - sy) ** 2 for cx, cy in cents]))
            parts[i] |= small
    if len(parts) != TARGET:
        raise SystemExit(f"{cont} tiled to {len(parts)} not {TARGET}")
    # overlap original lands for id assignment
    scored = []
    for mask in parts:
        best_id = None
        best = 0
        for r in local:
            ov = int(cv2.countNonZero(cv2.bitwise_and(mask, masks[r["id"]])))
            if ov > best:
                best = ov
                best_id = r["id"]
        scored.append((mask, best_id, best, centroid(mask)))
    assigned: dict[str, int] = {}
    used = set()
    # capitals first
    for i, (mask, orig, ov, cxy) in enumerate(scored):
        for r in local:
            if r["id"] not in CAPITALS:
                continue
            lx, ly = r["labelX"], r["labelY"]
            y, x = int(round(ly)), int(round(lx))
            y = min(max(y, 0), WORLD_H - 1)
            x = min(max(x, 0), WORLD_W - 1)
            if mask[y, x] > 0 or (orig == r["id"] and ov > 0):
                if r["id"] not in used:
                    assigned[r["id"]] = i
                    used.add(r["id"])
    # remaining originals by overlap
    order = sorted(range(len(scored)), key=lambda i: scored[i][2], reverse=True)
    orig_ids = [r["id"] for r in local]
    for i in order:
        if i in assigned.values():
            continue
        orig = scored[i][1]
        if orig and orig not in used:
            assigned[orig] = i
            used.add(orig)
    for oid in orig_ids:
        if oid in used:
            continue
        # nearest unassigned cluster to original centroid
        ox, oy = next((r["labelX"], r["labelY"]) for r in local if r["id"] == oid)
        best_i, best_d = None, 1e18
        for i, (_, _, _, cxy) in enumerate(scored):
            if i in assigned.values():
                continue
            d = (cxy[0] - ox) ** 2 + (cxy[1] - oy) ** 2
            if d < best_d:
                best_d = d
                best_i = i
        if best_i is None:
            raise SystemExit(f"no cluster for {oid}")
        assigned[oid] = best_i
        used.add(oid)
    inv = {i: oid for oid, i in assigned.items()}
    new_names = list(NEW_LANDS[cont])
    ni = 0
    out = []
    by_old = {r["id"]: r for r in local}
    for i, (mask, orig, ov, cxy) in enumerate(scored):
        if i in inv:
            old = by_old[inv[i]]
            meta = {
                "id": old["id"],
                "name": old["name"],
                "continent": cont,
                "source": old["id"],
            }
        else:
            nid, nname = new_names[ni]
            ni += 1
            src = orig or orig_ids[0]
            meta = {"id": nid, "name": nname, "continent": cont, "source": src}
        out.append((mask, meta))
    if ni != len(new_names):
        raise SystemExit(f"{cont} used {ni} new names, need {len(new_names)}")
    return out


def main() -> None:
    text = WORLD_TS.read_text()
    recs = parse_territories(text)
    assert len(recs) == 110, len(recs)
    sea_old = parse_edges(text, "SEA_EDGES")
    landscape = parse_landscape(LANDS_TS.read_text())
    by_id = {r["id"]: r for r in recs}

    for r in recs:
        if r["id"] == "hawaii":
            r["name"] = "Hawaiki"

    masks = {r["id"]: fill_mask(r["path"]) for r in recs}

    # Grow Wilkes, shrink Coral: take Coral's south and dilate Wilkes.
    coral = masks["coral"]
    wilkes = masks["wilkes"]
    yy, xx = np.where(coral > 0)
    if len(yy):
        cut_y = int(np.quantile(yy, 0.42))
        steal = coral.copy()
        steal[:cut_y, :] = 0
        wilkes = wilkes | steal
        coral = coral.copy()
        coral[steal > 0] = 0
    wilkes = cv2.dilate(wilkes, np.ones((31, 31), np.uint8))
    # do not swallow Tasmania / Uluru / Barrier / Aotearoa
    for oid in ("tasmania", "uluru", "barrier", "aotearoa", "sahul"):
        wilkes[masks[oid] > 0] = 0
    coral[wilkes > 0] = 0
    masks["wilkes"] = wilkes
    masks["coral"] = coral
    print("wilkes area", int(wilkes.sum() / 255), "coral area", int(coral.sum() / 255))

    masks["peninsula"], masks["weddell"] = paint_bridge(masks["peninsula"], masks["weddell"], 24)
    print("bridged peninsula-weddell")

    tiled: list[tuple[np.ndarray, dict]] = []
    for cont in ["at", "na", "ca", "sa", "eu", "an", "af", "me", "ns", "ss", "oc"]:
        parts = tile_continent(cont, recs, masks)
        print(cont, "n", len(parts), "ids", [m["id"] for _, m in parts])
        tiled.extend(parts)

    new_recs = []
    new_masks: dict[str, np.ndarray] = {}
    new_landscape: dict[str, dict] = {}
    old_to_new: dict[str, list[str]] = defaultdict(list)
    for mask, meta in tiled:
        k = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
        path = contour_path(mask)
        if not path:
            raise SystemExit(f"empty path {meta['id']}")
        lx, ly = centroid(mask)
        rec = {
            "id": meta["id"],
            "name": meta["name"],
            "continent": meta["continent"],
            "coastal": True,
            "path": path,
            "labelX": round(lx, 1),
            "labelY": round(ly, 1),
        }
        new_recs.append(rec)
        new_masks[meta["id"]] = mask
        src = meta["source"]
        old_to_new[src].append(meta["id"])
        parent_ls = landscape.get(src, {})
        if meta["id"] in landscape and meta["id"] in CAPITALS:
            new_landscape[meta["id"]] = landscape[meta["id"]]
        else:
            wonder = parent_ls.get("wonder") if meta["id"] in CAPITALS else None
            res = parent_ls.get("resource") or RES[len(new_recs) % len(RES)]
            if meta["id"] not in CAPITALS:
                res = RES[(RES.index(res) + 1) % len(RES)] if res in RES else "stone"
            new_landscape[meta["id"]] = {
                "terrain": parent_ls.get("terrain") or ("ice" if meta["continent"] == "at" else "mountain"),
                "resource": res,
                "wonder": wonder,
                "fauna": parent_ls.get("fauna") or FAUNA[meta["continent"]],
            }
            if meta["id"] in landscape and landscape[meta["id"]].get("wonder"):
                new_landscape[meta["id"]]["wonder"] = landscape[meta["id"]]["wonder"]

    # restore capital wonders from original landscape
    for cid in CAPITALS:
        if cid in landscape and landscape[cid].get("wonder"):
            new_landscape.setdefault(cid, {})
            new_landscape[cid]["wonder"] = landscape[cid]["wonder"]
            new_landscape[cid]["terrain"] = landscape[cid].get("terrain") or new_landscape[cid].get("terrain")
            new_landscape[cid]["resource"] = landscape[cid].get("resource") or new_landscape[cid].get("resource")
            new_landscape[cid]["fauna"] = landscape[cid].get("fauna") or new_landscape[cid].get("fauna")

    land = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for m in new_masks.values():
        land |= (m > 0).astype(np.uint8)

    by_new = {r["id"]: r for r in new_recs}
    for r in new_recs:
        r["coastal"] = is_coastal(new_masks[r["id"]], land)
    for pid in FORCE_INLAND:
        if pid in by_new:
            by_new[pid]["coastal"] = False
    for pid in FORCE_COASTAL:
        if pid in by_new:
            by_new[pid]["coastal"] = True

    names = [r["name"] for r in new_recs]
    dups = [n for n in names if names.count(n) > 1]
    if dups:
        raise SystemExit(f"duplicate names {dups}")
    ids = [r["id"] for r in new_recs]
    if len(set(ids)) != 220:
        raise SystemExit(f"id count {len(ids)} unique {len(set(ids))}")

    id_list = [r["id"] for r in new_recs]
    index = {pid: i for i, pid in enumerate(id_list)}
    owner = np.full((WORLD_H, WORLD_W), -1, np.int16)
    for pid, mask in new_masks.items():
        owner[mask > 0] = index[pid]
    land_edges: set[tuple[str, str]] = set()
    for y in range(WORLD_H - 1):
        row = owner[y]
        below = owner[y + 1]
        for x in range(WORLD_W - 1):
            a = int(row[x])
            if a < 0:
                continue
            for b in (int(row[x + 1]), int(below[x])):
                if b >= 0 and b != a:
                    u, v = (a, b) if a < b else (b, a)
                    land_edges.add((id_list[u], id_list[v]))
    # wrap date line on the same rows
    for y in range(WORLD_H):
        a = int(owner[y, 0])
        b = int(owner[y, WORLD_W - 1])
        if a >= 0 and b >= 0 and a != b:
            land_edges.add(tuple(sorted((id_list[a], id_list[b]))))  # type: ignore[arg-type]
    for a, b in FORCE_LAND:
        if a in index and b in index:
            land_edges.add(tuple(sorted((a, b))))  # type: ignore[arg-type]

    remapped: set[tuple[str, str]] = set()
    for a, b in sea_old:
        for na in old_to_new.get(a, [a]):
            for nb in old_to_new.get(b, [b]):
                if na == nb or na not in index or nb not in index:
                    continue
                if not by_new[na]["coastal"] or not by_new[nb]["coastal"]:
                    continue
                dx = by_new[na]["labelX"] - by_new[nb]["labelX"]
                dy = by_new[na]["labelY"] - by_new[nb]["labelY"]
                if dx * dx + dy * dy > 320 * 320:
                    continue
                remapped.add(tuple(sorted((na, nb))))  # type: ignore[arg-type]
    sea_edges = {p for p in remapped if p not in land_edges}

    counts = Counter(r["continent"] for r in new_recs)
    print("counts", dict(sorted(counts.items())))
    if any(n != TARGET for n in counts.values()):
        raise SystemExit(f"not even {dict(counts)}")

    write_world(new_recs, land_edges, sea_edges)
    write_lands(new_recs, new_landscape)

    vis = Image.new("RGB", (WORLD_W, WORLD_H), (18, 28, 42))
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    rng = np.random.default_rng(7)
    for r in new_recs:
        col = CONT_COLOR[r["continent"]]
        tint = (*[int(np.clip(c * 0.8 + int(rng.integers(-18, 18)), 0, 255)) for c in col], 160)
        layer = Image.new("RGBA", vis.size, tint)
        overlay.paste(layer, mask=Image.fromarray(new_masks[r["id"]], "L"))
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except Exception:
        font = ImageFont.load_default()
    for r in new_recs:
        d.text((r["labelX"] - 14, r["labelY"] - 6), r["name"], fill=(20, 20, 20, 255), font=font)
    vis.convert("RGB").save(PREVIEW)
    added = [r["id"] for r in new_recs if r["id"] not in by_id]
    print("added", len(added), added)
    print("wrote", WORLD_TS, LANDS_TS, PREVIEW)


if __name__ == "__main__":
    main()
