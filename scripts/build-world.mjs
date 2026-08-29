#!/usr/bin/env node
import fs from "node:fs";

const WORLD_W = 1680;
const WORLD_H = 920;
const MIN_LON = -172;
const MAX_LON = 192;
const MIN_LAT = -47;
const MAX_LAT = 84;

const g = JSON.parse(fs.readFileSync("/tmp/ne.json", "utf8"));

const PROVINCES = [
  { id: "alaska", name: "Alaska", continent: "na", boxes: [[-180, 51, -130, 72], [170, 51, 180, 72]] },
  { id: "yukon", name: "Yukon", continent: "na", boxes: [[-141, 54, -110, 72]] },
  { id: "hudson", name: "Hudson", continent: "na", boxes: [[-110, 50, -78, 70]] },
  { id: "labrador", name: "Labrador", continent: "na", boxes: [[-78, 47, -52, 63]] },
  { id: "greenland", name: "Greenland", continent: "na", boxes: [[-75, 58, -10, 84]] },
  { id: "cascade", name: "Cascadia", continent: "na", boxes: [[-130, 42, -110, 54]] },
  { id: "prairie", name: "Prairie", continent: "na", boxes: [[-115, 42, -95, 54]] },
  { id: "heartland", name: "Heartland", continent: "na", boxes: [[-104, 35, -82, 49]] },
  { id: "seaboard", name: "Seaboard", continent: "na", boxes: [[-82, 25, -64, 48]] },
  { id: "hawaii", name: "Hawaii", continent: "ca", boxes: [[-162, 18, -154, 23]] },
  { id: "texas", name: "Texas", continent: "ca", boxes: [[-107, 25.5, -93, 36.6]] },
  { id: "sierra", name: "Sierra", continent: "ca", boxes: [[-125, 31, -107, 42.2]] },
  { id: "mexico", name: "Mexico", continent: "ca", boxes: [[-118, 14, -96, 32.6]] },
  { id: "yucatan", name: "Yucatan", continent: "ca", boxes: [[-92.5, 15.5, -86.5, 22]] },
  { id: "panama", name: "Panama", continent: "ca", boxes: [[-93, 7, -77, 18]] },
  { id: "caribbean", name: "Caribbean", continent: "ca", boxes: [[-85, 10, -59, 28]] },
  { id: "grenada", name: "Granada", continent: "sa", boxes: [[-79, -5, -59, 13]] },
  { id: "amazon", name: "Amazon", continent: "sa", boxes: [[-75, -10, -54, 5]] },
  { id: "guiana", name: "Guiana", continent: "sa", boxes: [[-62, -2, -50, 9]] },
  { id: "andes", name: "Andes", continent: "sa", boxes: [[-82, -28, -62, 2]] },
  { id: "cerrado", name: "Cerrado", continent: "sa", boxes: [[-62, -20, -45, -2]] },
  { id: "brazil", name: "Brazil", continent: "sa", boxes: [[-48, -30, -34, -2]] },
  { id: "pampas", name: "Pampas", continent: "sa", boxes: [[-70, -40, -50, -22]] },
  { id: "patagonia", name: "Patagonia", continent: "sa", boxes: [[-76, -56, -53, -38]] },
  { id: "fjords", name: "Fjords", continent: "eu", boxes: [[4, 54, 32, 72]] },
  { id: "highlands", name: "Highlands", continent: "eu", boxes: [[-11, 49, 2, 61]] },
  { id: "gaul", name: "Gaul", continent: "eu", boxes: [[-5, 42, 8, 54]] },
  { id: "rhine", name: "Rhine", continent: "eu", boxes: [[5, 45, 20, 55]] },
  { id: "slavic", name: "Slavic", continent: "eu", boxes: [[19, 44, 40, 60]] },
  { id: "iberia", name: "Iberia", continent: "eu", boxes: [[-10, 35.5, 4, 44]] },
  { id: "roma", name: "Roma", continent: "eu", boxes: [[6, 36, 19, 47]] },
  { id: "balkans", name: "Balkans", continent: "eu", boxes: [[13, 34, 30, 46]] },
  { id: "volga", name: "Volga", continent: "eu", boxes: [[32, 46, 60, 62]] },
  { id: "maghreb", name: "Maghreb", continent: "af", boxes: [[-18, 18, 25, 38]] },
  { id: "nile", name: "Egypt", continent: "af", boxes: [[24, 21, 37, 32]] },
  { id: "guinea", name: "Guinea", continent: "af", boxes: [[-18, 0, 16, 20]] },
  { id: "congo", name: "Congo", continent: "af", boxes: [[8, -6, 32, 8]] },
  { id: "horn", name: "Horn", continent: "af", boxes: [[32, -5, 52, 18]] },
  { id: "rift", name: "Rift", continent: "af", boxes: [[10, -18, 42, 2]] },
  { id: "cape", name: "Cape", continent: "af", boxes: [[11, -36, 33, -16]] },
  { id: "madagascar", name: "Madagascar", continent: "af", boxes: [[42, -27, 51, -11]] },
  { id: "anatolia", name: "Anatolia", continent: "me", boxes: [[26, 36, 45, 43]] },
  { id: "arabia", name: "Arabia", continent: "me", boxes: [[34, 12, 60, 32]] },
  { id: "gulf", name: "Gulf", continent: "me", boxes: [[46, 22, 57, 31]] },
  { id: "mesopotamia", name: "Babylon", continent: "me", boxes: [[35, 29, 49, 38]] },
  { id: "persia", name: "Persia", continent: "me", boxes: [[44, 25, 64, 34]] },
  { id: "armenia", name: "Armenia", continent: "me", boxes: [[40, 37, 50, 43.5]] },
  { id: "media", name: "Media", continent: "me", boxes: [[44, 33, 61, 40]] },
  { id: "steppe", name: "Steppe", continent: "me", boxes: [[46, 35, 87, 55]] },
  { id: "siberia", name: "Siberia", continent: "as", boxes: [[60, 50, 120, 76]] },
  { id: "yakutia", name: "Yakutia", continent: "as", boxes: [[120, 50, 180, 76]] },
  { id: "gobi", name: "Gobi", continent: "as", boxes: [[87, 37, 120, 52]] },
  { id: "nippon", name: "Nippon", continent: "as", boxes: [[128, 24, 146, 46]] },
  { id: "cathay", name: "Cathay", continent: "as", boxes: [[108, 30, 135, 44]] },
  { id: "canton", name: "Canton", continent: "as", boxes: [[105, 18, 123, 32]] },
  { id: "india", name: "India", continent: "as", boxes: [[68, 6, 90, 36]] },
  { id: "indochina", name: "Indochina", continent: "as", boxes: [[92, 5, 110, 29]] },
  { id: "malaya", name: "Malaya", continent: "oc", boxes: [[94, -9, 128, 8]] },
  { id: "papua", name: "Papua", continent: "oc", boxes: [[128, -12, 155, 0]] },
  { id: "outback", name: "Outback", continent: "oc", boxes: [[132, -32, 146, -12]] },
  { id: "westralia", name: "Westralia", continent: "oc", boxes: [[112, -36, 132, -13]] },
  { id: "coral", name: "Coral Coast", continent: "oc", boxes: [[146, -39, 154, -12]] },
  { id: "aotearoa", name: "Aotearoa", continent: "oc", boxes: [[165, -48, 179, -34]] },
  { id: "polynesia", name: "Polynesia", continent: "oc", boxes: [[160, -22, 180, -8]] },
  { id: "tasmania", name: "Tasmania", continent: "oc", boxes: [[144, -44, 149, -40]] },
];

