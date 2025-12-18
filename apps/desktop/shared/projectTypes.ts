import { MAX_SEQUENCER_CHAINS, MAX_SEQUENCER_STEPS } from "@midi-playground/core";
import type { ControlElement, MidiMsg, SequencerWorldState } from "@midi-playground/core";
import type { RouteConfig } from "./ipcTypes";

export type DeviceConfig = {
  id: string;
  name: string;
  instrumentId: string | null;
  inputId: string | null;
  outputId: string | null;
  channel: number;
  clockEnabled: boolean;
};

export type AppView = "setup" | "routes" | "mapping" | "monitor" | "help" | "chains";

export type SequencerStepConfig = {
  id: string;
  name: string;
  enabled: boolean;
  length: number;
  weight: number;
  tags: string[];
  msg: MidiMsg | null;
  targetDeviceId: string | null;
  targetPortId: string | null;
  channel: number | null;
  gateMs: number;
};

export type SequencerChainConfig = {
  id: string;
  name: string;
  cycleLength: number;
  steps: SequencerStepConfig[];
};

export type TransportState = {
  bpm: number;
  running: boolean;
  swing: number;
};

export type SequencerProjectState = {
  chains: SequencerChainConfig[];
  activeChainId: string | null;
  transport: TransportState;
  world: SequencerWorldState;
};

export type SequencerApplyPayload = SequencerProjectState & {
  devices: DeviceConfig[];
};

export type ProjectStateV1 = {
  backendId: string | null;
  selectedIn: string | null;
  selectedOut: string | null;
  activeView: AppView;
  selectedDeviceId: string | null;
  devices: DeviceConfig[];
  routes: RouteConfig[];
  controls: ControlElement[];
  selectedControlId: string | null;
  sequencer: SequencerProjectState;
  ui: {
    routeBuilder: {
      forceChannelEnabled: boolean;
      routeChannel: number;
      allowNotes: boolean;
      allowCc: boolean;
      allowExpression: boolean;
      allowTransport: boolean;
      allowClock: boolean;
      clockDiv: number;
    };
    diagnostics: {
      note: number;
      ccValue: number;
    };
  };
};

export type ProjectDocV1 = {
  schemaVersion: 1;
  updatedAt: number; // epoch ms
  state: ProjectStateV1;
};

export function defaultSequencerState(): SequencerProjectState {
  const steps = Array.from({ length: 16 }, (_v, idx) => defaultSequencerStep(idx));
  const chain: SequencerChainConfig = {
    id: "chain-1",
    name: "Chain 1",
    cycleLength: steps.length,
    steps
  };

  return {
    chains: [chain],
    activeChainId: chain.id,
    transport: { bpm: 120, running: false, swing: 0 },
    world: defaultWorldState()
  };
}

export function defaultProjectState(): ProjectStateV1 {
  return {
    backendId: null,
    selectedIn: null,
    selectedOut: null,
    activeView: "setup",
    selectedDeviceId: null,
    devices: [],
    routes: [],
    controls: [],
    selectedControlId: null,
    sequencer: defaultSequencerState(),
    ui: {
      routeBuilder: {
        forceChannelEnabled: true,
        routeChannel: 1,
        allowNotes: true,
        allowCc: true,
        allowExpression: true,
        allowTransport: true,
        allowClock: true,
        clockDiv: 1
      },
      diagnostics: {
        note: 60,
        ccValue: 64
      }
    }
  };
}

