import type { MidiEvent } from "@midi-playground/core";
import type { MidiBackendInfo, MidiPorts, MidiSendPayload, RouteConfig } from "../../shared/ipcTypes";

export type MidiApi = {
  listPorts: () => Promise<MidiPorts>;
  listBackends: () => Promise<MidiBackendInfo[]>;
  setBackend: (id: string) => Promise<boolean>;
  openIn: (id: string) => Promise<boolean>;
  openOut: (id: string) => Promise<boolean>;
  send: (payload: MidiSendPayload) => Promise<boolean>;
  setRoutes: (routes: RouteConfig[]) => Promise<boolean>;
  onEvent: (listener: (evt: MidiEvent) => void) => () => void;
};

declare global {
  interface Window {
    midi: MidiApi;
  }
}