const COUNTRY_FORCE = {
  Greenland: "greenland", Iceland: "highlands", Ireland: "highlands", "United Kingdom": "highlands",
  Norway: "fjords", Sweden: "fjords", Finland: "fjords", Denmark: "fjords",
  France: "gaul", Belgium: "gaul", Netherlands: "gaul", Switzerland: "gaul", Luxembourg: "gaul",
  Spain: "iberia", Portugal: "iberia", Italy: "roma",
  Germany: "rhine", Austria: "rhine", Czechia: "rhine", Poland: "rhine", Slovakia: "rhine",
  Greece: "balkans", Albania: "balkans", Bulgaria: "balkans", Romania: "balkans", Hungary: "balkans",
  "Bosnia and Herzegovina": "balkans", Croatia: "balkans", Slovenia: "balkans", Montenegro: "balkans",
  Kosovo: "balkans", "North Macedonia": "balkans", "Republic of Serbia": "balkans", Moldova: "balkans",
  Ukraine: "slavic", Belarus: "slavic", Lithuania: "slavic", Latvia: "slavic", Estonia: "slavic",
  Turkey: "anatolia", Cyprus: "anatolia", "Northern Cyprus": "anatolia",
  Syria: "mesopotamia", Lebanon: "mesopotamia", Israel: "mesopotamia", Palestine: "mesopotamia",
  Jordan: "mesopotamia", Iraq: "mesopotamia",
  "Saudi Arabia": "arabia", Yemen: "arabia", Oman: "arabia",
  Kuwait: "gulf", Qatar: "gulf", "United Arab Emirates": "gulf",
  Iran: "persia", Afghanistan: "media", Armenia: "armenia", Georgia: "armenia", Azerbaijan: "armenia",
  Kazakhstan: "steppe", Uzbekistan: "steppe", Turkmenistan: "steppe", Kyrgyzstan: "steppe", Tajikistan: "steppe",
  Egypt: "nile", Libya: "maghreb", Tunisia: "maghreb", Algeria: "maghreb", Morocco: "maghreb", "Western Sahara": "maghreb",
  Madagascar: "madagascar", "South Africa": "cape", Lesotho: "cape", eSwatini: "cape", Namibia: "cape",
  Botswana: "rift", Zimbabwe: "rift", Mozambique: "rift", Zambia: "rift", Malawi: "rift", Angola: "rift",
  "United Republic of Tanzania": "rift",
  Ethiopia: "horn", Somalia: "horn", Somaliland: "horn", Djibouti: "horn", Eritrea: "horn", Kenya: "horn",
  "South Sudan": "horn", Sudan: "horn", Uganda: "horn",
  "Democratic Republic of the Congo": "congo", "Republic of the Congo": "congo", Gabon: "congo",
  Chad: "congo", "Central African Republic": "congo", Rwanda: "congo", Burundi: "congo",
  Cameroon: "guinea", Nigeria: "guinea", Ghana: "guinea", "Ivory Coast": "guinea", Senegal: "guinea",
  Mali: "guinea", Niger: "guinea", Guinea: "guinea", "Guinea-Bissau": "guinea", Liberia: "guinea",
  "Sierra Leone": "guinea", Togo: "guinea", Benin: "guinea", "Burkina Faso": "guinea", Mauritania: "guinea",
  Gambia: "guinea", "Equatorial Guinea": "guinea",
  India: "india", "Sri Lanka": "india", Nepal: "india", Bhutan: "india", Bangladesh: "india", Pakistan: "india",
  Myanmar: "indochina", Thailand: "indochina", Laos: "indochina", Cambodia: "indochina", Vietnam: "indochina",
  Malaysia: "malaya", Brunei: "malaya", Philippines: "malaya",
  "East Timor": "papua", "Papua New Guinea": "papua", "Solomon Islands": "papua",
  Mongolia: "gobi", Japan: "nippon", Taiwan: "nippon", "South Korea": "nippon", "North Korea": "cathay",
  Belize: "yucatan", Guatemala: "panama", Honduras: "panama", Nicaragua: "panama", "El Salvador": "panama",
  "Costa Rica": "panama", Panama: "panama",
  Cuba: "caribbean", Haiti: "caribbean", "Dominican Republic": "caribbean", Jamaica: "caribbean",
  "The Bahamas": "caribbean", "Puerto Rico": "caribbean", "Trinidad and Tobago": "caribbean",
  Colombia: "grenada", Venezuela: "grenada", Guyana: "guiana", Suriname: "guiana",
  Ecuador: "andes", Peru: "andes", Bolivia: "andes",
  Uruguay: "pampas", Paraguay: "cerrado",
  "New Zealand": "aotearoa", Fiji: "polynesia", Vanuatu: "polynesia", "New Caledonia": "polynesia",
  "Falkland Islands": "patagonia",
};

