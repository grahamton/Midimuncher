import { contextBridge, ipcRenderer } from "electron";
import type { MidiEvent } from "@midi-playground/core";
import type { MappingEmitPayload, MidiBackendInfo, MidiPorts, MidiSendPayload, RouteConfig } from "../shared/ipcTypes";
import type { ProjectDocV1, ProjectStateV1, SequencerApplyPayload } from "../shared/projectTypes";

const midiApi = {
  listPorts: (): Promise<MidiPorts> => ipcRenderer.invoke("midi:listPorts"),
  listBackends: (): Promise<MidiBackendInfo[]> => ipcRenderer.invoke("midi:listBackends"),
  setBackend: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:setBackend", id),
  openIn: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:openIn", id),
  openOut: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:openOut", id),
  send: (payload: MidiSendPayload): Promise<boolean> => ipcRenderer.invoke("midi:send", payload),
  emitMapping: (payload: MappingEmitPayload): Promise<boolean> => ipcRenderer.invoke("mapping:emit", payload),
  setRoutes: (routes: RouteConfig[]): Promise<boolean> => ipcRenderer.invoke("midi:setRoutes", routes),
  loadProject: (): Promise<ProjectDocV1 | null> => ipcRenderer.invoke("project:load"),
  setProjectState: (state: ProjectStateV1): Promise<boolean> => ipcRenderer.invoke("project:setState", state),
  flushProject: (): Promise<boolean> => ipcRenderer.invoke("project:flush"),
  applySequencer: (payload: SequencerApplyPayload): Promise<boolean> => ipcRenderer.invoke("sequencer:apply", payload),
  onEvent: (listener: (evt: MidiEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: MidiEvent) => listener(data);
    ipcRenderer.on("midi:event", handler);
    return () => ipcRenderer.removeListener("midi:event", handler);
  }
};

contextBridge.exposeInMainWorld("midi", midiApi);
