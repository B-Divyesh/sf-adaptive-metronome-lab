import { getBeatPlan } from "./drill";
import type { BeatPlan, Drill } from "./types";

type BeatHandler = (index: number, plan: BeatPlan) => void;

export class Metronome {
  private context: AudioContext | null = null;
  private interval: number | null = null;
  private finishTimer: number | null = null;
  private visualTimers: number[] = [];
  private nextBeatTime = 0;
  private index = 0;
  private running = false;

  constructor(private readonly onBeat: BeatHandler, private readonly onFinish: () => void) {}

  async start(drill: Drill): Promise<void> {
    if (this.running) return;
    this.context = new AudioContext({ latencyHint: "interactive" });
    await this.context.resume();
    this.running = true;
    this.index = 0;
    this.nextBeatTime = this.context.currentTime + 0.08;
    const schedule = () => this.schedule(drill);
    schedule();
    this.interval = window.setInterval(schedule, 25);
  }

  stop(): void {
    this.running = false;
    if (this.interval !== null) clearInterval(this.interval);
    if (this.finishTimer !== null) clearTimeout(this.finishTimer);
    this.visualTimers.forEach(clearTimeout);
    this.visualTimers = [];
    this.interval = null;
    this.finishTimer = null;
    void this.context?.close();
    this.context = null;
  }

  isRunning(): boolean { return this.running; }

  private schedule(drill: Drill): void {
    const context = this.context;
    if (!context || !this.running) return;
    const total = drill.bars * drill.meter;
    while (this.index < total && this.nextBeatTime < context.currentTime + 0.15) {
      const beatIndex = this.index;
      const plan = getBeatPlan(drill, beatIndex);
      const eventTime = this.nextBeatTime + plan.offsetMs / 1000;
      if (drill.audio && plan.audible) this.scheduleClick(context, eventTime, plan.accent);
      const delay = Math.max(0, (eventTime - context.currentTime) * 1000);
      this.visualTimers.push(window.setTimeout(() => {
        if (!this.running) return;
        this.onBeat(beatIndex, plan);
        if (drill.haptic && plan.audible && "vibrate" in navigator) navigator.vibrate(plan.accent ? 28 : 16);
      }, delay));
      this.nextBeatTime += 60 / plan.bpm;
      this.index += 1;
    }
    if (this.index >= total && this.finishTimer === null) {
      const delay = Math.max(0, (this.nextBeatTime - context.currentTime) * 1000);
      this.finishTimer = window.setTimeout(() => {
        if (!this.running) return;
        this.stop();
        this.onFinish();
      }, delay);
    }
  }

  private scheduleClick(context: AudioContext, time: number, accent: boolean): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(accent ? 1120 : 760, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.32 : 0.2, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }
}
