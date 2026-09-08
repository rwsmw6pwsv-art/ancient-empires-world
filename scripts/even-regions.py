#!/usr/bin/env python3
"""Even every region to ten lands: merge the smallest extras, split the largest shorts."""
from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
WORLD_TS = ROOT / "src/lib/game/world.ts"
LANDS_TS = ROOT / "src/lib/game/lands.gen.ts"
PREVIEW = ROOT / "screenshots/provinces.png"
WORLD_W, WORLD_H = 1680, 1260

# Absorb source into dest (source id disappears).
MERGES = [
    ("doggerland", "rhine"),
    ("danube", "alps"),
    ("baltic", "fjords"),
    ("reefs", "caribbean"),
    ("gulf", "yucatan"),
    ("polynesia", "barrier"),
]

# Split parent into parent + new land. New half is east (x) or south (y).
SPLITS = [
    ("ross", "adelie", "Adelie", "x"),
    ("amundsen", "byrd", "Byrd", "x"),
    ("patagonia", "magellan", "Magellan", "y"),
    ("drakensberg", "natal", "Natal", "x"),
    ("zambezi", "limpopo", "Limpopo", "y"),
    ("kalahari", "highveld", "Highveld", "x"),
]

FORCE_LAND = [
    ("beringia", "kamchatka"),
    ("atlas", "iberia"),
    ("atlas", "maghreb"),
    ("atlas", "alps"),
    ("peninsula", "patagonia"),
    ("ross", "adelie"),
    ("amundsen", "byrd"),
    ("patagonia", "magellan"),
    ("drakensberg", "natal"),
    ("zambezi", "limpopo"),
    ("kalahari", "highveld"),
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


def parse_territories(text: str) -> list[dict]:
    recs = []
    for m in re.finditer(
        r'\{\s*"id": "([^"]+)",\s*"name": "([^"]+)",\s*"continent": "([^"]+)",\s*'
        r'"coastal": (true|false),\s*"path": "([^"]*)",\s*"labelX": ([0-9.]+),\s*"labelY": ([0-9.]+)\s*\}',
        text,
    ):
        recs.append({
            "id": m.group(1),
            "name": m.group(2),
            "continent": m.group(3),
            "coastal": m.group(4) == "true",
            "path": m.group(5),
            "labelX": float(m.group(6)),
            "labelY": float(m.group(7)),
        })
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
    cnts = [c for c in cnts if cv2.contourArea(c) >= 20]
    cnts.sort(key=cv2.contourArea, reverse=True)
    parts = []
    for c in cnts:
        eps = max(1.2, 0.003 * cv2.arcLength(c, True))
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


def split_mask(mask: np.ndarray, axis: str) -> tuple[np.ndarray, np.ndarray]:
    yy, xx = np.where(mask > 0)
    if axis == "x":
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


def main() -> None:
    text = WORLD_TS.read_text()
    recs = parse_territories(text)
    assert len(recs) == 110, len(recs)
    by_id = {r["id"]: r for r in recs}
    sea_edges = parse_edges(text, "SEA_EDGES")
    landscape = parse_landscape(LANDS_TS.read_text())

    masks = {r["id"]: fill_mask(r["path"]) for r in recs}

    absorb: dict[str, str] = {}
    for src, dst in MERGES:
        if src not in masks or dst not in masks:
            raise SystemExit(f"merge missing {src}->{dst}")
        masks[dst] = masks[dst] | masks[src]
        del masks[src]
        absorb[src] = dst
        recs = [r for r in recs if r["id"] != src]
        landscape.pop(src, None)
        print(f"merge {src} -> {dst} area={int(masks[dst].sum()/255)}")

    by_id = {r["id"]: r for r in recs}

    for parent, nid, nname, axis in SPLITS:
        keep, new = split_mask(masks[parent], axis)
        ka, na = int(keep.sum() / 255), int(new.sum() / 255)
        if ka < 80 or na < 80:
            raise SystemExit(f"split {parent} too small keep={ka} new={na}")
        masks[parent] = keep
        masks[nid] = new
        prec = by_id[parent]
        recs.insert(
            recs.index(prec) + 1,
            {
                "id": nid,
                "name": nname,
                "continent": prec["continent"],
                "coastal": True,
                "path": "",
                "labelX": 0.0,
                "labelY": 0.0,
            },
        )
        parent_ls = landscape.get(parent, {})
        landscape[nid] = {
            "terrain": parent_ls.get("terrain", "mountain"),
            "resource": RES[(RES.index(parent_ls["resource"]) + 1) % len(RES)] if parent_ls.get("resource") in RES else "stone",
            "wonder": None,
            "fauna": parent_ls.get("fauna") or FAUNA[prec["continent"]],
        }
        print(f"split {parent} + {nid} keep={ka} new={na} axis={axis}")

    by_id = {r["id"]: r for r in recs}
    assert len(recs) == 110, len(recs)
    assert len(masks) == 110, len(masks)

    land = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for m in masks.values():
        land |= (m > 0).astype(np.uint8)

    for r in recs:
        mask = masks[r["id"]]
        path = contour_path(mask)
        if not path:
            raise SystemExit(f"empty path {r['id']}")
        r["path"] = path
        lx, ly = centroid(mask)
        r["labelX"] = round(lx, 1)
        r["labelY"] = round(ly, 1)
        r["coastal"] = is_coastal(mask, land)
    for pid in ("gobi", "kunlun", "pantanal"):
        by_id[pid]["coastal"] = False
    for pid in ("sahul", "tasmania"):
        by_id[pid]["coastal"] = True

    names = [r["name"] for r in recs]
    dups = [n for n in names if names.count(n) > 1]
    if dups:
        raise SystemExit(f"duplicate names {dups}")

    # Land adjacency from owner raster.
    id_list = [r["id"] for r in recs]
    index = {pid: i for i, pid in enumerate(id_list)}
    owner = np.full((WORLD_H, WORLD_W), -1, np.int16)
    for pid, mask in masks.items():
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
    for a, b in FORCE_LAND:
        if a in index and b in index:
            land_edges.add(tuple(sorted((a, b))))  # type: ignore[arg-type]

    # Remap sea edges through merges; copy parent sea links onto split children.
    remapped: set[tuple[str, str]] = set()
    for a, b in sea_edges:
        a2, b2 = absorb.get(a, a), absorb.get(b, b)
        if a2 == b2 or a2 not in index or b2 not in index:
            continue
        remapped.add(tuple(sorted((a2, b2))))  # type: ignore[arg-type]
    parent_of_new = {nid: parent for parent, nid, *_ in SPLITS}
    extra: set[tuple[str, str]] = set()
    for a, b in remapped:
        for p, n in parent_of_new.items():
            if a == p and by_id[n]["coastal"]:
                extra.add(tuple(sorted((n, b))))  # type: ignore[arg-type]
            if b == p and by_id[n]["coastal"]:
                extra.add(tuple(sorted((a, n))))  # type: ignore[arg-type]
    sea_edges = remapped | extra

    from collections import Counter
    counts = Counter(r["continent"] for r in recs)
    print("counts", dict(sorted(counts.items())))
    if any(n != 10 for n in counts.values()):
        raise SystemExit(f"not even {dict(counts)}")

    write_world(recs, land_edges, sea_edges)
    write_lands(recs, landscape)

    vis = Image.new("RGB", (WORLD_W, WORLD_H), (18, 28, 42))
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    rng = np.random.default_rng(7)
    for r in recs:
        col = CONT_COLOR[r["continent"]]
        tint = (*[int(np.clip(c * 0.8 + int(rng.integers(-18, 18)), 0, 255)) for c in col], 160)
        layer = Image.new("RGBA", vis.size, tint)
        overlay.paste(layer, mask=Image.fromarray(masks[r["id"]], "L"))
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except Exception:
        font = ImageFont.load_default()
    for r in recs:
        d.text((r["labelX"] - 16, r["labelY"] - 6), r["name"], fill=(20, 20, 20, 255), font=font)
    vis.convert("RGB").save(PREVIEW)
    print("wrote", WORLD_TS, LANDS_TS, PREVIEW)


if __name__ == "__main__":
    main()