const SPLIT = {
  "United States of America": ["hawaii", "alaska", "cascade", "sierra", "texas", "seaboard", "prairie", "heartland"],
  Canada: ["yukon", "labrador", "cascade", "prairie", "hudson"],
  Russia: ["volga", "yakutia", "siberia"],
  China: ["gobi", "canton", "cathay"],
  Brazil: ["brazil", "guiana", "amazon", "cerrado"],
  Australia: ["tasmania", "westralia", "coral", "outback"],
  Argentina: ["patagonia", "pampas"],
  Chile: ["patagonia", "andes"],
  Mexico: ["yucatan", "sierra", "mexico"],
  Indonesia: ["papua", "malaya"],
};

function project(lon, lat) {
  let x = lon;
  if (x < MIN_LON) x += 360;
  if (x > MAX_LON) x -= 360;
  const px = ((x - MIN_LON) / (MAX_LON - MIN_LON)) * WORLD_W;
  const py = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * WORLD_H;
  return [Math.round(px * 10) / 10, Math.round(py * 10) / 10];
}

function expandBox(box, pad = 0.5) {
  const [a, b, c, d] = box;
  return [a - pad, b - pad, c + pad, d + pad];
}

function inBox(lon, lat, box) {
  let [a, b, c, d] = box;
  let x = lon;
  if (a < -170 && x > 160) x -= 360;
  if (c > 170 && x < -160) x += 360;
  return x >= a && x <= c && lat >= b && lat <= d;
}

