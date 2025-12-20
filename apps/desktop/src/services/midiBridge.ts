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
  return { bpm: null, lastTickAt: null, tickCount: 0, running: false, stale: true, ppqn };
}

function computeBpmFromDelta(deltaMs: number, ppqn: number) {
  if (deltaMs <= 0) return null;
  return 60000 / (deltaMs * ppqn);
}

export type MidiBridgeClock = ClockState & { heartbeat: number };

export function useMidiBridgeClock(midiApi: MidiApi | undefined, ppqn: number = DEFAULT_PPQN) {
  const [clock, setClock] = useState<MidiBridgeClock>({ ...initialClock(ppqn), heartbeat: 0 });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setClock({ ...initialClock(ppqn), heartbeat: 0 });
  }, [ppqn]);

  useEffect(() => {
    if (!midiApi) return;

    const handleEvent = (evt: MidiEvent) => {
      if (evt.msg.t === "clock") {
        const now = evt.ts ?? Date.now();
        setClock((current) => {
          const delta = current.lastTickAt ? now - current.lastTickAt : null;
          const bpmFromTick = delta ? computeBpmFromDelta(delta, current.ppqn) : null;
          const smoothed = bpmFromTick && current.bpm ? current.bpm * 0.7 + bpmFromTick * 0.3 : bpmFromTick;
          return {
            ...current,
            bpm: smoothed ?? current.bpm,
            lastTickAt: now,
            tickCount: current.tickCount + 1,
            stale: false,
            heartbeat: (current.heartbeat + 1) % 1000
          };
        });
      }

      if (evt.msg.t === "start") {
        setClock((current) => ({
          ...initialClock(current.ppqn),
          running: true,
          heartbeat: (current.heartbeat + 1) % 1000
        }));
      }
      if (evt.msg.t === "stop") {
        setClock((current) => ({ ...current, running: false }));
      }
    };

    const unsubscribe = midiApi.onEvent(handleEvent);
    return unsubscribe;
  }, [midiApi]);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setClock((current) => {
        if (!current.lastTickAt) return { ...current, stale: true };
        const stale = Date.now() - current.lastTickAt > 2000;
        if (stale === current.stale) return current;
        return { ...current, stale };
      });
    }, 250);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  const relinkClock = () => setClock({ ...initialClock(ppqn), heartbeat: 0 });

  const phase = useMemo(() => {
    if (!clock.bpm || !clock.lastTickAt) return 0;
    const ticksPerBeat = clock.ppqn;
    const ticksPerBar = ticksPerBeat * 4;
    const msPerTick = 60000 / (clock.bpm * clock.ppqn);
    const elapsedTicks = Math.floor((Date.now() - clock.lastTickAt) / msPerTick);
    const totalTicks = clock.tickCount + Math.max(0, elapsedTicks);
    return (totalTicks % ticksPerBar) / ticksPerBar;
  }, [clock.bpm, clock.lastTickAt, clock.tickCount, clock.ppqn, clock.heartbeat]);

  return { clock: { ...clock, phase }, relinkClock };
}

export type BridgeClock = ReturnType<typeof useMidiBridgeClock>["clock"];
