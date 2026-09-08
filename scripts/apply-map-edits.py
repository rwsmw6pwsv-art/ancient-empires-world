#!/usr/bin/env python3
"""Apply the requested border, continent, capital and rename edits in place."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
WORLD_TS = ROOT / "src/lib/game/world.ts"
LANDS_TS = ROOT / "src/lib/game/lands.gen.ts"
PREVIEW = ROOT / "screenshots/provinces.png"
WORLD_W, WORLD_H = 1680, 1260

# Display names. Ids stay stable.
RENAME = {
    "nile": "Aegean",
    "iberia": "Gaul",
    "atlas": "Iberia",
    "sirte": "Grecia",
    "egypt": "Thebes",
    "sahel": "Egypt",
    "mayan": "Anahuac",
    "volcan": "Mayan",
    "shangrila": "Kailash",
    "irrawaddy": "Shangri-La",
    "kunlun": "Qilian",
    "gobi": "Kunlun",
}

# Continent moves (after Atlas top stays `atlas` but in Europe).
MOVE_CONT = {
    "nile": "eu",
    "sirte": "eu",
    "atlas": "eu",
    "peninsula": "sa",
    "wilkes": "oc",
    "eldorado": "ca",
    "orinoco": "ca",
    "congo": "an",
    "rift": "an",
    "kilimanjaro": "an",
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
    dil = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    ring = (dil > 0) & (mask == 0)
    return bool(((land == 0) & ring).any())


def land_touch(a: np.ndarray, b: np.ndarray) -> bool:
    dil = cv2.dilate(a, np.ones((3, 3), np.uint8))
    return bool((dil & b).any())


def main() -> None:
    text = WORLD_TS.read_text()
    recs = parse_territories(text)
    assert len(recs) == 110, len(recs)
    by_id = {r["id"]: r for r in recs}
    land_edges = parse_edges(text, "LAND_EDGES")
    sea_edges = parse_edges(text, "SEA_EDGES")

    masks = {r["id"]: fill_mask(r["path"]) for r in recs}
    land = np.zeros((WORLD_H, WORLD_W), np.uint8)
    for m in masks.values():
        land |= (m > 0).astype(np.uint8)

    # Split Atlas: northern half becomes European Iberia, southern half joins Maghreb.
    atlas = masks["atlas"]
    magh = masks["maghreb"]
    ys = np.where(atlas > 0)[0]
    split_y = int(np.median(ys))
    top = atlas.copy()
    top[split_y:, :] = 0
    bot = atlas.copy()
    bot[:split_y, :] = 0
    # Clean specks.
    k = np.ones((3, 3), np.uint8)
    top = cv2.morphologyEx(top, cv2.MORPH_OPEN, k)
    bot = cv2.morphologyEx(bot, cv2.MORPH_OPEN, k)
    magh = cv2.morphologyEx(magh | bot, cv2.MORPH_CLOSE, k)
    if int(top.sum() / 255) < 80:
        raise SystemExit(f"atlas top too small {int(top.sum()/255)}")
    masks["atlas"] = top
    masks["maghreb"] = magh
    print(f"atlas split at y={split_y} top={int(top.sum()/255)} bot={int(bot.sum()/255)} maghreb={int(magh.sum()/255)}")

    # Shrink South Africa's west-coast overreach: northern Namib joins Guinea.
    namib = masks["namib"]
    guinea = masks["guinea"]
    namib_y = np.where(namib > 0)[0]
    if len(namib_y):
        cut = 600
        north = namib.copy()
        north[cut:, :] = 0
        south = namib.copy()
        south[:cut, :] = 0
        south_px = int(south.sum() / 255)
        north_px = int(north.sum() / 255)
        if south_px >= 200 and north_px >= 80:
            masks["guinea"] = guinea | north
            masks["namib"] = south
            print(f"namib cut y={cut} south={south_px} north_to_guinea={north_px}")
        else:
            print(f"namib left whole south={south_px} north={north_px}")

    # Okavango northern fringe joins Congo (now North Africa).
    oka = masks["okavango"]
    congo = masks["congo"]
    if oka.any():
        cut = 610
        north = oka.copy()
        north[cut:, :] = 0
        south = oka.copy()
        south[:cut, :] = 0
        south_px = int(south.sum() / 255)
        north_px = int(north.sum() / 255)
        if south_px >= 200 and north_px >= 80:
            masks["congo"] = congo | north
            masks["okavango"] = south
            print(f"okavango cut y={cut} south={south_px} north_to_congo={north_px}")
        else:
            print(f"okavango left whole south={south_px} north={north_px}")

    changed = {"atlas", "maghreb", "namib", "guinea", "okavango", "congo"}
    for pid in changed:
        mask = masks[pid]
        rec = by_id[pid]
        rec["path"] = contour_path(mask)
        lx, ly = centroid(mask)
        rec["labelX"] = round(lx, 1)
        rec["labelY"] = round(ly, 1)
        rec["coastal"] = is_coastal(mask, land)
        print(pid, "area", int(mask.sum() / 255), "label", rec["labelX"], rec["labelY"], "coastal", rec["coastal"])

    # Apply renames + continents.
    for r in recs:
        if r["id"] in RENAME:
            r["name"] = RENAME[r["id"]]
        if r["id"] in MOVE_CONT:
            r["continent"] = MOVE_CONT[r["id"]]

    names = [r["name"] for r in recs]
    dups = [n for n in names if names.count(n) > 1]
    if dups:
        raise SystemExit(f"duplicate names {dups}")

    # Rebuild land edges that touch a changed polygon.
    for a, b in list(land_edges):
        if a in changed or b in changed:
            land_edges.discard((a, b))
    for pid in changed:
        m = masks[pid]
        for other, om in masks.items():
            if other == pid:
                continue
            if land_touch(m, om):
                land_edges.add(tuple(sorted((pid, other))))  # type: ignore[arg-type]
    # Split pair and Gibraltar must stay walkable.
    land_edges.add(tuple(sorted(("atlas", "maghreb"))))
    land_edges.add(tuple(sorted(("atlas", "iberia"))))
    land_edges.add(tuple(sorted(("iberia", "rhine"))))

    # Gobi is the Kunlun seat — keep it a mine land even if the poly nicks a coast.
    by_id["gobi"]["coastal"] = False

    # Write world.ts
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

    # Landscape: keep existing terrain/resource; move wonders; restamp fauna on continent moves.
    lands_text = LANDS_TS.read_text()
    existing: dict[str, dict] = {}
    for m in re.finditer(
        r"(\w+): \{ terrain: \"([^\"]+)\", resource: \"([^\"]+)\"(?:, wonder: \"([^\"]+)\")?, fauna: \"([^\"]+)\" \}",
        lands_text,
    ):
        existing[m.group(1)] = {
            "terrain": m.group(2),
            "resource": m.group(3),
            "wonder": m.group(4),
            "fauna": m.group(5),
        }

    lines = [
        "export const LANDSCAPE_GEN = {\n",
    ]
    for r in recs:
        old = existing.get(r["id"], {})
        terrain = old.get("terrain") or "grass"
        resource = old.get("resource") or "food"
        fauna = old.get("fauna") or FAUNA[r["continent"]]
        if r["id"] in MOVE_CONT:
            fauna = FAUNA[r["continent"]]
            if r["id"] == "peninsula":
                fauna = "llama"
                terrain = "ice"
            if r["id"] == "wilkes":
                fauna = "kangaroo"
            if r["id"] == "eldorado":
                fauna = "jaguar"
            if r["id"] == "orinoco":
                fauna = "jaguar"
        wonder = WONDER.get(r["id"])
        extra = f', wonder: "{wonder}"' if wonder else ""
        lines.append(
            f'  {r["id"]}: {{ terrain: "{terrain}", resource: "{resource}"{extra}, fauna: "{fauna}" }},\n'
        )
    lines.append("};\n\n")
    lines.append('export const OCEAN_LABELS: { name: string; x: number; y: number }[] = [\n')
    lines.append('  { name: "ARCTIC OCEAN", x: 780, y: 40 },\n')
    lines.append('  { name: "PACIFIC OCEAN", x: 90, y: 520 },\n')
    lines.append('  { name: "PACIFIC OCEAN", x: 1580, y: 480 },\n')
    lines.append('  { name: "ATLANTIC OCEAN", x: 560, y: 480 },\n')
    lines.append('  { name: "INDIAN OCEAN", x: 1180, y: 720 },\n')
    lines.append('  { name: "SOUTHERN OCEAN", x: 840, y: 920 },\n')
    lines.append("];\n")
    LANDS_TS.write_text("".join(lines))

    # Preview
    vis = Image.new("RGB", (WORLD_W, WORLD_H), (18, 28, 48))
    overlay = Image.new("RGBA", vis.size, (0, 0, 0, 0))
    rng = np.random.default_rng(7)
    for r in recs:
        col = CONT_COLOR[r["continent"]]
        tint = (*[int(max(0, min(255, c + int(rng.integers(-18, 18))))) for c in col], 140)
        mask = Image.fromarray(masks[r["id"]], "L")
        layer = Image.new("RGBA", vis.size, tint)
        overlay.paste(layer, mask=mask)
    vis = Image.alpha_composite(vis.convert("RGBA"), overlay)
    d = ImageDraw.Draw(vis)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        font_b = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
    except Exception:
        font = ImageFont.load_default()
        font_b = font
    capitals = {"atlantis", "irrawaddy", "pantanal", "volcan", "asgard", "gobi", "sahel", "sumer", "karoo", "sahul", "nord"}
    for r in recs:
        f = font_b if r["id"] in capitals else font
        fill = (10, 10, 10, 255)
        d.text((r["labelX"] - 16, r["labelY"] - 6), r["name"], fill=fill, font=f)
    vis.convert("RGB").save(PREVIEW)

    by_c: dict[str, int] = defaultdict(int)
    for r in recs:
        by_c[r["continent"]] += 1
    print("counts", dict(sorted(by_c.items())))
    print("wrote", WORLD_TS, LANDS_TS, PREVIEW)


if __name__ == "__main__":
    main()