function ringCentroid(ring) {
  let x = 0, y = 0, n = 0;
  for (const [lon, lat] of ring) { x += lon; y += lat; n++; }
  return n ? [x / n, y / n] : [0, 0];
}

function clipRing(ring, box) {
  const [minX, minY, maxX, maxY] = box;
  const clip = (pts, inside, intersect) => {
    if (!pts.length) return pts;
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const ain = inside(a);
      const bin = inside(b);
      if (ain && bin) out.push(b);
      else if (ain && !bin) out.push(intersect(a, b));
      else if (!ain && bin) { out.push(intersect(a, b)); out.push(b); }
    }
    return out;
  };
  let pts = ring.map((p) => [p[0], p[1]]);
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts = pts.slice(0, -1);
  }
  pts = clip(pts, (p) => p[0] >= minX, (a, b) => {
    const t = (minX - a[0]) / (b[0] - a[0] || 1e-12);
    return [minX, a[1] + t * (b[1] - a[1])];
  });
  pts = clip(pts, (p) => p[0] <= maxX, (a, b) => {
    const t = (maxX - a[0]) / (b[0] - a[0] || 1e-12);
    return [maxX, a[1] + t * (b[1] - a[1])];
  });
  pts = clip(pts, (p) => p[1] >= minY, (a, b) => {
    const t = (minY - a[1]) / (b[1] - a[1] || 1e-12);
    return [a[0] + t * (b[0] - a[0]), minY];
  });
  pts = clip(pts, (p) => p[1] <= maxY, (a, b) => {
    const t = (maxY - a[1]) / (b[1] - a[1] || 1e-12);
    return [a[0] + t * (b[0] - a[0]), maxY];
  });
  if (pts.length < 4) return null;
  pts.push(pts[0]);
  return pts;
}

