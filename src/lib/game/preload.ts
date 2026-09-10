import {
  BATTLE_UNIT_SRC,
  BEAST_SRC,
  CAPITAL_SRC,
  CITY_ART_SRC,
  DEFENSE_SRC,
  KING_SRC,
  PROP_SRC,
  SCORPION_ART_SRC,
  SIEGE_SRC,
  TERRAIN_TEXTURE,
  UNIT_SHEET_SRC,
  WORLD_SRC,
} from "./landscape";

export type AssetPackId = "title" | "play" | "battle" | "drill";

export interface PreloadProgress {
  loaded: number;
  total: number;
  fraction: number;
}

const cache = new Map<string, HTMLImageElement>();
const inflight = new Map<string, Promise<HTMLImageElement>>();

function uniq(list: (string | undefined | null)[]): string[] {
  return [...new Set(list.filter((u): u is string => Boolean(u)))];
}

export const TITLE_ASSETS = uniq(["/map/title-dragon.jpg", ...Object.values(KING_SRC), ...Object.values(BEAST_SRC)]);

export const PLAY_ASSETS = uniq([
  WORLD_SRC,
  "/map/title-dragon.jpg",
  ...Object.values(BEAST_SRC),
  ...Object.values(BATTLE_UNIT_SRC),
  ...Object.values(SIEGE_SRC),
  ...Object.values(CAPITAL_SRC),
  ...Object.values(PROP_SRC),
  ...Object.values(CITY_ART_SRC),
  ...Object.values(DEFENSE_SRC),
]);

export const BATTLE_ASSETS = uniq([
  WORLD_SRC,
  "/map/title-dragon.jpg",
  ...Object.values(CITY_ART_SRC),
  ...Object.values(UNIT_SHEET_SRC),
  ...Object.values(BATTLE_UNIT_SRC),
  ...Object.values(TERRAIN_TEXTURE),
  ...Object.values(SIEGE_SRC),
  ...Object.values(BEAST_SRC),
  SCORPION_ART_SRC,
  PROP_SRC.city,
  PROP_SRC.camp,
  PROP_SRC.walls,
  PROP_SRC.woodwalls,
  PROP_SRC.woodkeep,
  PROP_SRC.scorpion,
]);

export const DRILL_ASSETS = uniq(["/map/title-dragon.jpg", ...Object.values(BEAST_SRC)]);

const PACKS: Record<AssetPackId, string[]> = {
  title: TITLE_ASSETS,
  play: PLAY_ASSETS,
  battle: BATTLE_ASSETS,
  drill: DRILL_ASSETS,
};

export function packUrls(id: AssetPackId): string[] {
  return PACKS[id];
}

export function getImage(src: string): HTMLImageElement | undefined {
  const img = cache.get(src);
  if (img && img.complete) return img;
  return undefined;
}

export function allCached(urls: readonly string[]): boolean {
  if (typeof Image === "undefined") return false;
  return urls.every((u) => {
    const img = cache.get(u);
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });
}

function assetWeight(url: string): number {
  if (url.includes("/cities/")) return 8;
  if (url.includes("world-v")) return 4;
  if (url.includes("/units/")) return 2;
  return 1;
}

function decodeImg(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit && hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  const pending = inflight.get(src);
  if (pending) return pending;

  const job = new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    const finish = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(finish, finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = src;
  });
  inflight.set(src, job);
  return job.finally(() => inflight.delete(src));
}

async function warmFetch(src: string, onBytes: (got: number, total: number) => void): Promise<void> {
  if (typeof fetch === "undefined") return;
  try {
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok || !res.body) return;
    const len = Number(res.headers.get("content-length") || 0);
    const reader = res.body.getReader();
    let got = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        got += value.byteLength;
        onBytes(got, len > 0 ? len : Math.max(got, 1));
      }
    }
  } catch {
    /* Image() below still loads from the original URL. */
  }
}

async function loadOne(src: string, onBytes: (got: number, total: number) => void): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit && hit.complete && hit.naturalWidth > 0) {
    onBytes(1, 1);
    return hit;
  }
  await warmFetch(src, onBytes);
  const img = await decodeImg(src);
  onBytes(1, 1);
  return img;
}

export async function preloadAll(urls: readonly string[], onProgress?: (p: PreloadProgress) => void): Promise<void> {
  const list = uniq([...urls]);
  if (!list.length) {
    onProgress?.({ loaded: 0, total: 0, fraction: 1 });
    return;
  }
  if (typeof Image === "undefined") {
    onProgress?.({ loaded: list.length, total: list.length, fraction: 1 });
    return;
  }
  const weights = list.map(assetWeight);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const frac: number[] = list.map((u) => (allCached([u]) ? 1 : 0));
  const ping = () => {
    let doneW = 0;
    let loaded = 0;
    for (let i = 0; i < list.length; i++) {
      doneW += frac[i]! * weights[i]!;
      if (frac[i]! >= 1) loaded += 1;
    }
    onProgress?.({ loaded, total: list.length, fraction: totalW ? Math.min(1, doneW / totalW) : 1 });
  };
  ping();
  let cursor = 0;
  const worker = async () => {
    while (cursor < list.length) {
      const idx = cursor++;
      const url = list[idx]!;
      await loadOne(url, (got, total) => {
        frac[idx] = total > 0 ? Math.min(0.97, got / total) : frac[idx]!;
        ping();
      });
      frac[idx] = 1;
      ping();
    }
  };
  const n = Math.min(4, list.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
  }
  onProgress?.({ loaded: list.length, total: list.length, fraction: 1 });
}

export function prefetch(pack: AssetPackId | readonly string[]): void {
  if (typeof window === "undefined") return;
  const urls = typeof pack === "string" ? packUrls(pack) : pack;
  void preloadAll(urls);
}
