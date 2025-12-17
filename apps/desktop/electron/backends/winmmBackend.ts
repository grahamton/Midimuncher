import { EventEmitter } from "node:events";
import midi from "@julusian/midi";
import type { MidiPorts } from "../../shared/ipcTypes";
import type { BackendId } from "./types";
import { MidiBackend } from "./types";

export class WinmmBackend extends MidiBackend {
  readonly id: BackendId = "winmm";
  readonly label = "WinMM (legacy)";

  private readonly inputProbe = new midi.Input();
  private readonly outputProbe = new midi.Output();
  private readonly inputs = new Map<string, midi.Input>();
  private readonly outputs = new Map<string, midi.Output>();
  private readonly portNames = new Map<string, string>();

  isAvailable(): boolean {
    // If probes constructed, assume available.
    return true;
  }

  listPorts(): MidiPorts {
    const inputs = this.readPorts("in");
    const outputs = this.readPorts("out");
    return { inputs, outputs };
  }

  openIn(id: string): boolean {
    if (this.inputs.has(id)) return true;
    const idx = this.portIndexFromId(id, "in");
    if (idx < 0) return false;
    const input = new midi.Input();
    input.on("message", (_delta, message) => {
      const bytes = [...message];
      this.emit("midi", { portId: id, bytes });
    });
    try {
      input.openPort(idx);
      input.ignoreTypes(false, false, false);
      this.inputs.set(id, input);
      return true;
    } catch (err) {
      console.error("Failed to open MIDI input", id, err);
      input.closePort();
      return false;
    }
  }

  openOut(id: string): boolean {
    if (this.outputs.has(id)) return true;
    const idx = this.portIndexFromId(id, "out");
    if (idx < 0) return false;
    const output = new midi.Output();
    try {
      output.openPort(idx);
      this.outputs.set(id, output);
      return true;
    } catch (err) {
      console.error("Failed to open MIDI output", id, err);
      output.closePort();
      return false;
    }
  }

  send(portId: string, bytes: number[]): boolean {
    const output = this.outputs.get(portId) ?? (this.openOut(portId) ? this.outputs.get(portId) : null);
    if (!output) return false;
    try {
      output.sendMessage(bytes);
      return true;
    } catch (err) {
      console.error("Failed to send MIDI message", err);
      return false;
    }
  }

  closeAll(): void {
    this.inputs.forEach((input) => {
      try {
        input.closePort();
      } catch (err) {
        console.warn("Error closing MIDI input", err);
      }
    });
    this.outputs.forEach((output) => {
      try {
        output.closePort();
      } catch (err) {
        console.warn("Error closing MIDI output", err);
      }
    });
    this.inputs.clear();
    this.outputs.clear();
  }

  private readPorts(direction: "in" | "out") {
    const probe = direction === "in" ? this.inputProbe : this.outputProbe;
    const count = probe.getPortCount();
    const list: MidiPorts["inputs"] = [];
    for (let i = 0; i < count; i += 1) {
      const name = probe.getPortName(i);
      const id = `${direction}-${i}`;
      this.portNames.set(id, name);
      list.push({ id, name, direction });
    }
    return list;
  }

  private portIndexFromId(id: string, expected: "in" | "out"): number {
    const [direction, idxStr] = id.split("-");
    if (direction !== expected) return -1;
    const idx = Number(idxStr);
    return Number.isNaN(idx) ? -1 : idx;
  }
}
