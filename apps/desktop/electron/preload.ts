import { contextBridge, ipcRenderer } from "electron";
import type { MidiEvent } from "@midi-playground/core";
import type { MidiPorts, MidiSendPayload, RouteConfig } from "../shared/ipcTypes";

const midiApi = {
  listPorts: (): Promise<MidiPorts> => ipcRenderer.invoke("midi:listPorts"),
  openIn: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:openIn", id),
  openOut: (id: string): Promise<boolean> => ipcRenderer.invoke("midi:openOut", id),
  send: (payload: MidiSendPayload): Promise<boolean> => ipcRenderer.invoke("midi:send", payload),
  setRoutes: (routes: RouteConfig[]): Promise<boolean> => ipcRenderer.invoke("midi:setRoutes", routes),
  onEvent: (listener: (evt: MidiEvent) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: MidiEvent) => listener(data);
    ipcRenderer.on("midi:event", handler);
    return () => ipcRenderer.removeListener("midi:event", handler);
  }
};

contextBridge.exposeInMainWorld("midi", midiApi);
