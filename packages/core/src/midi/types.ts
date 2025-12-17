export type MidiPortRef = { kind: "usb" | "ble" | "din" | "virtual"; id: string; name?: string };

export type MidiMsg =
  | { t: "noteOn"; ch: number; note: number; vel: number }
  | { t: "noteOff"; ch: number; note: number; vel?: number }
  | { t: "cc"; ch: number; cc: number; val: number }
  | { t: "pitchBend"; ch: number; val: number }
  | { t: "aftertouch"; ch: number; val: number }
  | { t: "clock" }
  | { t: "start" }
  | { t: "stop" }
  | { t: "continue" };

export type MidiEvent = {
  ts: number;
  src: MidiPortRef;
  msg: MidiMsg;
};
