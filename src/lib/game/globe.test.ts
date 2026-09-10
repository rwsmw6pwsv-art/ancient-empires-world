import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TERRITORIES, TERRITORY_BY_ID, WORLD_W, landNeighbors } from "./world.ts";
import { FLOODED_IDS } from "./flooded.gen.ts";
import { createNewGame } from "./engine.ts";
import {
  CITY_PAD,
  GLOBE_BY_ID,
  GLOBE_HEXES,
  GLOBE_LANDS,
  GLOBE_R,
  LAND_BUFFERS,
  adjacentCellPairs,
  arcPoints,
  hexSpan,
  isGlobeFront,
  meanDir,
  pickHex,
  radialDome,
  rimGap,
  topFacesOut,
  vecFromXy,
} from "./globe.ts";

describe("globe projection", () => {
  it("tiles the whole sphere with land and ocean hexes", () => {
    assert.equal(GLOBE_LANDS.length, TERRITORIES.length);
    assert.equal(new Set(GLOBE_LANDS.map((h) => h.id)).size, TERRITORIES.length);
    const ocean = GLOBE_HEXES.filter((h) => h.kind === "ocean");
    assert.ok(ocean.length > 290, `ocean ${ocean.length}`);
    assert.equal(GLOBE_HEXES.length, 10 * 8 * 8 + 2);
    for (const h of GLOBE_HEXES) {
      const r = Math.hypot(...h.center);
      assert.ok(Math.abs(r - GLOBE_R) < 0.02, `${h.id} r=${r}`);
      assert.ok(h.rim.length === 5 || h.rim.length === 6, `${h.id} sides ${h.rim.length}`);
    }
  });

  it("keeps land and ocean on the same sphere", () => {
    const landR = GLOBE_LANDS.map((h) => Math.hypot(...h.center));
    const seaR = GLOBE_HEXES.filter((h) => h.kind === "ocean").map((h) => Math.hypot(...h.center));
    const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
    assert.ok(Math.abs(avg(landR) - avg(seaR)) < 0.01, "base radius");
    for (const h of GLOBE_HEXES) {
      for (const p of h.rim) {
        assert.ok(Math.abs(Math.hypot(...p) - GLOBE_R) < 0.02, h.id);
      }
    }
  });

  it("keeps polar hexes the same size as equatorial hexes", () => {
    const spans = GLOBE_HEXES.map((h) => hexSpan(h));
    const min = Math.min(...spans);
    const max = Math.max(...spans);
    assert.ok(max / min < 1.6, `span ratio ${max / min}`);
    const polar = GLOBE_HEXES.filter((h) => Math.abs(h.center[1]) > GLOBE_R * 0.82);
    const equator = GLOBE_HEXES.filter((h) => Math.abs(h.center[1]) < GLOBE_R * 0.25);
    assert.ok(polar.length > 8 && equator.length > 20);
    const pAvg = polar.reduce((s, h) => s + hexSpan(h), 0) / polar.length;
    const eAvg = equator.reduce((s, h) => s + hexSpan(h), 0) / equator.length;
    assert.ok(Math.abs(pAvg - eAvg) / eAvg < 0.28, `polar ${pAvg} equator ${eAvg}`);
  });

  it("wraps East Asia against West America", () => {
    const east = GLOBE_BY_ID.sakhalin;
    const west = GLOBE_BY_ID.dakota;
    assert.ok(east && west);
    const flat = Math.hypot(east.cx - west.cx, east.cy - west.cy);
    assert.ok(flat / WORLD_W > 0.85, "2D map keeps them on opposite edges");
    const d3 = Math.hypot(
      east.center[0] - west.center[0],
      east.center[1] - west.center[1],
      east.center[2] - west.center[2],
    );
    assert.ok(d3 < GLOBE_R * 1.1, `globe gap ${d3} should sit across the Pacific seam`);
  });

  it("shares rims between neighbouring cells", () => {
    const pairs = adjacentCellPairs();
    assert.ok(pairs.length > 1500, `adjacent ${pairs.length}`);
    let shared = 0;
    for (const [a, b] of pairs.slice(0, 400)) {
      if (rimGap(a, b) < 0.002) shared++;
    }
    assert.ok(shared > 350, `shared ${shared}`);
  });

  it("hex tops face outward and sit on the sphere", () => {
    let out = 0;
    for (const h of GLOBE_HEXES) {
      if (topFacesOut(h)) out++;
      assert.ok(radialDome(h) < 0.08, `${h.id} dome ${radialDome(h)}`);
    }
    assert.ok(out > GLOBE_HEXES.length * 0.95, `outward ${out}`);
  });

  it("builds a short great-circle hop instead of cutting through the globe", () => {
    const a = GLOBE_BY_ID.sakhalin.center;
    const b = GLOBE_BY_ID.dakota.center;
    const pts = arcPoints(a, b, 24);
    assert.equal(pts.length, 25);
    for (const p of pts) {
      const r = Math.hypot(...p);
      assert.ok(r > GLOBE_R * 0.95 && r < GLOBE_R * 1.12, `r=${r}`);
    }
  });

  it("picks the land or ocean under a surface point", () => {
    const h = GLOBE_BY_ID.sumer;
    assert.equal(pickHex(h.center), "sumer");
    const sea = GLOBE_HEXES.find((x) => x.kind === "ocean")!;
    assert.equal(pickHex(sea.center), sea.id);
    assert.equal(LAND_BUFFERS.faceHex.length, LAND_BUFFERS.indices.length / 3);
  });

  it("home focus points at owned lands", () => {
    const dir = meanDir(["sumer", "persia"]);
    const l = Math.hypot(...dir);
    assert.ok(Math.abs(l - 1) < 1e-6);
    const s = GLOBE_BY_ID.sumer.center;
    const d = dir[0] * s[0] + dir[1] * s[1] + dir[2] * s[2];
    assert.ok(d > 0);
  });

  it("hides names on the far side of the globe", () => {
    const seat = GLOBE_BY_ID.rockies.center;
    const len = Math.hypot(...seat) || 1;
    const dist = GLOBE_R * 2.35;
    const cam: [number, number, number] = [(seat[0] / len) * dist, (seat[1] / len) * dist + 0.35, (seat[2] / len) * dist];
    assert.equal(isGlobeFront(cam, seat), true);
    assert.equal(isGlobeFront(cam, CITY_PAD.rockies!), true);
    assert.equal(isGlobeFront(cam, GLOBE_BY_ID.darfur.center), false);
    assert.equal(isGlobeFront(cam, GLOBE_BY_ID.sumer.center), false);
    assert.equal(isGlobeFront(cam, GLOBE_BY_ID.tasmania.center), false);
    assert.equal(isGlobeFront(cam, GLOBE_BY_ID.asgard.center), false);
    const back: [number, number, number] = [-seat[0], -seat[1], -seat[2]];
    assert.equal(isGlobeFront(cam, back), false);
  });

  it("projects the date line to one meridian", () => {
    const left = vecFromXy(0, 204);
    const right = vecFromXy(WORLD_W, 204);
    const d = Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
    assert.ok(d < 1e-6, `seam ${d}`);
  });

  it("does not stretch the map across the Pacific date line", () => {
    const { uvs, indices } = LAND_BUFFERS;
    let bad = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const us = [0, 1, 2].map((k) => uvs[indices[i + k]! * 2]!);
      if (Math.max(...us) - Math.min(...us) > 0.5) bad++;
    }
    assert.equal(bad, 0, `date-line triangles ${bad}`);
  });

  it("leaves the open North Pacific as ocean", () => {
    for (const h of GLOBE_LANDS) {
      const lat = (Math.asin(Math.min(1, Math.max(-1, h.center[1] / GLOBE_R))) * 180) / Math.PI;
      const lon = (Math.atan2(h.center[0], h.center[2]) * 180) / Math.PI;
      assert.ok(
        !(lat < 53 && lat > 8 && Math.abs(lon) > 150),
        `${h.id} sits in the open Pacific at ${lon.toFixed(1)}, ${lat.toFixed(1)}`,
      );
    }
  });

  it("leaves the north polar sea as ocean", () => {
    for (const id of FLOODED_IDS) {
      assert.equal(TERRITORY_BY_ID[id], undefined, id);
      assert.equal(GLOBE_BY_ID[id], undefined, id);
    }
    for (const h of GLOBE_LANDS) {
      const lat = (Math.asin(Math.min(1, Math.max(-1, h.center[1] / GLOBE_R))) * 180) / Math.PI;
      assert.ok(lat < 72, `${h.id} sits at ${lat.toFixed(1)}N`);
    }
  });

  it("keeps the Bering land bridge as a neighbour", () => {
    assert.ok(landNeighbors("beringia").includes("kamchatka"));
    assert.ok(TERRITORY_BY_ID.dakota.continent === "nw");
  });

  it("makes leftover continent hexes playable tribal lands", () => {
    assert.ok(GLOBE_BY_ID.clanne01);
    assert.equal(GLOBE_BY_ID.clanne01.kind, "land");
    assert.ok(landNeighbors("clanne01").length >= 1);
    for (const t of TERRITORIES) {
      if (!t.id.startsWith("clan")) continue;
      assert.ok(GLOBE_BY_ID[t.id], t.id);
      assert.ok(landNeighbors(t.id).length >= 1, t.id);
    }
  });

  it("seeds ocean hexes as open waters", () => {
    const state = createNewGame({ empire: "asgard", difficulty: "easy", opening: "capital", seed: 7 });
    const seas = GLOBE_HEXES.filter((h) => h.kind === "ocean");
    assert.ok(seas.length > 290);
    assert.equal(Object.keys(state.territories).length, TERRITORIES.length + seas.length);
    for (const h of GLOBE_HEXES) {
      const t = state.territories[h.id];
      assert.ok(t, h.id);
      if (h.kind === "land") {
        assert.equal(typeof t.road, "boolean");
      } else {
        assert.equal(t.owner, "open");
        assert.equal(t.levy, 0);
        assert.equal(t.warships ?? 0, 0);
      }
    }
  });
});
