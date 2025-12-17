import { EventEmitter } from "node:events";
import midi from "@julusian/midi";
import type { MidiEvent, MidiMsg, MidiPortRef } from "@midi-playground/core";
import type { MidiPorts, MidiSendPayload, RouteConfig } from "../shared/ipcTypes";

type Direction = "in" | "out";

export class MidiBridge extends EventEmitter {
  private readonly inputProbe = new midi.Input();
  private readonly outputProbe = new midi.Output();
  private readonly inputs = new Map<string, midi.Input>();
  private readonly outputs = new Map<string, midi.Output>();
  private readonly portNames = new Map<string, string>();
  private readonly srcKind: MidiPortRef["kind"] = "usb";
  private activeRoutes: RouteConfig[] = [];
  // Tracks recently forwarded messages to avoid tight feedback loops when routing echoes back in.
  private readonly recentEchoes = new Map<string, number>();
  private readonly echoWindowMs = 20;
  private readonly clockCounters = new Map<string, number>();

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
      const midiMsg = decodeMidiMessage(message);
      if (!midiMsg) return;
      const evt: MidiEvent = {
        ts: Date.now(),
        src: { id, name: this.portNames.get(id), kind: this.srcKind },
        msg: midiMsg
      };
      this.emit("midi", evt);
      this.forwardRoute(evt);
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

  send(payload: MidiSendPayload): boolean {
    const { portId, msg } = payload;
    const output = this.outputs.get(portId) ?? (this.openOut(portId) ? this.outputs.get(portId) : null);
    if (!output) return false;
    const bytes = encodeMidiMessage(msg);
    if (!bytes) return false;
    try {
      output.sendMessage(bytes);
      return true;
    } catch (err) {
      console.error("Failed to send MIDI message", err);
      return false;
    }
  }

  setRoutes(routes: RouteConfig[]): boolean {
    this.activeRoutes = routes ?? [];
    this.clockCounters.clear();
    this.activeRoutes.forEach((route) => {
      this.openIn(route.fromId);
      this.openOut(route.toId);
    });
    return true;
  }

  closeAll() {
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

  private readPorts(direction: Direction) {
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

  private portIndexFromId(id: string, expected: Direction): number {
    const [direction, idxStr] = id.split("-");
    if (direction !== expected) return -1;
    const idx = Number(idxStr);
    return Number.isNaN(idx) ? -1 : idx;
  }

  private forwardRoute(evt: MidiEvent) {
    if (!this.activeRoutes.length) return;
    const now = Date.now();
    for (const route of this.activeRoutes) {
      if (evt.src.id !== route.fromId) continue;
      const msg =
        route.channelMode === "force" && route.forceChannel ? applyChannel(evt.msg, route.forceChannel) : evt.msg;
      if (!passesFilter(msg, route, this.clockCounters)) continue;
      const signature = `${route.id}:${makeSignature(msg)}`;
      const lastSeen = this.recentEchoes.get(signature);
      if (lastSeen && now - lastSeen < this.echoWindowMs) {
        continue;
      }
      this.recentEchoes.set(signature, now);
      this.send({ portId: route.toId, msg });
    }
  }
}

function decodeMidiMessage(message: number[]): MidiMsg | null {
  const status = message[0];
  const data1 = message[1] ?? 0;
  const data2 = message[2] ?? 0;
  const channel = (status & 0x0f) + 1;

  switch (status & 0xf0) {
    case 0x80:
      return { t: "noteOff", ch: channel, note: data1, vel: data2 };
    case 0x90:
      if (data2 === 0) return { t: "noteOff", ch: channel, note: data1, vel: 0 };
      return { t: "noteOn", ch: channel, note: data1, vel: data2 };
    case 0xb0:
      return { t: "cc", ch: channel, cc: data1, val: data2 };
    case 0xe0: {
      const value = (data2 << 7) | data1;
      return { t: "pitchBend", ch: channel, val: value - 8192 };
    }
    case 0xd0:
      return { t: "aftertouch", ch: channel, val: data1 };
    default:
      break;
  }

  switch (status) {
    case 0xf8:
      return { t: "clock" };
    case 0xfa:
      return { t: "start" };
    case 0xfb:
      return { t: "continue" };
    case 0xfc:
      return { t: "stop" };
    default:
      return null;
  }
}

function encodeMidiMessage(msg: MidiMsg): number[] | null {
  switch (msg.t) {
    case "noteOn": {
      const channel = clampChannel(msg.ch);
      return [0x90 | channel, clampData(msg.note), clampData(msg.vel)];
    }
    case "noteOff": {
      const channel = clampChannel(msg.ch);
      return [0x80 | channel, clampData(msg.note), clampData(msg.vel ?? 0)];
    }
    case "cc": {
      const channel = clampChannel(msg.ch);
      return [0xb0 | channel, clampData(msg.cc), clampData(msg.val)];
    }
    case "pitchBend": {
      const channel = clampChannel(msg.ch);
      const normalized = clampPitch(msg.val);
      const lsb = normalized & 0x7f;
      const msb = (normalized >> 7) & 0x7f;
      return [0xe0 | channel, lsb, msb];
    }
    case "aftertouch": {
      const channel = clampChannel(msg.ch);
      return [0xd0 | channel, clampData(msg.val)];
    }
    case "clock":
      return [0xf8];
    case "start":
      return [0xfa];
    case "stop":
      return [0xfc];
    case "continue":
      return [0xfb];
    default:
      return null;
  }
}

function clampChannel(ch: number | undefined) {
  const zeroBased = clampChannelValue(ch) - 1;
  return zeroBased & 0x0f;
}

function clampData(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(Math.max(Math.round(n), 0), 127);
}

function clampPitch(val: number) {
  if (Number.isNaN(val)) return 8192;
  const shifted = Math.round(val + 8192);
  return Math.min(Math.max(shifted, 0), 16383);
}

function applyChannel(msg: MidiMsg, channel: number): MidiMsg {
  if ("ch" in msg) {
    return { ...msg, ch: clampChannelValue(channel) };
  }
  return msg;
}

function clampChannelValue(ch: number | undefined) {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch as number), 1), 16);
}

function makeSignature(msg: MidiMsg): string {
  switch (msg.t) {
    case "noteOn":
    case "noteOff":
      return `${msg.t}-${msg.ch}-${msg.note}-${msg.vel ?? 0}`;
    case "cc":
      return `${msg.t}-${msg.ch}-${msg.cc}-${msg.val}`;
    case "pitchBend":
    case "aftertouch":
      return `${msg.t}-${msg.ch}-${msg.val}`;
    default:
      return msg.t;
  }
}

function passesFilter(msg: MidiMsg, route: RouteConfig, clockCounters: Map<string, number>): boolean {
  const filter = route.filter;
  if (filter?.allowTypes && !filter.allowTypes.includes(msg.t)) {
    return false;
  }
  if (msg.t === "cc") {
    if (filter?.allowCCs && !filter.allowCCs.includes(msg.cc)) return false;
    if (filter?.denyCCs && filter.denyCCs.includes(msg.cc)) return false;
  }
  if (msg.t === "clock" && filter?.clockDiv && filter.clockDiv > 1) {
    const count = (clockCounters.get(route.id) ?? 0) + 1;
    clockCounters.set(route.id, count);
    if (count % filter.clockDiv !== 0) {
      return false;
    }
  }
  return true;
}
