import type { ControlElement, SnapshotBurstLimit, SnapshotRecallStrategy, SnapshotState } from "@midi-playground/core";
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

export type ProjectStateV1 = {
  backendId: string | null;
  selectedIn: string | null;
  selectedOut: string | null;
  activeView: Exclude<AppView, "snapshots">;
  selectedDeviceId: string | null;
  devices: DeviceConfig[];
  routes: RouteConfig[];
  controls: ControlElement[];
  selectedControlId: string | null;
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

function defaultProjectStateV1(): ProjectStateV1 {
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

  return {
    backendId: asStringOrNull(raw.backendId),
    selectedIn: asStringOrNull(raw.selectedIn),
    selectedOut: asStringOrNull(raw.selectedOut),
    activeView,
    selectedDeviceId: asStringOrNull(raw.selectedDeviceId),
    devices,
    routes: asArray<RouteConfig>(raw.routes),
    controls: asArray<ControlElement>(raw.controls),
    selectedControlId: asStringOrNull(raw.selectedControlId),
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
