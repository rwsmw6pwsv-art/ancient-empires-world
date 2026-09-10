let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  if (!ctx) ctx = new C({ latencyHint: "interactive" });
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function brown(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = c.sampleRate;
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  noiseBuf = buf;
  return buf;
}

function beep(
  c: AudioContext,
  t: number,
  type: OscillatorType,
  freq: number,
  dur: number,
  vol: number,
  end?: number,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (end) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(
  c: AudioContext,
  t: number,
  dur: number,
  vol: number,
  freq: number,
  q = 1.2,
  type: BiquadFilterType = "lowpass",
) {
  const src = c.createBufferSource();
  src.buffer = brown(c);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  const g = c.createGain();
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function roar(c: AudioContext, beast: boolean) {
  const t = c.currentTime;
  const dur = beast ? 0.48 : 0.78;
  const high = beast ? 420 : 280;
  burst(c, t, dur, beast ? 0.11 : 0.14, high, 0.8);
  beep(c, t, "sawtooth", beast ? 180 : 96, dur, beast ? 0.05 : 0.07, beast ? 70 : 38);
  beep(c, t + 0.04, "triangle", beast ? 240 : 128, dur * 0.7, 0.04, beast ? 90 : 48);
}

function construct(c: AudioContext) {
  const t = c.currentTime;
  for (let i = 0; i < 3; i++) {
    const at = t + i * 0.14;
    burst(c, at, 0.08, 0.09, 900 - i * 80, 0.6);
    beep(c, at, "triangle", 210 - i * 18, 0.1, 0.05, 90);
    beep(c, at, "square", 140, 0.05, 0.02);
  }
}

const BEAST_CRIES = [
  "lion",
  "tiger",
  "jaguar",
  "sabertooth",
  "direwolf",
  "grizzly",
  "polar-bear",
  "gorilla",
  "rhino",
  "hippo",
  "crocodile",
  "mammoth",
  "giant",
] as const;

export function hasBeastCry(id: string): boolean {
  return (BEAST_CRIES as readonly string[]).includes(id);
}

function cry(c: AudioContext, id?: string) {
  const t = c.currentTime;
  if (id === "lion") {
    burst(c, t, 0.72, 0.13, 300, 0.7);
    beep(c, t, "sawtooth", 130, 0.72, 0.07, 52);
    beep(c, t + 0.1, "triangle", 210, 0.5, 0.05, 70);
    return;
  }
  if (id === "tiger") {
    burst(c, t, 0.55, 0.12, 380, 0.8);
    beep(c, t, "sawtooth", 160, 0.55, 0.06, 60);
    beep(c, t + 0.06, "sawtooth", 240, 0.35, 0.04, 90);
    return;
  }
  if (id === "jaguar") {
    burst(c, t, 0.16, 0.11, 900, 0.9);
    beep(c, t, "square", 320, 0.12, 0.05, 180);
    burst(c, t + 0.18, 0.14, 0.1, 700, 0.9);
    beep(c, t + 0.18, "square", 280, 0.12, 0.045, 140);
    return;
  }
  if (id === "sabertooth") {
    burst(c, t, 0.22, 0.12, 1400, 0.6, "highpass");
    beep(c, t, "sawtooth", 420, 0.28, 0.06, 180);
    beep(c, t + 0.12, "sawtooth", 260, 0.22, 0.05, 90);
    return;
  }
  if (id === "direwolf") {
    beep(c, t, "sine", 240, 0.85, 0.07, 720);
    beep(c, t + 0.38, "sine", 680, 0.55, 0.05, 310);
    burst(c, t + 0.1, 0.5, 0.04, 900, 0.4);
    return;
  }
  if (id === "grizzly") {
    burst(c, t, 0.18, 0.13, 220, 0.8);
    beep(c, t, "sawtooth", 110, 0.22, 0.07, 55);
    burst(c, t + 0.22, 0.32, 0.12, 180, 0.7);
    beep(c, t + 0.22, "sawtooth", 90, 0.32, 0.06, 40);
    return;
  }
  if (id === "polar-bear") {
    burst(c, t, 0.8, 0.12, 140, 0.6);
    beep(c, t, "sine", 70, 0.8, 0.07, 38);
    beep(c, t + 0.12, "triangle", 110, 0.55, 0.04, 48);
    return;
  }
  if (id === "gorilla") {
    burst(c, t, 0.09, 0.14, 160, 0.5);
    burst(c, t + 0.12, 0.09, 0.13, 140, 0.5);
    burst(c, t + 0.24, 0.1, 0.12, 120, 0.5);
    beep(c, t + 0.34, "triangle", 190, 0.32, 0.06, 90);
    return;
  }
  if (id === "rhino") {
    burst(c, t, 0.12, 0.14, 520, 0.5);
    burst(c, t + 0.1, 0.2, 0.12, 240, 0.7);
    beep(c, t, "sawtooth", 85, 0.22, 0.05, 45);
    return;
  }
  if (id === "hippo") {
    beep(c, t, "square", 170, 0.12, 0.06, 110);
    beep(c, t + 0.14, "square", 125, 0.2, 0.07, 75);
    burst(c, t, 0.28, 0.08, 380, 0.5);
    return;
  }
  if (id === "crocodile") {
    burst(c, t, 0.55, 0.1, 2200, 0.4, "highpass");
    beep(c, t + 0.08, "sawtooth", 68, 0.45, 0.05, 36);
    return;
  }
  if (id === "mammoth") {
    beep(c, t, "sawtooth", 260, 0.16, 0.06, 480);
    beep(c, t + 0.14, "sawtooth", 420, 0.5, 0.07, 160);
    burst(c, t + 0.08, 0.45, 0.06, 700, 0.5);
    return;
  }
  if (id === "giant") {
    burst(c, t, 0.16, 0.16, 110, 0.5);
    beep(c, t, "sawtooth", 62, 0.55, 0.09, 32);
    beep(c, t + 0.12, "triangle", 98, 0.4, 0.05, 48);
    return;
  }
  roar(c, true);
}

export type SfxKind = "tap" | "tick" | "ok" | "clash" | "hit" | "rout" | "roar" | "growl" | "build" | "king";

export function sfxForTrain(kind: string): SfxKind {
  if (kind === "dragon") return "roar";
  if (kind === "beast") return "growl";
  return "ok";
}

export function sfx(kind: SfxKind = "tap", opts?: { beast?: string }) {
  try {
    const c = ac();
    if (!c) return;
    const t = c.currentTime;
    if (kind === "tick") {
      beep(c, t, "square", 640, 0.04, 0.03);
      return;
    }
    if (kind === "ok") {
      beep(c, t, "triangle", 520, 0.12, 0.07, 880);
      return;
    }
    if (kind === "clash") {
      beep(c, t, "sawtooth", 180, 0.16, 0.05, 70);
      beep(c, t, "square", 740, 0.08, 0.03, 220);
      return;
    }
    if (kind === "hit") {
      beep(c, t, "triangle", 240, 0.12, 0.06, 90);
      return;
    }
    if (kind === "rout") {
      beep(c, t, "sine", 420, 0.28, 0.05, 160);
      return;
    }
    if (kind === "roar") {
      roar(c, false);
      return;
    }
    if (kind === "growl") {
      roar(c, true);
      return;
    }
    if (kind === "build") {
      construct(c);
      return;
    }
    if (kind === "king") {
      cry(c, opts?.beast);
      return;
    }
    beep(c, t, "triangle", 880, 0.1, 0.07, 420);
  } catch {
    /* audio optional */
  }
}
