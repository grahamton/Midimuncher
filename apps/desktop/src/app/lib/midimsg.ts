import type { MidiMsg } from "@midi-playground/core";

export function describeMsg(msg: MidiMsg): string {
  if (!msg) return "";

  // Safe channel access for channel messages
  const ch = "ch" in msg ? msg.ch : 0;

  switch (msg.t) {
    case "noteOn":
      return `Note On (Ch ${ch}) ${msg.note} Vel ${msg.vel}`;
    case "noteOff":
      return `Note Off (Ch ${ch}) ${msg.note}`;
    case "cc":
      return `CC ${msg.cc} (Ch ${ch}) Val ${msg.val}`;
    case "programChange":
      return `PC ${msg.program} (Ch ${ch})`;
    case "pitchBend":
      return `Pitch Bend (Ch ${ch}) ${msg.val}`;
    case "aftertouch":
      return `Aftertouch (Ch ${ch}) ${msg.val}`;
    case "start":
      return "Transport Start";
    case "stop":
      return "Transport Stop";
    case "continue":
      return "Transport Continue";
    case "clock":
      return "Clock Tick";
    default:
      return "Unknown MIDI Msg";
  }
}
