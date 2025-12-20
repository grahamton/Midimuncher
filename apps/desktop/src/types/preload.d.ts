import type { MidiEvent, SnapshotState } from "@midi-playground/core";
import type {
  MappingEmitPayload,
  MidiBackendInfo,
  MidiPorts,
  MidiSendPayload,
  RouteConfig,
  SessionLogStatus,
  SnapshotCapturePayload,
  SnapshotRecallPayload
} from "../../shared/ipcTypes";
import type { ProjectDoc, ProjectState, SequencerApplyPayload } from "../../shared/projectTypes";

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
  sessionStatus: () => Promise<SessionLogStatus>;
  sessionStart: () => Promise<SessionLogStatus>;
  sessionStop: () => Promise<SessionLogStatus>;
  sessionReveal: () => Promise<string | null>;
  applySequencer: (payload: SequencerApplyPayload) => Promise<boolean>;
  onEvent: (listener: (evt: MidiEvent) => void) => () => void;
};

declare global {
  interface Window {
    midi: MidiApi;
  }
}
