import type { MidiMsg } from "../midi/types";
import type {
  SnapshotBurstLimit,
  SnapshotDeviceState,
  SnapshotRecallOptions,
  SnapshotRecallStrategy,
  SnapshotState,
  TimedMidiSend
} from "./types";

type DeviceMap = Map<string, SnapshotDeviceState>;

const DEFAULT_COMMIT_MS = 500;

export function planSnapshotRecall(target: SnapshotState, options: SnapshotRecallOptions): TimedMidiSend[] {
  const from = options.from ?? null;
  const fromDevices = mapDevices(from);
  const targetDevices = mapDevices(target);
  const baseDelay = options.strategy === "commit" ? chooseCommitDelay(target, options.strategy, options.commitDelayMs) : 0;

  const sends: TimedMidiSend[] = [];

  for (const device of targetDevices.values()) {
    if (!device.outputId) continue;
    const previous = fromDevices.get(device.deviceId);

    if (device.program !== undefined && device.program !== previous?.program) {
      sends.push(makeTimedSend(device.outputId, { t: "programChange", ch: device.channel, program: device.program }, baseDelay));
    }

    const fadeMs = options.fadeMs && options.fadeMs > 0 ? options.fadeMs : 0;
    const ccEntries = Object.entries(device.cc ?? {});
    for (const [ccKey, targetValRaw] of ccEntries) {
      const cc = Number(ccKey);
      if (!Number.isFinite(cc)) continue;
      const targetVal = clampMidi(targetValRaw);
      const fromVal = previous?.cc?.[cc];
      if (fadeMs > 0 && typeof fromVal === "number" && fromVal !== targetVal) {
        const steps = Math.max(1, Math.round(fadeMs / 40));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const value = clampMidi(Math.round(fromVal + (targetVal - fromVal) * t));
          sends.push(makeTimedSend(device.outputId, { t: "cc", ch: device.channel, cc, val: value }, baseDelay + Math.round(fadeMs * t)));
        }
      } else {
        sends.push(makeTimedSend(device.outputId, { t: "cc", ch: device.channel, cc, val: targetVal }, baseDelay));
      }
    }

    const previousNotes = new Map<number, number>();
    previous?.notes?.forEach((n) => previousNotes.set(n.note, n.vel));

    for (const [note, _vel] of previousNotes.entries()) {
      if (!device.notes.some((n) => n.note === note)) {
        sends.push(makeTimedSend(device.outputId, { t: "noteOff", ch: device.channel, note, vel: 0 }, baseDelay));
      }
    }

    for (const noteState of device.notes) {
      sends.push(makeTimedSend(device.outputId, { t: "noteOn", ch: device.channel, note: noteState.note, vel: noteState.vel }, baseDelay + 20));
    }
  }

  const limiter = options.burst;
  const limited = limiter ? applyBurstLimit(sends, limiter) : sends;
  return limited.sort((a, b) => a.delayMs - b.delayMs);
}

function mapDevices(state: SnapshotState | null): DeviceMap {
  const map: DeviceMap = new Map();
  if (!state) return map;
  for (const dev of state.devices ?? []) {
    map.set(dev.deviceId, dev);
  }
  return map;
}

function chooseCommitDelay(target: SnapshotState, _strategy: SnapshotRecallStrategy, override?: number): number {
  if (typeof override === "number" && override >= 0) return override;
  if (target.bpm && target.bpm > 0) {
    return Math.round((60000 / target.bpm) * 4);
  }
  return DEFAULT_COMMIT_MS;
}

function applyBurstLimit(sends: TimedMidiSend[], limit: SnapshotBurstLimit): TimedMidiSend[] {
  const maxPer = Math.max(1, limit.maxPerInterval);
  const interval = Math.max(1, limit.intervalMs);
  const ordered = [...sends].sort((a, b) => a.delayMs - b.delayMs);
  let windowStart = 0;
  let count = 0;

  return ordered.map((send) => {
    let delay = send.delayMs;
    if (delay >= windowStart + interval) {
      windowStart = delay;
      count = 0;
    }
    if (count >= maxPer) {
      windowStart += interval;
      count = 0;
      delay = Math.max(delay, windowStart);
    }
    count += 1;
    return { ...send, delayMs: delay };
  });
}

function makeTimedSend(portId: string, msg: MidiMsg, delayMs: number): TimedMidiSend {
  return { portId, msg, delayMs: Math.max(0, Math.round(delayMs)) };
}

function clampMidi(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}
