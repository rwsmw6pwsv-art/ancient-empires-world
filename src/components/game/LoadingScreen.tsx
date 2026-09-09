import { useEffect, useState, type ReactNode } from "react";
import {
  allCached,
  packUrls,
  prefetch,
  preloadAll,
  type AssetPackId,
  type PreloadProgress,
} from "@/lib/game/preload";

export function usePreload(pack: AssetPackId) {
  const urls = packUrls(pack);
  const [progress, setProgress] = useState<PreloadProgress>(() =>
    allCached(urls)
      ? { loaded: urls.length, total: urls.length, fraction: 1 }
      : { loaded: 0, total: urls.length, fraction: urls.length ? 0 : 1 },
  );
  const [ready, setReady] = useState(() => allCached(urls));

  useEffect(() => {
    let live = true;
    const list = packUrls(pack);
    if (allCached(list)) {
      setProgress({ loaded: list.length, total: list.length, fraction: 1 });
      setReady(true);
      return;
    }
    setReady(false);
    void preloadAll(list, (p) => {
      if (live) setProgress(p);
    }).then(() => {
      if (!live) return;
      setProgress({ loaded: list.length, total: list.length, fraction: 1 });
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [pack]);

  return { ready, ...progress };
}

export function LoadingScreen({
  label,
  fraction = 0,
  wait = false,
}: {
  label: string;
  fraction?: number;
  wait?: boolean;
}) {
  const pct = wait ? 0 : Math.max(0, Math.min(100, Math.round(fraction * 100)));
  return (
    <div className="load-screen" role="status" aria-live="polite" aria-busy="true">
      <img
        src="/map/title-dragon.jpg"
        alt=""
        width={1200}
        height={800}
        decoding="async"
        fetchPriority="high"
        className="load-art"
      />
      <div className="load-veil" aria-hidden="true" />
      <div className="load-body">
        <p className="load-mark">The age of dragons</p>
        <h1 className="load-title">{label}</h1>
        <div
          className="load-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={wait ? undefined : pct}
          aria-label={label}
        >
          <div
            className={wait ? "load-fill is-wait" : "load-fill"}
            style={wait ? undefined : { width: `${pct}%` }}
          />
        </div>
        <p className="load-copy">{wait ? "Gathering the host…" : `${pct}%`}</p>
      </div>
    </div>
  );
}

export function BootFallback({ label }: { label: string }) {
  return <LoadingScreen label={label} wait />;
}

export function ScreenGate({
  pack,
  label,
  children,
}: {
  pack: AssetPackId;
  label: string;
  children: ReactNode;
}) {
  const load = usePreload(pack);
  useEffect(() => {
    if (!load.ready) return;
    if (pack === "title") prefetch("play");
  }, [load.ready, pack]);
  if (!load.ready) return <LoadingScreen label={label} fraction={load.fraction} />;
  return children;
}
