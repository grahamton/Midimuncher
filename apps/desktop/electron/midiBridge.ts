import { EventEmitter } from "node:events";
import type { MidiEvent, MidiMsg, MidiPortRef } from "@midi-playground/core";
import type { MidiBackendInfo, MidiPorts, MidiSendPayload, RouteConfig } from "../shared/ipcTypes";
import type { BackendId, MidiBackend, MidiPacket } from "./backends/types";
import { WinmmBackend } from "./backends/winmmBackend";
import { WindowsMidiServicesBackend } from "./backends/windowsMidiServicesBackend";

export class MidiBridge extends EventEmitter {
  private readonly srcKind: MidiPortRef["kind"] = "usb";
  private activeRoutes: RouteConfig[] = [];
  private readonly recentEchoes = new Map<string, number>();
  private readonly echoWindowMs = 20;
  private readonly clockCounters = new Map<string, number>();

  private readonly portNames = new Map<string, string>();
  private readonly backends: MidiBackend[] = [new WinmmBackend(), new WindowsMidiServicesBackend()];
  private backend: MidiBackend = this.backends[0];

  constructor() {
    super();
    this.backend.on("midi", this.handleBackendMidi);
  }

  async dispose() {
    await Promise.all(this.backends.map((b) => b.dispose()));
    this.removeAllListeners();
  }

  async listBackends(): Promise<MidiBackendInfo[]> {
    const currentId = this.backend.id;
    const results: MidiBackendInfo[] = [];
    for (const b of this.backends) {
      const available = await Promise.resolve(b.isAvailable());
      results.push({ id: b.id, label: b.label, available, selected: b.id === currentId });
    }
    return results;
  }

  async listPorts(): Promise<MidiPorts> {
    const ports = await Promise.resolve(this.backend.listPorts());
    ports.inputs.forEach((p) => this.portNames.set(p.id, p.name));
    ports.outputs.forEach((p) => this.portNames.set(p.id, p.name));
    return ports;
  }

  openIn(id: string): Promise<boolean> {
    return Promise.resolve(this.backend.openIn(id));
  }

  openOut(id: string): Promise<boolean> {
    return Promise.resolve(this.backend.openOut(id));
  }

  async send(payload: MidiSendPayload): Promise<boolean> {
    const { portId, msg } = payload;
    const bytes = encodeMidiMessage(msg);
    if (!bytes) return false;
    const ok = await Promise.resolve(this.backend.send(portId, bytes));
    if (ok) {
      const evt: MidiEvent = {
        ts: Date.now(),
        src: { id: `out:${portId}`, name: `OUT → ${this.portNames.get(portId) ?? portId}`, kind: "virtual" },
        msg
      };
      this.emit("midi", evt);
    }
    return ok;
  }

  async setRoutes(routes: RouteConfig[]): Promise<boolean> {
    this.activeRoutes = routes ?? [];
    this.clockCounters.clear();
    await Promise.all(
      this.activeRoutes.map(async (route) => {
        await this.openIn(route.fromId);
        await this.openOut(route.toId);
      })
    );
    return true;
  }

  async closeAll() {
    await Promise.resolve(this.backend.closeAll());
  }

  async setBackend(id: BackendId): Promise<boolean> {
    const target = this.backends.find((b) => b.id === id);
    if (!target) return false;
    const available = await Promise.resolve(target.isAvailable());
    if (!available) return false;
    if (target === this.backend) return true;
    this.backend.removeListener("midi", this.handleBackendMidi);
    await Promise.resolve(this.backend.closeAll());
    this.backend = target;
    this.backend.on("midi", this.handleBackendMidi);
    // Refresh port name cache.
    await this.listPorts();
    return true;
  }

  private async forwardRoute(evt: MidiEvent) {
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
      await this.send({ portId: route.toId, msg });
    }
  }

  private handleBackendMidi = (packet: MidiPacket) => {
    const midiMsg = decodeMidiMessage(packet.bytes);
    if (!midiMsg) return;
    const evt: MidiEvent = {
      ts: Date.now(),
      src: { id: packet.portId, name: this.portNames.get(packet.portId), kind: this.srcKind },
      msg: midiMsg
    };
    this.emit("midi", evt);
    void this.forwardRoute(evt).catch((err) => console.warn("Route forward failed", err));
  };
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
    case 0xc0:
      return { t: "programChange", ch: channel, program: data1 };
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
    case "programChange": {
      const channel = clampChannel(msg.ch);
      return [0xc0 | channel, clampData(msg.program)];
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
