import type { BridgeClock } from "../../../services/midiBridge";

export type QuantizeKind = "beat" | "bar";

export type QuantizedLaunch = {
  dueAt: number;
  delayMs: number;
  ticksUntil: number;
};

export function quantizeLaunch(clock: BridgeClock, quantize: QuantizeKind, now: number = Date.now()): QuantizedLaunch {
  if (!clock.bpm || !clock.lastTickAt) {
    return { dueAt: now, delayMs: 0, ticksUntil: 0 };
  }

  const ticksPerBeat = clock.ppqn;
  const ticksPerBar = ticksPerBeat * 4;
  const step = quantize === "bar" ? ticksPerBar : ticksPerBeat;
  const msPerTick = 60000 / (clock.bpm * clock.ppqn);
  const elapsedTicks = Math.floor((now - clock.lastTickAt) / msPerTick);
  const totalTicks = clock.tickCount + Math.max(0, elapsedTicks);
  const nextBoundary = Math.ceil((totalTicks + 1) / step) * step;
  const ticksUntil = Math.max(0, nextBoundary - totalTicks);
  const delayMs = ticksUntil * msPerTick;

  return { dueAt: now + delayMs, delayMs, ticksUntil };
}

export function describePhase(clock: BridgeClock) {
  if (!clock.bpm || !clock.lastTickAt) {
    return { beat: 0, bar: 0, phase: 0 };
  }
  const ticksPerBeat = clock.ppqn;
  const ticksPerBar = ticksPerBeat * 4;
  const msPerTick = 60000 / (clock.bpm * clock.ppqn);
  const elapsedTicks = Math.floor((Date.now() - clock.lastTickAt) / msPerTick);
  const totalTicks = clock.tickCount + Math.max(0, elapsedTicks);
  const beat = Math.floor((totalTicks % ticksPerBar) / ticksPerBeat) + 1;
  const bar = Math.floor(totalTicks / ticksPerBar) + 1;
  const phase = (totalTicks % ticksPerBar) / ticksPerBar;
  return { beat, bar, phase };
}
