import type {
  ControlElement,
  MidiMsg,
  SnapshotBurstLimit,
  SnapshotRecallStrategy,
  SnapshotState
} from "@midi-playground/core";

export type MidiPortInfo = {
  id: string;
  name: string;
  direction: "in" | "out";
};

export type MidiPorts = {
  inputs: MidiPortInfo[];
  outputs: MidiPortInfo[];
};

export type MidiBackendInfo = {
  id: string;
  label: string;
  available: boolean;
  selected: boolean;
};

export type MidiSendPayload = {
  portId: string;
  msg: MidiMsg;
};

export type MappingEmitPayload = {
  control: ControlElement;
  value: number;
  devices: Array<{
    id: string;
    outputId: string | null;
    channel: number;
  }>;
};

export type RouteFilter = {
  allowTypes?: MidiMsg["t"][];
  allowCCs?: number[];
  denyCCs?: number[];
  clockDiv?: number;
};

export type RouteConfig = {
  id: string;
  fromId: string;
  toId: string;
  channelMode?: "passthrough" | "force";
  forceChannel?: number;
  filter?: RouteFilter;
};

export type SnapshotRecallPayload = {
  snapshot: SnapshotState;
  strategy: SnapshotRecallStrategy;
  fadeMs?: number;
  commitDelayMs?: number;
  burst?: SnapshotBurstLimit;
};

export type SnapshotClockSource = "oxi" | "internal";

export type SnapshotQuantizeKind = "immediate" | "beat" | "bar" | "bar4";

export type SnapshotSchedulePayload = {
  snapshotId?: string | null;
  snapshotName?: string | null;
  snapshot: SnapshotState;
  strategy: SnapshotRecallStrategy;
  fadeMs?: number;
  commitDelayMs?: number;
  burst?: SnapshotBurstLimit;
  clockSource?: SnapshotClockSource;
  quantize?: SnapshotQuantizeKind;
  cycleLengthBars?: number;
  bpm?: number | null;
};

export type MacroRampPayload = {
  control: ControlElement;
  from: number;
  to: number;
  durationMs: number;
  stepMs?: number;
  perSendSpacingMs?: number;
};

export type SnapshotDropBundlePayload = {
  schedule: SnapshotSchedulePayload;
  macroRamp?: MacroRampPayload | null;
};

export type SnapshotQueueStatus = {
  queueLength: number;
  executing: boolean;
  armed: boolean;
  activeSnapshotId: string | null;
  activeSnapshotName: string | null;
  clockRunning: boolean;
  clockSource: SnapshotClockSource;
};

export type SnapshotCapturePayload = {
  notes?: string | null;
  bpm?: number | null;
};

export type SessionLogStatus = {
  active: boolean;
  filePath: string | null;
  startedAt: number | null;
  eventCount: number;
};
