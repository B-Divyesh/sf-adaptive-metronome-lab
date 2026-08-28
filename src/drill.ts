import type { BeatPlan, Drill, PracticeLog } from "./types";

export const supportedBarCounts = [4, 8, 12, 16, 24, 32, 48, 64] as const;
const supportedBars = new Set<number>(supportedBarCounts);

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function hasSupportedAmount(mode: Drill["mode"], amount: unknown): amount is number {
  if (mode === "drift") return isIntegerInRange(amount, 1, 20);
  if (mode === "ramp") return isIntegerInRange(amount, -40, 60);
  if (mode === "delay") return isIntegerInRange(amount, 20, 180) && amount % 10 === 0;
  return isIntegerInRange(amount, 1, 4);
}

export function rampAmountBounds(bpm: number): { min: number; max: number } {
  return { min: Math.max(-40, 40 - bpm), max: Math.min(60, 220 - bpm) };
}

export function minimumBarsForRecovery(silentBars: number): number {
  return silentBars + 3;
}

function hasValidModeRelationship(mode: Drill["mode"], bpm: number, bars: number, amount: number): boolean {
  if (mode === "ramp") {
    const bounds = rampAmountBounds(bpm);
    return amount >= bounds.min && amount <= bounds.max;
  }
  return mode !== "recovery" || bars >= minimumBarsForRecovery(amount);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

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
  const { bpm, bars, meter, seed, amount } = d;
  if (!["drift", "ramp", "delay", "recovery"].includes(d.mode ?? "") || !isIntegerInRange(bpm, 40, 220) || !supportedBars.has(bars ?? 0) || !isIntegerInRange(meter, 2, 7) || !isIntegerInRange(seed, 1, 999_999)) return null;
  const mode = d.mode as Drill["mode"];
  if (!hasSupportedAmount(mode, amount) || !hasValidModeRelationship(mode, bpm, bars!, amount)) return null;
  const now = new Date().toISOString();
  return { id: typeof d.id === "string" ? d.id : crypto.randomUUID(), name: typeof d.name === "string" ? d.name.slice(0, 60) : "Shared drill", mode, bpm, bars: bars!, meter, amount, seed, audio: d.audio !== false, visual: d.visual !== false, haptic: d.haptic === true, createdAt: typeof d.createdAt === "string" ? d.createdAt : now, updatedAt: now };
}

export function validatePracticeLog(value: unknown): PracticeLog | null {
  if (!value || typeof value !== "object") return null;
  const log = value as Partial<PracticeLog>;
  if (typeof log.id !== "string" || !log.id || log.id.length > 128 || typeof log.drillName !== "string" || !log.drillName.trim() || log.drillName.length > 60) return null;
  if (!log.mode || !["drift", "ramp", "delay", "recovery"].includes(log.mode) || !isIsoDate(log.startedAt)) return null;
  if (!Number.isSafeInteger(log.seconds) || log.seconds! < 0 || !supportedBars.has(log.barsPlanned ?? 0) || !isIntegerInRange(log.barsReached, 0, log.barsPlanned ?? -1)) return null;
  if (!isIntegerInRange(log.bpm, 40, 220) || !hasSupportedAmount(log.mode, log.amount) || !hasValidModeRelationship(log.mode, log.bpm, log.barsPlanned!, log.amount)) return null;
  if (typeof log.completed !== "boolean") return null;
  return log as PracticeLog;
}
