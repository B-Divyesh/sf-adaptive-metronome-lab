import type { BeatPlan, Drill } from "./types";

function randomAt(seed: number, position: number): number {
  let value = (seed + Math.imul(position + 1, 0x9e3779b1)) | 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 4_294_967_296;
}

export function getBeatPlan(drill: Drill, beatIndex: number): BeatPlan {
  const bar = Math.floor(beatIndex / drill.meter);
  const beat = beatIndex % drill.meter;
  const accent = beat === 0;
  if (drill.mode === "drift") {
    const segment = Math.floor(bar / 2);
    const change = Math.round((randomAt(drill.seed, segment) * 2 - 1) * drill.amount);
    return { bpm: Math.max(30, drill.bpm + change), offsetMs: 0, audible: true, accent, phase: `${change >= 0 ? "+" : ""}${change} BPM drift` };
  }
  if (drill.mode === "ramp") {
    const progress = beatIndex / Math.max(1, drill.bars * drill.meter - 1);
    const bpm = drill.bpm + drill.amount * progress;
    return { bpm, offsetMs: 0, audible: true, accent, phase: `${drill.amount >= 0 ? "Accelerating" : "Slowing"} to ${Math.round(drill.bpm + drill.amount)} BPM` };
  }
  if (drill.mode === "delay") {
    const isDelayed = beat === drill.meter - 1 && bar % 2 === 1;
    return { bpm: drill.bpm, offsetMs: isDelayed ? drill.amount : 0, audible: true, accent, phase: isDelayed ? `${drill.amount} ms late cue` : "On the grid" };
  }
  const silentBars = Math.round(drill.amount);
  const cycleLength = silentBars + 3;
  const cycleBar = bar % cycleLength;
  const silent = cycleBar >= 2 && cycleBar < 2 + silentBars;
  const recovery = cycleBar === 2 + silentBars;
  return { bpm: drill.bpm, offsetMs: 0, audible: !silent, accent: accent || recovery, phase: silent ? `Internal pulse · ${cycleBar - 1} of ${silentBars}` : recovery ? "Recovery bar" : "Reference bars" };
}

export function describeDrill(drill: Drill): string {
  const details = {
    drift: `wanders within ±${drill.amount} BPM, changing every two bars`,
    ramp: `${drill.amount >= 0 ? "climbs" : "falls"} from ${drill.bpm} to ${drill.bpm + drill.amount} BPM`,
    delay: `delays the last beat of every second bar by ${drill.amount} ms`,
    recovery: `gives two reference bars, ${drill.amount} silent bar${drill.amount === 1 ? "" : "s"}, then a recovery bar`
  }[drill.mode];
  return `${drill.bars} bars in ${drill.meter}/4; ${details}. Seed ${drill.seed}.`;
}

export function estimateSeconds(drill: Drill): number {
  let seconds = 0;
  for (let i = 0; i < drill.bars * drill.meter; i += 1) seconds += 60 / getBeatPlan(drill, i).bpm;
  return seconds;
}

export function routePoints(drill: Drill, count = 25): number[] {
  const total = drill.bars * drill.meter;
  return Array.from({ length: count }, (_, i) => getBeatPlan(drill, Math.min(total - 1, Math.floor(i * total / count))).bpm);
}

export function validateDrill(value: unknown): Drill | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Partial<Drill>;
  if (!["drift", "ramp", "delay", "recovery"].includes(d.mode ?? "") || typeof d.bpm !== "number" || d.bpm < 30 || d.bpm > 240 || typeof d.bars !== "number" || d.bars < 2 || d.bars > 128 || typeof d.meter !== "number" || d.meter < 2 || d.meter > 7 || typeof d.amount !== "number" || typeof d.seed !== "number") return null;
  const now = new Date().toISOString();
  return { id: typeof d.id === "string" ? d.id : crypto.randomUUID(), name: typeof d.name === "string" ? d.name.slice(0, 60) : "Shared drill", mode: d.mode!, bpm: Math.round(d.bpm), bars: Math.round(d.bars), meter: Math.round(d.meter), amount: d.amount, seed: Math.round(d.seed), audio: d.audio !== false, visual: d.visual !== false, haptic: d.haptic === true, createdAt: typeof d.createdAt === "string" ? d.createdAt : now, updatedAt: now };
}
