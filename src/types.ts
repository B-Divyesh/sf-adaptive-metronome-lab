export type DrillMode = "drift" | "ramp" | "delay" | "recovery";

export interface Drill {
  id: string;
  name: string;
  mode: DrillMode;
  bpm: number;
  bars: number;
  meter: number;
  amount: number;
  seed: number;
  audio: boolean;
  visual: boolean;
  haptic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeLog {
  id: string;
  drillName: string;
  mode: DrillMode;
  startedAt: string;
  seconds: number;
  barsPlanned: number;
  barsReached: number;
  bpm: number;
  amount: number;
  completed: boolean;
}

export interface BeatPlan {
  bpm: number;
  offsetMs: number;
  audible: boolean;
  accent: boolean;
  phase: string;
}

export const modeLabels: Record<DrillMode, string> = {
  drift: "Bounded drift",
  ramp: "Tempo ramp",
  delay: "Delayed beat",
  recovery: "Recovery gap"
};

export function createDrill(): Drill {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), name: "", mode: "drift", bpm: 92, bars: 16, meter: 4,
    amount: 6, seed: Math.floor(Math.random() * 999_999) + 1,
    audio: true, visual: true, haptic: false, createdAt: now, updatedAt: now
  };
}

export function amountDefault(mode: DrillMode): number {
  return { drift: 6, ramp: 24, delay: 80, recovery: 2 }[mode];
}
