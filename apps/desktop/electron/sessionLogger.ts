import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type { MidiEvent } from "@midi-playground/core";

export type SessionLogStatus = {
  active: boolean;
  filePath: string | null;
  startedAt: number | null;
  eventCount: number;
};

type SessionLogLine = Record<string, unknown> & {
  type: string;
  ts: number;
  monoMs: number;
};

function safeJsonl(line: SessionLogLine): string {
  return `${JSON.stringify(line)}\n`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function makeLogFileName(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mi = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  return `session-${yyyy}${mm}${dd}-${hh}${mi}${ss}.jsonl`;
}

type ClockRuntime = {
  lastTickAt: number | null;
  bpm: number | null;
  tickCount: number;
};

function computeBpmFromDelta(deltaMs: number, ppqn: number) {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return null;
  return 60000 / (deltaMs * ppqn);
}

export class SessionLogger {
  private filePath: string | null = null;
  private stream: fs.WriteStream | null = null;
  private startedAt: number | null = null;
  private eventCount = 0;
  private clockByPort = new Map<string, ClockRuntime>();

  constructor(private readonly baseDir: string, private readonly ppqn = 24) {}

  status(): SessionLogStatus {
    return {
      active: Boolean(this.stream),
      filePath: this.filePath,
      startedAt: this.startedAt,
      eventCount: this.eventCount,
    };
  }

  start(): SessionLogStatus {
    if (this.stream) return this.status();

    fs.mkdirSync(this.baseDir, { recursive: true });
    const filePath = path.join(this.baseDir, makeLogFileName());

    this.filePath = filePath;
    this.startedAt = Date.now();
    this.eventCount = 0;
    this.clockByPort.clear();
    this.stream = fs.createWriteStream(filePath, { flags: "a" });

    this.write({ type: "sessionStart", ts: this.startedAt, monoMs: performance.now() });
    return this.status();
  }

  stop(): SessionLogStatus {
    if (!this.stream) return this.status();
    this.write({ type: "sessionStop", ts: Date.now(), monoMs: performance.now() });
    this.stream.end();
    this.stream = null;
    this.clockByPort.clear();
    return this.status();
  }

  revealPath(): string | null {
    return this.filePath;
  }

  log(type: string, data: Record<string, unknown> = {}) {
    if (!this.stream) return;
    const ts = Date.now();
    const monoMs = performance.now();
    const line: SessionLogLine = { type, ts, monoMs, ...data };
    this.write(line);
  }

  logMidi(evt: MidiEvent) {
    if (!this.stream) return;

    const portId = evt.src.id;
    if (evt.msg.t === "clock") {
      const state = this.clockByPort.get(portId) ?? {
        lastTickAt: null,
        bpm: null,
        tickCount: 0,
      };
      const delta = state.lastTickAt ? evt.ts - state.lastTickAt : null;
      const bpmInstant =
        typeof delta === "number" ? computeBpmFromDelta(delta, this.ppqn) : null;
      const bpm =
        bpmInstant && state.bpm ? state.bpm * 0.7 + bpmInstant * 0.3 : bpmInstant;
      state.lastTickAt = evt.ts;
      state.tickCount += 1;
      state.bpm = bpm ?? state.bpm;
      this.clockByPort.set(portId, state);

      this.log("clockTick", {
        portId,
        portName: evt.src.name ?? null,
        deltaMs: delta,
        bpmInstant,
        bpm: state.bpm,
        tickCount: state.tickCount,
      });
    } else if (
      evt.msg.t === "start" ||
      evt.msg.t === "stop" ||
      evt.msg.t === "continue"
    ) {
      const state = this.clockByPort.get(portId) ?? {
        lastTickAt: null,
        bpm: null,
        tickCount: 0,
      };
      state.lastTickAt = null;
      state.tickCount = 0;
      this.clockByPort.set(portId, state);
      this.log("transport", {
        portId,
        portName: evt.src.name ?? null,
        transport: evt.msg.t,
      });
    }

    this.log("midi", {
      evtTs: evt.ts,
      src: evt.src,
      msg: evt.msg,
    });
  }

  private write(line: SessionLogLine) {
    if (!this.stream) return;
    this.stream.write(safeJsonl(line));
    this.eventCount += 1;
  }
}
