import { useEffect, useMemo, useRef, useState } from "react";
import type { MidiEvent } from "@midi-playground/core";
import type { MidiApi } from "../types/preload";

type ClockState = {
  bpm: number | null;
  lastTickAt: number | null;
  tickCount: number;
  running: boolean;
  stale: boolean;
  ppqn: number;
};

const DEFAULT_PPQN = 24;

function initialClock(ppqn: number): ClockState {
  return {
    bpm: null,
    lastTickAt: null,
    tickCount: 0,
    running: false,
    stale: true,
    ppqn,
  };
}

function computeBpmFromDelta(deltaMs: number, ppqn: number) {
  if (deltaMs <= 0) return null;
  return 60000 / (deltaMs * ppqn);
}

export type MidiBridgeClock = ClockState & { heartbeat: number };

export function useMidiBridgeClock(
  midiApi: MidiApi | undefined,
  ppqn: number = DEFAULT_PPQN
) {
  const [clock, setClock] = useState<MidiBridgeClock>({
    ...initialClock(ppqn),
    heartbeat: 0,
  });

  // Windowed BPM Calculation
  // We keep a history of tick timestamps in the last 1000ms
  const tickHistoryRef = useRef<number[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setClock({ ...initialClock(ppqn), heartbeat: 0 });
    tickHistoryRef.current = [];
  }, [ppqn]);

  useEffect(() => {
    if (!midiApi) return;

    const handleEvent = (evt: MidiEvent) => {
      if (evt.msg.t === "clock") {
        const now = evt.ts ?? Date.now();

        // Add current tick
        tickHistoryRef.current.push(now);

        // Prune old ticks (> 2000ms ago) to keep array manageable but allowing for slow tempos
        const windowStart = now - 2000;
        if (tickHistoryRef.current[0] < windowStart) {
          tickHistoryRef.current = tickHistoryRef.current.filter(
            (t) => t >= windowStart
          );
        }

        setClock((current) => {
          // Calculate BPM based on density in the last ~1s
          // Filter strictly for the last 1000ms for calculation
          const oneSecAgo = now - 1000;
          const ticksInWindow = tickHistoryRef.current.filter(
            (t) => t >= oneSecAgo
          ).length;

          // BPM = (Ticks per second / PPQN) * 60
          // Only update BPM if we have enough samples to be stable (e.g. > 1 tick)
          let newBpm = current.bpm;
          if (ticksInWindow > 2) {
            // ticksInWindow is roughly "ticks per second"
            newBpm = (ticksInWindow / current.ppqn) * 60;
          }

          return {
            ...current,
            bpm: newBpm,
            lastTickAt: now,
            tickCount: current.tickCount + 1,
            stale: false,
            // Toggle heartbeat every beat (approx 24 ticks)
            heartbeat: Math.floor(current.tickCount / 24) % 2,
          };
        });
      }

      if (evt.msg.t === "start") {
        tickHistoryRef.current = [];
        setClock((current) => ({
          ...initialClock(current.ppqn),
          running: true,
          heartbeat: 0,
        }));
      }
      if (evt.msg.t === "stop") {
        setClock((current) => ({ ...current, running: false }));
      }
    };

    const unsubscribe = midiApi.onEvent(handleEvent);
    return unsubscribe;
  }, [midiApi]);

  // Stale check
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setClock((current) => {
        // If no ticks in 2 seconds, mark stale and reset BPM
        if (!current.lastTickAt) return { ...current, stale: true };
        const isStale = Date.now() - current.lastTickAt > 2000;

        if (isStale !== current.stale) {
          return {
            ...current,
            stale: isStale,
            bpm: isStale ? null : current.bpm,
          };
        }
        return current;
      });
    }, 500);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  const relinkClock = () => {
    tickHistoryRef.current = [];
    setClock({ ...initialClock(ppqn), heartbeat: 0 });
  };

  const phase = useMemo(() => {
    if (!clock.bpm || !clock.lastTickAt) return 0;
    // Simple phase extrapolation
    // For visual smoothness only
    const beatDurationMs = 60000 / clock.bpm;
    const barDurationMs = beatDurationMs * 4;
    const elapsed = Date.now() - clock.lastTickAt;
    // We can't really trust exact phase without SPP, so just looping a bar based on running time
    // This is approximate.
    const runTime = (clock.tickCount / clock.ppqn) * beatDurationMs + elapsed;
    return (runTime % barDurationMs) / barDurationMs;
  }, [clock.bpm, clock.lastTickAt, clock.tickCount, clock.ppqn]);

  return { clock: { ...clock, phase }, relinkClock };
}

export type BridgeClock = ReturnType<typeof useMidiBridgeClock>["clock"];
