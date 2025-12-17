import { MidiBackend } from "./types";
import type { BackendId } from "./types";
import type { MidiPorts } from "../../shared/ipcTypes";

// Placeholder backend for future Windows MIDI Services integration.
export class WindowsMidiServicesBackend extends MidiBackend {
  readonly id: BackendId = "windows-midi-services";
  readonly label = "Windows MIDI Services (preview)";

  async isAvailable(): Promise<boolean> {
    // Not implemented yet; return false to indicate unavailable.
    return false;
  }

  listPorts(): MidiPorts {
    return { inputs: [], outputs: [] };
  }

  openIn(_id: string): boolean {
    return false;
  }

  openOut(_id: string): boolean {
    return false;
  }

  send(_portId: string, _bytes: number[]): boolean {
    return false;
  }

  closeAll(): void {
    // No-op for now.
  }
}
