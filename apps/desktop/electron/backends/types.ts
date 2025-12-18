import { EventEmitter } from "node:events";
import type { MidiPorts } from "../../shared/ipcTypes";

export type BackendId = "winmm" | "windows-midi-services";

export type MidiBackendInfo = {
  id: BackendId;
  label: string;
  available: boolean;
  selected: boolean;
};

export type MidiPacket = {
  portId: string;
  bytes: number[];
};

export abstract class MidiBackend extends EventEmitter {
  abstract readonly id: BackendId;
  abstract readonly label: string;

  abstract isAvailable(): Promise<boolean> | boolean;
  abstract listPorts(): Promise<MidiPorts> | MidiPorts;
  abstract openIn(id: string): Promise<boolean> | boolean;
  abstract openOut(id: string): Promise<boolean> | boolean;
  abstract send(portId: string, bytes: number[]): Promise<boolean> | boolean;
  abstract closeAll(): Promise<void> | void;

  async dispose() {
    this.removeAllListeners();
    await Promise.resolve(this.closeAll());
  }
}
