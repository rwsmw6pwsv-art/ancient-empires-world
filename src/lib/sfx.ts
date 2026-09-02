let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  if (!ctx) ctx = new C();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export type SfxKind = "tap" | "tick" | "ok" | "clash" | "hit" | "rout";

export function sfx(kind: SfxKind = "tap") {
  try {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    const beep = (type: OscillatorType, freq: number, dur: number, vol: number, end?: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (end) o.frequency.exponentialRampToValueAtTime(end, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    if (kind === "tick") {
      beep("square", 640, 0.04, 0.03);
      return;
    }
    if (kind === "ok") {
      beep("triangle", 520, 0.12, 0.07, 880);
      return;
    }
    if (kind === "clash") {
      beep("sawtooth", 180, 0.16, 0.05, 70);
      beep("square", 740, 0.08, 0.03, 220);
      return;
    }
    if (kind === "hit") {
      beep("triangle", 240, 0.12, 0.06, 90);
      return;
    }
    if (kind === "rout") {
      beep("sine", 420, 0.28, 0.05, 160);
      return;
    }
    beep("triangle", 880, 0.1, 0.07, 420);
  } catch {
    /* audio optional */
  }
}
