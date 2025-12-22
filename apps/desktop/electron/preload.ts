import { contextBridge, ipcRenderer } from "electron";
import type { MidiEvent, SnapshotState } from "@midi-playground/core";
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
} from "../shared/ipcTypes";
import type {
  ProjectDoc,
  ProjectState,
  SequencerApplyPayload,
} from "../shared/projectTypes";

const midiApi = {
  listPorts: (): Promise<MidiPorts> => ipcRenderer.invoke("midi:listPorts"),
  listBackends: (): Promise<MidiBackendInfo[]> =>
    ipcRenderer.invoke("midi:listBackends"),
  setBackend: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("midi:setBackend", id),
  openIn: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("midi:openIn", id),
  openOut: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("midi:openOut", id),
  send: (payload: MidiSendPayload): Promise<boolean> =>
    ipcRenderer.invoke("midi:send", payload),
  emitMapping: (payload: MappingEmitPayload): Promise<boolean> =>
    ipcRenderer.invoke("mapping:emit", payload),
  setRoutes: (routes: RouteConfig[]): Promise<boolean> =>
    ipcRenderer.invoke("midi:setRoutes", routes),
  loadProject: (): Promise<ProjectDoc | null> =>
    ipcRenderer.invoke("project:load"),
  setProjectState: (state: ProjectState): Promise<boolean> =>
    ipcRenderer.invoke("project:setState", state),
  flushProject: (): Promise<boolean> => ipcRenderer.invoke("project:flush"),
  captureSnapshot: (payload?: SnapshotCapturePayload): Promise<SnapshotState> =>
    ipcRenderer.invoke("snapshot:capture", payload),
  recallSnapshot: (payload: SnapshotRecallPayload): Promise<boolean> =>
    ipcRenderer.invoke("snapshot:recall", payload),
  scheduleSnapshot: (payload: SnapshotSchedulePayload): Promise<boolean> =>
    ipcRenderer.invoke("snapshot:schedule", payload),
  scheduleDropBundle: (payload: SnapshotDropBundlePayload): Promise<boolean> =>
    ipcRenderer.invoke("snapshot:scheduleDropBundle", payload),
  flushSnapshotQueue: (): Promise<boolean> =>
    ipcRenderer.invoke("snapshot:flushQueue"),
  sessionStatus: (): Promise<SessionLogStatus> =>
    ipcRenderer.invoke("session:status"),
  sessionStart: (): Promise<SessionLogStatus> =>
    ipcRenderer.invoke("session:start"),
  sessionStop: (): Promise<SessionLogStatus> =>
    ipcRenderer.invoke("session:stop"),
  sessionReveal: (): Promise<string | null> =>
    ipcRenderer.invoke("session:reveal"),
  applySequencer: (payload: SequencerApplyPayload): Promise<boolean> =>
    ipcRenderer.invoke("sequencer:apply", payload),
  loadInstruments: (): Promise<any[]> => ipcRenderer.invoke("instruments:load"),
  onEvent: (listener: (evt: MidiEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: MidiEvent) =>
      listener(data);
    ipcRenderer.on("midi:event", handler);
    return () => ipcRenderer.removeListener("midi:event", handler);
  },
  onSnapshotStatus: (listener: (status: SnapshotQueueStatus) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: SnapshotQueueStatus) =>
      listener(data);
    ipcRenderer.on("snapshot:status", handler);
    return () => ipcRenderer.removeListener("snapshot:status", handler);
  },
};

contextBridge.exposeInMainWorld("midi", midiApi);
