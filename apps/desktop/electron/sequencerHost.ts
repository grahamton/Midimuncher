import {
  MAX_SEQUENCER_STEPS,
  SequencerRunner,
  type MidiMsg,
  type SequencerChain,
  type SequencerSend,
  type SequencerTarget
} from "@midi-playground/core";
import type {
  DeviceConfig,
  SequencerApplyPayload,
  SequencerChainConfig,
  SequencerStepConfig
} from "../shared/projectTypes";
import { MidiBridge } from "./midiBridge";

export class SequencerHost {
  private readonly runner = new SequencerRunner();
  private devices: DeviceConfig[] = [];
  private chains: SequencerChain[] = [];
  private clockTimer: NodeJS.Timeout | null = null;
  private transportBpm = 120;
  private running = false;

  constructor(private readonly midiBridge: MidiBridge) {}

  apply(payload: SequencerApplyPayload): boolean {
    this.devices = payload.devices;
    this.transportBpm = payload.transport.bpm;
    this.running = payload.transport.running;

    this.runner.setWorldState(payload.world);
    this.chains = payload.chains.map((c) => this.toChain(c));
    this.runner.setChains(this.chains);
    this.runner.queueChain(payload.activeChainId ?? payload.chains[0]?.id ?? null);

    if (this.running) {
      this.start();
    } else {
      this.stop(false);
    }

    return true;
  }

  start(): void {
    this.stop(false);
    this.running = true;
    const intervalMs = this.clockIntervalMs();
    if (intervalMs <= 0) return;
    this.sendTransportMsg("start");
    this.sendInitialEvents();
    this.clockTimer = setInterval(() => this.tick(), intervalMs);
  }

  stop(sendStop = true): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    if (sendStop && this.running) {
      this.sendTransportMsg("stop");
    }
    this.running = false;
    this.runner.stop();
  }

  dispose(): void {
    this.stop(false);
  }

  private sendInitialEvents() {
    const first = this.runner.start(Date.now());
    first.forEach((send) => this.emit(send));
  }

  private tick(): void {
    this.sendClock();
    const sends = this.runner.handleClock(Date.now());
    for (const send of sends) {
      this.emit(send);
    }
  }

  private emit(send: SequencerSend) {
    this.midiBridge.openOut(send.portId);
    this.midiBridge.send({ portId: send.portId, msg: send.msg });

    if (send.msg.t === "noteOn" && send.target?.gateMs) {
      const gate = Math.max(10, Math.round(send.target.gateMs));
      const off: MidiMsg = { t: "noteOff", ch: send.msg.ch, note: send.msg.note, vel: 0 };
      setTimeout(() => this.midiBridge.send({ portId: send.portId, msg: off }), gate);
    }
  }

  private sendClock() {
    const ports = this.clockPorts();
    for (const portId of ports) {
      this.midiBridge.openOut(portId);
      this.midiBridge.send({ portId, msg: { t: "clock" } });
    }
  }

  private sendTransportMsg(kind: "start" | "stop") {
    const ports = this.clockPorts();
    for (const portId of ports) {
      this.midiBridge.openOut(portId);
      this.midiBridge.send({ portId, msg: { t: kind } });
    }
  }

  private clockPorts(): Set<string> {
    const ports = new Set<string>();
    this.devices.forEach((d) => {
      if (d.outputId && d.clockEnabled) {
        ports.add(d.outputId);
      }
    });
    // Also include all ports referenced by chain targets to keep clocks aligned with active destinations.
    for (const chain of this.chains) {
      for (const step of chain.steps) {
        step.targets?.forEach((t) => {
          if (t.portId) ports.add(t.portId);
        });
      }
    }
    return ports;
  }

  private toChain(cfg: SequencerChainConfig): SequencerChain {
    const steps = cfg.steps.slice(0, MAX_SEQUENCER_STEPS).map((step) => this.toStep(step));
    return {
      id: cfg.id,
      name: cfg.name,
      cycleLength: cfg.cycleLength,
      steps
    };
  }

  private toStep(step: SequencerStepConfig) {
    const targets: SequencerTarget[] = [];
    const device = step.targetDeviceId ? this.devices.find((d) => d.id === step.targetDeviceId) : null;
    const portId = step.targetPortId ?? device?.outputId ?? null;
    const channel = step.channel ?? device?.channel ?? null;

    targets.push({ portId, channel, gateMs: step.gateMs });

    const hasEvent = step.enabled && !!step.msg;
    return {
      id: step.id,
      label: step.name,
      length: step.length,
      muted: !hasEvent,
      events: hasEvent && step.msg
        ? [
            {
              ts: 0,
              weight: step.weight,
              tags: step.tags ?? [],
              msg: normalizeMsgChannel(step.msg, channel ?? undefined)
            }
          ]
        : [],
      targets
    };
  }

  private clockIntervalMs(): number {
    if (!Number.isFinite(this.transportBpm) || this.transportBpm <= 0) return 0;
    return Math.max(1, Math.round(60000 / (this.transportBpm * 24)));
  }
}

function normalizeMsgChannel(msg: MidiMsg, channel: number | undefined): MidiMsg {
  if (!channel || !("ch" in msg)) return msg;
  return { ...msg, ch: clampChannel(channel) } as MidiMsg;
}

function clampChannel(ch: number): number {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch), 1), 16);
}
