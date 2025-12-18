import type { MidiMsg } from "../midi/types";

export type SnapshotNoteState = { note: number; vel: number };

export type SnapshotDeviceBinding = {
  deviceId: string;
  outputId: string | null;
  inputId?: string | null;
  channel: number;
  name?: string | null;
};

export type SnapshotDeviceState = {
  deviceId: string;
  outputId: string | null;
  channel: number;
  cc: Record<number, number>;
  program?: number;
  notes: SnapshotNoteState[];
  name?: string | null;
};

export type SnapshotState = {
  capturedAt: number;
  bpm: number | null;
  notes: string | null;
  devices: SnapshotDeviceState[];
};

export type SnapshotRecallStrategy = "jump" | "commit";

export type SnapshotBurstLimit = {
  maxPerInterval: number;
  intervalMs: number;
};

export type TimedMidiSend = {
  portId: string;
  msg: MidiMsg;
  delayMs: number;
};

export type SnapshotRecallOptions = {
  from?: SnapshotState | null;
  strategy: SnapshotRecallStrategy;
  fadeMs?: number;
  commitDelayMs?: number;
  burst?: SnapshotBurstLimit;
};
