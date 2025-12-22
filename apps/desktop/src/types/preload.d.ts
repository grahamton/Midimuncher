import type {
  MidiEvent,
  SnapshotState,
  InstrumentDef,
} from "@midi-playground/core";
import type {
  MappingEmitPayload,
  MidiBackendInfo,
  MidiPorts,
  MidiSendPayload,
  RouteConfig,
  SessionLogStatus,
  SnapshotDropBundlePayload,
  SnapshotCapturePayload,
  SnapshotQueueStatus,
  SnapshotRecallPayload,
  SnapshotSchedulePayload,
} from "../../shared/ipcTypes";
import type {
  ProjectDoc,
  ProjectState,
  SequencerApplyPayload,
} from "../../shared/projectTypes";

export type MidiApi = {
  listPorts: () => Promise<MidiPorts>;
  listBackends: () => Promise<MidiBackendInfo[]>;
  setBackend: (id: string) => Promise<boolean>;
  openIn: (id: string) => Promise<boolean>;
  openOut: (id: string) => Promise<boolean>;
  send: (payload: MidiSendPayload) => Promise<boolean>;
  emitMapping: (payload: MappingEmitPayload) => Promise<boolean>;
  setRoutes: (routes: RouteConfig[]) => Promise<boolean>;
  loadProject: () => Promise<ProjectDoc | null>;
  setProjectState: (state: ProjectState) => Promise<boolean>;
  flushProject: () => Promise<boolean>;
  captureSnapshot: (payload?: SnapshotCapturePayload) => Promise<SnapshotState>;
  recallSnapshot: (payload: SnapshotRecallPayload) => Promise<boolean>;
  scheduleSnapshot: (payload: SnapshotSchedulePayload) => Promise<boolean>;
  scheduleDropBundle: (payload: SnapshotDropBundlePayload) => Promise<boolean>;
  flushSnapshotQueue: () => Promise<boolean>;
  sessionStatus: () => Promise<SessionLogStatus>;
  sessionStart: () => Promise<SessionLogStatus>;
  sessionStop: () => Promise<SessionLogStatus>;
  sessionReveal: () => Promise<string | null>;
  applySequencer: (payload: SequencerApplyPayload) => Promise<boolean>;
  loadInstruments: () => Promise<InstrumentDef[]>;
  onEvent: (listener: (evt: MidiEvent) => void) => () => void;
  onSnapshotStatus: (
    listener: (status: SnapshotQueueStatus) => void
  ) => () => void;
};

declare global {
  interface Window {
    midi: MidiApi;
  }
}
