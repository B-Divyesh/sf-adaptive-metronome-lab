import type { Drill, PracticeLog } from "./types";

const createdAt = "2026-08-28T09:00:00.000Z";

export const demoDrills: Drill[] = [
  { id: "demo-drift", name: "Pocket drift at 96", mode: "drift", bpm: 96, bars: 16, meter: 4, amount: 5, seed: 48291, audio: true, visual: true, haptic: false, createdAt, updatedAt: createdAt },
  { id: "demo-ramp", name: "Chorus ramp", mode: "ramp", bpm: 88, bars: 16, meter: 4, amount: 24, seed: 71182, audio: true, visual: true, haptic: false, createdAt, updatedAt: createdAt },
  { id: "demo-delay", name: "Late backbeat", mode: "delay", bpm: 104, bars: 16, meter: 4, amount: 80, seed: 93511, audio: true, visual: true, haptic: false, createdAt, updatedAt: createdAt },
  { id: "demo-recovery", name: "Recovery count", mode: "recovery", bpm: 72, bars: 8, meter: 4, amount: 3, seed: 21457, audio: true, visual: true, haptic: false, createdAt, updatedAt: createdAt }
];

export const demoLogs: PracticeLog[] = [
  { id: "demo-log-1", drillName: "Pocket drift at 96", mode: "drift", startedAt: "2026-08-27T18:20:00.000Z", seconds: 40, barsPlanned: 16, barsReached: 16, bpm: 96, amount: 5, completed: true },
  { id: "demo-log-2", drillName: "Late backbeat", mode: "delay", startedAt: "2026-08-26T17:10:00.000Z", seconds: 24, barsPlanned: 16, barsReached: 9, bpm: 104, amount: 80, completed: false },
  { id: "demo-log-3", drillName: "Recovery count", mode: "recovery", startedAt: "2026-08-24T11:05:00.000Z", seconds: 27, barsPlanned: 8, barsReached: 8, bpm: 72, amount: 3, completed: true }
];
