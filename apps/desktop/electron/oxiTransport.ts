import type { MidiMsg } from "@midi-playground/core";

// OXI One can optionally emit transport actions as CCs.
// docs/roadmap.md:
// - CC 105: Stop
// - CC 106: Play
// - CC 107: Record (toggle)
export function deriveTransportFromOxiCc(msg: MidiMsg): Extract<MidiMsg, { t: "start" | "stop" | "continue" }> | null {
  if (msg.t !== "cc") return null;
  if (msg.val <= 0) return null;

  if (msg.cc === 105) return { t: "stop" };
  if (msg.cc === 106) return { t: "start" };
  if (msg.cc === 107) return { t: "continue" };
  return null;
}

