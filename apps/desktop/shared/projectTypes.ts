import type { ControlElement } from "@midi-playground/core";
import type { RouteConfig } from "./ipcTypes";

export type SnapshotQuantize = "immediate" | "bar1" | "bar4";
export type SnapshotMode = "jump" | "commit";
export type ChainStep = { snapshot: string; bars: number };

export type DeviceConfig = {
  id: string;
  name: string;
  instrumentId: string | null;
  inputId: string | null;
  outputId: string | null;
  channel: number;
  clockEnabled: boolean;
};

export type AppView = "setup" | "routes" | "mapping" | "monitor" | "help" | "snapshots" | "chains" | "settings";

export type ProjectStateV1 = {
  backendId: string | null;
  selectedIn: string | null;
  selectedOut: string | null;
  activeView: AppView;
  selectedDeviceId: string | null;
  tempoBpm: number;
  useClockSync: boolean;
  followClockStart: boolean;
  snapshotQuantize: SnapshotQuantize;
  snapshotMode: SnapshotMode;
  snapshotFadeMs: number;
  chainSteps: ChainStep[];
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
  schemaVersion: 2;
  updatedAt: number; // epoch ms
  state: ProjectStateV1;
};

export function defaultProjectState(): ProjectStateV1 {
  return {
    backendId: null,
    selectedIn: null,
    selectedOut: null,
    activeView: "snapshots",
    selectedDeviceId: null,
    tempoBpm: 124,
    useClockSync: false,
    followClockStart: false,
    snapshotQuantize: "bar1",
    snapshotMode: "jump",
    snapshotFadeMs: 500,
    chainSteps: [
      { snapshot: "INTRO", bars: 8 },
      { snapshot: "VERSE", bars: 8 },
      { snapshot: "CHORUS 1", bars: 8 },
      { snapshot: "DROP!!", bars: 8 }
    ],
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

export function defaultProjectDoc(): ProjectDocV1 {
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function coerceSnapshotQuantize(value: unknown, fallback: SnapshotQuantize): SnapshotQuantize {
  return value === "immediate" || value === "bar1" || value === "bar4" ? value : fallback;
}

function coerceSnapshotMode(value: unknown, fallback: SnapshotMode): SnapshotMode {
  return value === "jump" || value === "commit" ? value : fallback;
}

function coerceChainStep(value: unknown): ChainStep | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const snapshot = typeof rec.snapshot === "string" ? rec.snapshot : null;
  const bars = clampNumber(asNumberOr(rec.bars, 1), 1, 64);
  if (!snapshot) return null;
  return { snapshot, bars };
}

export function coerceProjectDoc(raw: unknown): ProjectDocV1 {
  const fallback = defaultProjectDoc();
  if (!raw || typeof raw !== "object") return fallback;

  const rec = raw as Record<string, unknown>;
  if (rec.schemaVersion !== 2) return fallback;

  const rawState = (rec.state && typeof rec.state === "object" ? (rec.state as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const stateDefaults = defaultProjectState();

  const view = rawState.activeView;
  const activeView: AppView =
    view === "setup" ||
    view === "routes" ||
    view === "mapping" ||
    view === "monitor" ||
    view === "help" ||
    view === "snapshots" ||
    view === "chains" ||
    view === "settings"
      ? view
      : "snapshots";

  const devices: DeviceConfig[] = asArray<Record<string, unknown>>(rawState.devices).map((d, idx) => ({
    id: typeof d.id === "string" ? d.id : `device-${idx + 1}`,
    name: typeof d.name === "string" ? d.name : `Device ${idx + 1}`,
    instrumentId: asStringOrNull(d.instrumentId),
    inputId: asStringOrNull(d.inputId),
    outputId: asStringOrNull(d.outputId),
    channel: clampNumber(asNumberOr(d.channel, 1), 1, 16),
    clockEnabled: asBooleanOr(d.clockEnabled, false)
  }));

  return {
    schemaVersion: 2,
    updatedAt: asNumberOr(rec.updatedAt, Date.now()),
    state: {
      backendId: asStringOrNull(rawState.backendId),
      selectedIn: asStringOrNull(rawState.selectedIn),
      selectedOut: asStringOrNull(rawState.selectedOut),
      activeView,
      selectedDeviceId: asStringOrNull(rawState.selectedDeviceId),
      tempoBpm: clampNumber(asNumberOr(rawState.tempoBpm, stateDefaults.tempoBpm), 20, 300),
      useClockSync: asBooleanOr(rawState.useClockSync, stateDefaults.useClockSync),
      followClockStart: asBooleanOr(rawState.followClockStart, stateDefaults.followClockStart),
      snapshotQuantize: coerceSnapshotQuantize(rawState.snapshotQuantize, stateDefaults.snapshotQuantize),
      snapshotMode: coerceSnapshotMode(rawState.snapshotMode, stateDefaults.snapshotMode),
      snapshotFadeMs: clampNumber(asNumberOr(rawState.snapshotFadeMs, stateDefaults.snapshotFadeMs), 0, 20000),
      chainSteps: (() => {
        if (!Array.isArray(rawState.chainSteps)) return stateDefaults.chainSteps;
        const cleaned = (rawState.chainSteps as unknown[]).slice(0, 64).map(coerceChainStep).filter(Boolean) as ChainStep[];
        return cleaned.length ? cleaned : stateDefaults.chainSteps;
      })(),
      devices,
      routes: asArray<RouteConfig>(rawState.routes),
      controls: asArray<ControlElement>(rawState.controls),
      selectedControlId: asStringOrNull(rawState.selectedControlId),
      ui: {
        routeBuilder: {
          forceChannelEnabled: asBooleanOr((rawState.ui as any)?.routeBuilder?.forceChannelEnabled, stateDefaults.ui.routeBuilder.forceChannelEnabled),
          routeChannel: clampNumber(
            asNumberOr((rawState.ui as any)?.routeBuilder?.routeChannel, stateDefaults.ui.routeBuilder.routeChannel),
            1,
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
          clockDiv: clampNumber(
            asNumberOr((rawState.ui as any)?.routeBuilder?.clockDiv, stateDefaults.ui.routeBuilder.clockDiv),
            1,
            96
          )
        },
        diagnostics: {
          note: clampNumber(
            asNumberOr((rawState.ui as any)?.diagnostics?.note, stateDefaults.ui.diagnostics.note),
            0,
            127
          ),
          ccValue: clampNumber(
            asNumberOr((rawState.ui as any)?.diagnostics?.ccValue, stateDefaults.ui.diagnostics.ccValue),
            0,
            127
          )
        }
      }
    }
  };
}
