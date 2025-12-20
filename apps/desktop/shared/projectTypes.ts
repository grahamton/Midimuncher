import {
  MAX_SEQUENCER_CHAINS,
  MAX_SEQUENCER_STEPS,
  type ControlElement,
  type MidiMsg,
  type SnapshotBurstLimit,
  type SnapshotRecallStrategy,
  type SnapshotState,
  type SequencerWorldState
} from "@midi-playground/core";
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

export type AppView = "setup" | "routes" | "mapping" | "monitor" | "help" | "snapshots";

export type SequencerTransportState = {
  bpm: number;
  running: boolean;
};

export type SequencerStepConfig = {
  id: string;
  name: string;
  enabled: boolean;
  weight: number;
  gateMs: number;
  length: number;
  channel: number | null;
  targetDeviceId: string | null;
  targetPortId: string | null;
  msg: MidiMsg | null;
  tags: string[];
};

export type SequencerChainConfig = {
  id: string;
  name: string;
  cycleLength: number;
  steps: SequencerStepConfig[];
};

export type SequencerProjectState = {
  chains: SequencerChainConfig[];
  activeChainId: string | null;
  transport: SequencerTransportState;
  world: SequencerWorldState;
};

export type SequencerApplyPayload = {
  chains: SequencerChainConfig[];
  activeChainId: string | null;
  transport: SequencerTransportState;
  world: SequencerWorldState;
  devices: DeviceConfig[];
};

export type SnapshotSlotState = {
  id: string;
  name: string;
  lastCapturedAt: number | null;
  snapshot: SnapshotState | null;
  notes: string;
};

export type SnapshotBankState = {
  id: string;
  name: string;
  slots: SnapshotSlotState[];
};

export type SnapshotsState = {
  activeBankId: string | null;
  strategy: SnapshotRecallStrategy;
  fadeMs: number;
  commitDelayMs: number;
  burst: SnapshotBurstLimit;
  captureNotes: string;
  banks: SnapshotBankState[];
};
export type ChainStep = { snapshot: string; bars: number };