function pickProvince(name, lon, lat) {
  const parts = SPLIT[name];
  if (parts) {
    for (const id of parts) {
      const p = PROVINCES.find((x) => x.id === id);
      if (p.boxes.some((b) => inBox(lon, lat, b))) return id;
    }
  }
  if (COUNTRY_FORCE[name]) return COUNTRY_FORCE[name];
  const candidates = PROVINCES.filter((p) => p.boxes.some((b) => inBox(lon, lat, b)));
  if (!candidates.length) return null;
  let best = candidates[0], bestD = Infinity;
  for (const p of candidates) {
    for (const [a, b, c, d] of p.boxes) {
      const cx = (a + c) / 2, cy = (b + d) / 2;
      const dist = (lon - cx) ** 2 + (lat - cy) ** 2;
      if (dist < bestD) { bestD = dist; best = p; }
    }
  }
  return best.id;
}

const buckets = Object.fromEntries(PROVINCES.map((p) => [p.id, []]));

for (const feat of g.features) {
  const name = feat.properties.ADMIN;
  if (name === "Antarctica" || name === "French Southern and Antarctic Lands") continue;
  const geom = feat.geometry;
  if (!geom) continue;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const parts = SPLIT[name];
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer || outer.length < 4) continue;
    if (parts) {
      for (const id of parts) {
        const p = PROVINCES.find((x) => x.id === id);
        for (const box of p.boxes) {
          const clipped = clipRing(outer, expandBox(box, 0.5));
          if (clipped) buckets[id].push([clipped]);
        }
      }
    } else {
      const [clon, clat] = ringCentroid(outer);
      const pid = pickProvince(name, clon, clat);
      if (!pid) continue;
      buckets[pid].push(poly);
    }
  }
}

if (!buckets.hawaii.length) {
  buckets.hawaii.push([[[-157.8, 21.3], [-155.5, 19.0], [-154.8, 19.5], [-156.0, 21.0], [-157.8, 21.3]]]);
}
if (!buckets.polynesia.length) {
  buckets.polynesia.push([[[-171, -14], [-169, -14], [-169, -13], [-171, -13], [-171, -14]]]);
}
if (!buckets.tasmania.length) {
  buckets.tasmania.push([[[144.6, -40.6], [148.3, -40.6], [148.3, -43.6], [144.6, -43.6], [144.6, -40.6]]]);
}

function simplify(ring, step) {
  if (ring.length <= 8) return ring;
  const out = [];
  for (let i = 0; i < ring.length - 1; i += step) out.push(ring[i]);
  out.push(ring[0]);
  return out;
}

function inflateProjected(pts, dist) {
  let ring = pts;
  if (
    ring.length > 2 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    ring = ring.slice(0, -1);
  }
  if (ring.length < 3) return pts;
  let cx = 0;
  let cy = 0;
  for (const p of ring) {
    cx += p[0];
    cy += p[1];
  }
  cx /= ring.length;
  cy /= ring.length;
  const out = ring.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [Math.round((x + (dx / len) * dist) * 10) / 10, Math.round((y + (dy / len) * dist) * 10) / 10];
  });
  out.push(out[0]);
  return out;
}

