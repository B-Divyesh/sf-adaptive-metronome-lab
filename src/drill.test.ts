import { describe, expect, it } from "vitest";
import { createDrill } from "./types";
import { estimateSeconds, getBeatPlan, rampAmountBounds, routePoints, supportedBarCounts, validateDrill, validatePracticeLog } from "./drill";

describe("deterministic drill planning", () => {
  it("replays bounded drift from the same seed", () => {
    const drill = { ...createDrill(), mode: "drift" as const, bpm: 90, amount: 7, seed: 12345 };
    const first = routePoints(drill, 40);
    const replay = routePoints({ ...drill }, 40);
    expect(replay).toEqual(first);
    expect(first.every((bpm) => bpm >= 83 && bpm <= 97)).toBe(true);
  });

  it("ramps exactly between the requested endpoints", () => {
    const drill = { ...createDrill(), mode: "ramp" as const, bpm: 80, bars: 4, meter: 4, amount: 24 };
    expect(getBeatPlan(drill, 0).bpm).toBe(80);
    expect(getBeatPlan(drill, 15).bpm).toBe(104);
  });

  it("keeps every accepted ramp destination inside the 40–220 BPM domain", () => {
    for (let bpm = 40; bpm <= 220; bpm += 1) {
      const bounds = rampAmountBounds(bpm);
      expect(bpm + bounds.min).toBeGreaterThanOrEqual(40);
      expect(bpm + bounds.max).toBeLessThanOrEqual(220);
      for (let amount = -40; amount <= 60; amount += 1) {
        const candidate = validateDrill({ id: "ramp", mode: "ramp", bpm, bars: 16, meter: 4, amount, seed: 1 });
        expect(Boolean(candidate)).toBe(bpm + amount >= 40 && bpm + amount <= 220);
        if (candidate) expect(Number.isFinite(estimateSeconds(candidate))).toBe(true);
      }
    }
  });

  it("delays only the final beat of every second bar", () => {
    const drill = { ...createDrill(), mode: "delay" as const, meter: 4, amount: 90 };
    expect(getBeatPlan(drill, 6).offsetMs).toBe(0);
    expect(getBeatPlan(drill, 7).offsetMs).toBe(90);
    expect(getBeatPlan(drill, 15).offsetMs).toBe(90);
  });

  it("mutes the configured recovery gap and then accents return", () => {
    const drill = { ...createDrill(), mode: "recovery" as const, meter: 4, amount: 2 };
    expect(getBeatPlan(drill, 0).audible).toBe(true);
    expect(getBeatPlan(drill, 8).audible).toBe(false);
    expect(getBeatPlan(drill, 12).audible).toBe(false);
    expect(getBeatPlan(drill, 16).audible).toBe(true);
    expect(getBeatPlan(drill, 16).phase).toBe("Recovery bar");
  });

  it("includes a recovery bar in every accepted amount and length combination", () => {
    for (let amount = 1; amount <= 4; amount += 1) {
      for (const bars of supportedBarCounts) {
        const candidate = validateDrill({ id: "recovery", mode: "recovery", bpm: 120, bars, meter: 4, amount, seed: 1 });
        expect(Boolean(candidate)).toBe(bars >= amount + 3);
        if (!candidate) continue;
        const phases = Array.from({ length: bars }, (_, bar) => getBeatPlan(candidate, bar * candidate.meter).phase);
        expect(phases).toContain("Recovery bar");
      }
    }
  });

  it("estimates a finite session duration", () => {
    const drill = { ...createDrill(), bpm: 120, bars: 8, meter: 4 };
    expect(estimateSeconds(drill)).toBeGreaterThan(14);
    expect(estimateSeconds(drill)).toBeLessThan(20);
  });

  it("rejects malformed shared settings", () => {
    expect(validateDrill({ mode: "drift", bpm: 500 })).toBeNull();
    expect(validateDrill(null)).toBeNull();
  });

  it("accepts only each mode's advertised amount range and step", () => {
    const base = { id: "test", bpm: 120, bars: 16, meter: 4, seed: 1 };
    expect(validateDrill({ ...base, mode: "drift", amount: 1 })?.amount).toBe(1);
    expect(validateDrill({ ...base, mode: "drift", amount: 20 })?.amount).toBe(20);
    expect(validateDrill({ ...base, mode: "ramp", amount: -40 })?.amount).toBe(-40);
    expect(validateDrill({ ...base, mode: "ramp", amount: 60 })?.amount).toBe(60);
    expect(validateDrill({ ...base, mode: "delay", amount: 20 })?.amount).toBe(20);
    expect(validateDrill({ ...base, mode: "delay", amount: 180 })?.amount).toBe(180);
    expect(validateDrill({ ...base, mode: "recovery", amount: 1 })?.amount).toBe(1);
    expect(validateDrill({ ...base, mode: "recovery", amount: 4 })?.amount).toBe(4);
    for (const invalid of [
      { mode: "drift", amount: 0 }, { mode: "drift", amount: 999 },
      { mode: "ramp", amount: -41 }, { mode: "ramp", amount: 61 },
      { mode: "delay", amount: 10 }, { mode: "delay", amount: 185 }, { mode: "delay", amount: 25 },
      { mode: "recovery", amount: 0 }, { mode: "recovery", amount: 5 }
    ]) expect(validateDrill({ ...base, ...invalid })).toBeNull();
  });

  it("rejects values outside the control domain before they can be persisted", () => {
    const base = { mode: "drift", bpm: 120, bars: 16, meter: 4, amount: 6, seed: 1 };
    expect(validateDrill({ ...base, bpm: 39 })).toBeNull();
    expect(validateDrill({ ...base, bpm: 220.5 })).toBeNull();
    expect(validateDrill({ ...base, bars: 10 })).toBeNull();
    expect(validateDrill({ ...base, meter: 3.5 })).toBeNull();
    expect(validateDrill({ ...base, seed: 0 })).toBeNull();
  });

  it("validates every practice-log field and its ISO date", () => {
    const valid = {
      id: "log-1", drillName: "Bridge", mode: "drift", startedAt: "2026-08-28T05:00:00.000Z",
      seconds: 30, barsPlanned: 16, barsReached: 8, bpm: 120, amount: 6, completed: false
    };
    expect(validatePracticeLog(valid)).toEqual(valid);
    for (const field of Object.keys(valid) as (keyof typeof valid)[]) {
      const missing: Partial<typeof valid> = { ...valid };
      delete missing[field];
      expect(validatePracticeLog(missing), `missing ${field}`).toBeNull();
    }
    for (const invalid of [
      { id: "" }, { drillName: "" }, { mode: "unknown" }, { startedAt: "not-a-date" },
      { seconds: -1 }, { seconds: 1.5 }, { barsPlanned: 5 }, { barsReached: 17 },
      { bpm: 221 }, { amount: 999 }, { completed: "false" }
    ]) expect(validatePracticeLog({ ...valid, ...invalid })).toBeNull();
    expect(validatePracticeLog({ id: "bad-log", startedAt: "not-a-date" })).toBeNull();
  });

  it("applies cross-field drill rules to imported practice logs", () => {
    const base = {
      id: "log-1", drillName: "Route", startedAt: "2026-08-28T05:00:00.000Z",
      seconds: 30, barsPlanned: 16, barsReached: 8, bpm: 120, amount: 6, completed: true
    };
    expect(validatePracticeLog({ ...base, mode: "ramp", bpm: 40, amount: -1 })).toBeNull();
    expect(validatePracticeLog({ ...base, mode: "ramp", bpm: 40, amount: 0 })).not.toBeNull();
    expect(validatePracticeLog({ ...base, mode: "recovery", barsPlanned: 4, barsReached: 4, amount: 4 })).toBeNull();
    expect(validatePracticeLog({ ...base, mode: "recovery", barsPlanned: 8, amount: 4 })).not.toBeNull();
  });
});
