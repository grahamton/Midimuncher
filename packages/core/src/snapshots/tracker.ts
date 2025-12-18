import type { MidiEvent } from "../midi/types";
import type { SnapshotDeviceBinding, SnapshotDeviceState, SnapshotNoteState, SnapshotState } from "./types";

type DeviceRuntimeState = {
  binding: SnapshotDeviceBinding;
  cc: Map<number, number>;
  notes: Map<number, number>;
  program?: number;
};

function clampChannel(ch: number | undefined) {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch as number), 1), 16);
}

function clampMidi(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}

const CLOCKS_PER_QUARTER = 24;

export class SnapshotTracker {
  private bindings = new Map<string, SnapshotDeviceBinding>();
  private devices = new Map<string, DeviceRuntimeState>();
  private lastClockTs: number | null = null;
  private clockIntervals: number[] = [];
  private notesMeta: string | null = null;
  private bpm: number | null = null;

  constructor(bindings: SnapshotDeviceBinding[] = []) {
    this.updateBindings(bindings);
  }

  updateBindings(bindings: SnapshotDeviceBinding[]) {
    this.bindings.clear();
    const nextBindings = bindings.filter((b) => !!b.deviceId);
    for (const binding of nextBindings) {
      const existing = this.devices.get(binding.deviceId);
      const state: DeviceRuntimeState = existing ?? {
        binding,
        cc: new Map(),
        notes: new Map()
      };
      state.binding = binding;
      this.devices.set(binding.deviceId, state);

      if (binding.outputId) {
        this.bindings.set(binding.outputId, binding);
        this.bindings.set(`out:${binding.outputId}`, binding);
      }
      if (binding.inputId) {
        this.bindings.set(binding.inputId, binding);
      }
    }
  }

  setNotesMeta(notes: string | null) {
    this.notesMeta = notes ?? null;
  }

  ingest(evt: MidiEvent) {
    if (evt.msg.t === "clock") {
      this.handleClock();
      return;
    }
    if (evt.msg.t === "start" || evt.msg.t === "stop") {
      this.resetClock();
      return;
    }

    const binding = this.bindingForPort(evt.src.id);
    if (!binding) return;

    const device = this.ensureDevice(binding.deviceId, binding);

    switch (evt.msg.t) {
      case "cc":
        device.cc.set(clampMidi(evt.msg.cc), clampMidi(evt.msg.val));
        break;
      case "programChange":
        device.program = clampMidi(evt.msg.program);
        break;
      case "noteOn": {
        const vel = clampMidi(evt.msg.vel);
        if (vel <= 0) {
          device.notes.delete(clampMidi(evt.msg.note));
        } else {
          device.notes.set(clampMidi(evt.msg.note), vel);
        }
        break;
      }
      case "noteOff":
        device.notes.delete(clampMidi(evt.msg.note));
        break;
      default:
        break;
    }
  }

  capture(meta?: { notes?: string | null; bpm?: number | null }): SnapshotState {
    const devices: SnapshotDeviceState[] = [];
    const snapshotNotes = typeof meta?.notes === "string" ? meta?.notes : this.notesMeta;

    for (const state of this.devices.values()) {
      const cc: Record<number, number> = {};
      state.cc.forEach((value, ccNum) => {
        cc[clampMidi(ccNum)] = clampMidi(value);
      });
      const notes: SnapshotNoteState[] = [];
      state.notes.forEach((vel, note) => {
        notes.push({ note: clampMidi(note), vel: clampMidi(vel) });
      });
      devices.push({
        deviceId: state.binding.deviceId,
        outputId: state.binding.outputId ?? null,
        channel: clampChannel(state.binding.channel),
        cc,
        program: state.program,
        notes,
        name: state.binding.name ?? undefined
      });
    }

    return {
      capturedAt: Date.now(),
      bpm: typeof meta?.bpm === "number" ? meta?.bpm : this.bpm,
      notes: snapshotNotes ?? null,
      devices
    };
  }

  getCurrentState(): SnapshotState {
    return this.capture();
  }

  private ensureDevice(id: string, binding: SnapshotDeviceBinding): DeviceRuntimeState {
    let device = this.devices.get(id);
    if (!device) {
      device = { binding, cc: new Map(), notes: new Map() };
      this.devices.set(id, device);
    } else {
      device.binding = binding;
    }
    return device;
  }

  private bindingForPort(portId: string): SnapshotDeviceBinding | null {
    const found = this.bindings.get(portId);
    if (found) return found;
    if (portId.startsWith("out:") || portId.startsWith("in:")) {
      const normalized = portId.slice(portId.indexOf(":") + 1);
      return this.bindings.get(normalized) ?? null;
    }
    return null;
  }

  private handleClock() {
    const now = Date.now();
    if (this.lastClockTs != null) {
      const delta = now - this.lastClockTs;
      if (delta > 0) {
        this.clockIntervals.push(delta);
        if (this.clockIntervals.length > 12) {
          this.clockIntervals.shift();
        }
        const avg = this.clockIntervals.reduce((acc, n) => acc + n, 0) / this.clockIntervals.length;
        const bpm = 60000 / (avg * CLOCKS_PER_QUARTER);
        this.bpm = Math.round(bpm);
      }
    }
    this.lastClockTs = now;
  }

  private resetClock() {
    this.clockIntervals = [];
    this.lastClockTs = null;
  }
}