export type ProjectStateV1 = {
  backendId: string | null;
  selectedIn: string | null;
  selectedOut: string | null;
  activeView: Exclude<AppView, "snapshots">;
  selectedDeviceId: string | null;
  devices: DeviceConfig[];
  routes: RouteConfig[];
  controls: ControlElement[];
  chainSteps: ChainStep[];
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

export type ProjectStateV2 = Omit<ProjectStateV1, "activeView"> & {
  activeView: AppView;
  snapshots: SnapshotsState;
};

export type ProjectDocV2 = {
  schemaVersion: 2;
  updatedAt: number;
  state: ProjectStateV2;
};

export type ProjectState = ProjectStateV2;
export type ProjectDoc = ProjectDocV2;

function defaultSnapshotSlots(): SnapshotSlotState[] {
  return Array.from({ length: 8 }, (_v, idx) => ({
    id: `slot-${idx + 1}`,
    name: `Slot ${idx + 1}`,
    lastCapturedAt: null,
    snapshot: null,
    notes: ""
  }));
}

function defaultSnapshotBanks(): SnapshotBankState[] {
  return [
    { id: "bank-1", name: "Bank A", slots: defaultSnapshotSlots() },
    { id: "bank-2", name: "Bank B", slots: defaultSnapshotSlots() }
  ];
}

export function defaultSnapshotsState(): SnapshotsState {
  const banks = defaultSnapshotBanks();
  return {
    activeBankId: banks[0]?.id ?? null,
    strategy: "jump",
    fadeMs: 220,
    commitDelayMs: 500,
    burst: { intervalMs: 25, maxPerInterval: 12 },
    captureNotes: "",
    banks
  };
}

function defaultChainSteps(): ChainStep[] {
  return [
    { snapshot: "INTRO", bars: 8 },
    { snapshot: "VERSE", bars: 8 },
    { snapshot: "CHORUS 1", bars: 8 },
    { snapshot: "DROP!!", bars: 8 }
  ];
}

const DEFAULT_SEQUENCER_STEP_COUNT = 16;

function defaultSequencerTransport(): SequencerTransportState {
  return { bpm: 120, running: false };
}

export function defaultSequencerWorld(): SequencerWorldState {
  return {
    energy: 0.5,
    density: 0.5,
    stability: 0.5,
    mutationPressure: 0.25,
    silenceDebt: 0
  };
}

export function defaultSequencerStep(index: number): SequencerStepConfig {
  return {
    id: `step-${index + 1}`,
    name: `Step ${index + 1}`,
    enabled: false,
    weight: 1,
    gateMs: 120,
    length: 1,
    channel: null,
    targetDeviceId: null,
    targetPortId: null,
    msg: { t: "noteOn", ch: 1, note: 60, vel: 100 },
    tags: []
  };
}

function defaultSequencerChain(index: number): SequencerChainConfig {
  const id = `chain-${index + 1}`;
  const steps = Array.from({ length: DEFAULT_SEQUENCER_STEP_COUNT }, (_v, stepIdx) => ({
    ...defaultSequencerStep(stepIdx),
    id: `${id}-step-${stepIdx + 1}`
  }));
  return {
    id,
    name: `Chain ${index + 1}`,
    cycleLength: steps.length,
    steps
  };
}

export function defaultSequencerState(): SequencerProjectState {
  const chains = [defaultSequencerChain(0)];
  return {
    chains,
    activeChainId: chains[0]?.id ?? null,
    transport: defaultSequencerTransport(),
    world: defaultSequencerWorld()
  };
}

function defaultProjectStateV1(): ProjectStateV1 {
  return {
    backendId: null,
    selectedIn: null,
    selectedOut: null,
    activeView: "setup",
    selectedDeviceId: null,
    devices: [],
    routes: [],
    chainSteps: defaultChainSteps(),
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

export function defaultProjectState(): ProjectStateV2 {
  return {
    ...defaultProjectStateV1(),
    activeView: "setup",
    snapshots: defaultSnapshotsState()
  };
}

export function defaultProjectDoc(): ProjectDocV2 {
  return {
    schemaVersion: 2,
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

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 1);
}

function clampBpm(value: unknown, fallback: number): number {
  const bpm = Math.round(asNumberOr(value, fallback));
  if (!Number.isFinite(bpm)) return fallback;
  return Math.min(Math.max(bpm, 30), 240);
}

function clampStepLength(value: unknown, fallback: number): number {
  const length = Math.round(asNumberOr(value, fallback));
  if (!Number.isFinite(length)) return fallback;
  return Math.min(Math.max(length, 1), MAX_SEQUENCER_STEPS);
}

function clampGateMs(value: unknown, fallback: number): number {
  const gate = Math.round(asNumberOr(value, fallback));
  if (!Number.isFinite(gate)) return fallback;
  return Math.min(Math.max(gate, 10), 2000);
}

function clampWeight(value: unknown, fallback: number): number {
  const weight = asNumberOr(value, fallback);
  const safe = Number.isFinite(weight) ? weight : fallback;
  return Math.min(Math.max(safe, 0), 8);
}

function clampChannelNullable(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  const ch = Math.round(value);
  return Math.min(Math.max(ch, 1), 16);
}

function coerceSequencerWorld(raw: unknown, defaults: SequencerWorldState): SequencerWorldState {
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  return {
    energy: clamp01(asNumberOr(rec.energy, defaults.energy), defaults.energy),
    density: clamp01(asNumberOr(rec.density, defaults.density), defaults.density),
    stability: clamp01(asNumberOr(rec.stability, defaults.stability), defaults.stability),
    mutationPressure: clamp01(asNumberOr(rec.mutationPressure, defaults.mutationPressure), defaults.mutationPressure),
    silenceDebt: clamp01(asNumberOr(rec.silenceDebt, defaults.silenceDebt), defaults.silenceDebt)
  };
}

function coerceSequencerTransport(raw: unknown, defaults: SequencerTransportState): SequencerTransportState {
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  return {
    bpm: clampBpm(rec.bpm, defaults.bpm),
    running: asBooleanOr(rec.running, defaults.running)
  };
}

function coerceSequencerStep(raw: unknown, index: number): SequencerStepConfig {
  const defaults = defaultSequencerStep(index);
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const tags = asArray(rec.tags).filter((t): t is string => typeof t === "string");
  const msg = rec.msg && typeof rec.msg === "object" ? (rec.msg as MidiMsg) : defaults.msg;
  return {
    id: typeof rec.id === "string" ? rec.id : defaults.id,
    name: typeof rec.name === "string" ? rec.name : defaults.name,
    enabled: asBooleanOr(rec.enabled, defaults.enabled),
    weight: clampWeight(rec.weight, defaults.weight),
    gateMs: clampGateMs(rec.gateMs, defaults.gateMs),
    length: clampStepLength(rec.length, defaults.length),
    channel: clampChannelNullable(rec.channel),
    targetDeviceId: asStringOrNull(rec.targetDeviceId),
    targetPortId: asStringOrNull(rec.targetPortId),
    msg,
    tags: tags.length > 0 ? tags : defaults.tags
  };
}

function coerceSequencerChain(raw: unknown, index: number): SequencerChainConfig {
  const defaults = defaultSequencerChain(index);
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const steps = asArray<Record<string, unknown>>(rec.steps)
    .slice(0, MAX_SEQUENCER_STEPS)
    .map((step, stepIdx) => coerceSequencerStep(step, stepIdx));
  const safeSteps = steps.length > 0 ? steps : defaults.steps;
  const cycleLength = Math.min(clampStepLength(rec.cycleLength, safeSteps.length), safeSteps.length || 1);
  return {
    id: typeof rec.id === "string" ? rec.id : defaults.id,
    name: typeof rec.name === "string" ? rec.name : defaults.name,
    cycleLength,
    steps: safeSteps
  };
}

function coerceChainStep(raw: unknown, idx: number): ChainStep | null {
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const snapshot = typeof rec.snapshot === "string" ? rec.snapshot : null;
  const barsNum = Math.round(asNumberOr(rec.bars, NaN));
  // reject invalid entries so the caller can fall back to defaults
  if (!snapshot) return null;
  if (!Number.isFinite(barsNum) || barsNum < 1 || barsNum > 64) return null;
  return {
    snapshot,
    bars: Math.max(1, barsNum)
  };
}

function coerceSequencerState(rawState: unknown): SequencerProjectState {
  const defaults = defaultSequencerState();
  const raw = (rawState && typeof rawState === "object" ? (rawState as Record<string, unknown>) : {}) as Record<string, unknown>;
  const chains = asArray<Record<string, unknown>>(raw.chains)
    .slice(0, MAX_SEQUENCER_CHAINS)
    .map((c, idx) => coerceSequencerChain(c, idx));
  const safeChains = chains.length > 0 ? chains : defaults.chains;
  const activeChainId =
    typeof raw.activeChainId === "string" && safeChains.some((c) => c.id === raw.activeChainId)
      ? raw.activeChainId
      : safeChains[0]?.id ?? null;

  return {
    chains: safeChains,
    activeChainId,
    transport: coerceSequencerTransport((raw as any)?.transport, defaults.transport),
    world: coerceSequencerWorld((raw as any)?.world, defaults.world)
  };
}

function coerceSnapshotSlot(raw: unknown, idx: number, fallbackName: string): SnapshotSlotState {
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const capturedAt =
    typeof rec.lastCapturedAt === "number" && Number.isFinite(rec.lastCapturedAt) ? rec.lastCapturedAt : null;
  const snapshot = rec.snapshot && typeof rec.snapshot === "object" ? (rec.snapshot as SnapshotState) : null;
  const fallbackSlot: SnapshotSlotState = {
    id: typeof rec.id === "string" ? rec.id : `slot-${idx + 1}`,
    name: typeof rec.name === "string" ? rec.name : fallbackName,
    lastCapturedAt: capturedAt,
    snapshot,
    notes: typeof rec.notes === "string" ? rec.notes : ""
  };
  return fallbackSlot;
}

function coerceSnapshotBank(raw: unknown, idx: number): SnapshotBankState {
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const slots = asArray(rec.slots).map((slot, slotIdx) => coerceSnapshotSlot(slot, slotIdx, `Slot ${slotIdx + 1}`));
  return {
    id: typeof rec.id === "string" ? rec.id : `bank-${idx + 1}`,
    name: typeof rec.name === "string" ? rec.name : `Bank ${idx + 1}`,
    slots: slots.length > 0 ? slots : defaultSnapshotSlots()
  };
}

function coerceSnapshotsState(raw: unknown): SnapshotsState {
  const defaults = defaultSnapshotsState();
  const rec = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const banks = asArray(rec.banks).map((b, idx) => coerceSnapshotBank(b, idx));

  const activeBankId =
    typeof rec.activeBankId === "string"
      ? rec.activeBankId
      : banks.find((b) => b.id === defaults.activeBankId)?.id ?? defaults.activeBankId;

  const strategy: SnapshotRecallStrategy = rec.strategy === "commit" ? "commit" : "jump";
  const fadeMs = Math.max(0, asNumberOr(rec.fadeMs, defaults.fadeMs));
  const commitDelayMs = Math.max(0, asNumberOr(rec.commitDelayMs, defaults.commitDelayMs));

  const burstDefaults = defaults.burst;
  const burstRec = ((rec.burst && typeof rec.burst === "object") ? (rec.burst as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const burst: SnapshotBurstLimit = {
    intervalMs: Math.max(1, asNumberOr(burstRec.intervalMs, burstDefaults.intervalMs)),
    maxPerInterval: Math.max(1, asNumberOr(burstRec.maxPerInterval, burstDefaults.maxPerInterval))
  };

  return {
    activeBankId,
    strategy,
    fadeMs,
    commitDelayMs,
    captureNotes: typeof rec.captureNotes === "string" ? rec.captureNotes : defaults.captureNotes,
    burst,
    banks: banks.length > 0 ? banks : defaults.banks
  };
}

function sanitizeAppView(raw: unknown): AppView {
  const view = raw as AppView;
  return view === "setup" ||
    view === "routes" ||
    view === "mapping" ||
    view === "monitor" ||
    view === "help" ||
    view === "snapshots"
    ? view
    : "setup";
}

function coerceProjectStateV1(rawState: unknown): ProjectStateV1 {
  const stateDefaults = defaultProjectStateV1();
  const raw = (rawState && typeof rawState === "object" ? (rawState as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const sequencer = coerceSequencerState((raw as any)?.sequencer);

  const view = raw.activeView;
  const activeView: AppView =
    view === "setup" || view === "routes" || view === "mapping" || view === "monitor" || view === "help" ? view : "setup";

  const devices: DeviceConfig[] = asArray<Record<string, unknown>>(raw.devices).map((d, idx) => ({
    id: typeof d.id === "string" ? d.id : `device-${idx + 1}`,
    name: typeof d.name === "string" ? d.name : `Device ${idx + 1}`,
    instrumentId: asStringOrNull(d.instrumentId),
    inputId: asStringOrNull(d.inputId),
    outputId: asStringOrNull(d.outputId),
    channel: Math.min(Math.max(Math.round(asNumberOr(d.channel, 1)), 1), 16),
    clockEnabled: asBooleanOr(d.clockEnabled, false)
  }));

  const chainSteps: ChainStep[] = asArray(raw.chainSteps)
    .slice(0, 64)
    .map((s, idx) => coerceChainStep(s, idx))
    .filter((v): v is ChainStep => Boolean(v));
  const safeChainSteps = chainSteps.length > 0 ? chainSteps : stateDefaults.chainSteps;

  return {
    backendId: asStringOrNull(raw.backendId),
    selectedIn: asStringOrNull(raw.selectedIn),
    selectedOut: asStringOrNull(raw.selectedOut),
    activeView,
    selectedDeviceId: asStringOrNull(raw.selectedDeviceId),
    devices,
    routes: asArray<RouteConfig>(raw.routes),
    controls: asArray<ControlElement>(raw.controls),
    chainSteps: safeChainSteps,
    selectedControlId: asStringOrNull(raw.selectedControlId),
    sequencer,
    ui: {
      routeBuilder: {
        forceChannelEnabled: asBooleanOr((raw.ui as any)?.routeBuilder?.forceChannelEnabled, stateDefaults.ui.routeBuilder.forceChannelEnabled),
        routeChannel: Math.min(
          Math.max(Math.round(asNumberOr((raw.ui as any)?.routeBuilder?.routeChannel, stateDefaults.ui.routeBuilder.routeChannel)), 1),
          16
        ),
        allowNotes: asBooleanOr((raw.ui as any)?.routeBuilder?.allowNotes, stateDefaults.ui.routeBuilder.allowNotes),
        allowCc: asBooleanOr((raw.ui as any)?.routeBuilder?.allowCc, stateDefaults.ui.routeBuilder.allowCc),
        allowExpression: asBooleanOr((raw.ui as any)?.routeBuilder?.allowExpression, stateDefaults.ui.routeBuilder.allowExpression),
        allowTransport: asBooleanOr((raw.ui as any)?.routeBuilder?.allowTransport, stateDefaults.ui.routeBuilder.allowTransport),
        allowClock: asBooleanOr((raw.ui as any)?.routeBuilder?.allowClock, stateDefaults.ui.routeBuilder.allowClock),
        clockDiv: Math.min(
          Math.max(Math.round(asNumberOr((raw.ui as any)?.routeBuilder?.clockDiv, stateDefaults.ui.routeBuilder.clockDiv)), 1),
          96
        )
      },
      diagnostics: {
        note: Math.min(Math.max(Math.round(asNumberOr((raw.ui as any)?.diagnostics?.note, stateDefaults.ui.diagnostics.note)), 0), 127),
        ccValue: Math.min(
          Math.max(Math.round(asNumberOr((raw.ui as any)?.diagnostics?.ccValue, stateDefaults.ui.diagnostics.ccValue)), 0),
          127
        )
      }
    }
  };
}

function upgradeToV2(state: ProjectStateV1): ProjectStateV2 {
  return {
    ...state,
    activeView: sanitizeAppView(state.activeView),
    snapshots: defaultSnapshotsState()
  };
}

function coerceProjectStateV2(rawState: unknown): ProjectStateV2 {
  const base = coerceProjectStateV1(rawState);
  const raw = (rawState && typeof rawState === "object" ? (rawState as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const snapshots = coerceSnapshotsState((raw as any)?.snapshots);
  return {
    ...base,
    activeView: sanitizeAppView((raw as any)?.activeView),
    snapshots
  };
}

export function coerceProjectDoc(raw: unknown): ProjectDocV2 {
  const fallback = defaultProjectDoc();
  if (!raw || typeof raw !== "object") return fallback;

  const rec = raw as Record<string, unknown>;
  const updatedAt = asNumberOr(rec.updatedAt, Date.now());

  if (rec.schemaVersion === 1) {
    const v1State = coerceProjectStateV1((rec as any).state);
    return {
      schemaVersion: 2,
      updatedAt,
      state: upgradeToV2(v1State)
    };
  }

  if (rec.schemaVersion !== 2) return fallback;

  return {
    schemaVersion: 2,
    updatedAt,
    state: coerceProjectStateV2((rec as any).state)
  };
}
