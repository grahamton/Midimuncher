import type { MidiEvent } from "@midi-playground/core";
import type { MappingEmitPayload, MidiBackendInfo, MidiPorts, MidiSendPayload, RouteConfig } from "../../shared/ipcTypes";
import type { ProjectDocV1, ProjectStateV1, SequencerApplyPayload } from "../../shared/projectTypes";

export type MidiApi = {
  listPorts: () => Promise<MidiPorts>;
  listBackends: () => Promise<MidiBackendInfo[]>;
  setBackend: (id: string) => Promise<boolean>;
  openIn: (id: string) => Promise<boolean>;
  openOut: (id: string) => Promise<boolean>;
  send: (payload: MidiSendPayload) => Promise<boolean>;
  emitMapping: (payload: MappingEmitPayload) => Promise<boolean>;
  setRoutes: (routes: RouteConfig[]) => Promise<boolean>;
  loadProject: () => Promise<ProjectDocV1 | null>;
  setProjectState: (state: ProjectStateV1) => Promise<boolean>;
  flushProject: () => Promise<boolean>;
  applySequencer: (payload: SequencerApplyPayload) => Promise<boolean>;
  onEvent: (listener: (evt: MidiEvent) => void) => () => void;
};

declare global {
  interface Window {
    midi: MidiApi;
  }
}