function pathFromRings(rings) {
  const parts = [];
  for (const ring of rings) {
    let pts = ring
      .map(([lon, lat]) => project(lon, lat))
      .filter(([x, y]) => x >= -40 && x <= WORLD_W + 40 && y >= -40 && y <= WORLD_H + 40);
    if (pts.length < 4) continue;
    pts = inflateProjected(pts, 1.8);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]},${pts[i][1]}`;
    d += "Z";
    parts.push(d);
  }
  return parts.join("");
}

function labelOf(rings) {
  let best = rings[0], bestA = 0;
  for (const ring of rings) {
    if (ring.length > bestA) { bestA = ring.length; best = ring; }
  }
  const [lon, lat] = ringCentroid(best);
  const [x, y] = project(lon, lat);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function bboxOf(rings) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      const [x, y] = project(lon, lat);
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

const GW = 420, GH = 230;
const grid = new Uint8Array(GW * GH);

function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

function plot(rings, idn) {
  const projected = rings.map((ring) => ring.map(([lon, lat]) => project(lon, lat)));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of projected) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
  }
  const gx0 = Math.max(0, Math.floor((minX / WORLD_W) * GW));
  const gx1 = Math.min(GW - 1, Math.ceil((maxX / WORLD_W) * GW));
  const gy0 = Math.max(0, Math.floor((minY / WORLD_H) * GH));
  const gy1 = Math.min(GH - 1, Math.ceil((maxY / WORLD_H) * GH));
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const px = ((gx + 0.5) / GW) * WORLD_W;
      const py = ((gy + 0.5) / GH) * WORLD_H;
      for (const ring of projected) {
        if (pointInRing(px, py, ring)) {
          grid[gy * GW + gx] = idn;
          break;
        }
      }
    }
  }
}

const territories = [];
PROVINCES.forEach((p, i) => {
  const polys = buckets[p.id];
  const rings = polys.map((poly) => poly[0]).filter(Boolean);
  if (!rings.length) {
    const [a, b, c, d] = p.boxes[0];
    rings.push([[a, b], [c, b], [c, d], [a, d], [a, b]]);
  }
  plot(rings, i + 1);
  territories.push({ ...p, rings, path: pathFromRings(rings), lab: labelOf(rings), bb: bboxOf(rings) });
});

function isCoastal(t) {
  const { minX, minY, maxX, maxY } = t.bb;
  const x0 = Math.max(1, Math.floor((minX / WORLD_W) * GW) - 1);
  const x1 = Math.min(GW - 2, Math.floor((maxX / WORLD_W) * GW) + 1);
  const y0 = Math.max(1, Math.floor((minY / WORLD_H) * GH) - 1);
  const y1 = Math.min(GH - 2, Math.floor((maxY / WORLD_H) * GH) + 1);
  const idx = PROVINCES.findIndex((p) => p.id === t.id) + 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (grid[y * GW + x] !== idx) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (grid[(y + dy) * GW + (x + dx)] === 0) return true;
      }
    }
  }
  return false;
}

const LAND_FORCE = [
  ["mexico", "yucatan"], ["alaska", "yukon"], ["yukon", "cascade"], ["yukon", "prairie"],
  ["hudson", "prairie"], ["hudson", "heartland"], ["hudson", "seaboard"], ["cascade", "heartland"],
  ["cascade", "sierra"], ["prairie", "heartland"], ["heartland", "seaboard"], ["heartland", "sierra"],
  ["heartland", "mexico"], ["seaboard", "mexico"], ["sierra", "mexico"], ["grenada", "guiana"],
  ["grenada", "amazon"], ["grenada", "andes"], ["guiana", "amazon"], ["amazon", "andes"],
  ["amazon", "cerrado"], ["andes", "cerrado"], ["andes", "pampas"], ["andes", "patagonia"],
  ["cerrado", "pampas"], ["pampas", "patagonia"], ["fjords", "gaul"], ["fjords", "rhine"],
  ["fjords", "slavic"], ["gaul", "rhine"], ["gaul", "iberia"], ["gaul", "roma"], ["rhine", "slavic"],
  ["rhine", "roma"], ["rhine", "balkans"], ["slavic", "balkans"], ["slavic", "anatolia"],
  ["slavic", "armenia"], ["slavic", "steppe"], ["iberia", "maghreb"], ["roma", "balkans"],
  ["roma", "maghreb"], ["balkans", "anatolia"], ["maghreb", "nile"], ["maghreb", "guinea"],
  ["nile", "guinea"], ["nile", "congo"], ["nile", "horn"], ["nile", "anatolia"], ["nile", "arabia"],
  ["guinea", "congo"], ["congo", "horn"], ["congo", "rift"], ["congo", "cape"], ["horn", "rift"],
  ["horn", "arabia"], ["rift", "cape"], ["anatolia", "mesopotamia"], ["anatolia", "persia"],
  ["anatolia", "arabia"], ["anatolia", "armenia"], ["arabia", "mesopotamia"], ["arabia", "persia"],
  ["arabia", "gulf"], ["gulf", "mesopotamia"], ["gulf", "persia"], ["mesopotamia", "persia"],
  ["armenia", "mesopotamia"], ["persia", "steppe"], ["persia", "gobi"], ["persia", "india"],
  ["persia", "armenia"], ["persia", "media"], ["armenia", "volga"], ["armenia", "steppe"],
  ["media", "gobi"], ["media", "india"], ["media", "steppe"], ["siberia", "steppe"],
  ["siberia", "gobi"], ["steppe", "gobi"], ["steppe", "india"], ["gobi", "cathay"],
  ["gobi", "canton"], ["gobi", "india"], ["gobi", "indochina"], ["cathay", "canton"],
  ["canton", "indochina"], ["india", "indochina"], ["indochina", "malaya"], ["malaya", "papua"],
  ["papua", "coral"], ["outback", "coral"], ["outback", "westralia"], ["alaska", "yakutia"],
  ["siberia", "yakutia"], ["yakutia", "cathay"], ["guiana", "cerrado"], ["hudson", "labrador"],
  ["labrador", "seaboard"], ["heartland", "texas"], ["texas", "mexico"], ["texas", "seaboard"],
  ["texas", "sierra"], ["cerrado", "brazil"], ["brazil", "guiana"], ["brazil", "pampas"],
  ["amazon", "brazil"], ["slavic", "siberia"], ["yucatan", "panama"], ["panama", "grenada"],
  ["slavic", "volga"], ["volga", "siberia"], ["volga", "steppe"], ["volga", "persia"],
  ["yucatan", "caribbean"], ["caribbean", "grenada"], ["caribbean", "seaboard"],
  ["caribbean", "panama"], ["yukon", "hudson"], ["greenland", "labrador"],
];

const SEA = [
  ["yucatan","guinea"],["hawaii","texas"],["hawaii","yucatan"],["hawaii","mexico"],["alaska","cascade"],
  ["yukon","sierra"],["yucatan","amazon"],["yucatan","andes"],["amazon","pampas"],["fjords","highlands"],
  ["fjords","roma"],["fjords","balkans"],["highlands","gaul"],["highlands","rhine"],["highlands","iberia"],
  ["highlands","roma"],["gaul","slavic"],["gaul","balkans"],["gaul","maghreb"],["gaul","nile"],
  ["rhine","iberia"],["rhine","maghreb"],["rhine","anatolia"],["slavic","roma"],["slavic","anatolia"],
  ["slavic","arabia"],["iberia","roma"],["iberia","balkans"],["iberia","nile"],["iberia","guinea"],
  ["roma","nile"],["roma","anatolia"],["balkans","maghreb"],["balkans","nile"],["balkans","anatolia"],
  ["balkans","arabia"],["maghreb","congo"],["nile","rift"],["nile","anatolia"],["nile","persia"],
  ["guinea","horn"],["guinea","rift"],["guinea","cape"],["horn","cape"],["horn","anatolia"],
  ["rift","arabia"],["anatolia","arabia"],["anatolia","persia"],["arabia","india"],["gulf","india"],
  ["cathay","nippon"],["cathay","canton"],["nippon","canton"],["cathay","india"],["cathay","indochina"],
  ["canton","india"],["canton","malaya"],["malaya","outback"],["malaya","coral"],["malaya","westralia"],
  ["papua","outback"],["highlands","seaboard"],["seaboard","iberia"],["seaboard","gaul"],["seaboard","guinea"],
  ["cascade","nippon"],["alaska","nippon"],["mexico","guinea"],["amazon","guinea"],["grenada","guinea"],
  ["guiana","guinea"],["guiana","cape"],["pampas","cape"],["patagonia","cape"],["cape","outback"],
  ["cape","madagascar"],["horn","madagascar"],["rift","madagascar"],["madagascar","outback"],
  ["horn","india"],["india","outback"],["india","malaya"],["coral","aotearoa"],["outback","aotearoa"],
  ["westralia","aotearoa"],["westralia","cape"],["coral","tasmania"],["outback","tasmania"],
  ["aotearoa","tasmania"],["coral","polynesia"],["papua","polynesia"],["aotearoa","polynesia"],
  ["hawaii","polynesia"],["sierra","nippon"],["yakutia","nippon"],["greenland","fjords"],
  ["greenland","seaboard"],["greenland","highlands"],["hudson","greenland"],["labrador","greenland"],
  ["labrador","fjords"],["labrador","seaboard"],["mexico","iberia"],["brazil","guinea"],["brazil","cape"],
  ["caribbean","yucatan"],["caribbean","grenada"],["caribbean","guinea"],["caribbean","iberia"],
  ["caribbean","panama"],["panama","amazon"],["panama","andes"],["panama","guinea"],["hawaii","alaska"],
  ["hawaii","yukon"],["hawaii","cascade"],["hawaii","sierra"],["hawaii","nippon"],["arabia","roma"],
  ["mesopotamia","roma"],["mesopotamia","nile"],["mesopotamia","anatolia"],["mesopotamia","balkans"],
  ["mesopotamia","maghreb"],["volga","armenia"],["media","armenia"],["steppe","volga"],
  ["volga","media"],["media","steppe"],
];

const FORCE_COASTAL = new Set(["mesopotamia", "volga", "media", "steppe", "patagonia", "heartland"]);
const FORCE_INLAND = new Set(["prairie", "cerrado", "gobi", "amazon"]);

const defs = territories.map((t) => {
  let coastal = isCoastal(t);
  if (FORCE_COASTAL.has(t.id)) coastal = true;
  if (FORCE_INLAND.has(t.id)) coastal = false;
  return {
    id: t.id, name: t.name, continent: t.continent, coastal,
    path: t.path || `M${t.lab.x - 8},${t.lab.y - 6}L${t.lab.x + 8},${t.lab.y - 6}L${t.lab.x + 8},${t.lab.y + 6}L${t.lab.x - 8},${t.lab.y + 6}Z`,
    labelX: t.lab.x, labelY: t.lab.y,
  };
});

const inland = defs.filter((d) => !d.coastal).map((d) => d.id);
console.log("provinces", defs.length);
console.log("inland", inland.join(", "));
console.log("empty", PROVINCES.filter((p) => !buckets[p.id].length).map((p) => p.id).join(", "));

const out = `import type { TerritoryDef } from "./types";
import { CAPITOL } from "./types";