export function defaultProjectDoc(): ProjectDocV1 {
  return {
    schemaVersion: 1,
    updatedAt: Date.now(),
    state: defaultProjectState()
  };
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBooleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function coerceProjectDoc(raw: unknown): ProjectDocV1 {
  const fallback = defaultProjectDoc();
  if (!raw || typeof raw !== "object") return fallback;

  const rec = raw as Record<string, unknown>;
  if (rec.schemaVersion !== 1) return fallback;

  const rawState = (rec.state && typeof rec.state === "object" ? (rec.state as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const stateDefaults = defaultProjectState();

  const view = rawState.activeView;
  const activeView: AppView =
    view === "setup" || view === "routes" || view === "mapping" || view === "monitor" || view === "help" || view === "chains"
      ? view
      : "setup";

  const devices: DeviceConfig[] = asArray<Record<string, unknown>>(rawState.devices).map((d, idx) => ({
    id: typeof d.id === "string" ? d.id : `device-${idx + 1}`,
    name: typeof d.name === "string" ? d.name : `Device ${idx + 1}`,
    instrumentId: asStringOrNull(d.instrumentId),
    inputId: asStringOrNull(d.inputId),
    outputId: asStringOrNull(d.outputId),
    channel: Math.min(Math.max(Math.round(asNumberOr(d.channel, 1)), 1), 16),
    clockEnabled: asBooleanOr(d.clockEnabled, false)
  }));

  return {
    schemaVersion: 1,
    updatedAt: asNumberOr(rec.updatedAt, Date.now()),
    state: {
      backendId: asStringOrNull(rawState.backendId),
      selectedIn: asStringOrNull(rawState.selectedIn),
      selectedOut: asStringOrNull(rawState.selectedOut),
      activeView,
      selectedDeviceId: asStringOrNull(rawState.selectedDeviceId),
      devices,
      routes: asArray<RouteConfig>(rawState.routes),
      controls: asArray<ControlElement>(rawState.controls),
      selectedControlId: asStringOrNull(rawState.selectedControlId),
      sequencer: coerceSequencerState(rawState.sequencer, devices),
      ui: {
        routeBuilder: {
          forceChannelEnabled: asBooleanOr((rawState.ui as any)?.routeBuilder?.forceChannelEnabled, stateDefaults.ui.routeBuilder.forceChannelEnabled),
          routeChannel: Math.min(
            Math.max(Math.round(asNumberOr((rawState.ui as any)?.routeBuilder?.routeChannel, stateDefaults.ui.routeBuilder.routeChannel)), 1),
            16
          ),
          allowNotes: asBooleanOr((rawState.ui as any)?.routeBuilder?.allowNotes, stateDefaults.ui.routeBuilder.allowNotes),
          allowCc: asBooleanOr((rawState.ui as any)?.routeBuilder?.allowCc, stateDefaults.ui.routeBuilder.allowCc),
          allowExpression: asBooleanOr(
            (rawState.ui as any)?.routeBuilder?.allowExpression,
            stateDefaults.ui.routeBuilder.allowExpression
          ),
          allowTransport: asBooleanOr(
            (rawState.ui as any)?.routeBuilder?.allowTransport,
            stateDefaults.ui.routeBuilder.allowTransport
          ),
          allowClock: asBooleanOr((rawState.ui as any)?.routeBuilder?.allowClock, stateDefaults.ui.routeBuilder.allowClock),
          clockDiv: Math.min(
            Math.max(Math.round(asNumberOr((rawState.ui as any)?.routeBuilder?.clockDiv, stateDefaults.ui.routeBuilder.clockDiv)), 1),
            96
          )
        },
        diagnostics: {
          note: Math.min(Math.max(Math.round(asNumberOr((rawState.ui as any)?.diagnostics?.note, stateDefaults.ui.diagnostics.note)), 0), 127),
          ccValue: Math.min(
            Math.max(Math.round(asNumberOr((rawState.ui as any)?.diagnostics?.ccValue, stateDefaults.ui.diagnostics.ccValue)), 0),
            127
          )
        }
      }
    }
  };
}

export function defaultSequencerStep(index: number): SequencerStepConfig {
  return {
    id: `step-${index + 1}`,
    name: `Step ${index + 1}`,
    enabled: false,
    length: 1,
    weight: 1,
    tags: [],
    msg: { t: "noteOn", ch: 1, note: 60, vel: 100 },
    targetDeviceId: null,
    targetPortId: null,
    channel: null,
    gateMs: 140
  };
}

function coerceSequencerState(raw: unknown, _devices: DeviceConfig[]): SequencerProjectState {
  const fallback = defaultSequencerState();
  if (!raw || typeof raw !== "object") return fallback;

  const rec = raw as Record<string, unknown>;
  const chains: SequencerChainConfig[] = asArray<Record<string, unknown>>(rec.chains)
    .slice(0, MAX_SEQUENCER_CHAINS)
    .map((chain, chainIdx) => {
      const steps: SequencerStepConfig[] = asArray<Record<string, unknown>>(chain.steps)
        .slice(0, MAX_SEQUENCER_STEPS)
        .map((step, stepIdx) => ({
          id: typeof step.id === "string" ? step.id : `step-${stepIdx + 1}`,
          name: typeof step.name === "string" ? step.name : `Step ${stepIdx + 1}`,
          enabled: asBooleanOr(step.enabled, false),
          length: clampStepLength(asNumberOr(step.length, 1)),
          weight: clampWeight(asNumberOr(step.weight, 1)),
          tags: Array.isArray(step.tags) ? (step.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
          msg: isMidiMsg((step as any).msg) ? ((step as any).msg as MidiMsg) : null,
          targetDeviceId: asStringOrNull(step.targetDeviceId),
          targetPortId: asStringOrNull(step.targetPortId),
          channel: typeof step.channel === "number" && Number.isFinite(step.channel) ? clampChannel(step.channel) : null,
          gateMs: clampGateMs(asNumberOr(step.gateMs, 140))
        }));

      const cycleLength = clampCycleLength(asNumberOr(chain.cycleLength, steps.length || fallback.chains[0].cycleLength));
      return {
        id: typeof chain.id === "string" ? chain.id : `chain-${chainIdx + 1}`,
        name: typeof chain.name === "string" ? chain.name : `Chain ${chainIdx + 1}`,
        cycleLength,
        steps: steps.length ? steps : Array.from({ length: cycleLength }, (_v, idx) => defaultSequencerStep(idx))
      };
    });

  const world = normalizeWorld((rec.world as SequencerWorldState) ?? fallback.world);
  const transport = rec.transport && typeof rec.transport === "object"
    ? {
        bpm: clampBpm(asNumberOr((rec.transport as any).bpm, fallback.transport.bpm)),
        running: asBooleanOr((rec.transport as any).running, fallback.transport.running),
        swing: clampSwing(asNumberOr((rec.transport as any).swing, fallback.transport.swing))
      }
    : fallback.transport;

  const activeChainId = asStringOrNull(rec.activeChainId);
  return {
    chains: chains.length ? chains : fallback.chains,
    activeChainId: activeChainId ?? chains[0]?.id ?? fallback.activeChainId,
    transport,
    world
  };
}

function defaultWorldState(): SequencerWorldState {
  return {
    energy: 0.5,
    density: 0.5,
    stability: 0.5,
    mutationPressure: 0.25,
    silenceDebt: 0
  };
}

function normalizeWorld(world: SequencerWorldState): SequencerWorldState {
  return {
    energy: clamp01(world.energy),
    density: clamp01(world.density),
    stability: clamp01(world.stability),
    mutationPressure: clamp01(world.mutationPressure),
    silenceDebt: clamp01(world.silenceDebt)
  };
}

function isMidiMsg(value: unknown): value is MidiMsg {
  return !!value && typeof value === "object" && typeof (value as any).t === "string";
}

function clampChannel(ch: number): number {
  return Math.min(Math.max(Math.round(ch), 1), 16);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(value, 0), 8);
}

function clampStepLength(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), 8);
}

function clampCycleLength(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), MAX_SEQUENCER_STEPS);
}

function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.min(Math.max(Math.round(value), 30), 240);
}

function clampSwing(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 0.25);
}

function clampGateMs(value: number): number {
  if (!Number.isFinite(value)) return 140;
  return Math.min(Math.max(Math.round(value), 20), 2000);
}
