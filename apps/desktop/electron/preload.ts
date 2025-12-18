import { contextBridge, ipcRenderer } from "electron";
import type { MidiEvent, SnapshotState } from "@midi-playground/core";
import type {
  MappingEmitPayload,
  MidiBackendInfo,
  MidiPorts,
  MidiSendPayload,
  RouteConfig,
  SnapshotCapturePayload,
  SnapshotRecallPayload
} from "../shared/ipcTypes";
import type { ProjectDoc, ProjectState } from "../shared/projectTypes";

const midiApi = {
  listPorts: (): Promise<MidiPorts> => ipcRenderer.invoke("midi:listPorts"),
  listBackends: (): Promise<MidiBackendInfo[]> => ipcRenderer.invoke("midi:listBackends"),
  setBackend: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:setBackend", id),
  openIn: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:openIn", id),
  openOut: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:openOut", id),
  send: (payload: MidiSendPayload): Promise<boolean> => ipcRenderer.invoke("midi:send", payload),
  emitMapping: (payload: MappingEmitPayload): Promise<boolean> => ipcRenderer.invoke("mapping:emit", payload),
  setRoutes: (routes: RouteConfig[]): Promise<boolean> => ipcRenderer.invoke("midi:setRoutes", routes),
  loadProject: (): Promise<ProjectDoc | null> => ipcRenderer.invoke("project:load"),
  setProjectState: (state: ProjectState): Promise<boolean> => ipcRenderer.invoke("project:setState", state),
  flushProject: (): Promise<boolean> => ipcRenderer.invoke("project:flush"),
  captureSnapshot: (payload?: SnapshotCapturePayload): Promise<SnapshotState> => ipcRenderer.invoke("snapshot:capture", payload),
  recallSnapshot: (payload: SnapshotRecallPayload): Promise<boolean> => ipcRenderer.invoke("snapshot:recall", payload),
  onEvent: (listener: (evt: MidiEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: MidiEvent) => listener(data);
    ipcRenderer.on("midi:event", handler);
    return () => ipcRenderer.removeListener("midi:event", handler);
  }
};

contextBridge.exposeInMainWorld("midi", midiApi);