export const WORLD_W = ${WORLD_W};
export const WORLD_H = ${WORLD_H};

export const TERRITORIES: TerritoryDef[] = ${JSON.stringify(defs, null, 2)};

export const TERRITORY_BY_ID: Record<string, TerritoryDef> = Object.fromEntries(
  TERRITORIES.map((t) => [t.id, t]),
);

/** Independent tribes. Every land that is not a capital starts tribal. */
export const BARBARIAN_IDS: readonly string[] = TERRITORIES.map((t) => t.id).filter(
  (id) => !Object.values(CAPITOL).includes(id),
);

export const BARBARIAN_SET = new Set<string>(BARBARIAN_IDS);

const LAND_EDGES: [string, string][] = ${JSON.stringify(LAND_FORCE)};
const SEA_EDGES: [string, string][] = ${JSON.stringify(SEA)};

function undirected(edges: [string, string][]) {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const [a, b] of edges) { add(a, b); add(b, a); }
  return map;
}

export const LAND_NEIGHBORS = undirected(LAND_EDGES);
export const SEA_NEIGHBORS = undirected(SEA_EDGES);

export function landNeighbors(id: string): string[] {
  return [...(LAND_NEIGHBORS.get(id) ?? [])];
}

export function seaNeighbors(id: string): string[] {
  return [...(SEA_NEIGHBORS.get(id) ?? [])];
}

export function continentTerritories(continent: string) {
  return TERRITORIES.filter((t) => t.continent === continent);
}
`;

fs.writeFileSync("/workspace/src/lib/game/world.ts", out);
console.log("wrote world.ts", out.length);
